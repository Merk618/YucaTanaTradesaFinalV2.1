"""Open-position lifecycle tracking for Crypto Hunter."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from shared.config.settings import POSITIONS_FILE


def load_positions() -> dict:
    """Load open positions from JSON file. Return empty dict if file missing."""
    if not POSITIONS_FILE.exists():
        return {}
    try:
        return json.loads(POSITIONS_FILE.read_text())
    except json.JSONDecodeError:
        return {}


def save_positions(positions: dict):
    """Save open positions dict to JSON file."""
    POSITIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    POSITIONS_FILE.write_text(json.dumps(positions, indent=2, sort_keys=True))


def open_position(
    symbol: str,
    product_id: str,
    entry_price: float,
    usd_amount: float,
    stop_loss_pct: float,
    take_profit_pct: float,
):
    """Record a new open position with stop-loss and take-profit levels."""
    if entry_price <= 0 or usd_amount <= 0:
        raise ValueError("entry_price and usd_amount must be positive")
    positions = load_positions()
    positions[symbol] = {
        "symbol": symbol,
        "product_id": product_id,
        "entry_price": float(entry_price),
        "usd_amount": float(usd_amount),
        "crypto_amount": float(usd_amount) / float(entry_price),
        "stop_loss": float(entry_price) * (1 - float(stop_loss_pct)),
        "take_profit": float(entry_price) * (1 + float(take_profit_pct)),
        "opened_at": datetime.now(timezone.utc).isoformat(),
    }
    save_positions(positions)


def close_position(symbol: str, exit_price: float, reason: str) -> dict:
    """Close an open position, calculate PnL, persist removal, and return summary."""
    positions = load_positions()
    position = positions.pop(symbol, None)
    if not position:
        raise KeyError(f"No open position for {symbol}")
    entry_price = float(position["entry_price"])
    usd_amount = float(position["usd_amount"])
    pnl = ((float(exit_price) - entry_price) / entry_price) * usd_amount
    save_positions(positions)
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "symbol": symbol,
        "product_id": position["product_id"],
        "entry_price": entry_price,
        "exit_price": float(exit_price),
        "usd_amount": usd_amount,
        "crypto_amount": float(position["crypto_amount"]),
        "pnl": pnl,
        "reason": reason,
        "opened_at": position["opened_at"],
    }


def check_exit_conditions(live_prices: dict) -> list:
    """Return (symbol, reason) tuples for positions that hit stop-loss or take-profit."""
    exits = []
    positions = load_positions()
    for symbol, position in positions.items():
        price = live_prices.get(symbol)
        if price is None:
            continue
        if float(price) <= float(position["stop_loss"]):
            exits.append((symbol, "STOP_LOSS"))
        elif float(price) >= float(position["take_profit"]):
            exits.append((symbol, "TAKE_PROFIT"))
    return exits
