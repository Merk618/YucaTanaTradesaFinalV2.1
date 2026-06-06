# Responsive Layout System

The post-login YucaTanaTrades shell is designed to scale across laptop, 27-inch desktop, 40-inch display, and ultrawide monitor contexts.

## Breakpoints

- Standard desktop: `1280px+`
- Large desktop: `1600px+`
- Wide desktop: `1920px+`
- Ultrawide: `min-aspect-ratio: 21/9`
- Short height: `max-height: 850px`

## Layout Rules

- Non-protected tabs use the available workspace width instead of floating as small centered panels.
- Standard desktop uses 12-column grids.
- Large and ultrawide displays expand the max workspace width and allow wider primary/detail splits.
- Short-height screens reduce vertical padding and card heights.
- Tablet/mobile stacks grids into single-column flows and disables sticky side rails.

## Protected Exclusions

The responsive overhaul excludes protected internals:

- Sign-in
- Dashboard
- Meridian

The outer shell can adapt around these surfaces, but their internal content, animation, iframe source, and layout stay unchanged.
