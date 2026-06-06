# UI Overhaul Protected Areas

This project treats the following surfaces as protected during post-login UI overhaul work:

- Sign-in screen and auth entry surface
- Dashboard tab internals
- Meridian tab internals

The global shell may surround these areas with the shared sidebar, topbar, and workspace frame, but the internal protected content must not be redesigned, rearranged, or reanimated.

## Guardrails

- Do not change sign-in/auth/vault logic.
- Do not change Dashboard iframe source, animation files, visual surfaces, or internal layout.
- Do not change Meridian iframe source, animation files, visual surfaces, or internal layout.
- Scope post-login command-system CSS with `body.ytt-signed-in` and exclude `#tab-dashboard` and `#tab-meridian`.
- MomentumAI is assistant-facing branding only; the product remains YucaTanaTrades / YucaTana Market Brain.

## Allowed

- The app shell, sidebar, topbar, ticker ribbon, and outer workspace may visually surround protected tabs.
- Comments and documentation may mark protected surfaces.

## Not Allowed

- Redesigning protected tab internals.
- Replacing protected iframes.
- Changing auth persistence, vault save/load behavior, or provider routing.
