"""File, console, and CSV trade logging."""

from __future__ import annotations

import csv
import logging
import sys
from datetime import date, datetime, timezone

from shared.config.settings import BOT_LOG_PATH, TRADE_LOG_PATH

TRADE_COLUMNS = [
    "timestamp",
    "symbol",
    "action",
    "entry_price",
    "exit_price",
    "usd_amount",
    "pnl",
    "pnl_pct",
    "reason",
    "confidence",
]


def setup_logging():
    """Set up Python logging to bot.log and stderr."""
    BOT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.handlers.clear()
    formatter = logging.Formatter("[%(asctime)s] %(levelname)s — %(message)s")

    file_handler = logging.FileHandler(BOT_LOG_PATH)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.WARNING)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)


def _ensure_trade_log():
    """Create trade_log.csv with headers if needed."""
    TRADE_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not TRADE_LOG_PATH.exists():
        with TRADE_LOG_PATH.open("w", newline="") as file:
            csv.DictWriter(file, fieldnames=TRADE_COLUMNS).writeheader()


def log_trade(
    symbol: str,
    action: str,
    entry_price: float,
    exit_price: float,
    usd_amount: float,
    pnl: float,
    reason: str,
    confidence: float,
):
    """Append a normalized trade row to trade_log.csv."""
    _ensure_trade_log()
    pnl_pct = 0.0
    if entry_price and exit_price:
        pnl_pct = ((float(exit_price) - float(entry_price)) / float(entry_price)) * 100
    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbol": symbol,
        "action": action,
        "entry_price": float(entry_price or 0),
        "exit_price": float(exit_price or 0),
        "usd_amount": float(usd_amount or 0),
        "pnl": float(pnl or 0),
        "pnl_pct": pnl_pct,
        "reason": reason,
        "confidence": float(confidence or 0),
    }
    with TRADE_LOG_PATH.open("a", newline="") as file:
        csv.DictWriter(file, fieldnames=TRADE_COLUMNS).writerow(row)
    logging.getLogger(__name__).info("Trade logged: %s", row)


def get_trade_history() -> list:
    """Read and return all rows from trade_log.csv as dictionaries."""
    if not TRADE_LOG_PATH.exists():
        return []
    with TRADE_LOG_PATH.open(newline="") as file:
        return list(csv.DictReader(file))


def get_daily_pnl() -> float:
    """Sum today's realized PnL from trade_log.csv."""
    today = date.today().isoformat()
    total = 0.0
    for row in get_trade_history():
        if row.get("timestamp", "").startswith(today):
            total += float(row.get("pnl") or 0)
    return total
