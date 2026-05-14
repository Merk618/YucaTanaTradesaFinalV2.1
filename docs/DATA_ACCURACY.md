# Data Accuracy

The main repo data systems are the source of truth for YucaTanaTrades financial data.

## Source Of Truth

Use:

- `services/data` for provider API integrations.
- `services/scanners` for candidate detection and ranking.
- `services/strategies` for RSI, MACD, VWAP, support, resistance, setup scoring, backtests, and risk.
- `services/execution` for guarded broker/order behavior.

## Enhanced Heatmap Rule

`apps/web/legacy/YucaTanaTrades_Enhancedv23HeatmapExpandAnimation.html` is UI-only. It may inspire:

- click interactions,
- inline expansion,
- ripple animation,
- gold terminal styling,
- deep-dive drawer behavior,
- performance-lite/reduced-motion behavior.

It must not supply production prices, rankings, RSI, MACD, support/resistance, volume, catalysts, conviction scores, or thesis text.

## Mock/Static Values

Mock/static financial values are forbidden in production views. If a provider is unavailable, show:

```text
Data unavailable — retrying
```

or shimmer placeholders.

## Data Quality

All production asset rows use:

- `LIVE`
- `DELAYED`
- `FALLBACK`
- `UNAVAILABLE`

The UI displays this label subtly on heatmap tiles and detail panels.

## API Failure Behavior

API failures should:

- keep the UI interactive,
- leave missing cells shimmered or unavailable,
- log or show a source-status message,
- retry on the next scan.

API failures should not:

- crash the dashboard,
- silently switch to mock values,
- fabricate thesis or technical metrics.

## Rate Limits

When rate-limited, keep the last valid provider label if cached data exists and mark it `DELAYED` or `FALLBACK`. If no valid data exists, mark `UNAVAILABLE`.
