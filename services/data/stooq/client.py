"""Stooq delayed fallback quote client."""

from __future__ import annotations

import csv
from io import StringIO

import requests

from services.data.http import ProviderError

STOOQ_QUOTE_URL = "https://stooq.com/q/l/"


def stooq_symbol(symbol: str) -> str:
    """Map a US ticker to Stooq's delayed quote symbol format."""
    return f"{symbol.lower().replace('.', '-')}.us"


def quotes(symbols: list[str]) -> list[dict[str, str]]:
    """Return delayed Stooq quote rows."""
    try:
        response = requests.get(
            STOOQ_QUOTE_URL,
            params={"s": "+".join(stooq_symbol(symbol) for symbol in symbols), "f": "sd2t2ohlcv", "h": "", "e": "csv"},
            timeout=12,
        )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        raise ProviderError("Stooq fallback request failed") from exc
    return list(csv.DictReader(StringIO(response.text)))
