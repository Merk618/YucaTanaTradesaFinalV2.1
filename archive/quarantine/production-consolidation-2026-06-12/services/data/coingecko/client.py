"""CoinGecko market data client."""

from __future__ import annotations

from typing import Any

from services.data.http import get_json

COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3"


def top_coins(vs_currency: str = "usd", per_page: int = 50, sparkline: bool = True) -> list[dict[str, Any]]:
    """Return top crypto assets by market cap."""
    return get_json(
        f"{COINGECKO_BASE_URL}/coins/markets",
        params={
            "vs_currency": vs_currency,
            "order": "market_cap_desc",
            "per_page": per_page,
            "page": 1,
            "sparkline": str(sparkline).lower(),
            "price_change_percentage": "24h,7d",
        },
    )


def crypto_market_data(ids: list[str], vs_currency: str = "usd") -> list[dict[str, Any]]:
    """Return market payloads for specific CoinGecko ids."""
    return get_json(
        f"{COINGECKO_BASE_URL}/coins/markets",
        params={
            "vs_currency": vs_currency,
            "ids": ",".join(ids),
            "order": "market_cap_desc",
            "sparkline": "true",
            "price_change_percentage": "24h,7d",
        },
    )


def global_market_data() -> dict[str, Any]:
    """Return global crypto market data."""
    return get_json(f"{COINGECKO_BASE_URL}/global").get("data", {})


def btc_dominance() -> float | None:
    """Return BTC dominance percentage where available."""
    return global_market_data().get("market_cap_percentage", {}).get("btc")


def sparkline_data(coin_id: str, vs_currency: str = "usd", days: int = 7) -> list[float]:
    """Return CoinGecko sparkline prices for one asset."""
    payload = get_json(
        f"{COINGECKO_BASE_URL}/coins/{coin_id}/market_chart",
        params={"vs_currency": vs_currency, "days": days, "interval": "hourly"},
    )
    return [float(item[1]) for item in payload.get("prices", [])]
