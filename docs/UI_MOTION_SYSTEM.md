# UI Motion System

YucaTanaTrades uses a restrained terminal motion system for non-protected app surfaces.

## Motion Tokens

```css
:root {
  --ytt-ease-premium: cubic-bezier(0.22, 1, 0.36, 1);
  --ytt-motion-fast: 140ms;
  --ytt-motion-base: 220ms;
  --ytt-motion-slow: 320ms;
}
```

## Applied Motion

- Sidebar collapse and mobile drawer transitions
- Nav item hover lift and gold sweep
- Active nav state transitions
- Non-protected tab content fade/translate entrance
- Card and provider-section hover lift
- Button press microinteractions
- Settings/status pill transitions
- Existing AI assistant and AIheatmap polish from the prior pass
- Sidebar logo gold pulse
- Sidebar-only scanline sweep
- Sidebar-only terminal grid shimmer
- Bottom safety/status dot pulse
- Command header entrance and gold edge treatment
- Ticker token hover glow
- Panel bracket/sweep treatment on non-protected tabs
- Tab-specific background environment drift
- Vanilla IntersectionObserver reveal-on-scroll for non-protected panels

## Performance Rules

- Prefer transform and opacity.
- Avoid constant motion on dense data grids.
- Do not animate TradingView iframes.
- Avoid large animated blur layers.
- Keep interactions fast and subtle.
- Keep sidebar ambience scoped to `.sidebar`.
- Do not add global canvas effects.
- Do not animate Dashboard or Meridian iframe contents.
- Do not animate TradingView iframes directly.
- Do not use layout-thrashing scroll listeners.
- Do not introduce blocking external animation scripts.

## Reduced Motion

Reduced-motion handling is scoped to the app shell and non-protected surfaces. The sign-in screen, Dashboard animation area, and Meridian animation area are intentionally excluded from the new reduced-motion override.
