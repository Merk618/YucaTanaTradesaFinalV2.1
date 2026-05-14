# YucaTanaTrades System Architecture

YucaTanaTrades is organized as a modular trading intelligence platform with clear boundaries between UI, data providers, scanners, strategies, and execution.

## Primary App Shell

The primary app shell is `apps/web/index.html`. It was chosen because it is the cleanest current v2 shell: it already includes the source-health command center, AI drawer, settings vault, TradingView widget usage, scanner tables, and deployment proxy support. The root `index.html` redirects to this shell for compatibility.

## Applications

- `apps/web/index.html` is the production web shell.
- `apps/web/legacy` preserves standalone prototypes and experiments.
- `apps/web/components` contains UI-adjacent Python terminal components and future web component modules.
- `apps/web/styles` and `apps/web/scripts` contain extracted production UI behavior such as the heatmap module.

## Service Layers

- `services/data` owns provider integrations and provider-to-AssetRow adapters.
- `services/scanners` detects and ranks candidates only.
- `services/strategies` calculates indicators, backtests, risk, support/resistance, setup labels, and portfolio logic.
- `services/execution` owns broker adapters, order routing, alerts, webhooks, and execution guardrails.
- `services/intelligence` is reserved for macro, news, sentiment, and AI research services.

## Shared Layer

- `shared/types` defines the normalized `AssetRow` and `DataQuality` contract.
- `shared/config` owns feature flags and environment-file loading.
- `shared/constants` contains cross-layer constants.
- `shared/utils` contains common utilities such as logging.

## Safety Rule

The UI must not place live trades directly. Broker calls live in `services/execution`, live trading is disabled by default, and execution requests must pass risk/feature-flag validation.
