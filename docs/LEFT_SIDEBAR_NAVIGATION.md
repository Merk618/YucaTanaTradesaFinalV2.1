# Left Sidebar Navigation

YucaTanaTrades now uses a left-side collapsible navigation rail for the primary application sections. The top utility bar is reserved for brand context, market clock/status, safety status, profile/account settings, and sign out.

## Structure

Left rail:
- Dashboard
- Meridian
- News
- Option Flows
- Stocks
- Crypto
- AIheatmap
- Crypto Hunter
- Portfolio
- Charts
- Settings

Top utility bar:
- YucaTanaTrades Terminal brand context
- Market status and Central Time clock
- Read-only / live-trading-off safety chips
- Profile/account settings
- Sign out

Ticker ribbon:
- Remains below the utility bar
- Aligns with the content area
- Does not overlap the rail

## Behavior

Desktop:
- Expanded rail is the default.
- The rail can collapse to icon-only mode.
- Active sections receive a gold edge, glow, and icon emphasis.
- Tab routing still uses the existing `showTab()` path.

Mobile:
- The rail becomes a slide-out drawer.
- The topbar menu button opens the drawer.
- Selecting a section closes the drawer.

## Safety Notes

This pass changes navigation layout only. It does not change provider routing, API keys, vault persistence, data accuracy, broker execution, paper trading, or live trading.
