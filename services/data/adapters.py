"""Provider payload to AssetRow adapters."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from shared.types import AssetRow, DataQuality


def stock_from_finnhub(symbol: str, quote: dict[str, Any], profile: dict[str, Any] | None = None, metrics: dict[str, Any] | None = None) -> AssetRow:
    """Map Finnhub payloads to a normalized stock AssetRow."""
    profile = profile or {}
    metric = (metrics or {}).get("metric", {})
    price = quote.get("c")
    if price is None or float(price or 0) <= 0:
        return AssetRow.unavailable(symbol, "stock", "Finnhub")
    return AssetRow(
        symbol=symbol.upper(),
        name=profile.get("name") or symbol.upper(),
        type="stock",
        group=profile.get("finnhubIndustry"),
        sector=profile.get("finnhubIndustry"),
        price=float(price),
        changePercent=float(quote.get("dp") or 0),
        marketCap=float(profile.get("marketCapitalization") or 0) * 1_000_000 if profile.get("marketCapitalization") else None,
        source="Finnhub",
        lastUpdated=datetime.now(timezone.utc).isoformat(),
        dataQuality=DataQuality.LIVE,
        fiftyTwoWeekHigh=metric.get("52WeekHigh"),
        fiftyTwoWeekLow=metric.get("52WeekLow"),
    )


def crypto_from_coingecko(payload: dict[str, Any]) -> AssetRow:
    """Map CoinGecko market payload to a normalized crypto AssetRow."""
    symbol = str(payload.get("symbol") or "").upper()
    price = payload.get("current_price")
    if not symbol or price is None:
        return AssetRow.unavailable(symbol or "UNKNOWN", "crypto", "CoinGecko")
    return AssetRow(
        symbol=symbol,
        name=payload.get("name") or symbol,
        type="crypto",
        group=payload.get("asset_platform_id") or "Crypto",
        price=float(price),
        changePercent=payload.get("price_change_percentage_24h"),
        volume=payload.get("total_volume"),
        marketCap=payload.get("market_cap"),
        source="CoinGecko",
        lastUpdated=datetime.now(timezone.utc).isoformat(),
        series=[float(value) for value in payload.get("sparkline_in_7d", {}).get("price", []) if value is not None],
        dataQuality=DataQuality.LIVE,
        marketCapRank=payload.get("market_cap_rank"),
    )
