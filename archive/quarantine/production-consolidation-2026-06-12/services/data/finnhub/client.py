"""Finnhub stock data client.

This is a source-of-truth adapter for stock quote/profile/candle/metric data.
It returns provider payloads only; UI adapters decide how to display missing
fields as unavailable.
"""

from __future__ import annotations

import os
from typing import Any

from services.data.http import ProviderError, get_json

FINNHUB_BASE_URL = "https://finnhub.io/api/v1"


def _token() -> str:
    token = os.getenv("FINNHUB_API_KEY") or os.getenv("FINNHUB_KEY")
    if not token:
        raise ProviderError("FINNHUB_API_KEY is not configured")
    return token


def quote(symbol: str) -> dict[str, Any]:
    """Return latest Finnhub quote for a stock symbol."""
    return get_json(f"{FINNHUB_BASE_URL}/quote", params={"symbol": symbol.upper(), "token": _token()})


def profile(symbol: str) -> dict[str, Any]:
    """Return Finnhub company profile."""
    return get_json(f"{FINNHUB_BASE_URL}/stock/profile2", params={"symbol": symbol.upper(), "token": _token()})


def candles(symbol: str, resolution: str, start_unix: int, end_unix: int) -> dict[str, Any]:
    """Return Finnhub candle data."""
    return get_json(
        f"{FINNHUB_BASE_URL}/stock/candle",
        params={"symbol": symbol.upper(), "resolution": resolution, "from": start_unix, "to": end_unix, "token": _token()},
    )


def metrics(symbol: str) -> dict[str, Any]:
    """Return Finnhub all metric payload, including 52-week fields where available."""
    return get_json(f"{FINNHUB_BASE_URL}/stock/metric", params={"symbol": symbol.upper(), "metric": "all", "token": _token()})


def fifty_two_week(symbol: str) -> dict[str, Any]:
    """Return normalized 52-week high/low fields from Finnhub metrics."""
    payload = metrics(symbol).get("metric", {})
    return {
        "high": payload.get("52WeekHigh"),
        "low": payload.get("52WeekLow"),
        "source": "Finnhub metric",
    }


def market_regime(symbols: list[str]) -> dict[str, Any]:
    """Compute a lightweight regime snapshot from live Finnhub quote changes."""
    changes = []
    for symbol in symbols:
        payload = quote(symbol)
        if payload.get("dp") is not None:
            changes.append(float(payload["dp"]))
    if not changes:
        raise ProviderError("No Finnhub quote changes available for regime")
    avg = sum(changes) / len(changes)
    return {"averageChangePercent": avg, "regime": "risk-on" if avg >= 0 else "risk-off", "source": "Finnhub quotes"}


def stock_scanner_data(symbols: list[str]) -> list[dict[str, Any]]:
    """Return raw quote/profile/metric snapshots for stock scanner services."""
    rows = []
    for symbol in symbols:
        item: dict[str, Any] = {"symbol": symbol.upper(), "source": "Finnhub"}
        item["quote"] = quote(symbol)
        try:
            item["profile"] = profile(symbol)
        except ProviderError:
            item["profile"] = {}
        try:
            item["metrics"] = metrics(symbol)
        except ProviderError:
            item["metrics"] = {}
        rows.append(item)
    return rows
