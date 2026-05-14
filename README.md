# YucaTanaTrades

YucaTanaTrades is now organized as a modular trading intelligence platform.

## Current Layout

- `apps/web/index.html` is the primary app shell.
- `apps/web/legacy` preserves standalone dashboard prototypes and enhanced UI experiments.
- `services/data` owns provider integrations and proxy code.
- `services/scanners` owns candidate detection/ranking.
- `services/strategies` owns indicators, risk, support/resistance, backtesting, and portfolio logic.
- `services/execution` owns broker adapters and guarded order routing.
- `shared/types` contains the normalized `AssetRow` model and `DataQuality` labels.
- `docs` explains architecture, API flow, heatmap behavior, data accuracy, roadmap, and deployment.

The enhanced heatmap HTML is preserved for UI/animation reference only. It is not a source of truth for financial data.

# YucaTanaTrades API Proxy

This folder contains a Cloudflare Worker proxy for YucaTanaTrades v2.

## Why This Exists

The browser app can run as a local HTML file, but production API keys should not live in localStorage or frontend JavaScript. Deploy this Worker and set the deployed URL as `API PROXY BASE URL` in the Settings vault.

Example:

```text
https://yucatanatrades-api.yourname.workers.dev
```

## Environment Variables

Set these as Worker secrets:

```text
FINNHUB_API_KEY=
TRADIER_API_KEY=
TRADIER_BASE_URL=https://sandbox.tradier.com/v1
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optional. If it is missing, `/ai/stock-assistant` returns a local source-aware fallback response instead of calling OpenAI.

## Routes

```text
GET  /health
GET  /finnhub/quote?symbol=NVDA
GET  /coingecko/ping
GET  /coingecko/markets?...CoinGecko query params...
GET  /tradier/quotes?symbols=NVDA,TSLA
GET  /alpaca/account
POST /ai/stock-assistant
```

## Deployment Sketch

1. Create a Cloudflare Worker.
2. Paste `worker.js`.
3. Add the environment variables/secrets.
4. Deploy.
5. In YucaTanaTrades: Settings → unlock vault with `142010` → paste the Worker URL into `API PROXY BASE URL` → Save Keys.
6. Click `REFRESH HEALTH` in Source Health Command.

The app will prefer the proxy when `API_PROXY_BASE` is configured.
