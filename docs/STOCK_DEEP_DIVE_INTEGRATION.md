# Stock Deep-Dive Integration

YucaTanaTrades adds a native Stocks tab module titled **Stock Deep-Dive — Why These Are Our Top Picks**.

The module is based on the legacy v8 deep-dive card layout, but the imported thesis content is treated as a manual overlay only. It is not the source of truth for current prices, targets, stops, analyst ratings, earnings, or catalysts.

## Files

- `apps/web/scripts/stockDeepDive.js`
- `apps/web/styles/stockDeepDive.css`
- `services/stocks/stockDeepDiveData.js`
- `services/stocks/stockThesisStore.js`
- `tests/stockDeepDive.test.mjs`

## Data Boundary

The initial cards cover:

- OXY
- NVDA
- META
- TSLA
- XLE
- CVX
- AAPL
- MSFT

Each card is labeled as a manual thesis imported from legacy v8 HTML. Manual target and stop fields are intentionally unavailable unless a verified source supplies them later.

## Live Data Override

The renderer checks the current YucaTana app context first, then routes through the stock quote router:

1. MooMoo OpenD bridge when enabled as primary and running.
2. Finnhub fallback when configured.
3. Unavailable state when no connected provider returns a quote.

Live/current quote data is displayed ahead of manual fields. If live data is unavailable, the UI says `Unavailable` or `Manual / Unavailable`.

## Market Brain

Every card is scored with the deterministic YucaTana opportunity scorer. The card shows:

- Market Brain score
- Rating
- confirmation status
- strongest factors
- weakest/missing data
- data quality
- provider/fallback metadata

Confirmation labels are:

- Confirmed by YucaTana
- Partially Confirmed
- Not Confirmed
- Conflicting
- Data Insufficient

These labels are decision-support only. They are not buy/sell instructions.

## AI Context

The module exposes `window.YTTStockDeepDive.getContext()`. `buildAIContext()` includes this under `stockDeepDive`, so YucaTana AI can answer prompts such as:

- Why are these top picks?
- Review NVDA thesis
- Compare OXY vs NVDA
- Rank the stock deep dives

Ollama receives only supplied context and must not invent prices, targets, stops, catalysts, analyst ratings, filings, or earnings.

## Safety

This module does not:

- enable live trading
- place orders
- add broker execution
- expose API secrets
- modify sign-in/auth/vault logic
- replace the existing Stocks tab
- iframe the uploaded standalone page
