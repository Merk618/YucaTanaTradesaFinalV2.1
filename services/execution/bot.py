"""Crypto Hunter entry point."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from rich.live import Live

from shared.config.settings import (
    BOT_LOOP_SECONDS,
    CANDLE_INTERVAL,
    DAILY_LOSS_LIMIT_USD,
    MAX_OPEN_POSITIONS,
    MAX_PORTFOLIO_RISK_PCT,
    RETRAIN_EVERY_N_HOURS,
    STOP_LOSS_PCT,
    TAKE_PROFIT_PCT,
    TRADE_END_HOUR,
    TRADE_START_HOUR,
    TRADING_PAIRS,
)
from apps.web.components.layout.terminal_ui import build_dashboard
from services.data.binance.feed import get_live_price, get_ohlcv
from services.data.binance.historical import fetch_historical_ohlcv
from services.execution.brokers.coinbase_client import get_account_balance, get_crypto_balance, place_market_buy, place_market_sell
from services.execution.routing.order_manager import check_exit_conditions, close_position, load_positions, open_position
from shared.utils.logger import get_daily_pnl, get_trade_history, log_trade, setup_logging
from services.strategies.risk.risk_engine import calculate_position_size, can_open_position, is_kill_switch_active, record_trade_pnl
from services.strategies.signals.indicators import add_all_indicators, generate_signal
from services.strategies.signals.model import load_model, predict_signal, train_model

setup_logging()
log = logging.getLogger(__name__)

LIVE_STATE = {
    "live_prices": {},
    "open_positions": {},
    "daily_pnl": 0.0,
    "trade_history": [],
    "model_signals": {},
    "account_balance": 0.0,
}


def is_trading_hours() -> bool:
    """Return True if current UTC hour is inside configured trading hours."""
    hour = datetime.now(timezone.utc).hour
    return TRADE_START_HOUR <= hour < TRADE_END_HOUR


def _train_from_first_pair():
    """Train a model from the first configured Binance pair."""
    first_symbol = next(iter(TRADING_PAIRS.values()))["binance"]
    df = fetch_historical_ohlcv(first_symbol, CANDLE_INTERVAL)
    return train_model(df)


def run_trading_cycle(model):
    """Execute one scheduled trading cycle with exits, entries, logging, and dashboard state."""
    if is_kill_switch_active(DAILY_LOSS_LIMIT_USD):
        log.warning("Kill switch active; skipping trading cycle")
        return
    if not is_trading_hours():
        log.info("Outside configured trading hours; skipping")
        return

    positions = load_positions()
    live_prices = {}
    for symbol, pair in TRADING_PAIRS.items():
        try:
            live_prices[symbol] = get_live_price(pair["binance"])
        except Exception:
            log.exception("Could not fetch live price for %s", symbol)

    for symbol, reason in check_exit_conditions(live_prices):
        try:
            position = positions.get(symbol, {})
            base_amount = float(position.get("crypto_amount") or get_crypto_balance(symbol))
            place_market_sell(position["product_id"], base_amount)
            summary = close_position(symbol, live_prices[symbol], reason)
            record_trade_pnl(summary["pnl"])
            log_trade(symbol, "SELL", summary["entry_price"], summary["exit_price"], summary["usd_amount"], summary["pnl"], reason, 1.0)
        except Exception:
            log.exception("Failed closing position for %s", symbol)

    positions = load_positions()
    account_balance = get_account_balance("USD")
    model_signals = {}
    for symbol, pair in TRADING_PAIRS.items():
        try:
            if symbol in positions:
                continue
            if not can_open_position(len(positions), MAX_OPEN_POSITIONS):
                break
            df = get_ohlcv(pair["binance"], CANDLE_INTERVAL)
            enriched = add_all_indicators(df)
            ml_signal, confidence = predict_signal(model, df)
            rule_signal = generate_signal(enriched)
            latest = enriched.iloc[-1]
            model_signals[symbol] = {
                "signal": ml_signal,
                "confidence": confidence,
                "rule_signal": rule_signal,
                "last_trained_at": getattr(model, "last_trained_at", "unknown"),
                "indicators": {
                    "rsi": float(latest["rsi"]),
                    "ema_cross": int(latest["ema_cross"]),
                    "macd_hist": float(latest["macd_hist"]),
                },
            }
            if ml_signal != "BUY" or rule_signal != "BUY":
                continue
            entry = live_prices.get(symbol) or float(latest["close"])
            stop_loss_price = entry * (1 - STOP_LOSS_PCT)
            usd_amount = calculate_position_size(account_balance, entry, stop_loss_price, MAX_PORTFOLIO_RISK_PCT)
            if usd_amount <= 0:
                continue
            place_market_buy(pair["coinbase"], usd_amount)
            open_position(symbol, pair["coinbase"], entry, usd_amount, STOP_LOSS_PCT, TAKE_PROFIT_PCT)
            log_trade(symbol, "BUY", entry, 0.0, usd_amount, 0.0, "ENTRY", confidence)
            positions = load_positions()
        except Exception:
            log.exception("Trading cycle failed for %s", symbol)

    LIVE_STATE.update(
        {
            "live_prices": live_prices,
            "open_positions": load_positions(),
            "daily_pnl": get_daily_pnl(),
            "trade_history": get_trade_history(),
            "model_signals": model_signals,
            "account_balance": account_balance,
        }
    )


def main():
    """Start the Crypto Hunter scheduled bot and Rich live dashboard."""
    print(
        r"""
   ______                 __        __  __            __
  / ____/______  ______  / /_____   / / / /_  ______  / /____  _____
 / /   / ___/ / / / __ \/ __/ __ \ / /_/ / / / / __ \/ __/ _ \/ ___/
/ /___/ /  / /_/ / /_/ / /_/ /_/ // __  / /_/ / / / / /_/  __/ /
\____/_/   \__, / .___/\__/\____//_/ /_/\__,_/_/ /_/\__/\___/_/
          /____/_/
"""
    )
    print(f"Pairs: {', '.join(TRADING_PAIRS.keys())} | Loop: {BOT_LOOP_SECONDS}s | Dry-run defaults ON via .env")
    try:
        try:
            model = load_model()
        except FileNotFoundError:
            model = _train_from_first_pair()

        balance = get_account_balance("USD")
        btc_price = get_live_price("BTCUSDT")
        print(f"Coinbase USD balance: {balance:.2f}")
        print(f"Binance BTCUSDT: {btc_price:.2f}")

        scheduler = BackgroundScheduler(timezone=timezone.utc)
        scheduler.add_job(lambda: run_trading_cycle(model), "interval", seconds=BOT_LOOP_SECONDS, max_instances=1)
        scheduler.add_job(_train_from_first_pair, "interval", hours=RETRAIN_EVERY_N_HOURS, max_instances=1)
        scheduler.start()
        run_trading_cycle(model)

        with Live(build_dashboard(**LIVE_STATE), refresh_per_second=1, screen=True) as live:
            while True:
                live.update(build_dashboard(**LIVE_STATE))
                time.sleep(1)
    except KeyboardInterrupt:
        log.warning("Crypto Hunter shutdown requested")
        print("Crypto Hunter shutdown complete.")
    except Exception:
        log.exception("Fatal bot error")
        raise


if __name__ == "__main__":
    main()
