"""Execution guardrails.

UI code must never call broker adapters directly. Execution requests should pass
through guard functions and risk validation first.
"""

from __future__ import annotations

from dataclasses import dataclass

from shared.config.settings import ENABLE_LIVE_TRADING, ENABLE_PAPER_TRADING


@dataclass(slots=True)
class ExecutionRequest:
    """Normalized order intent before broker routing."""

    symbol: str
    side: str
    notional_usd: float
    live: bool = False


def validate_execution_request(request: ExecutionRequest) -> None:
    """Validate feature flags and request shape before broker routing."""
    if request.notional_usd <= 0:
        raise ValueError("Execution notional must be positive")
    if request.live and not ENABLE_LIVE_TRADING:
        raise PermissionError("Live trading is disabled by default")
    if not request.live and not ENABLE_PAPER_TRADING:
        raise PermissionError("Paper trading is disabled")
