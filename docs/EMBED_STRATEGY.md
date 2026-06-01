# Embed Strategy

## Principle

Official widgets should be used only where they add real value and must remain lazy-loaded. The app shell should never wait on widget providers to become usable.

## Safe Existing Embeds

- TradingView chart modules already exist in chart and stock contexts.
- Crypto Scanner Pro remains custom and must not be replaced by an iframe.
- AIheatmap remains custom with crypto/stocks subtabs.

## Future Lazy Embed Candidates

- AIheatmap Stocks: TradingView Stock Heatmap at the top of the Stocks subtab.
- AIheatmap Crypto: TradingView Crypto Coins Heatmap at the top of the Crypto subtab.
- Charts: TradingView Advanced Chart plus Technical Analysis widget.
- News/Macro: TradingView Top Stories or Economic Calendar, only if loaded after the tab is visible.

## Loader Direction

If future TradingView widgets are expanded, use a local loader module such as `services/widgets/tradingViewWidgetLoader.js` or an equivalent app-local script. The loader should:

- create widgets only after the owning tab/section is visible
- reuse existing TradingView script availability
- render command-style loading/fallback frames
- avoid replacing custom Crypto Scanner Pro, Stock Deep-Dive, or YucaTana AI surfaces

## Rules

- Lazy-load only when tab/section is visible.
- Do not block the app shell.
- Show clean placeholders/fallbacks.
- Do not duplicate heavyweight widgets across multiple visible sections.
- Do not auto-load all widgets on initial page load.
- Do not create fake data if a provider fails.
- Do not change data-provider routing or API key handling.
