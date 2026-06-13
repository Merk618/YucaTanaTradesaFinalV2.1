"""Historical OHLCV fetcher for Binance training and backtests."""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta, timezone

import pandas as pd
from binance.client import Client
from dotenv import load_dotenv

from shared.config.settings import CACHE_DIR, ENV_PATH
from services.data.binance.feed import _klines_to_frame

load_dotenv(ENV_PATH)
log = logging.getLogger(__name__)
client = Client(os.getenv("BINANCE_API_KEY"), os.getenv("BINANCE_SECRET_KEY"))


def fetch_historical_ohlcv(
    symbol: str,
    interval: str = "5m",
    start_date: str = "2024-01-01",
    end_date: str | None = None,
) -> pd.DataFrame:
    """Fetch and cache multi-month Binance OHLCV history."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{symbol}_{interval}.csv"
    if cache_file.exists():
        modified = datetime.fromtimestamp(cache_file.stat().st_mtime, tz=timezone.utc)
        if datetime.now(timezone.utc) - modified < timedelta(hours=24):
            df = pd.read_csv(cache_file, parse_dates=["timestamp"])
            return df.set_index("timestamp")

    end = end_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        klines = client.get_historical_klines(symbol, interval, start_date, end)
        time.sleep(0.2)
    except Exception:
        log.exception("Failed fetching historical OHLCV for %s", symbol)
        raise
    df = _klines_to_frame(klines)
    if df.empty:
        raise ValueError(f"No historical data returned for {symbol}")
    df.reset_index().to_csv(cache_file, index=False)
    return df
