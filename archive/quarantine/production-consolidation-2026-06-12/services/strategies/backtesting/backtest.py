"""Vectorbt backtesting module for Crypto Hunter."""

from __future__ import annotations

import numpy as np
import vectorbt as vbt

from shared.config.settings import COINBASE_TAKER_FEE_PCT
from services.data.binance.historical import fetch_historical_ohlcv
from services.strategies.signals.indicators import add_all_indicators


def run_backtest(
    symbol: str = "BTCUSDT",
    start_date: str = "2024-01-01",
    end_date: str = "2026-01-01",
    initial_capital: float = 10000.0,
):
    """Run a vectorbt backtest using the bot's rule-based confirmation layer."""
    df = fetch_historical_ohlcv(symbol, "5m", start_date, end_date)
    df = add_all_indicators(df)
    if df.empty:
        raise ValueError(f"No indicator data available for {symbol}")

    entries = (df["rsi"] < 45) & (df["ema_fast"] > df["ema_slow"]) & (df["macd_hist"] > 0)
    exits = (df["rsi"] > 55) & (df["ema_fast"] < df["ema_slow"]) & (df["macd_hist"] < 0)
    portfolio = vbt.Portfolio.from_signals(
        close=df["close"],
        entries=entries,
        exits=exits,
        init_cash=initial_capital,
        fees=COINBASE_TAKER_FEE_PCT,
        sl_stop=0.025,
        tp_stop=0.05,
        freq="5min",
    )
    stats = portfolio.stats()
    print(stats[["Total Return [%]", "Sharpe Ratio", "Max Drawdown [%]", "Win Rate [%]", "Total Trades"]])
    figure = portfolio.value().vbt.plot()
    figure.write_image(f"backtest/{symbol}_equity_curve.png")
    return stats


if __name__ == "__main__":
    run_backtest("BTCUSDT")
    run_backtest("ETHUSDT")
    run_backtest("SOLUSDT")
