# Perplexity Proxy Testing

Use these checks before pointing the public YucaTanaTrades GitHub Pages frontend at a Worker.

## Health Check

```bash
curl -X GET https://YOUR-WORKER.workers.dev/health
```

Expected shape:

```json
{
  "service": "ytt-perplexity-proxy",
  "status": "ok",
  "perplexityConfigured": true,
  "timestamp": "2026-05-27T00:00:00.000Z"
}
```

## Finance Research Check

Run this from `workers/perplexity-proxy`:

```bash
curl -X POST https://YOUR-WORKER.workers.dev/perplexity/finance \
  -H "Content-Type: application/json" \
  -d @test-request.example.json
```

From the repository root, use `-d @workers/perplexity-proxy/test-request.example.json`.

Expected normalized response fields:

```json
{
  "answer": "...",
  "citations": [],
  "sources": [],
  "tickers": ["NVDA"],
  "timestamp": "2026-05-27T00:00:00.000Z",
  "categories": ["Why Is This Moving?", "stock", "stocks"],
  "dataQuality": "WEB-GROUNDED",
  "latencyMs": 1200
}
```

## Rate Limit Check

Send the same POST twice within five seconds. The second request should return:

```json
{
  "error": "Rate limit active. Please wait before asking another research question.",
  "dataQuality": "UNAVAILABLE"
}
```

with HTTP `429` and a `Retry-After: 5` header.

## Browser Testing

1. Open the YucaTanaTrades live site.
2. Go to Settings/Admin.
3. Paste the Worker origin into `API_PROXY_BASE`.
4. Open AI Lab.
5. Ask a Perplexity Finance question.
6. Confirm a `WEB-GROUNDED` response with sources or citations when Perplexity returns them.
7. Ask again immediately and confirm the local cooldown prevents duplicate spam.
8. Use Settings/Admin -> Perplexity AI -> Check Proxy Health and confirm Source Health shows `CONNECTED`, `DEGRADED`, `RATE LIMITED`, or `FAILED` instead of crashing.

## Failure Cases To Verify

- Empty query returns HTTP `400`.
- Query over 4000 characters returns HTTP `400`.
- Missing `PERPLEXITY_API_KEY` returns HTTP `503`.
- Worker cooldown returns HTTP `429`.
- Perplexity upstream failure returns HTTP `502`.
- Timeout returns HTTP `504`.

The public frontend must never contain a Perplexity API key. It should only store the Worker URL in `API_PROXY_BASE`.
