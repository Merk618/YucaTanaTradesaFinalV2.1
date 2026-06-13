"""Strategy-layer support/resistance and setup helpers."""

from __future__ import annotations

import pandas as pd


def support_resistance(df: pd.DataFrame, lookback: int = 60) -> tuple[float | None, float | None]:
    """Calculate support and resistance from OHLCV history."""
    if df is None or df.empty or "low" not in df.columns or "high" not in df.columns:
        return None, None
    window = df.tail(lookback)
    return float(window["low"].min()), float(window["high"].max())


def rsi_state(rsi: float | None) -> str | None:
    """Classify RSI state."""
    if rsi is None:
        return None
    if rsi >= 70:
        return "overbought"
    if rsi <= 34:
        return "oversold"
    return "balanced"


def macd_state(macd_hist: float | None) -> str | None:
    """Classify MACD state from histogram."""
    if macd_hist is None:
        return None
    if macd_hist > 0:
        return "bullish crossover"
    if macd_hist < 0:
        return "bearish crossover"
    return "flat"


def setup_from_indicators(rsi: float | None, macd_hist: float | None, price_vs_vwap: float | None) -> str | None:
    """Calculate a setup label from real strategy fields."""
    if rsi is None or macd_hist is None or price_vs_vwap is None:
        return None
    if rsi < 45 and macd_hist > 0 and price_vs_vwap > 0:
        return "Breakout"
    if rsi < 35 and macd_hist > 0:
        return "Pullback"
    if rsi > 65 and macd_hist < 0:
        return "Exhaustion"
    return "Continuation"
