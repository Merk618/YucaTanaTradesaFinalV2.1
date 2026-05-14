"""Risk engine for Crypto Hunter."""

from __future__ import annotations

import json
from datetime import date

from shared.config.settings import DAILY_STATS_FILE, MAX_TRADE_SIZE_USD


def load_daily_stats() -> dict:
    """Load today's stats. Reset if date has changed."""
    today = date.today().isoformat()
    if not DAILY_STATS_FILE.exists():
        return {"date": today, "pnl": 0.0, "trade_count": 0}
    try:
        stats = json.loads(DAILY_STATS_FILE.read_text())
    except json.JSONDecodeError:
        stats = {}
    if stats.get("date") != today:
        return {"date": today, "pnl": 0.0, "trade_count": 0}
    stats.setdefault("pnl", 0.0)
    stats.setdefault("trade_count", 0)
    return stats


def save_daily_stats(stats: dict):
    """Persist daily risk statistics."""
    DAILY_STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    DAILY_STATS_FILE.write_text(json.dumps(stats, indent=2, sort_keys=True))


def calculate_position_size(
    account_balance: float,
    entry_price: float,
    stop_loss_price: float,
    risk_pct: float = 0.02,
) -> float:
    """Calculate capped USD position size from account balance and stop distance."""
    if account_balance <= 0 or entry_price <= 0 or stop_loss_price <= 0:
        return 0.0
    risk_amount = float(account_balance) * float(risk_pct)
    price_risk = abs((float(entry_price) - float(stop_loss_price)) / float(entry_price))
    if price_risk <= 0:
        return 0.0
    position_usd = risk_amount / price_risk
    return max(0.0, min(float(position_usd), float(MAX_TRADE_SIZE_USD), float(account_balance)))


def record_trade_pnl(pnl: float):
    """Add PnL to today's running total."""
    stats = load_daily_stats()
    stats["pnl"] = float(stats.get("pnl", 0.0)) + float(pnl)
    stats["trade_count"] = int(stats.get("trade_count", 0)) + 1
    save_daily_stats(stats)


def is_kill_switch_active(daily_loss_limit: float) -> bool:
    """Return True if today's realized loss exceeds the configured limit."""
    stats = load_daily_stats()
    return float(stats.get("pnl", 0.0)) <= -abs(float(daily_loss_limit))


def can_open_position(current_open_count: int, max_positions: int) -> bool:
    """Return True if current open positions are below configured max."""
    return int(current_open_count) < int(max_positions)
