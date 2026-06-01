# Crypto Scanner Pro Tab

The Crypto tab is a scoped native YucaTanaTrades implementation of the Crypto Scanner Pro layout. It replaces only the visible Crypto tab content and leaves Stock, AIheatmap, Settings/Admin, sign-in, and vault logic untouched.

## Lazy Loading Contract

- The main app does not call CoinGecko on page load.
- The main app does not start a Binance WebSocket on page load.
- The Crypto Scanner Pro shell mounts instantly when the Crypto tab opens.
- Provider data loads only when the user clicks `Scan Now`.
- TradingView is loaded asynchronously and errors are contained inside the Crypto tab.

## Data Behavior

- CoinGecko public markets data powers scanner rows, category heat, top movers, and alerts.
- A saved CoinGecko key may be read from the provider vault if present, but no key is hardcoded.
- Binance public WebSocket ticks start only after a successful manual scan and only for supported pairs.
- The live-price badge says `PRICES: BINANCE LIVE` only when the WebSocket opens.
- Category heat is computed from current scan rows. Empty categories show `Unavailable`.

## AI Context

The module exposes `window.YTTCryptoScannerPro.getContext()` with scanner rows, selected symbol, top movers, alerts, category heat, provider metadata, and active filters. YucaTana AI can explain supplied scanner data, but must not invent prices, catalysts, RSI, MACD, support/resistance, targets, stops, or analyst data.
