"""Coinbase Advanced Trade execution adapter."""

from __future__ import annotations

import logging
import os
import time
import uuid

from coinbase.rest import RESTClient
from dotenv import load_dotenv

from shared.config.settings import API_RETRY_ATTEMPTS, API_RETRY_DELAY_SECONDS, ENABLE_LIVE_TRADING, ENABLE_PAPER_TRADING, ENV_PATH, SLIPPAGE_BUFFER_PCT

load_dotenv(ENV_PATH)
log = logging.getLogger(__name__)

DRY_RUN = ENABLE_PAPER_TRADING or os.getenv("DRY_RUN", "true").strip().lower() != "false"

client = RESTClient(
    api_key=os.getenv("COINBASE_API_KEY"),
    api_secret=os.getenv("COINBASE_API_SECRET"),
)


def _as_dict(value):
    """Convert Coinbase SDK objects to dictionaries where possible."""
    if isinstance(value, dict):
        return value
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if hasattr(value, "__dict__"):
        return value.__dict__
    return {"raw": value}


def _retry_coinbase(fn, *args, **kwargs):
    """Call Coinbase with retries and error logging."""
    last_error = None
    for attempt in range(1, API_RETRY_ATTEMPTS + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            log.exception("Coinbase API call failed on attempt %s/%s", attempt, API_RETRY_ATTEMPTS)
            if attempt < API_RETRY_ATTEMPTS:
                time.sleep(API_RETRY_DELAY_SECONDS)
    raise RuntimeError(f"Coinbase API call failed after retries: {last_error}") from last_error


def _dry_run_response(action: str, **payload) -> dict:
    """Return a Coinbase-like response when DRY_RUN is enabled."""
    response = {
        "dry_run": True,
        "success": True,
        "order_id": f"dry-{uuid.uuid4()}",
        "action": action,
        **payload,
    }
    log.warning("DRY_RUN Coinbase order suppressed: %s", response)
    return response


def _assert_execution_allowed():
    """Block live broker routing unless explicitly enabled."""
    if DRY_RUN:
        return
    if not ENABLE_LIVE_TRADING:
        raise PermissionError("Live trading is disabled by default")


def _accounts_payload() -> list:
    """Fetch account payload as a list of account dictionaries."""
    response = _as_dict(_retry_coinbase(client.get_accounts))
    accounts = response.get("accounts", response.get("data", response if isinstance(response, list) else []))
    return [_as_dict(account) for account in accounts]


def get_account_balance(currency: str = "USD") -> float:
    """Get available balance for a Coinbase account currency."""
    accounts = _accounts_payload()
    for account in accounts:
        cur = account.get("currency") or account.get("currency_code")
        if cur != currency:
            continue
        available = account.get("available_balance", account.get("balance", {}))
        if isinstance(available, dict):
            return float(available.get("value", 0) or 0)
        return float(available or 0)
    return 0.0


def get_crypto_balance(symbol: str) -> float:
    """Get current Coinbase holdings for a crypto symbol."""
    return get_account_balance(symbol)


def place_market_buy(product_id: str, usd_amount: float) -> dict:
    """Place a market buy order on Coinbase, or suppress it in DRY_RUN mode."""
    client_order_id = str(uuid.uuid4())
    if DRY_RUN:
        return _dry_run_response("MARKET_BUY", product_id=product_id, quote_size=str(usd_amount))
    _assert_execution_allowed()
    response = _retry_coinbase(
        client.market_order_buy,
        client_order_id=client_order_id,
        product_id=product_id,
        quote_size=str(round(float(usd_amount), 2)),
    )
    result = _as_dict(response)
    log.warning("Coinbase market buy placed: %s", result)
    return result


def place_market_sell(product_id: str, base_amount: float) -> dict:
    """Place a market sell order on Coinbase, or suppress it in DRY_RUN mode."""
    client_order_id = str(uuid.uuid4())
    if DRY_RUN:
        return _dry_run_response("MARKET_SELL", product_id=product_id, base_size=str(round(base_amount, 8)))
    _assert_execution_allowed()
    response = _retry_coinbase(
        client.market_order_sell,
        client_order_id=client_order_id,
        product_id=product_id,
        base_size=str(round(float(base_amount), 8)),
    )
    result = _as_dict(response)
    log.warning("Coinbase market sell placed: %s", result)
    return result


def place_limit_sell(product_id: str, base_amount: float, limit_price: float) -> dict:
    """Place a GTC limit sell order with a 0.1% slippage buffer applied."""
    client_order_id = str(uuid.uuid4())
    safe_price = float(limit_price) * (1 - SLIPPAGE_BUFFER_PCT)
    if DRY_RUN:
        return _dry_run_response(
            "LIMIT_SELL",
            product_id=product_id,
            base_size=str(round(base_amount, 8)),
            limit_price=str(round(safe_price, 2)),
        )
    _assert_execution_allowed()
    response = _retry_coinbase(
        client.limit_order_gtc_sell,
        client_order_id=client_order_id,
        product_id=product_id,
        base_size=str(round(float(base_amount), 8)),
        limit_price=str(round(safe_price, 2)),
    )
    return _as_dict(response)


def get_open_orders(product_id: str | None = None) -> list:
    """Return all open Coinbase orders, optionally filtered by product_id."""
    response = _as_dict(_retry_coinbase(client.list_orders, order_status=["OPEN"]))
    orders = [_as_dict(order) for order in response.get("orders", response.get("data", []))]
    if product_id:
        orders = [order for order in orders if order.get("product_id") == product_id]
    return orders


def cancel_order(order_id: str) -> bool:
    """Cancel a Coinbase order by ID."""
    if DRY_RUN:
        log.warning("DRY_RUN Coinbase cancel suppressed for %s", order_id)
        return True
    _assert_execution_allowed()
    response = _as_dict(_retry_coinbase(client.cancel_orders, order_ids=[order_id]))
    return bool(response.get("success", True))
