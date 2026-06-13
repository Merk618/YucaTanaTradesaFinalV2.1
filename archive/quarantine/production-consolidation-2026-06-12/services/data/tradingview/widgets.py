"""TradingView official widget/embed utilities.

YucaTanaTrades uses TradingView's official embed script/widget only. This module
intentionally does not scrape TradingView data.
"""

from __future__ import annotations


def symbol_for_stock(symbol: str, exchange: str = "NASDAQ") -> str:
    """Return a TradingView symbol string for official widget configuration."""
    return f"{exchange}:{symbol.upper().replace('.', '-')}"


def symbol_for_crypto(symbol: str, quote: str = "USDT", exchange: str = "BINANCE") -> str:
    """Return a TradingView crypto pair for official widget configuration."""
    clean = symbol.upper().replace("-", "").replace("/", "")
    if clean.endswith(quote):
        pair = clean
    else:
        pair = f"{clean}{quote}"
    return f"{exchange}:{pair}"


def widget_config(symbol: str, container_id: str, *, interval: str = "D", theme: str = "dark") -> dict:
    """Return safe official TradingView widget config."""
    return {
        "autosize": True,
        "symbol": symbol,
        "interval": interval,
        "timezone": "Etc/UTC",
        "theme": theme,
        "style": "1",
        "locale": "en",
        "enable_publishing": False,
        "allow_symbol_change": True,
        "hide_side_toolbar": False,
        "withdateranges": True,
        "studies": ["STD;RSI", "STD;MACD"],
        "container_id": container_id,
    }
