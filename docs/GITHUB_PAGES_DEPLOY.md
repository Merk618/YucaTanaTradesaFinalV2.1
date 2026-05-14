# GitHub Pages Deploy

This project publishes the modular static build from `dist-web/`.

## Build The Site

From the repository root:

```powershell
npm install
npm run build:web
```

If npm is not available, the build script can also be run directly with Node:

```powershell
node scripts/build-dist-web.mjs
```

The build creates:

- `dist-web/index.html`
- `dist-web/styles/`
- `dist-web/scripts/`
- `dist-web/legacy/`
- `dist-web/.nojekyll`

The existing single-file export is preserved at `dist/YucaTanaTrades_SingleFile.html`.

## Upload To GitHub

1. Create a GitHub repository.
2. Push this repository to GitHub:

```powershell
git add .
git commit -m "Deploy modular YucaTanaTrades static build"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY-NAME.git
git push -u origin main
```

## Recommended Pages Setup

Use GitHub Actions or a `gh-pages` branch so the contents of `dist-web/` are served as the site root.

Recommended settings:

- GitHub repository: `Settings` > `Pages`
- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/`

To publish manually, copy the contents of `dist-web/` to the root of the `gh-pages` branch and push it. The hosted entry must be `index.html` at the branch root.

The site should then load at:

```text
https://USERNAME.github.io/REPOSITORY-NAME/
```

## Alternative Main Branch Setup

If you serve the repository root from `main`, the root `index.html` redirects to `dist-web/index.html`. This works, but the cleanest production URL comes from publishing the contents of `dist-web/` as the Pages root.

## Updating Later

1. Edit source files under `apps/web/`.
2. Run:

```powershell
npm run build:web
```

3. Commit the source and rebuilt `dist-web/`.
4. Push to GitHub.
5. If using `gh-pages`, update that branch with the latest `dist-web/` contents.

## API Notes

GitHub Pages is static hosting. The frontend can call public APIs such as CoinGecko and Binance WebSocket directly when browser/CORS/rate limits allow it. Private-key APIs such as Finnhub should use the Settings tab's API Proxy Base URL so secrets stay server-side.

When an API fails, the dashboard keeps rendering, marks fields as unavailable, and leaves retry controls active.
