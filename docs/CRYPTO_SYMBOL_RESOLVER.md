# Crypto Symbol Resolver

Crypto remains CoinGecko/Binance-first.

Registry sources:
- CoinGecko `/coins/list` for broad symbol/name/id resolution.
- Binance `/api/v3/exchangeInfo` for live tradable USDT pairs.

Cache windows:
- CoinGecko coin list: up to 24 hours.
- Binance exchange info: up to 6 hours.
- Price snapshots: around 60 seconds.

Resolution behavior:
- Normalize symbols to uppercase.
- Prefer currently loaded CoinGecko/Binance market rows when available.
- Prefer Binance-tradable USDT pairs when available.
- Otherwise use CoinGecko IDs.
- If ambiguous and unresolved, expose candidates instead of fabricating certainty.

Direct price queries such as `XLM price`, `BTC price`, `SUI price`, and `PEPE price` must return crypto metadata or:

```text
XLM price is unavailable from currently connected crypto data providers.
```

They must never fall through to selected stock context.
