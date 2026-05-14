"""Crypto scanner service."""

from __future__ import annotations

from services.data import adapters
from services.data.coingecko import client as coingecko
from services.data.http import ProviderError
from services.scanners.momentum.ranker import rank_movers, rank_volume
from shared.types import AssetRow


def scan_top(limit: int = 50) -> list[AssetRow]:
    """Return normalized CoinGecko top-coin rows."""
    try:
        payloads = coingecko.top_coins(per_page=limit, sparkline=True)
    except ProviderError:
        return []
    return [adapters.crypto_from_coingecko(payload) for payload in payloads]


def scan_ids(ids: list[str]) -> list[AssetRow]:
    """Return normalized CoinGecko rows for specific ids."""
    try:
        payloads = coingecko.crypto_market_data(ids)
    except ProviderError:
        return [AssetRow.unavailable(symbol, "crypto", "CoinGecko") for symbol in ids]
    return [adapters.crypto_from_coingecko(payload) for payload in payloads]


def top_movers(limit: int = 30) -> list[AssetRow]:
    """Return top crypto movers from CoinGecko market data."""
    return rank_movers(scan_top(max(limit, 50)), limit)


def volume_leaders(limit: int = 30) -> list[AssetRow]:
    """Return crypto volume leaders."""
    return rank_volume(scan_top(max(limit, 50)), limit)
