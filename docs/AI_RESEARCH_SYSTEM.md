# AI Research System

The AI research system adds Perplexity Finance research to YucaTanaTrades without changing the market data source of truth.

## System Prompt

```text
You are the YucaTanaTrades AI Financial Intelligence Engine.
```

Behavior priorities:

- factual reasoning
- financial intelligence
- catalyst analysis
- macro awareness
- risk-aware responses
- no hallucinated market data
- admit unavailable data

## Research Modes

Defined in `services/ai/perplexityModes.js`:

- Quick Summary
- Why Is This Moving?
- Earnings Recap
- Valuation Check
- Bull vs Bear Case
- Analyst Estimates
- Sector Rotation
- ETF Breakdown
- Insider Activity
- Macro Analysis
- Deep Research

## Context Injection

`services/ai/contextBuilder.js` normalizes YucaTanaTrades context before it reaches the proxy:

- active tab
- selected stock or crypto symbol
- watchlist
- Finnhub quote snapshot
- CoinGecko market snapshot
- source health
- scanner row counts
- heatmap selection

The context is intentionally compact. It gives Perplexity situational awareness without turning AI into the source of truth for live market data.

## UI Components

`apps/web/scripts/perplexityResearch.js` mounts reusable panels into AI Lab, Stocks, Crypto, and Settings. Each panel supports:

- query input
- Enter-to-submit
- Ask button
- retry and regenerate
- copy response
- loading shimmer
- citations
- detected tickers
- timestamp
- data-quality label

## Source Health

Perplexity extends the existing source health system with:

- `CONNECTED`
- `PROXY REQUIRED`
- `FAILED`
- `DEGRADED`
- `DISABLED`

Latency and last successful request timestamps are stored in the health detail when the proxy responds.

## Safety Boundary

AI research is informational only. Execution remains isolated under `services/execution`, and live trading remains disabled by default.
