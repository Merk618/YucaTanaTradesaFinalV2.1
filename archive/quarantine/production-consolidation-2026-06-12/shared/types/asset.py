"""Normalized market asset contracts used by scanners, strategy, and UI adapters."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Literal


class DataQuality(StrEnum):
    """Visible data provenance label for every asset row."""

    LIVE = "LIVE"
    DELAYED = "DELAYED"
    FALLBACK = "FALLBACK"
    UNAVAILABLE = "UNAVAILABLE"


AssetType = Literal["stock", "crypto", "option", "macro"]


@dataclass(slots=True)
class AssetRow:
    """Canonical YucaTanaTrades asset row.

    Numeric values are optional because production views must show unavailable
    states instead of fabricating values when a provider fails.
    """

    symbol: str
    name: str
    type: AssetType
    group: str | None = None
    sector: str | None = None
    price: float | None = None
    changePercent: float | None = None
    volume: float | None = None
    marketCap: float | None = None
    source: str | None = None
    lastUpdated: str | None = None
    trend: str | None = None
    momentum: float | None = None
    strength: float | None = None
    rsi: float | None = None
    rsiState: str | None = None
    macdState: str | None = None
    vwap: float | None = None
    support: float | None = None
    resistance: float | None = None
    relativeStrength: float | None = None
    volatility: float | None = None
    setup: str | None = None
    catalysts: list[str] = field(default_factory=list)
    series: list[float] = field(default_factory=list)
    dataQuality: DataQuality = DataQuality.UNAVAILABLE
    beta: float | None = None
    earningsWindow: str | None = None
    analystTrend: str | None = None
    optionsFlow: str | None = None
    institutionalTone: str | None = None
    fiftyTwoWeekHigh: float | None = None
    fiftyTwoWeekLow: float | None = None
    chain: str | None = None
    fundingRate: float | None = None
    whaleFlag: str | None = None
    unlockAlert: str | None = None
    liquidityRank: int | None = None
    narrative: str | None = None
    marketCapRank: int | None = None

    @classmethod
    def unavailable(cls, symbol: str, asset_type: AssetType, source: str) -> "AssetRow":
        """Build an explicit unavailable row without mock market values."""
        return cls(
            symbol=symbol.upper(),
            name=symbol.upper(),
            type=asset_type,
            source=source,
            lastUpdated=datetime.now(timezone.utc).isoformat(),
            dataQuality=DataQuality.UNAVAILABLE,
        )

    def with_quality(self, quality: DataQuality, source: str) -> "AssetRow":
        """Stamp source and quality after a provider adapter maps fields."""
        self.dataQuality = quality
        self.source = source
        self.lastUpdated = datetime.now(timezone.utc).isoformat()
        return self
