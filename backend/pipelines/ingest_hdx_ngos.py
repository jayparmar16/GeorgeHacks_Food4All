#!/usr/bin/env python3
"""
HDX NGO Ingestion Pipeline
===========================
Queries HDX CKAN for the latest 3W (Who does What, Where) operational presence
dataset for a given country, filters to Food Security / Disaster Relief NGOs,
and writes the results to MongoDB.

Usage:
    python ingest_hdx_ngos.py --country hti        # Haiti (default)
    python ingest_hdx_ngos.py --country cod        # DRC
    python ingest_hdx_ngos.py --country moz        # Mozambique
"""

import argparse
import io
import re
import logging
import sys
import os
from datetime import datetime
from typing import Optional

import requests
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ── HDX CKAN config ────────────────────────────────────────────────────────
HDX_API_BASE = "https://data.humdata.org/api/3/action"
SEARCH_ENDPOINT = f"{HDX_API_BASE}/package_search"

# ISO3 → country name used in HDX free-text search
COUNTRY_NAMES = {
    "hti": "Haiti",
    "cod": "Congo",          # matches both "Congo" and "DRC"
    "moz": "Mozambique",
    "ind": "India",
}

# Sector keywords to keep (regex alternation, case-insensitive)
FOOD_DISASTER_PATTERN = re.compile(
    r"food|nourriture|agriculture|s[eé]curit[eé] alimentaire|disaster|relief|urgence|humanitarian",
    re.IGNORECASE,
)

# Contact/address placeholder columns to look for
CONTACT_COLS = ["email", "contact", "phone", "website", "twitter", "whatsapp"]


