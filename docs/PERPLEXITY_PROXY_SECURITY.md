# Perplexity Proxy Security

YucaTanaTrades is hosted publicly on GitHub Pages, so frontend code is visible to everyone. Private API keys must never be shipped to the browser.

## Why Frontend Keys Are Forbidden

If a Perplexity API key is placed in JavaScript, HTML, local storage defaults, or a public config file, anyone can view it in DevTools or by downloading the site. That would allow unauthorized usage, billing abuse, and key rotation incidents.

The only supported architecture is:

```text
YucaTanaTrades GitHub Pages frontend
-> API_PROXY_BASE
-> Cloudflare Worker
-> Perplexity API
```

The Worker reads the secret only from:

```text
env.PERPLEXITY_API_KEY
```

That value must be configured with:

```bash
wrangler secret put PERPLEXITY_API_KEY
```

## What Data Is Sent to Perplexity

The Worker forwards the research request and limited platform context:

- user query
- research mode
- selected ticker or crypto asset
- selected asset type
- selected YucaTanaTrades tab
- watchlist context
- market context supplied by the app
- scanner context supplied by the app
- source health context

The Worker does not send broker credentials, order instructions, account identifiers, or private execution state.

## No Broker Execution

The Perplexity proxy is research-only. It does not:

- place trades
- route orders
- call broker APIs
- enable live trading
- modify risk settings
- execute webhooks

Live trading remains disabled by default in YucaTanaTrades. Any future execution feature must stay behind the existing execution and risk layers.

## Response Safety

The Worker normalizes Perplexity responses into:

```json
{
  "answer": "...",
  "citations": [],
  "sources": [],
  "tickers": [],
  "timestamp": "...",
  "categories": [],
  "dataQuality": "WEB-GROUNDED",
  "latencyMs": 0
}
```

If Perplexity is unavailable, the Worker returns `dataQuality: "UNAVAILABLE"` with a safe error message. It never returns raw secrets or Perplexity credentials.

## Abuse Protection

The Worker includes:

- empty query rejection
- 4000 character query limit
- request body size limit
- 20 second upstream timeout
- five-second lightweight in-memory cooldown
- restricted production CORS allowlist

The cooldown is intentionally lightweight and not durable. Production hardening should add Cloudflare WAF rules, Turnstile, Durable Object rate limits, or Access controls.
