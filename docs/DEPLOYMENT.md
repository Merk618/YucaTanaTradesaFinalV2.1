# Deployment

## Static Web App

Open `apps/web/index.html` for local static usage. The root `index.html` redirects there for compatibility.

Security limitation: local static HTML can store API keys only in browser storage. This is acceptable for local-only development with warnings, but production should use the proxy.

## API Proxy

Deploy `services/data/proxy/worker.js` with Cloudflare Workers. `wrangler.toml` already points at the modular Worker path.

Set Worker secrets:

```text
FINNHUB_API_KEY=
TRADIER_API_KEY=
TRADIER_BASE_URL=https://sandbox.tradier.com/v1
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

In the app, set `API PROXY BASE URL` in Settings.

## Python Services

Environment files are supported at repo root:

- `.env.local`
- `.env.staging`
- `.env.production`

Run the compatibility entrypoint:

```bash
python main.py
```

Live trading is disabled by default. Paper trading is enabled by default.
