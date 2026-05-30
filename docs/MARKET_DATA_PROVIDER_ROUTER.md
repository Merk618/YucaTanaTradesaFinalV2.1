# Market Data Provider Router

Provider priority:

Stocks:
1. MooMoo OpenD local bridge when enabled and configured as primary.
2. Finnhub fallback.
3. Unavailable if neither source returns a safe quote.

Options:
1. MooMoo OpenD local bridge when options data is enabled.
2. Unavailable if MooMoo options are disabled or the bridge is offline.

Crypto:
1. CoinGecko for broad symbol registry, market metadata, and snapshots.
2. Binance for tradable USDT pairs and live stream updates.
3. MooMoo crypto is future optional only, not the default crypto source.

No fake market data is generated. Missing price, options chain, RSI, MACD, catalyst, valuation, or target data must remain unavailable until an accurate provider supplies it.

Source health should expose provider state clearly:
- `RUNNING` / `CONNECTED`
- `DISABLED`
- `UNKNOWN`
- `UNAVAILABLE`
- `FAILED`
- `RATE LIMITED`
- `FALLBACK_ACTIVE`
