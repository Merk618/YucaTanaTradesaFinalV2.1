# API Flow

## Frontend Flow

1. `apps/web/index.html` loads scanner panels and heatmap containers.
2. The settings vault stores local API keys or an `API_PROXY_BASE` URL.
3. Quote loaders prefer the proxy when configured.
4. Without provider data, visible values remain shimmered or display `Data unavailable — retrying`.

## Proxy Flow

`services/data/proxy/worker.js` exposes:

- `GET /health`
- `GET /finnhub/quote?symbol=NVDA`
- `GET /coingecko/ping`
- `GET /coingecko/markets?...`
- `GET /tradier/quotes?symbols=NVDA,TSLA`
- `GET /alpaca/account`
- `POST /ai/stock-assistant`

`wrangler.toml` points to `services/data/proxy/worker.js`.

## Python Service Flow

- Stocks: `services/data/finnhub/client.py` -> `services/data/adapters.py` -> `services/scanners/stocks/scanner.py`.
- Crypto: `services/data/coingecko/client.py` -> `services/data/adapters.py` -> `services/scanners/crypto/scanner.py`.
- Binance candles/websocket: `services/data/binance/feed.py`.
- Indicators: `services/strategies/signals/indicators.py`.
- Backtests: `services/strategies/backtesting/backtest.py`.
- Execution: `services/execution/brokers` and `services/execution/routing`.

## Error Behavior

Provider errors must not break the UI. Return unavailable rows or leave cells shimmered. Do not fabricate prices, volume, RSI, MACD, support, resistance, or catalyst values.
