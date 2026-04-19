"""Solana devnet transaction verification."""
import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


async def verify_transaction(tx_hash: str) -> dict:
    """Verify a Solana devnet transaction by signature."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                settings.SOLANA_RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [tx_hash, {"encoding": "json", "maxSupportedTransactionVersion": 0}],
                },
            )
            data = resp.json()
            result = data.get("result")
            if not result:
                return {"valid": False, "error": "Transaction not found"}

            meta = result.get("meta", {})
            if meta.get("err"):
                return {"valid": False, "error": f"Transaction failed: {meta['err']}"}

            return {
                "valid": True,
                "slot": result.get("slot"),
                "blockTime": result.get("blockTime"),
                "fee": meta.get("fee", 0),
            }
    except Exception as e:
        logger.error(f"Solana tx verification error: {e}")
        return {"valid": False, "error": str(e)}


async def get_sol_balance(wallet_address: str) -> float:
    """Get SOL balance for a wallet on devnet."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                settings.SOLANA_RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getBalance",
                    "params": [wallet_address],
                },
            )
            data = resp.json()
            lamports = data.get("result", {}).get("value", 0)
            return lamports / 1e9  # Convert lamports to SOL
    except Exception as e:
        logger.error(f"Balance check error: {e}")
        return 0.0
