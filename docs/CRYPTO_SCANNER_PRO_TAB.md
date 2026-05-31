# Crypto Scanner Pro Tab

The Crypto tab is now a scoped native YucaTanaTrades implementation of the Crypto Scanner Pro layout. It replaces the old mixed crypto dashboard UI only inside `#tab-crypto`.

## Scope

- The app-level navigation, Stock tab, AIheatmap tab, Settings/Admin, sign-in, and vault logic remain separate.
- Styles are scoped under `.ytt-crypto-scanner-pro`.
- No standalone uploaded page header, footer, body styles, or global resets are imported.
- No exchange API keys, broker controls, order placement, or live trading controls are added.

## Data Behavior

- CoinGecko public markets data powers scanner rows, category heat, top movers, and alert generation.
- If a saved CoinGecko key exists in the Data / AI Provider Vault it can be used, but no key is hardcoded.
- Binance public WebSocket ticks update supported rows only after the socket opens.
- The bottom badge says `PRICES: BINANCE LIVE` only when the scanner WebSocket is open; otherwise it shows partial or unavailable.
- Category heat is computed from the current scan rows. Missing category data is shown as unavailable.

## Scanner Output

Signal labels are deterministic and derived from supplied fields:

- `HYPER`
- `SURGE`
- `BREAKOUT`
- `MOMENTUM`
- `REVERSAL`
- `SUPPORT`
- `OVERBOUGHT` only when RSI is supplied
- `NEUTRAL`

When RSI or deeper technical data is absent, the classifier uses a clearly labeled price-change model and does not claim RSI-based signals.

## AI Context

The Crypto Scanner Pro tab publishes:

- `cryptoScannerProRows`
- `cryptoScannerProSelectedSymbol`
- `cryptoScannerProSelectedRow`
- `cryptoScannerProTopMovers`
- `cryptoScannerProAlerts`
- `cryptoScannerProCategoryHeat`
- `cryptoScannerProLastScanAt`
- `cryptoScannerProDataQuality`
- `cryptoScannerProProviderMetadata`
- `cryptoScannerProActiveFilters`

YucaTana AI may explain these supplied rows, but it must not invent prices, catalysts, RSI, MACD, support/resistance, targets, stops, or analyst data.
