"""Twilio SMS/WhatsApp service — stubs to logs if keys not set."""
import logging
from config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client():
    global _client
    if _client is None and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client
            _client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        except Exception as e:
            logger.warning(f"Twilio client init failed: {e}")
    return _client


async def send_sms(to: str, body: str) -> dict:
    client = get_client()
    if not client:
        logger.info(f"[MOCK SMS] To: {to} | Body: {body}")
        return {"status": "mock_sent", "to": to, "body": body}
    try:
        msg = client.messages.create(
            body=body,
            from_=settings.TWILIO_FROM_NUMBER,
            to=to,
        )
        return {"status": "sent", "sid": msg.sid, "to": to}
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return {"status": "error", "error": str(e)}


async def send_whatsapp(to: str, body: str) -> dict:
    client = get_client()
    if not client:
        logger.info(f"[MOCK WHATSAPP] To: {to} | Body: {body}")
        return {"status": "mock_sent", "to": to, "body": body}
    try:
        msg = client.messages.create(
            body=body,
            from_=f"whatsapp:{settings.TWILIO_FROM_NUMBER}",
            to=f"whatsapp:{to}",
        )
        return {"status": "sent", "sid": msg.sid, "to": to}
    except Exception as e:
        logger.error(f"WhatsApp send failed: {e}")
        return {"status": "error", "error": str(e)}


async def blast_vendors(vendor_list: list, message: str) -> list:
    results = []
    for vendor in vendor_list:
        phone = vendor.get("phone") or vendor.get("contact")
        if not phone:
            continue
        method = vendor.get("contactMethod", "sms")
        if method == "whatsapp":
            result = await send_whatsapp(phone, message)
        else:
            result = await send_sms(phone, message)
        results.append({"vendorId": str(vendor.get("_id", "")), **result})
    return results
