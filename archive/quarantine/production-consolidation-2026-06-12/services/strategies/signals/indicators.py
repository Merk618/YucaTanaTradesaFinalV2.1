"""Technical indicator calculations for Crypto Hunter."""

from __future__ import annotations

import pandas as pd
from ta.momentum import RSIIndicator
from ta.trend import EMAIndicator, MACD
from ta.volatility import AverageTrueRange

from shared.config.settings import ATR_PERIOD, EMA_FAST, EMA_SLOW, MACD_FAST, MACD_SIGNAL, MACD_SLOW, RSI_PERIOD


def _validate_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    """Validate that an OHLCV DataFrame has enough clean rows to compute indicators."""
    required = {"open", "high", "low", "close", "volume"}
    if df is None or df.empty:
        raise ValueError("OHLCV DataFrame is empty")
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"OHLCV DataFrame missing columns: {sorted(missing)}")
    clean = df.copy()
    for col in required:
        clean[col] = pd.to_numeric(clean[col], errors="coerce")
    clean = clean.dropna(subset=list(required))
    if len(clean) < max(RSI_PERIOD, EMA_SLOW, MACD_SLOW, ATR_PERIOD) + 5:
        raise ValueError("Not enough OHLCV rows to compute indicators")
    return clean


def add_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Add RSI, EMA, MACD, ATR, CVD proxy, VWAP distance, candle body, and previous close."""
    out = _validate_ohlcv(df)
    out["rsi"] = RSIIndicator(close=out["close"], window=RSI_PERIOD).rsi()
    out["ema_fast"] = EMAIndicator(close=out["close"], window=EMA_FAST).ema_indicator()
    out["ema_slow"] = EMAIndicator(close=out["close"], window=EMA_SLOW).ema_indicator()
    out["ema_cross"] = 0
    out.loc[out["ema_fast"] > out["ema_slow"], "ema_cross"] = 1
    out.loc[out["ema_fast"] < out["ema_slow"], "ema_cross"] = -1

    macd = MACD(
        close=out["close"],
        window_fast=MACD_FAST,
        window_slow=MACD_SLOW,
        window_sign=MACD_SIGNAL,
    )
    out["macd"] = macd.macd()
    out["macd_signal"] = macd.macd_signal()
    out["macd_hist"] = macd.macd_diff()
    out["atr"] = AverageTrueRange(
        high=out["high"],
        low=out["low"],
        close=out["close"],
        window=ATR_PERIOD,
    ).average_true_range()
    out["vol_delta"] = out["volume"].diff()
    signed_volume = out["volume"].where(out["close"] >= out["open"], -out["volume"])
    out["cvd"] = signed_volume.cumsum()

    typical_price = (out["high"] + out["low"] + out["close"]) / 3
    cumulative_volume = out["volume"].cumsum()
    vwap = (typical_price * out["volume"]).cumsum() / cumulative_volume.replace(0, pd.NA)
    out["price_vs_vwap"] = (out["close"] / vwap) - 1
    out["body_size"] = (out["close"] - out["open"]).abs() / out["open"].replace(0, pd.NA)
    out["prev_close"] = out["close"].shift(1)
    out = out.dropna()
    return out


def generate_signal(df: pd.DataFrame) -> str:
    """Return BUY, SELL, or HOLD from a 2-of-3 RSI/EMA/MACD confirmation layer."""
    if df is None or df.empty:
        return "HOLD"
    latest = df.iloc[-1]
    buy_conditions = [
        latest["rsi"] < 45,
        latest["ema_fast"] > latest["ema_slow"],
        latest["macd_hist"] > 0,
    ]
    sell_conditions = [
        latest["rsi"] > 55,
        latest["ema_fast"] < latest["ema_slow"],
        latest["macd_hist"] < 0,
    ]
    if sum(buy_conditions) >= 2:
        return "BUY"
    if sum(sell_conditions) >= 2:
        return "SELL"
    return "HOLD"
