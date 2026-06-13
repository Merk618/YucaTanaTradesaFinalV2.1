"""Small HTTP helpers for provider clients."""

from __future__ import annotations

from typing import Any

import requests


class ProviderError(RuntimeError):
    """Raised when an upstream provider cannot return usable data."""


def get_json(url: str, *, params: dict[str, Any] | None = None, headers: dict[str, str] | None = None, timeout: int = 12) -> Any:
    """Fetch JSON and raise a provider-scoped error on failure."""
    try:
        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except Exception as exc:  # noqa: BLE001
        raise ProviderError(f"Provider request failed for {url}") from exc
