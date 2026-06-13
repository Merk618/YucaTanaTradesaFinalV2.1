"""Rich live terminal dashboard for Crypto Hunter."""

from __future__ import annotations

from datetime import datetime, timezone

from rich import box
from rich.console import Console
from rich.layout import Layout
from rich.panel import Panel
from rich.table import Table

from shared.config.settings import DAILY_LOSS_LIMIT_USD

console = Console()


def _money(value: float) -> str:
    """Format a numeric value as USD."""
    return f"${float(value):,.2f}"


def _signal_style(signal: str) -> str:
    """Return Rich color style for a signal."""
    return {"BUY": "green", "SELL": "red", "HOLD": "yellow"}.get(signal, "white")


def build_dashboard(
    live_prices: dict,
    open_positions: dict,
    daily_pnl: float,
    trade_history: list,
    model_signals: dict,
    account_balance: float,
) -> Layout:
    """Build a Rich layout for live bot monitoring."""
    layout = Layout(name="root")
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="main", ratio=1),
        Layout(name="trades", size=10),
        Layout(name="status", size=3),
    )
    layout["main"].split_row(Layout(name="signals"), Layout(name="positions"))

    pnl_style = "green" if daily_pnl >= 0 else "red"
    header = (
        f"[bold gold1]CryptoBot — Coinbase + Binance[/] "
        f"| UTC {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} "
        f"| Balance {_money(account_balance)} "
        f"| Daily PnL [{pnl_style}]{_money(daily_pnl)}[/]"
    )
    layout["header"].update(Panel(header, box=box.SIMPLE_HEAVY))

    signals = Table(title="Live Signals", box=box.SIMPLE_HEAVY)
    for col in ["Symbol", "Price", "RSI", "EMA Cross", "MACD", "ML Signal", "Confidence"]:
        signals.add_column(col)
    for symbol, payload in model_signals.items():
        signal = payload.get("signal", "HOLD")
        indicators = payload.get("indicators", {})
        price = live_prices.get(symbol, 0)
        signals.add_row(
            symbol,
            _money(price) if price else "—",
            str(round(float(indicators.get("rsi", 0)), 2)) if indicators else "—",
            str(indicators.get("ema_cross", "—")),
            str(round(float(indicators.get("macd_hist", 0)), 6)) if indicators else "—",
            f"[{_signal_style(signal)}]{signal}[/]",
            f"{float(payload.get('confidence', 0)):.2%}",
        )
    layout["signals"].update(Panel(signals))

    positions = Table(title="Open Positions", box=box.SIMPLE_HEAVY)
    for col in ["Symbol", "Entry", "Current", "PnL%", "Stop Loss", "Take Profit", "Age"]:
        positions.add_column(col)
    for symbol, position in open_positions.items():
        current = float(live_prices.get(symbol, 0) or 0)
        entry = float(position.get("entry_price", 0) or 0)
        pnl_pct = ((current - entry) / entry * 100) if current and entry else 0.0
        style = "green" if pnl_pct >= 0 else "red"
        positions.add_row(
            symbol,
            _money(entry),
            _money(current) if current else "—",
            f"[{style}]{pnl_pct:.2f}%[/]",
            _money(position.get("stop_loss", 0)),
            _money(position.get("take_profit", 0)),
            position.get("opened_at", "—")[:19],
        )
    layout["positions"].update(Panel(positions))

    trades = Table(title="Recent Trades (Last 10)", box=box.SIMPLE_HEAVY)
    for col in ["Time", "Symbol", "Action", "Entry", "Exit", "PnL", "Reason"]:
        trades.add_column(col)
    for row in trade_history[-10:]:
        pnl = float(row.get("pnl") or 0)
        style = "green" if pnl >= 0 else "red"
        trades.add_row(
            row.get("timestamp", "")[:19],
            row.get("symbol", ""),
            row.get("action", ""),
            row.get("entry_price", ""),
            row.get("exit_price", ""),
            f"[{style}]{_money(pnl)}[/]",
            row.get("reason", ""),
        )
    layout["trades"].update(Panel(trades))

    kill = "ACTIVE" if daily_pnl <= -abs(DAILY_LOSS_LIMIT_USD) else "INACTIVE"
    kill_style = "red" if kill == "ACTIVE" else "green"
    last_trained = next(iter(model_signals.values()), {}).get("last_trained_at", "unknown")
    status = f"Kill Switch [{kill_style}]{kill}[/] | Model last trained {last_trained} | Next candle check scheduled"
    layout["status"].update(Panel(status, box=box.SIMPLE_HEAVY))
    return layout
