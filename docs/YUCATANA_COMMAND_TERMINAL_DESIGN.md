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

Each non-protected tab receives a visible scoped motion background made from real DOM layers. The injected root uses both compatibility and page-specific classes:

- `.ytt-motion-bg`
- `.ytt-page-motion-bg`
- `.ytt-motion-bg--{tab}`
- `.ytt-page-motion-bg--{tab}`

Each background includes these moving layers:

- `.ytt-motion-bg__glow`
- `.ytt-motion-bg__grid`
- `.ytt-motion-bg__scanline`
- `.ytt-motion-bg__particles`
- `.ytt-motion-bg__tickerstream`
- `.ytt-motion-bg__accent`

The layer spans also expose `motion-layer--glow`, `motion-layer--grid`, `motion-layer--scan`, and `motion-layer--accent` aliases.

The app shell also marks the active visual system with non-visible body attributes:

- `data-command-theme="active"`
- `data-motion-system="active"`
- `data-active-tab="{tab}"`

The tab identities are:

- News: amber macro-grid, RSS-style bands, and official-release pulse rings
- Option Flows: purple/gold options-chain grid, strike ladder rails, and delta/gamma curve motion
- Stocks: graphite/gold sector tiles with green/red cell pulses and equity tape movement
- Crypto: emerald liquidity stream, blockchain node constellation, and digital mesh drift
- AIheatmap: animated tile field, radar sweep, and green/red/gold cell cluster motion
- Crypto Hunter: amber scanlines, checkpoint nodes, and read-only risk-gate path motion
- Portfolio: allocation rings, account sleeve grid, and calm blue/gold stability flow
- Charts: candlestick silhouettes, wave lines, and technical grid movement
- Settings/Admin: vault grid, lock/circuit keylines, and blue/gold security sweep

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
