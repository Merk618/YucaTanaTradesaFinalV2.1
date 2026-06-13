# Data Accuracy

YucaTanaTrades production data must come from connected providers or deterministic calculations over provider data.

## Active Sources

- Crypto prices and registry: CoinGecko and Binance public data.
- Stock quotes: MooMoo local bridge when available, otherwise Finnhub fallback.
- Options chains: MooMoo local bridge only when available.
- AI research: Perplexity through the secure proxy.
- Local reasoning: Ollama over supplied YucaTanaTrades context only.
- External signals: manual overlays that require YucaTana confirmation.

## Forbidden Production Behavior

- Do not use imported prototype prices as live values.
- Do not fabricate RSI, MACD, VWAP, support/resistance, targets, stops, catalysts, analyst ratings, filings, or earnings.
- Do not silently substitute selected dashboard context when a user asks for an explicit symbol.
- Do not route crypto symbols to stock providers.
- Do not call broker/exchange execution from the frontend.

## Missing Data Behavior

If data is missing, display:

```text
Unavailable
```

or a source-specific unavailable/rate-limited/degraded state.

## Prototype Material

Legacy HTML, Replit/CodePen exports, and design-reference projects are UI references only. They are never a source of truth for prices, rankings, technicals, catalysts, or recommendations.
