# YucaTana UI System

The post-login app uses a command-terminal design system for non-protected tabs only.

## Design Direction

- Institutional trading terminal
- Dark graphite surfaces
- Premium gold accents
- Emerald data/success accents
- Amber warning accents
- Red risk/error accents
- Dense but readable market modules

Gold is an accent, not a page wash. Dense text modules should use solid dark surfaces rather than transparent glass.

## Core Patterns

- `command-page-header`: implemented through the non-protected tab `data-command-title` and `data-command-meta` shell.
- `command-card`: shared treatment for `.panel`, `.detail-card`, `.kpi-card`, `.market-mini-card`, and `.vault-provider-section`.
- `command-grid`: 12-column grids for options, portfolio, charts, settings, and market workspaces.
- `command-status-pill`: shared status chip and source tag styling.
- `command-table`: readable sticky table headers and high-contrast rows.
- `command-empty-state`: source-gated unavailable states that do not fake market data.

## Page Roles

- News: market intelligence briefing center.
- Option Flows: options command console.
- Stocks: institutional stock intelligence with Stock Deep-Dive preserved.
- Crypto: Crypto Scanner Pro shell, manual scan only.
- AIheatmap: premium heatmap command surface with crypto/stocks subtabs preserved.
- Crypto Hunter: read-only observation console.
- Portfolio: capital allocation command center with honest unavailable states.
- Charts: technical analysis workspace with lazy widget hooks.
- Settings/Admin: provider control room with vault behavior preserved.
- MomentumAI: assistant command co-pilot; routing remains unchanged.

## Motion Policy

Use subtle module-level motion only:

- Tab transitions
- Card entrance and hover lift
- Button press states
- Status pill pulses
- MomentumAI open/close motion

Avoid aggressive full-screen animated backgrounds, debug-looking grids, Matrix effects, heavy canvas, autoplay video, or any motion that reduces readability.
