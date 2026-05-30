# MooMoo OpenD Provider Architecture

MooMoo OpenD / Futu OpenAPI is prepared as the future primary read-only stock and options data provider for YucaTanaTrades.

Current phase:
- Read-only market data architecture only.
- No order placement.
- No account actions.
- No frontend broker credentials.
- Live trading remains disabled.

Planned flow:

```text
YucaTanaTrades frontend
-> local MooMoo bridge / local backend
-> MooMoo OpenD
-> MooMoo/Futu market data servers
```

Default local bridge:

```text
http://127.0.0.1:8765
```

Expected bridge endpoints:
- `GET /health`
- `GET /quotes/:symbol`
- `GET /candles/:symbol?timeframe=1d&limit=100`
- `GET /snapshot/:symbol`
- `GET /options/:symbol`
- `GET /search/:symbol`

Trading endpoints are intentionally unsupported in this phase. Finnhub remains the stock quote fallback whenever MooMoo is disabled, unavailable, or returns no usable quote.
