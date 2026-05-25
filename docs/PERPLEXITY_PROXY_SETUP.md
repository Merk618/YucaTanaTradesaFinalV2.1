# Perplexity Proxy Setup

YucaTanaTrades uses a proxy-only Perplexity architecture:

```text
GitHub Pages frontend -> API_PROXY_BASE -> Cloudflare Worker -> Perplexity API
```

The frontend must never contain the Perplexity API key. The key belongs only in Cloudflare as a Worker secret named `PERPLEXITY_API_KEY`.

## Files

```text
workers/perplexity-proxy/worker.js
workers/perplexity-proxy/wrangler.toml
workers/perplexity-proxy/README.md
```

## Install Wrangler

```bash
npm install -g wrangler
```

## Login

```bash
wrangler login
```

## Add the Secret

Run this from `workers/perplexity-proxy`:

```bash
wrangler secret put PERPLEXITY_API_KEY
```

Paste the Perplexity API key when Wrangler prompts for it. Do not add the key to `wrangler.toml`, `.env`, frontend JavaScript, or documentation.

## Deploy

```bash
cd workers/perplexity-proxy
wrangler deploy
```

Wrangler will print a URL similar to:

```text
https://ytt-perplexity-proxy.YOUR-SUBDOMAIN.workers.dev
```

## Test Health

```bash
curl https://YOUR-WORKER.workers.dev/health
```

Expected shape:

```json
{
  "service": "ytt-perplexity-proxy",
  "status": "ok",
  "perplexityConfigured": true,
  "timestamp": "2026-05-24T00:00:00.000Z"
}
```

## Test Finance Research

```bash
curl -X POST https://YOUR-WORKER.workers.dev/perplexity/finance \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"Why is NVDA moving today?\",\"mode\":\"Why Is This Moving?\",\"ticker\":\"NVDA\",\"assetType\":\"stock\",\"selectedTab\":\"stocks\",\"watchlist\":[],\"marketContext\":{},\"scannerContext\":{},\"sourceHealth\":{}}"
```

Expected normalized response fields:

```json
{
  "answer": "...",
  "citations": [],
  "sources": [],
  "tickers": ["NVDA"],
  "timestamp": "2026-05-24T00:00:00.000Z",
  "categories": ["Why Is This Moving?", "stock", "stocks"],
  "dataQuality": "WEB-GROUNDED",
  "latencyMs": 1234
}
```

## Connect the Frontend

Open YucaTanaTrades:

```text
Settings/Admin -> Perplexity AI -> API_PROXY_BASE
```

Set it to the Worker origin only:

```text
https://YOUR-WORKER.workers.dev
```

Do not include `/perplexity/finance`; the frontend adds the endpoint path automatically.

## CORS

The Worker allows:

- `https://Merk618.github.io`
- `https://merk618.github.io`
- GitHub Pages project paths under `https://merk618.github.io`
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:5500`

Browser CORS origins do not include path names, so `https://Merk618.github.io/YucaTanaTradesaFinalV2.1` is covered by the `https://merk618.github.io` origin rule.

## Failure Behavior

- Missing API key returns `503` and `dataQuality: "UNAVAILABLE"`.
- Bad requests return `400`.
- Upstream Perplexity failures return `502`.
- Timeouts return `504`.
- Empty queries and queries over 4000 characters are rejected.

## Production Hardening

The Worker includes a small in-memory cooldown for basic abuse resistance. Cloudflare isolates are ephemeral, so production deployments should add one or more durable controls:

- Cloudflare WAF rate limiting
- Turnstile on public AI actions
- Durable Object or KV-backed rate limits
- Cloudflare Access for private/admin deployments
