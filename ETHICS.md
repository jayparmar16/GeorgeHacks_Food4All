# Ethics & Data Privacy — Resilient Food Systems

## 1. Beneficiary Data (Ration Tickets)

**Data minimization:** Ration tickets store only: name, location, household size, and ration composition. No national ID, biometrics, or financial data is collected from beneficiaries.

**QR codes:** Ticket QR codes encode only the `ticketCode` string (e.g. `RFS-A3F9B821`). They contain no personal data. If a printed ticket is lost, the ticket can be voided in the system without exposing beneficiary information.

**Retention:** Tickets expire automatically. Expired ticket records are retained for 90 days for reconciliation, then purged from the operational database. Anonymized aggregate counts (redeemed/expired by region) may be retained for program evaluation.

**Consent:** Beneficiary data is collected by NGO staff at point of registration. Staff must obtain verbal informed consent in the local language before creating a ticket record. The system supports Haitian Creole and French (Haiti) and French/Lingala (DRC).

## 2. Vendor Consent & RootNet Registration

**Voluntary:** Vendor registration is explicitly voluntary. Vendors can deregister at any time by contacting their NGO partner or via the self-service portal.

**Data shared:** Vendor profiles (name, GPS location, food types, phone) are visible only to logged-in NGO staff. They are not publicly indexed or sold.

**Phone numbers:** Vendor phone numbers are used exclusively for crisis SMS/WhatsApp alerts. They are stored encrypted at rest. Twilio handles transmission; their data processing agreement applies.

**Community trust scores:** Vouch/flag counts are visible but the identities of vouchers/flaggers are not disclosed to vendors, preventing retaliation.

**Seasonal re-verification:** Every 90 days, vendors receive an automated prompt to confirm their profile is still accurate. Lapsed profiles are marked "unverified" and excluded from crisis activation lists until re-confirmed.

## 3. Farmer Data (SowSafe)

**Harvest pledges:** Pledged harvest quantities and farm GPS are visible only to NGO staff managing the reserve ledger. They are not shared with commercial buyers.

**On-chain anchoring (optional):** If enabled, only a cryptographic hash of the reserve record is written to Solana (not raw farm data). The hash allows auditability without exposing personal or economic details on a public ledger.

**Payment data:** Farmer payment records (mobile money disbursements) are stored server-side and not on-chain. Mobile money provider APIs (MTN MoMo, MonCash) handle PII under their own privacy policies.

## 4. Donation Privacy (Solana)

**Public ledger:** Solana transactions are publicly visible on-chain. Donors should be informed that their wallet address and transaction amount are permanently recorded on a public blockchain.

**Devnet note:** In the current implementation, all transactions are on Solana Devnet, which uses test tokens with no monetary value. For mainnet deployment, donors must be shown a clear disclosure before connecting their wallet.

**No KYC by default:** General public donors are not subject to identity verification. UN-affiliated donors undergo a lightweight self-attestation (email domain check or checkbox). Full KYC would require a separate compliance review before mainnet deployment.

**MongoDB records:** Donation records stored in MongoDB include wallet address and tx hash but not donor legal name (unless volunteered during registration). These records are accessible only to system administrators and the recipient NGO.

## 5. Geospatial Data

All map data (roads, populated places, market locations) is sourced from publicly available datasets (HOT/OSM exports, HDX). No individual tracking or movement logging is performed.

## 6. Data Residency & Security

- MongoDB Atlas supports region selection; operators should choose a region consistent with applicable data protection law.
- All API endpoints require JWT authentication for write operations.
- Passwords are hashed with bcrypt. JWTs are short-lived (60 minutes).
- No API keys or secrets are stored in frontend code or public repositories.

## 7. AI (Gemini) Usage

- Gemini receives anonymized, aggregated context (market price rows, IPC phase labels, place names) — never individual beneficiary records.
- Gemini outputs are advisory only and reviewed by NGO staff before operational use.
- Outputs are not cached or shared with third parties beyond the requesting session.
