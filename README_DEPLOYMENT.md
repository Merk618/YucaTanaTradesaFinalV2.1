# YucaTanaTrades Deployment

## Production Repo

Use `D:\YucaTanaTrades` as the source-of-truth production repo. Replit/CodePen exports and design-reference projects are reference material only and should not be imported as production code.

## Local Development

```powershell
npm install
npm run dev
```

Vite serves `apps/web/`. Opening `apps/web/index.html` directly can provide a limited static preview, but module imports and browser security rules are better exercised through the dev server.

## GitHub Pages Build

```powershell
npm run build:web
```

Output:

- `dist-web/index.html`
- `dist-web/scripts/*`
- `dist-web/styles/*`
- `dist-web/services/*`
- `dist-web/legacy/*`
- `dist-web/.nojekyll`
- mirrored root `index.html`, `scripts/`, `styles/`, `legacy/`, `.nojekyll`

The root mirror exists for GitHub Pages compatibility. Do not hand-edit root build output; edit `apps/web` and `services`, then rebuild.

## Perplexity Worker

The production Perplexity proxy is:

```text
workers/perplexity-proxy
```

Deploy from that directory:

```powershell
cd workers/perplexity-proxy
wrangler secret put PERPLEXITY_API_KEY
wrangler deploy
```

The frontend calls:

```text
API_PROXY_BASE/perplexity/finance
```

Never place a Perplexity API key in frontend code, localStorage defaults, or GitHub Pages output.

## Provider Settings

Provider configuration is managed in Settings/Admin and by `services/settings/providerSettings.js`.

Active frontend/provider settings include:

- Finnhub fallback key
- FRED key
- Alpha Vantage key
- FMP key
- MarketAux key
- optional CoinGecko key
- SEC User-Agent contact
- API proxy base URL
- Local Ollama endpoint/model
- MooMoo local bridge URL
- External signal preferences

Broker/exchange execution keys are not active production settings.

## Release Checklist

1. Run tests.
2. Run `npm run build:web`.
3. Confirm `.nojekyll` exists at root and in `dist-web`.
4. Confirm `dist/YucaTanaTrades_SingleFile.html` still exists.
5. Scan for local paths and hardcoded secrets.
6. Browser smoke: Dashboard, Crypto, AIheatmap, Stocks, Settings/Admin, and YucaTana AI.
7. Confirm live trading and broker/exchange execution remain disabled.
