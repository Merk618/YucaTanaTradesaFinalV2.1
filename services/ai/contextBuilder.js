const MAX_WATCHLIST = 20;
const MAX_SCANNER_ROWS = 12;

function compactObject(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.slice(0, MAX_SCANNER_ROWS).map((item) => compactObject(item, depth + 1));
  if (depth > 2 || typeof value !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
      .slice(0, 24)
      .map(([key, entry]) => [key, compactObject(entry, depth + 1)])
  );
}

function selectedAssetFromState(state = {}) {
  if (state.symbolIntent?.selectedAsset) return state.symbolIntent.selectedAsset;
  const selectedSymbol = state.selectedSymbol || state.ticker || state.crypto || state.heatmapSelection?.symbol || state.heatmapSelection;
  if (!selectedSymbol) return null;
  const symbol = String(selectedSymbol).toUpperCase();
  const stock = state.stockQuotes?.[symbol];
  const crypto = state.cryptoMarkets?.[symbol];
  return {
    symbol,
    assetType: crypto ? "crypto" : "stock",
    quote: stock ? compactObject(stock) : null,
    market: crypto ? compactObject(crypto) : null,
  };
}

export function buildPerplexityContext(state = {}) {
  const selectedAsset = selectedAssetFromState(state);
  return {
    selectedTab: state.activeTab || "dashboard",
    selectedAsset,
    symbolIntent: compactObject(state.symbolIntent || null),
    resolution: compactObject(state.symbolIntent?.metadata || null),
    watchlist: Array.isArray(state.watchlist) ? state.watchlist.slice(0, MAX_WATCHLIST) : [],
    externalSignals: Array.isArray(state.externalSignals) ? compactObject(state.externalSignals) : [],
    marketContext: {
      stockQuotes: compactObject(state.stockQuotes || {}),
      cryptoMarkets: compactObject(state.cryptoMarkets || {}),
      sourceHealth: compactObject(state.sourceHealth || {}),
      symbolResolution: compactObject(state.symbolIntent?.metadata || {}),
      newsCount: Number(state.newsCount || 0),
    },
    scannerContext: compactObject(state.scannerContext || {}),
    heatmapSelection: compactObject(state.heatmapSelection || null),
    dataBoundary: "Use loaded YucaTanaTrades data as context only. Do not fabricate missing quote, RSI, MACD, support, resistance, catalyst, or valuation fields.",
  };
}

export function inferTickerFromQuery(query = "") {
  const match = String(query).toUpperCase().match(/\b[A-Z]{1,5}(?:\.[A-Z])?\b/);
  return match ? match[0] : "";
}
