# Perplexity Proxy Architecture

YucaTanaTrades is hosted publicly on GitHub Pages. No private Perplexity key may be placed in frontend code, local storage, committed files, or deployment artifacts.

## Request Path

```text
GitHub Pages frontend
  -> API_PROXY_BASE/perplexity/finance
  -> secure backend/proxy
  -> Perplexity API
```

## Frontend Endpoint

The browser sends:

```http
POST API_PROXY_BASE/perplexity/finance
Content-Type: application/json
```

Request body:

```json
{
  "query": "Why is NVDA moving today?",
  "mode": "why_is_this_moving",
  "ticker": "NVDA",
  "assetType": "stock",
  "selectedTab": "stocks",
  "watchlist": ["NVDA", "BTC"],
  "marketContext": {},
  "scannerContext": {}
}
```

Normalized response:

```json
{
  "answer": "Research summary...",
  "citations": [{ "title": "Source", "url": "https://example.com" }],
  "sources": [{ "title": "Source", "url": "https://example.com" }],
  "tickers": ["NVDA"],
  "timestamp": "2026-05-24T15:00:00.000Z",
  "categories": ["earnings", "semiconductors"],
  "dataQuality": "WEB-GROUNDED"
}
```

## Backend Responsibilities

The proxy should:

- Store the Perplexity API key server-side only.
- Add the Perplexity authorization header.
- Enforce rate limits and input length limits.
- Apply the YucaTanaTrades system prompt.
- Return the normalized response shape above.
- Return safe errors without leaking backend secrets.

## Failure Behavior

If `API_PROXY_BASE` is missing:

```text
Perplexity proxy not configured.
```

If the proxy fails:

```text
Perplexity research unavailable — retrying.
```

The frontend must keep the rest of the terminal usable.
