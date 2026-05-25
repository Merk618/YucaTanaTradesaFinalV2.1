# Perplexity Finance Integration

YucaTanaTrades integrates Perplexity as a finance research layer, not as a quote feed or execution engine.

## What It Does

- AI research assistant
- "Why is this moving?" analysis
- Earnings and analyst recap support
- Macro, sector, ETF, and catalyst explanation
- Bull versus bear framing
- Web-grounded source and citation display

## What It Does Not Do

- It does not place trades.
- It does not replace CoinGecko, Binance, Finnhub, or TradingView.
- It does not provide HFT, broker routing, or raw quote streaming.
- It does not fabricate unavailable price, RSI, MACD, valuation, support, resistance, or catalyst fields.

## Frontend Placement

The `apps/web/scripts/perplexityResearch.js` module mounts the Perplexity Finance Research panel into:

- AI drawer / AI Lab
- Stocks selected ticker detail panel
- Crypto selected asset detail panel
- Settings / Admin panel

The visual layer is isolated in `apps/web/styles/perplexity.css`.

## Modular Service Files

The browser-safe service modules live in `services/ai/`:

- `perplexityClient.js`
- `perplexityNormalizer.js`
- `contextBuilder.js`
- `perplexityModes.js`
- `researchPromptTemplates.js`

They define the proxy client, response normalization, app context shaping, research modes, and prompt contract without exposing private keys.

## Data Quality

Perplexity responses display one of:

- `LIVE`
- `DELAYED`
- `WEB-GROUNDED`
- `FALLBACK`
- `UNAVAILABLE`

Perplexity output should usually be `WEB-GROUNDED`. If the proxy is missing or unavailable, the UI shows `UNAVAILABLE`.

## Security Rule

Perplexity API keys must remain server-side. GitHub Pages must only call `API_PROXY_BASE/perplexity/finance`.
