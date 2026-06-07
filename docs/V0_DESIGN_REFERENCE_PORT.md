# v0 Design Reference Port

This pass used the downloaded `fintech-trading-terminal` v0 build as a visual reference only.

## What Was Ported

- Grouped sidebar hierarchy inspired by the v0 sidebar sections.
- Compact graphite/gold card system inspired by the v0 `Card` and `StatusPill` components.
- Cleaner top utility bar treatment.
- Rounder, denser command cards, tables, inputs, and provider-vault fields.
- AIheatmap layout emphasis: wide heatmap module plus selected-symbol rail.
- MomentumAI launcher/panel styling inspired by the v0 assistant treatment.

## What Was Not Ported

- No Next.js architecture.
- No v0 routing.
- No fake v0 data.
- No demo auth.
- No provider/data routing changes.
- No trading or broker execution controls.

## Protected Areas

The visual port does not redesign:

- Sign-in
- Dashboard internals
- Meridian internals

Those surfaces remain protected and are documented in `docs/UI_OVERHAUL_PROTECTED_AREAS.md`.
