# API Flow

## Frontend Flow

1. `apps/web/index.html` loads the static terminal shell.
2. Scoped modules mount only their own UI areas.
3. Provider settings are read from the Data / AI Provider Vault via `services/settings/providerSettings.js`.
4. Crypto Scanner Pro fetches CoinGecko/Binance data only when the user clicks Scan Now.
5. AIheatmap scans only when the tab engine is activated.
6. Direct price queries resolve explicit symbols before any LLM is used.
7. Missing provider data displays unavailable states, never fake market data.

## AI Flow

Perplexity:

```text
Frontend -> API_PROXY_BASE/perplexity/finance -> Cloudflare Worker -> Perplexity API
```

Local Ollama:

```text
Frontend -> http://127.0.0.1:11434/api/chat
```

Ollama is local-only and receives structured YucaTanaTrades context. Perplexity is used for cited/latest research through the proxy.

## Market Data Flow

Crypto:

```text
CoinGecko registry/snapshots + Binance public pairs/ticks
```

Stocks/options:

```text
MooMoo local bridge when enabled/running -> Finnhub fallback -> unavailable
```

Options:

```text
MooMoo options bridge only -> unavailable
```

## Retired Flow

The old generic `services/data/proxy/worker.js` and Python scanner/execution pipeline are not active production API paths after consolidation.
