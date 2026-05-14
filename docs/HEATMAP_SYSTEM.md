# Heatmap System

The production heatmap is implemented in:

- `apps/web/styles/heatmap.css`
- `apps/web/scripts/heatmap.js`

The enhanced prototype `apps/web/legacy/YucaTanaTrades_Enhancedv23HeatmapExpandAnimation.html` is UI inspiration only.

## HeatmapCell

`HeatmapCell` is represented by `.ytt-heatmap-cell`. Single click:

- selects the asset,
- updates the selected detail panel,
- updates the official TradingView widget,
- highlights the related scanner table row,
- plays a ripple/pulse animation.

## HeatmapExpandedPanel

Double click a tile to open an inline `.ytt-heatmap-expanded-panel`. This is the default research expansion experience. It does not open a full-screen overlay on first click.

## AssetDetailPanel

`#stocks-asset-detail-panel` and `#crypto-asset-detail-panel` display selected asset fields. Fields such as RSI, MACD, VWAP, support, resistance, momentum, thesis, and setup remain unavailable until the strategy layer supplies calculated values.

## DeepDiveDrawer

Deep dive opens only from a `Deep Dive` button. The drawer uses `.ytt-deep-dive-drawer` and `.drawer-scan-line` for the scan-line animation.

## Stock Adapter

The stock heatmap adapter reads `liveStockQuotes`, which is populated by the existing Finnhub/proxy quote loader. Missing data renders `Data unavailable — retrying`.

## Crypto Adapter

The crypto heatmap adapter reads `liveCryptoMarkets`, which is populated by the existing CoinGecko/proxy loader. Binance-only indicator fields stay unavailable until Binance/strategy services supply them.

## Data Quality Labels

Every heatmap tile displays a subtle data-quality chip:

- `LIVE`
- `DELAYED`
- `FALLBACK`
- `UNAVAILABLE`

## Adding Metrics Safely

Add a metric only after it exists in `AssetRow` and is calculated by `services/data` or `services/strategies`. Do not copy static values from legacy HTML prototypes.
