# YucaTanaTrades Deployment

## Local Development

Install dependencies, then run Vite:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints in the terminal. The dev server serves `apps/web/`.

If npm is not installed on the machine, open `apps/web/index.html` directly for a limited static preview, or install Node.js with npm before running the Vite scripts.

## Modular GitHub Pages Build

Build the deploy-ready modular site:

```powershell
npm run build:web
```

Direct Node fallback:

```powershell
node scripts/build-dist-web.mjs
```

Output:

- `dist-web/index.html`
- `dist-web/styles/heatmap.css`
- `dist-web/scripts/heatmap.js`
- `dist-web/legacy/*.html`
- `dist-web/.nojekyll`

Deploy the contents of `dist-web/` as the GitHub Pages site root. This supports repository subpath hosting such as:

```text
https://username.github.io/repository-name/
```

## Single-File Export

The single-file build remains separate:

```text
dist/YucaTanaTrades_SingleFile.html
```

Use it when you need one portable HTML file. Do not replace the modular `dist-web/` build with the single-file export unless that is the intended deployment target.

## Environment And Config Notes

The GitHub Pages build is static. It cannot safely store server secrets.

Use local browser storage only for personal testing keys. For hosted production, configure an API proxy and set its URL in:

```text
Settings > API Proxy Base URL
```

Expected behavior:

- CoinGecko crypto data loads from public API when available.
- Binance crypto ticker updates use public WebSocket streams.
- TradingView stays as an external embed script.
- Finnhub stock quotes require a local key or server-side proxy.
- Missing or blocked APIs show unavailable states instead of fabricated values.

## Releasing Updates

1. Edit source in `apps/web/`.
2. Run `npm run build:web`.
3. Check that `dist-web/index.html` has no `D:/`, `C:/`, or `file:///` paths.
4. Commit the source and build output.
5. Push to GitHub and update the Pages branch or deployment workflow.
