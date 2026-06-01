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

## Command Language

Non-protected tabs use command headers such as:

- `> STOCKS MODULE READY`
- `> CRYPTO SCANNER READY`
- `> AIHEATMAP MODULE READY`
- `> OPTIONS FLOW CONSOLE READY`

Each command header includes read-only / manual / provider state metadata. These labels are UI organization only and do not alter provider behavior.

## Protected Areas

The sign-in screen, Dashboard iframe surface, and Meridian iframe surface remain protected. The command shell can surround those areas, but their animation content and iframe sources should not be changed.
