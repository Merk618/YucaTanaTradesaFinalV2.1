"""Scanner ranking helpers.

Scanners detect and rank candidates only. Strategy calculations such as RSI,
MACD, VWAP, support, resistance, and risk scoring live under services/strategies.
"""

from __future__ import annotations

from shared.types import AssetRow, DataQuality


def sortable_number(value: float | None) -> float:
    """Normalize optional numbers for ranking without fabricating display data."""
    return float(value) if value is not None else 0.0


def rank_movers(rows: list[AssetRow], limit: int = 30) -> list[AssetRow]:
    """Rank assets by absolute move, excluding unavailable rows."""
    available = [row for row in rows if row.dataQuality != DataQuality.UNAVAILABLE]
    return sorted(available, key=lambda row: abs(sortable_number(row.changePercent)), reverse=True)[:limit]


def rank_volume(rows: list[AssetRow], limit: int = 30) -> list[AssetRow]:
    """Rank assets by reported volume."""
    available = [row for row in rows if row.dataQuality != DataQuality.UNAVAILABLE]
    return sorted(available, key=lambda row: sortable_number(row.volume), reverse=True)[:limit]


def rank_momentum(rows: list[AssetRow], limit: int = 30) -> list[AssetRow]:
    """Rank assets by strategy-provided momentum when present."""
    available = [row for row in rows if row.dataQuality != DataQuality.UNAVAILABLE and row.momentum is not None]
    return sorted(available, key=lambda row: sortable_number(row.momentum), reverse=True)[:limit]
