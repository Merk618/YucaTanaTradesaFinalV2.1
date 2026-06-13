# YucaTanaTrades System Architecture

YucaTanaTrades is a static, read-only fintech intelligence terminal. The active production system is the JavaScript frontend, modular browser-safe services, and the Perplexity Cloudflare Worker.

## Source Of Truth

Use `D:\YucaTanaTrades` as the production repo. Replit/CodePen exports and the `design-reference` prototype are reference-only material, not production code.

## Active Frontend

- `apps/web/index.html` is the app shell.
- `apps/web/scripts` contains scoped modules for AI, heatmaps, Crypto Scanner Pro, Stock Deep-Dive, TradingView loading, and motion.
- `apps/web/styles` contains scoped production CSS.
- `scripts/build-dist-web.mjs` builds `dist-web` and mirrors it to the root for GitHub Pages.

## Active Service Modules

- `services/ai` - provider routing, Perplexity/Ollama clients, Market Brain, scoring, prompts, and symbol intent.
- `services/crypto` - CoinGecko/Binance symbol resolution, scanner data, and signal classification.
- `services/marketData` - MooMoo local bridge architecture, stock/options routers, AIheatmap data and technical engines.
- `services/settings` - provider setting key map, defaults, aliases, and persistence helpers.
- `services/signals` - manual external signal overlays and confirmation scoring.
- `services/stocks` - Stock Deep-Dive data and thesis storage.

## Backend Boundary

The active backend is:

```text
workers/perplexity-proxy
```

It exposes:

- `GET /health`
- `POST /perplexity/finance`

Perplexity credentials must be Cloudflare Worker secrets only.

## Quarantined Material

Old Python services, broker execution experiments, generic proxy code, generated caches, and imported design prototypes are not part of active production. They may remain in `archive/quarantine/...` for traceability.

## Safety Boundary

YucaTanaTrades is read-only decision support. It must not place orders, enable live trading, expose broker credentials, or fabricate market data.
