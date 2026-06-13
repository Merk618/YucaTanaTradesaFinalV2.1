# YucaTanaTrades

YucaTanaTrades is a static, read-only market intelligence terminal. The production source of truth is this repository, with `apps/web` as the web app source and `dist-web` plus the repository root as the GitHub Pages output.

## Production Scope

- Static GitHub Pages frontend.
- Provider-driven market data surfaces for stocks, crypto, heatmaps, scanner views, and deep-dive modules.
- Perplexity Finance research through a Cloudflare Worker proxy only.
- Local Ollama support for private local reasoning over supplied YucaTanaTrades context.
- Read-only MooMoo OpenD bridge architecture for future stock/options data.
- External signal overlays that must be confirmed by YucaTana Market Brain before ranking.
- No live trading, no order placement, and no frontend broker/exchange credentials.

## Active Production Layout

- `apps/web/index.html` - primary application shell.
- `apps/web/scripts` - scoped browser modules for AI, Crypto Scanner Pro, AIheatmap, TradingView loading, heatmaps, and stock deep dives.
- `apps/web/styles` - scoped production styles.
- `services/ai` - Perplexity/Ollama routing, Market Brain, scoring, prompts, and symbol intent resolution.
- `services/crypto` - crypto scanner, symbol registry, CoinGecko/Binance resolver logic.
- `services/marketData` - MooMoo bridge architecture, stock/options routing, AIheatmap data/technical engines.
- `services/settings` - centralized provider setting keys and persistence helpers.
- `services/signals` - manual external signal ingestion and YucaTana confirmation logic.
- `services/stocks` - Stock Deep-Dive thesis data and store helpers.
- `workers/perplexity-proxy` - secure Cloudflare Worker for `POST /perplexity/finance`.
- `tests` - regression checks for provider settings, AI routing, Crypto Scanner Pro, AIheatmap, Stock Deep-Dive, Market Brain, and external signals.
- `scripts/build-dist-web.mjs` - static build/copy pipeline for GitHub Pages.

## Reference And Quarantine Material

Prototype HTML, imported Replit/CodePen exports, old Python services, broker execution experiments, and generated cache files are not production source-of-truth code. They should live under `archive/quarantine/...` or `legacy` and must not be wired into the active frontend or deployment path.

## Security Model

- Perplexity API keys stay server-side as the Cloudflare Worker secret `PERPLEXITY_API_KEY`.
- Frontend settings may store local personal API keys in browser storage for local/private use, but production secrets should be proxied server-side.
- Broker/exchange keys must not be stored in the GitHub Pages frontend.
- Live trading remains disabled.

## Build

```powershell
npm install
npm run build:web
```

The build writes `dist-web/` and mirrors deployable files to the repository root for GitHub Pages. The single-file export is preserved separately in `dist/YucaTanaTrades_SingleFile.html`.

## Validation

```powershell
node tests/cryptoScannerProTab.test.mjs
node tests/aiHeatmap.test.mjs
node tests/stockDeepDive.test.mjs
node tests/settingsPersistence.test.mjs
node tests/symbolIntentResolver.test.mjs
node tests/marketBrain.test.mjs
node tests/externalSignals.test.mjs
npm run build:web
```

Run local-path and secret scans before release:

```powershell
rg -n "local-drive-or-file-url-pattern" index.html dist-web apps/web scripts styles services docs tests
rg -n "CG-[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9]{20,}|PERPLEXITY_API_KEY\s*=\s*" apps/web scripts styles services dist-web index.html
```
