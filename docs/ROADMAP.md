# Roadmap

## Phase 1: Modular Foundation

- Preserve v2 app shell.
- Move prototypes into `apps/web/legacy`.
- Centralize data clients.
- Add `AssetRow` and `DataQuality`.
- Add production heatmap behavior without mock financial values.

## Phase 2: Data Completeness

- Expand Finnhub candle/profile/metric usage in stock scanners.
- Add Tradier option-flow service under `services/scanners/options`.
- Add Binance websocket hydration for crypto RSI/MACD fields.
- Add cache freshness labels and retry state.

## Phase 3: Strategy Intelligence

- Feed candles into strategy modules.
- Calculate RSI, MACD, VWAP, support/resistance, and setup labels.
- Add backtest reports to `services/strategies/backtesting`.

## Phase 4: Execution Safety

- Build paper-trading workflows.
- Add alert/webhook routing.
- Keep live trading disabled until explicit deployment review.

## Phase 5: Production Deployment

- Deploy Cloudflare Worker proxy.
- Move secrets out of frontend localStorage.
- Add integration tests for provider failures and unavailable states.
