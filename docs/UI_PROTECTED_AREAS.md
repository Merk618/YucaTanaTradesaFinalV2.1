# UI Protected Areas

The following areas are protected during the organization and motion polish pass.

## Sign-In

Protected:
- `#signin-shell`
- `.signin-shell`
- `.auth-panel`
- sign-in/create-account form behavior
- vault/auth persistence logic

Status:
- Sign-in markup and auth/vault logic were not intentionally changed by this pass.

## Dashboard Animations

Protected:
- `#tab-dashboard`
- `.premium-dashboard-tab`
- `.premium-dashboard-frame`
- legacy dashboard iframe source: `legacy/YucatanaTrades-Premium-Dashboard.html`
- Dashboard animation classes and keyframes already present in the app

Status:
- Dashboard animation content remains isolated.
- New tab entrance animation is explicitly excluded for `#tab-dashboard`.
- Command-terminal panel styling excludes `#tab-dashboard` internals.
- Tab-specific background environments exclude `#tab-dashboard`.
- Reveal-on-scroll motion excludes `#tab-dashboard`.

## Meridian Animations

Protected:
- `#tab-meridian`
- `.meridian-frame`
- legacy Meridian iframe source: `legacy/MeridianYucaTanaStock-insight.html`
- Meridian animation classes and iframe behavior already present in the app

Status:
- Meridian animation content remains isolated.
- New tab entrance animation is explicitly excluded for `#tab-meridian`.
- Command-terminal panel styling excludes `#tab-meridian` internals.
- Tab-specific background environments exclude `#tab-meridian`.
- Reveal-on-scroll motion excludes `#tab-meridian`.

## Scope Boundary

The app shell around protected areas may move because the global navigation moved from top tabs to a left rail. The protected animation content itself should remain visually and functionally unchanged.
