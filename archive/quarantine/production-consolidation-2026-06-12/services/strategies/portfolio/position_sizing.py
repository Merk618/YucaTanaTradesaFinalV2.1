"""Portfolio strategy helpers."""

from __future__ import annotations


def cap_allocation(account_value: float, desired_usd: float, max_pct: float = 0.05) -> float:
    """Cap desired allocation to a portfolio percentage."""
    if account_value <= 0 or desired_usd <= 0:
        return 0.0
    return min(float(desired_usd), float(account_value) * float(max_pct))
