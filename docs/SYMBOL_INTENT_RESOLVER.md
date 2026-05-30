# Symbol Intent Resolver

The AI assistant resolves explicit user symbols before building YucaTanaTrades AI context.

Rules:
- Explicit user-requested symbols override selected dashboard context.
- `XLM Price` must resolve to XLM crypto context, never selected NVDA stock context.
- Crypto symbols never use Finnhub stock data.
- Stock symbols route through MooMoo first when enabled, then Finnhub fallback.
- Options requests route only through MooMoo options when enabled; otherwise they return unavailable.
- If no explicit symbol is found, selected dashboard context is used.

The resolver returns metadata for every routed answer:
- Requested Symbol
- Resolved Symbol
- Asset Type
- Primary Data Source
- Fallback Used
- Timestamp
- Data Quality
- Resolution Confidence

Ollama receives only the resolved YucaTanaTrades context block. Perplexity receives the same resolved symbol context plus web-research mode information through the secure proxy.
