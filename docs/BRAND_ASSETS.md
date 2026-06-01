# Brand Assets

## Primary Sidebar Logo

Source asset:
- `apps/web/assets/brand/yucatana-trades-logo.png`

Build output:
- `dist-web/assets/brand/yucatana-trades-logo.png`
- `assets/brand/yucatana-trades-logo.png`

The image is used in the left sidebar brand block and as a compact topbar mark. It is rendered with `object-fit: contain` to avoid distortion.

## Fallback

If the image fails to load, the sidebar brand block reveals fallback text:

`YucaTana Trades`

## Usage Notes

- Keep the sidebar version compact.
- Do not duplicate a large logo in the topbar.
- Use the topbar mark only as a small visual echo of the sidebar brand.
- Do not embed API keys, market data, or provider logic in brand assets.
