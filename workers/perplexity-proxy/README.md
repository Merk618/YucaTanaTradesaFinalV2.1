# YucaTanaTrades Perplexity Proxy Worker

Secure Cloudflare Worker proxy for the YucaTanaTrades Perplexity Finance Research UI.

The public GitHub Pages frontend calls this Worker at:

```text
POST API_PROXY_BASE/perplexity/finance
```

The Worker then calls Perplexity with the server-side secret `PERPLEXITY_API_KEY`.

## Deploy

1. Install Wrangler:

```bash
npm install -g wrangler
```

2. Login:

```bash
wrangler login
```

3. Add the Perplexity secret:

```bash
wrangler secret put PERPLEXITY_API_KEY
```

4. Deploy from this folder:

```bash
cd workers/perplexity-proxy
wrangler deploy
```

5. Test health:

```bash
curl https://YOUR-WORKER.workers.dev/health
```

6. Add the Worker URL to YucaTanaTrades:

```text
Settings/Admin -> Perplexity AI -> API_PROXY_BASE
```

Example:

```text
https://YOUR-WORKER.workers.dev
```

## Local Development

```bash
cd workers/perplexity-proxy
wrangler dev
```

Test a request:

```bash
curl -X POST http://127.0.0.1:8787/perplexity/finance \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"Why is NVDA moving?\",\"mode\":\"Why Is This Moving?\",\"ticker\":\"NVDA\",\"assetType\":\"stock\",\"selectedTab\":\"stocks\"}"
```

## Routes

- `GET /health`
- `OPTIONS *`
- `POST /perplexity/finance`

## Security Notes

- Never commit `PERPLEXITY_API_KEY`.
- Never place a Perplexity API key in GitHub Pages frontend code.
- This Worker does not place trades, call brokers, or enable live trading.
- The lightweight in-memory cooldown is not durable. For production abuse prevention, add Cloudflare WAF rules, Turnstile, Access, or a durable rate limiter.
