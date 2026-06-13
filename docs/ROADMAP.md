# Roadmap

## Phase 1: Production Consolidation

- Use `D:\YucaTanaTrades` as source of truth.
- Keep Replit/CodePen/design-reference material as reference only.
- Quarantine obsolete Python, broker execution, generated cache, and old proxy files.
- Keep GitHub Pages static deployment as the primary frontend path.

## Phase 2: Provider Reliability

- Harden CoinGecko/Binance scanner fallbacks.
- Expand Finnhub fallback handling for stocks.
- Keep MooMoo OpenD as read-only future primary stock/options provider through a local bridge.
- Add provider failure regression tests for unavailable/rate-limited states.

## Phase 3: AI Intelligence

- Continue improving Market Brain scoring with deterministic provider data.
- Keep Ollama limited to supplied YucaTanaTrades context.
- Keep Perplexity routed through the secure Worker proxy.

## Phase 4: Data Persistence

- Decide whether production needs a database.
- If needed, add schema, migrations, and a server-side deployment target before storing user/system data.
- Until then, use localStorage only for local preferences and manual signal overlays.

## Phase 5: Security Review

- Keep live trading disabled.
- Keep broker/exchange credentials out of GitHub Pages.
- Review any quarantined broker/execution code before restoring it.
- Run secret, local-path, and build-output scans before every production release.
