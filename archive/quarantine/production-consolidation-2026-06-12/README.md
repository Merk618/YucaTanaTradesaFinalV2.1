# Production Consolidation Quarantine

Date: 2026-06-12

This folder preserves files moved out of the active YucaTanaTrades production path during source-of-truth consolidation.

Nothing here is deleted permanently. These files are retained for audit, rollback, or future extraction after explicit review.

## Why These Files Were Quarantined

- The active production app is the static GitHub Pages frontend in `apps/web` plus browser-safe services in `services/ai`, `services/crypto`, `services/marketData`, `services/settings`, `services/signals`, and `services/stocks`.
- The active backend is `workers/perplexity-proxy`.
- Python bot/execution services, old generic proxy paths, generated Python caches, Azure Static Web Apps workflow, and imported design-reference material are not part of the active production deployment.
- Broker/exchange execution must remain disabled and must not be wired into the frontend.

## Restore Guidance

Do not restore these files into active production until:

1. Their security boundary is reviewed.
2. They have tests.
3. They do not expose secrets or broker credentials.
4. They do not enable live trading.
5. They are documented as active production components.
