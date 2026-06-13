# Deployment

YucaTanaTrades production deployment is a static GitHub Pages frontend plus an optional secure Cloudflare Worker for Perplexity Finance.

## Static Frontend

Source:

```text
apps/web
```

Build:

```powershell
npm run build:web
```

Deployable output:

```text
dist-web/
```

The build script also mirrors `dist-web` to the repository root for GitHub Pages compatibility.

## Secure AI Proxy

Perplexity research must go through:

```text
workers/perplexity-proxy
```

Required Cloudflare Worker secret:

```text
PERPLEXITY_API_KEY
```

Set the secret with Wrangler:

```powershell
cd workers/perplexity-proxy
wrangler secret put PERPLEXITY_API_KEY
wrangler deploy
```

Frontend setting:

```text
Settings/Admin -> API_PROXY_BASE
```

The frontend endpoint contract is:

```text
POST API_PROXY_BASE/perplexity/finance
```

## Retired Production Paths

The old generic proxy under `services/data/proxy`, Python scanner/strategy services, and broker execution experiments are not part of the active production deployment. They should remain quarantined for reference until explicitly reviewed.

## Safety Rules

- Do not store Perplexity keys in the frontend.
- Do not add active broker/exchange keys to GitHub Pages.
- Do not enable live trading.
- Do not deploy prototype/mock-data pages as production source of truth.