# ── Step 1 — Fetch latest 3W package from HDX ─────────────────────────────
def fetch_3w_package(country_iso3: str, debug: bool = False) -> Optional[list]:
    """
    Query HDX CKAN for 3W operational-presence datasets for the given country.
    Uses the same proven query pattern as the reference script:
        q = "{CountryName} AND (3w OR 3ws OR 'operational presence' OR qfqo)"
    Returns list of matching package dicts, or None on failure.
    """
    country_name = COUNTRY_NAMES.get(country_iso3.lower())
    if not country_name:
        logger.error(f"Unknown country code: {country_iso3}")
        return None

    params = {
        "q": f'{country_name} AND (3w OR 3ws OR "operational presence" OR qfqo)',
        "rows": 10,  # fetch several; first may not have a CSV
    }

    logger.info(f"Querying HDX for: {params['q']}")
    try:
        resp = requests.get(SEARCH_ENDPOINT, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as exc:
        logger.error(f"HDX API request failed: {exc}")
        return None

    if not data.get("success"):
        logger.error("HDX API returned success=false")
        return None

    results = data.get("result", {}).get("results", [])
    if not results:
        logger.warning(f"No 3W packages found for '{country_name}'")
        return None

    logger.info(f"Found {len(results)} package(s) for {country_iso3.upper()}")

    # Debug mode: mirror the reference script output exactly
    if debug:
        print(f"\nSuccessfully connected to HDX!\n{'─'*40}")
        for dataset in results:
            title = dataset.get("title")
            org = dataset.get("organization", {}).get("title", "N/A")
            print(f"Dataset Title: {title}")
            print(f"Maintained By: {org}")
            for resource in dataset.get("resources", []):
                file_format = resource.get("format", "").upper()
                if file_format in ("CSV", "XLSX", "XLS"):
                    print(f"[!] Found {file_format} Data Link: {resource.get('url')}")
            print("─" * 40)

    return results


# ── Step 2 — Find a downloadable CSV/XLSX resource ────────────────────────
def find_downloadable_resource(packages: list) -> Optional[tuple]:
    """Return (download_url, format_str) for the first CSV/XLSX resource found."""
    for pkg in packages:
        for resource in pkg.get("resources", []):
            fmt = resource.get("format", "").upper()
            url = resource.get("url") or resource.get("download_url", "")
            if fmt in ("CSV", "XLSX", "XLS") and url:
                logger.info(f"Selected resource: {resource.get('name', 'unnamed')} [{fmt}] — {url[:80]}…")
                return url, fmt
    logger.warning("No CSV/XLSX resource found in any package.")
    return None, None


# ── Step 3 — Download and parse into DataFrame ───────────────────────────
def download_and_parse(url: str, fmt: str) -> Optional[pd.DataFrame]:
    """Download file into memory and return a Pandas DataFrame."""
    try:
        logger.info(f"Downloading {url[:80]}…")
        resp = requests.get(url, timeout=60, stream=True)
        resp.raise_for_status()
        buf = io.BytesIO(resp.content)
    except requests.RequestException as exc:
        logger.error(f"Download failed: {exc}")
        return None

    try:
        if fmt == "CSV":
            # Try common encodings
            for enc in ("utf-8", "latin-1", "cp1252"):
                try:
                    buf.seek(0)
                    df = pd.read_csv(buf, encoding=enc, on_bad_lines="skip")
                    break
                except UnicodeDecodeError:
                    continue
            else:
                logger.error("Could not decode CSV with any supported encoding")
                return None
        else:
            df = pd.read_excel(buf, engine="openpyxl")
        logger.info(f"Loaded DataFrame: {len(df)} rows × {len(df.columns)} columns")
        return df
    except Exception as exc:
        logger.error(f"Parse error: {exc}")
        return None


# ── Step 4 — Dynamic column resolution + filtering ───────────────────────
def resolve_column(df: pd.DataFrame, *keywords: str) -> Optional[str]:
    """Find a column by priority: exact match wins over substring, earlier keywords win over later."""
    for kw in keywords:
        for col in df.columns:
            if kw.lower() == col.lower():
                return col
    for kw in keywords:
        for col in df.columns:
            if kw.lower() in col.lower():
                return col
    return None


def filter_food_ngos(df: pd.DataFrame, country_iso3: str) -> pd.DataFrame:
    """Filter rows to food/disaster sectors; return de-duped NGO list.

    Handles two layouts:
    1. Country-specific 3W files (Haiti XLSX) — column names like 'Organisation',
       'Cluster/Sector', 'Département/Admin1'
    2. HDX HAPI global CSV — column names like 'org_name', 'sector_name',
       'location_code', 'admin1_name'
    For global files, pre-filter rows to the requested country ISO3 code first.
    """
    # ── Pre-filter global files by location_code ──────────────────────────
    if "location_code" in df.columns:
        df = df[df["location_code"].str.upper() == country_iso3.upper()].copy()
        logger.info(f"  Global CSV: filtered to {len(df)} rows for {country_iso3.upper()}")

    sector_col = resolve_column(df, "sector_name", "sector", "secteur", "cluster", "pillar")
    org_col = resolve_column(df, "org_name", "organisation", "organization", "org", "agence", "acteur")
    region_col = resolve_column(df, "admin1_name", "adm1", "region", "departement", "province", "admin1", "where")

    if sector_col is None:
        logger.warning("Sector column not found — returning all unique organisations")
        if org_col:
            df = df[[org_col]].copy()
            df.columns = ["organization"]
        return df.drop_duplicates()

    if org_col is None:
        logger.warning("Organisation column not found; cannot extract NGO names")
        return pd.DataFrame()

    # Some HDX global CSVs wrap text values in literal single quotes — strip them
    for col in [sector_col, org_col]:
        if col and col in df.columns:
            df[col] = df[col].astype(str).str.strip("'\"").str.strip()

    # Apply food/disaster filter
    FOOD_PATTERN_STR = (
        r"food|nourriture|agriculture|s[eé]curit[eé] alimentaire"
        r"|disaster|relief|urgence|humanitarian"
    )
    mask = df[sector_col].str.contains(FOOD_PATTERN_STR, case=False, na=False, regex=True)
    logger.info(f"  Sector filter matched {mask.sum()} rows from {len(df)}")
    filtered = df[mask].copy()

    # Build clean output columns
    cols_to_keep = {
        "organization": org_col,
        "sectors": sector_col,
    }
    if region_col:
        cols_to_keep["region"] = region_col

    # Look for contact columns
    for label in CONTACT_COLS:
        col = resolve_column(filtered, label)
        if col:
            cols_to_keep[label] = col

    output_cols = {v: k for k, v in cols_to_keep.items() if v in filtered.columns}
    result = filtered[list(output_cols.keys())].rename(columns=output_cols)
    result = result.drop_duplicates(subset=["organization"])
    result["country"] = country_iso3
    result["source"] = "HDX 3W"
    result["updatedAt"] = datetime.utcnow().isoformat()

    logger.info(f"Filtered to {len(result)} unique food/disaster NGOs")
    return result


# ── Step 5 — Output & MongoDB write ──────────────────────────────────────
def print_ngo_list(df: pd.DataFrame) -> None:
    if df.empty:
        print("No NGOs found matching filter criteria.")
        return
    print(f"\n{'─'*60}")
    print(f"  Food Security / Disaster Relief NGOs ({len(df)} found)")
    print(f"{'─'*60}")
    for i, row in enumerate(df.itertuples(), 1):
        org = getattr(row, "organization", "Unknown")
        sectors = getattr(row, "sectors", "")
        region = getattr(row, "region", "")
        print(f"  {i:>3}. {org}")
        if sectors:
            print(f"       Sectors: {str(sectors)[:80]}")
        if region:
            print(f"       Region:  {region}")
    print(f"{'─'*60}\n")


def write_to_mongo(df: pd.DataFrame, country_iso3: str) -> None:
    """Write NGO records to MongoDB (requires MONGODB_URI env var or local default)."""
    try:
        import pymongo
        mongo_uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/resilient_food")
        client = pymongo.MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        db = client["resilient_food"]

        records = df.to_dict(orient="records")
        # Upsert by organization + country
        for record in records:
            db["ngos"].update_one(
                {"organization": record.get("organization"), "country": record.get("country")},
                {"$set": record},
                upsert=True,
            )
        logger.info(f"Upserted {len(records)} NGO records into MongoDB (ngos collection)")
        client.close()
    except Exception as exc:
        logger.warning(f"MongoDB write skipped: {exc}. Set MONGODB_URI env var to enable.")


# ── Main pipeline ─────────────────────────────────────────────────────────
def run_pipeline(country_iso3: str = "hti", write_mongo: bool = False, debug: bool = False) -> pd.DataFrame:
    logger.info(f"Starting NGO ingestion pipeline for country: {country_iso3.upper()}")

    # Step 1 — Fetch HDX packages
    packages = fetch_3w_package(country_iso3, debug=debug)
    if not packages:
        logger.error("Pipeline aborted: could not fetch HDX packages")
        return pd.DataFrame()

    # Step 2 — Find downloadable CSV/XLSX
    url, fmt = find_downloadable_resource(packages)
    if not url:
        logger.error("Pipeline aborted: no downloadable resource found")
        return pd.DataFrame()

    # Step 3 — Download and parse
    df = download_and_parse(url, fmt)
    if df is None or df.empty:
        logger.error("Pipeline aborted: DataFrame is empty or parse failed")
        return pd.DataFrame()

    # Step 4 — Filter to food/disaster NGOs
    result = filter_food_ngos(df, country_iso3)

    # Step 5 — Print and optionally persist
    print_ngo_list(result)

    if write_mongo and not result.empty:
        write_to_mongo(result, country_iso3)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HDX 3W NGO ingestion pipeline")
    parser.add_argument("--country", default="hti", help="ISO3 country code (hti, cod, moz)")
    parser.add_argument("--mongo", action="store_true", help="Write results to MongoDB")
    parser.add_argument("--debug", action="store_true", help="Print all datasets + CSV links before filtering")
    args = parser.parse_args()
    result_df = run_pipeline(args.country, write_mongo=args.mongo, debug=args.debug)
    sys.exit(0 if not result_df.empty else 1)
