"""Binance REST and WebSocket live data adapter."""

from __future__ import annotations

import logging
import os
import time
from typing import Callable

import pandas as pd
from binance import ThreadedWebsocketManager
from binance.client import Client
from dotenv import load_dotenv

from shared.config.settings import API_RETRY_ATTEMPTS, API_RETRY_DELAY_SECONDS, BINANCE_REQUEST_SLEEP_SECONDS, ENV_PATH

load_dotenv(ENV_PATH)
log = logging.getLogger(__name__)

client = Client(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_SECRET_KEY"),
)


def _retry_api_call(fn, *args, **kwargs):
    """Call an API function with fixed retry/backoff and logging."""
    last_error = None
    for attempt in range(1, API_RETRY_ATTEMPTS + 1):
        try:
            time.sleep(BINANCE_REQUEST_SLEEP_SECONDS)
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            log.exception("Binance API call failed on attempt %s/%s", attempt, API_RETRY_ATTEMPTS)
            if attempt < API_RETRY_ATTEMPTS:
                time.sleep(API_RETRY_DELAY_SECONDS)
    raise RuntimeError(f"Binance API call failed after retries: {last_error}") from last_error


def _klines_to_frame(klines: list) -> pd.DataFrame:
    """Convert Binance kline rows to a clean OHLCV DataFrame."""
    if not klines:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume", "timestamp"])
    df = pd.DataFrame(
        klines,
        columns=[
            "timestamp",
            "open",
            "high",
            "low",
            "close",
            "volume",
            "close_time",
            "quote_asset_volume",
            "number_of_trades",
            "taker_buy_base_volume",
            "taker_buy_quote_volume",
            "ignore",
        ],
    )
    df = df[["timestamp", "open", "high", "low", "close", "volume"]].copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna().set_index("timestamp").sort_index()
    return df


def get_ohlcv(symbol: str, interval: str = "5m", lookback: int = 500) -> pd.DataFrame:
    """Fetch OHLCV candles from Binance REST API."""
    klines = _retry_api_call(client.get_klines, symbol=symbol, interval=interval, limit=lookback)
    df = _klines_to_frame(klines)
    if df.empty:
        raise ValueError(f"No OHLCV data returned for {symbol}")
    return df


def get_orderbook(symbol: str, depth: int = 20) -> dict:
    """Fetch order book bid/ask depth for CVD calculation."""
    raw = _retry_api_call(client.get_order_book, symbol=symbol, limit=depth)
    return {
        "bids": [[float(price), float(size)] for price, size in raw.get("bids", [])],
        "asks": [[float(price), float(size)] for price, size in raw.get("asks", [])],
    }


def get_live_price(symbol: str) -> float:
    """Get latest ticker price."""
    ticker = _retry_api_call(client.get_symbol_ticker, symbol=symbol)
    price = float(ticker["price"])
    if price <= 0:
        raise ValueError(f"Invalid Binance price for {symbol}: {price}")
    return price


def start_websocket_stream(symbol: str, callback_fn: Callable[[pd.DataFrame], None]):
    """Open a Binance WebSocket stream for closed 5m candles with reconnect handling."""
    def handle_message(msg):
        try:
            if msg.get("e") != "kline":
                return
            kline = msg.get("k", {})
            if not kline.get("x"):
                return
            df = pd.DataFrame(
                [{
                    "timestamp": pd.to_datetime(kline["t"], unit="ms", utc=True),
                    "open": float(kline["o"]),
                    "high": float(kline["h"]),
                    "low": float(kline["l"]),
                    "close": float(kline["c"]),
                    "volume": float(kline["v"]),
                }]
            ).set_index("timestamp")
            callback_fn(df)
        except Exception:
            log.exception("Failed handling Binance websocket message for %s", symbol)

    backoff = 1
    while True:
        try:
            twm = ThreadedWebsocketManager(
                api_key=os.getenv("BINANCE_API_KEY"),
                api_secret=os.getenv("BINANCE_SECRET_KEY"),
            )
            twm.start()
            twm.start_kline_socket(callback=handle_message, symbol=symbol, interval=Client.KLINE_INTERVAL_5MINUTE)
            log.info("Started Binance websocket for %s", symbol)
            return twm
        except Exception:
            log.exception("Binance websocket disconnected for %s; reconnecting", symbol)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
