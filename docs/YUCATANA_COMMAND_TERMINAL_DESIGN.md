# YucaTana Command Terminal Design

## Purpose

The post-login YucaTanaTrades shell is styled as a luxury market-intelligence command terminal: dark graphite, black-gold brand hierarchy, emerald data accents, crisp command labels, and read-only safety emphasis.

## Design Tokens

The app shell defines command-terminal tokens for post-login UI:

- `--ytt-bg-base`
- `--ytt-bg-elevated`
- `--ytt-bg-panel`
- `--ytt-bg-panel-2`
- `--ytt-gold`
- `--ytt-gold-2`
- `--ytt-gold-muted`
- `--ytt-emerald`
- `--ytt-emerald-soft`
- `--ytt-red`
- `--ytt-text-main`
- `--ytt-text-muted`
- `--ytt-border-soft`
- `--ytt-border-strong`

These tokens are applied to post-login app shell surfaces and do not intentionally restyle the sign-in surface.

## Shell Structure

- Left command rail
- Top command bar
- Ticker/data command strip
- Main workspace
- YucaTana AI command assistant

## Tab Environments

Each non-protected tab receives a visible scoped motion background made from real DOM layers:

- `.ytt-motion-bg`
- `.ytt-motion-bg__glow`
- `.ytt-motion-bg__grid`
- `.ytt-motion-bg__scanline`
- `.ytt-motion-bg__particles`
- `.ytt-motion-bg__tickerstream`

The app shell also marks the active visual system with non-visible body attributes:

- `data-command-theme="active"`
- `data-motion-system="active"`

The tab identities are:

- News: macro pulse grid and headline-band sweep
- Option Flows: options-chain grid and delta/gamma-inspired glow
- Stocks: graphite/gold sector-map texture
- Crypto: digital asset node/liquidity texture
- AIheatmap: tile field and radar-like heat glow
- Crypto Hunter: bot/risk-gate scanline environment
- Portfolio: account-sleeve stability grid
- Charts: technical chart grid and signal-line texture
- Settings/Admin: vault/security grid

Dashboard and Meridian are excluded from these environment layers and are not included in the motion tab map.

## Command Language

Non-protected tabs use command headers such as:

- `> STOCKS MODULE READY`
- `> CRYPTO SCANNER READY`
- `> AIHEATMAP MODULE READY`
- `> OPTIONS FLOW CONSOLE READY`

Each command header includes read-only / manual / provider state metadata. These labels are UI organization only and do not alter provider behavior.

## Motion

The command terminal uses CSS transitions and keyframes first, with a small vanilla `IntersectionObserver` helper for reveal-on-scroll and tab boot states. It does not add GSAP, Lenis, Lottie, Three.js, Spline, video, or blocking external animation scripts.

## Protected Areas

The sign-in screen, Dashboard iframe surface, and Meridian iframe surface remain protected. The command shell can surround those areas, but their animation content and iframe sources should not be changed.
