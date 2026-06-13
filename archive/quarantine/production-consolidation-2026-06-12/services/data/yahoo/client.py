"""Yahoo Finance fallback quote client.

Yahoo is treated as a fallback source only. Rows sourced here must be labeled
FALLBACK or DELAYED by caller/UI code.
"""

from __future__ import annotations

from typing import Any

from services.data.http import get_json

YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote"


def quotes(symbols: list[str]) -> list[dict[str, Any]]:
    """Return Yahoo quote payloads for fallback quote display."""
    payload = get_json(YAHOO_QUOTE_URL, params={"symbols": ",".join(symbols)})
    return payload.get("quoteResponse", {}).get("result", [])
