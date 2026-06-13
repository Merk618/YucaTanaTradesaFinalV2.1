"""Stock scanner service.

Uses services/data providers for raw market data and returns normalized AssetRow
objects. It does not calculate strategy indicators or fabricate missing fields.
"""

from __future__ import annotations

from services.data import adapters
from services.data.finnhub import client as finnhub
from services.data.http import ProviderError
from services.data.yahoo import client as yahoo
from services.scanners.momentum.ranker import rank_movers, rank_volume
from shared.types import AssetRow, DataQuality


def scan_symbols(symbols: list[str]) -> list[AssetRow]:
    """Scan stock symbols with Finnhub first and Yahoo fallback only when needed."""
    rows: list[AssetRow] = []
    for symbol in symbols:
        try:
            quote = finnhub.quote(symbol)
            try:
                profile = finnhub.profile(symbol)
            except ProviderError:
                profile = {}
            try:
                metrics = finnhub.metrics(symbol)
            except ProviderError:
                metrics = {}
            rows.append(adapters.stock_from_finnhub(symbol, quote, profile, metrics))
        except ProviderError:
            rows.append(AssetRow.unavailable(symbol, "stock", "Finnhub"))
    unavailable = [row.symbol for row in rows if row.dataQuality == DataQuality.UNAVAILABLE]
    if unavailable:
        try:
            fallback = {item.get("symbol", "").upper(): item for item in yahoo.quotes(unavailable)}
            for index, row in enumerate(rows):
                quote = fallback.get(row.symbol)
                price = quote and quote.get("regularMarketPrice")
                if price:
                    rows[index] = AssetRow(
                        symbol=row.symbol,
                        name=quote.get("shortName") or row.symbol,
                        type="stock",
                        price=float(price),
                        changePercent=quote.get("regularMarketChangePercent"),
                        volume=quote.get("regularMarketVolume"),
                        marketCap=quote.get("marketCap"),
                        source="Yahoo fallback",
                        dataQuality=DataQuality.FALLBACK,
                    )
        except ProviderError:
            pass
    return rows


def top_movers(symbols: list[str], limit: int = 30) -> list[AssetRow]:
    """Return top stock movers from scanner data."""
    return rank_movers(scan_symbols(symbols), limit)


def unusual_volume(symbols: list[str], limit: int = 30) -> list[AssetRow]:
    """Return volume-ranked stock candidates."""
    return rank_volume(scan_symbols(symbols), limit)
