# External Signal Providers

YucaTanaTrades supports external trade ideas as read-only overlays. External providers are not the source of truth for quotes, indicators, scanners, rankings, or execution.

## Current Provider

- Provider: Prosperio.AI
- Status: Manual / Import / API Future
- Current ingestion: manual local entry only
- Storage: browser `localStorage`
- Execution: disabled

## Rules

- Do not scrape provider websites.
- Do not automate login.
- Do not store provider credentials in the frontend.
- Do not place trades from external signals.
- Do not let an external signal override YucaTana market data.

## Confirmation Flow

1. User enters an external signal manually.
2. The signal is normalized under `services/signals`.
3. YucaTana resolves the symbol against current app data.
4. YucaTana Market Brain scores the symbol from YucaTana data.
5. The signal receives a confirmation status:
   - `CONFIRMED`
   - `PARTIALLY_CONFIRMED`
   - `NOT_CONFIRMED`
   - `CONFLICTING`
   - `DATA_INSUFFICIENT`

A `STRONG CANDIDATE` rating requires YucaTana market-data confirmation. Prosperio alone cannot create that rating.
