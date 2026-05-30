# AIheatmap Tab

`AIheatmap` is a standalone YucaTanaTrades tab for a luxury market-terminal heatmap workflow. It recreates the TradingView, selected-detail sidecar, scan console, clickable heatmap grid, and expanded ticker research pattern from the legacy enhanced heatmap file without importing the standalone page or global styles.

## Data Boundary

The tab is provider-driven:

- Crypto rows use CoinGecko market snapshots and Binance public ticker data when available.
- Stock rows use the existing MooMoo OpenD-first / Finnhub fallback quote router.
- TradingView is used only through the official embedded widget.
- Missing RSI, MACD, VWAP, support, resistance, volume, or price fields are displayed as `Unavailable`.
- Day high/low support and resistance are labeled as `Provisional day-range support/resistance`.

No hardcoded prices, targets, stops, catalysts, analyst ratings, or live trading values are copied from the legacy heatmap file.

## Modules

- `apps/web/scripts/aiHeatmapTab.js` renders the tab, scan console, heatmap, sidecar, TradingView widget, and expanded panel.
- `apps/web/styles/aiHeatmapTab.css` contains scoped styles under `.ytt-aiheatmap-tab`.
- `services/marketData/aiHeatmapDataService.js` normalizes stock and crypto rows.
- `services/marketData/aiHeatmapTechnicalEngine.js` calculates RSI/MACD only from supplied series data and derives provisional range levels.
- `services/marketData/aiHeatmapScanEngine.js` orchestrates scan stages and Market Brain scoring.

## AI Context

The tab exposes `window.YTTAIHeatmap.getContext()` with:

- selected AIheatmap mode and symbol
- selected normalized row
- top movers
- scan timestamp
- data quality
- technical context
- support/resistance metadata
- provider metadata

Ollama and Perplexity can use this context through the existing unified YucaTana AI assistant, but the local model must only explain supplied data and must not invent missing technicals or market facts.

## Safety

This tab is read-only decision support. It does not place orders, enable live trading, store broker credentials, or modify the Stock/Crypto tabs. Live trading remains disabled.
