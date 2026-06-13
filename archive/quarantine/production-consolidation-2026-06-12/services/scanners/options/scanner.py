"""Options scanner boundary.

Tradier-backed implementation belongs here. Until a provider is configured,
callers should display unavailable states rather than mock option flow.
"""

from __future__ import annotations

from shared.config.settings import ENABLE_OPTIONS_ENGINE


def scan_options_flow() -> list[dict]:
    """Return option-flow candidates when the options engine is enabled."""
    if not ENABLE_OPTIONS_ENGINE:
        return []
    return []
