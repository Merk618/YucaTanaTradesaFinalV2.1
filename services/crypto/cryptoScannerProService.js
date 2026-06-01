import {
  binancePairForSymbol,
  buildCryptoSignalAlerts,
  buildCryptoTopMovers,
  classifyCryptoSignal,
  computeCryptoCategoryHeat,
  cryptoCategoryForSymbol,
  filterCryptoScannerRows,
  normalizeCryptoScannerSymbol,
  signalRank,
} from "./cryptoScannerSignals.js";

export const COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";
export const CRYPTO_SCANNER_DEFAULTS = {
  perPage: 100,
  pages: [1],
  vsCurrency: "usd",
  timeoutMs: 9000,
};

function finite(value) {
  return Number.isFinite(Number(value));
}

function safeNumber(value, fallback = null) {
  return finite(value) ? Number(value) : fallback;
}

function normalizeSparkline(value) {
  const prices = Array.isArray(value?.prices) ? value.prices : [];
  return prices.map((item) => Number(item)).filter(Number.isFinite).slice(-48);
}

function readStorageValue(keys = [], storage = globalThis.localStorage) {
  for (const key of keys) {
    try {
      const value = storage?.getItem?.(key);
      if (value) return value;
    } catch {
      return "";
    }
  }
  return "";
}

export function getCoinGeckoApiKey({ storage = globalThis.localStorage } = {}) {
  return readStorageValue(["COINGECKO_API_KEY", "COINGECKO_KEY", "YTT_COINGECKO_API_KEY"], storage);
}

export function normalizeCoinGeckoMarket(coin = {}, timestamp = new Date().toISOString()) {
  const symbol = normalizeCryptoScannerSymbol(coin.symbol);
  const signalData = classifyCryptoSignal({
    symbol,
    change1h: coin.price_change_percentage_1h_in_currency,
    change24h: coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h,
    change7d: coin.price_change_percentage_7d_in_currency,
    volume: coin.total_volume,
    marketCap: coin.market_cap,
    rank: coin.market_cap_rank,
  });
  return {
    id: coin.id || symbol.toLowerCase(),
    rank: safeNumber(coin.market_cap_rank),
    symbol,
    displaySymbol: symbol,
    name: coin.name || symbol,
    assetType: "crypto",
    category: cryptoCategoryForSymbol(symbol),
    price: safeNumber(coin.current_price),
    change1h: safeNumber(coin.price_change_percentage_1h_in_currency),
    change24h: safeNumber(coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h),
    change7d: safeNumber(coin.price_change_percentage_7d_in_currency),
    volume: safeNumber(coin.total_volume),
    marketCap: safeNumber(coin.market_cap),
    image: coin.image || "",
    sparkline: normalizeSparkline(coin.sparkline_in_7d),
    binancePair: binancePairForSymbol(symbol),
    tradingViewSymbol: binancePairForSymbol(symbol) ? `BINANCE:${binancePairForSymbol(symbol)}` : "",
    signal: signalData.signal,
    signalSource: signalData.source,
    signalReason: signalData.reason,
    source: "CoinGecko",
    provider: "CoinGecko",
    dataQuality: finite(coin.current_price) ? "RECENT" : "UNAVAILABLE",
    timestamp: coin.last_updated || timestamp,
  };
}

function coingeckoUrl(page, options = {}) {
  const params = new URLSearchParams({
    vs_currency: options.vsCurrency || CRYPTO_SCANNER_DEFAULTS.vsCurrency,
    order: "market_cap_desc",
    per_page: String(options.perPage || CRYPTO_SCANNER_DEFAULTS.perPage),
    page: String(page),
    sparkline: "true",
    price_change_percentage: "1h,24h,7d",
  });
  return `${COINGECKO_MARKETS_URL}?${params.toString()}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = CRYPTO_SCANNER_DEFAULTS.timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await (options.fetchImpl || fetch)(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(`CoinGecko request failed with HTTP ${response.status}`);
      error.status = response.status === 429 ? "RATE_LIMITED" : "FAILED";
      error.httpStatus = response.status;
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      const timeout = new Error("CoinGecko request timed out");
      timeout.status = "TIMEOUT";
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMarketsPage(page, options = {}) {
  const directUrl = coingeckoUrl(page, options);
  const apiProxyBase = String(options.apiProxyBase || "").replace(/\/+$/, "");
  const url = apiProxyBase ? `${apiProxyBase}/coingecko/markets?${directUrl.split("?")[1]}` : directUrl;
  const headers = { Accept: "application/json" };
  if (options.coinGeckoApiKey) headers["x-cg-demo-api-key"] = options.coinGeckoApiKey;
  return fetchWithTimeout(url, { method: "GET", headers, fetchImpl: options.fetchImpl }, options.timeoutMs || CRYPTO_SCANNER_DEFAULTS.timeoutMs);
}

function dedupeRows(rows = []) {
  const bySymbol = new Map();
  for (const row of rows) {
    if (!row.symbol) continue;
    const existing = bySymbol.get(row.symbol);
    if (!existing || Number(row.rank || 999999) < Number(existing.rank || 999999)) bySymbol.set(row.symbol, row);
  }
  return [...bySymbol.values()];
}

function sortScannerRows(rows = []) {
  return rows.slice().sort((a, b) => {
    const signalDelta = signalRank(a.signal) - signalRank(b.signal);
    if (signalDelta !== 0) return signalDelta;
    return Math.abs(Number(b.change24h || 0)) - Math.abs(Number(a.change24h || 0));
  });
}

function sessionStats(rows = [], allRows = []) {
  const gainers = rows.filter((row) => Number(row.change24h || 0) > 0).length;
  const avgChange = rows.length ? rows.reduce((sum, row) => sum + Number(row.change24h || 0), 0) / rows.length : null;
  return {
    scanned: allRows.length,
    matched: rows.length,
    gainers,
    decliners: rows.length - gainers,
    avgChange,
    generatedAt: new Date().toISOString(),
  };
}

export async function runCryptoScannerProScan(options = {}) {
  const timestamp = new Date().toISOString();
  const pages = Array.isArray(options.pages) && options.pages.length ? options.pages : CRYPTO_SCANNER_DEFAULTS.pages;
  const warnings = [];
  const pageResults = [];
  const coinGeckoApiKey = options.coinGeckoApiKey ?? getCoinGeckoApiKey({ storage: options.storage });

  for (const page of pages) {
    try {
      const pageData = await fetchMarketsPage(page, { ...options, coinGeckoApiKey });
      if (Array.isArray(pageData)) pageResults.push(...pageData);
    } catch (error) {
      warnings.push(error.status === "RATE_LIMITED" ? "CoinGecko rate limited this scan." : error.message);
      if (page === pages[0]) {
        return {
          rows: [],
          allRows: [],
          topMovers: [],
          alerts: [],
          categoryHeat: computeCryptoCategoryHeat([]),
          stats: sessionStats([], []),
          lastScanAt: timestamp,
          dataQuality: error.status === "RATE_LIMITED" ? "RATE_LIMITED" : "UNAVAILABLE",
          providerMetadata: {
            coinGecko: error.status === "RATE_LIMITED" ? "RATE_LIMITED" : "FAILED",
            binance: "NOT_STARTED",
            source: "CoinGecko",
            warnings,
          },
        };
      }
    }
  }

  const allRows = dedupeRows(pageResults.map((coin) => normalizeCoinGeckoMarket(coin, timestamp)));
  const rows = sortScannerRows(filterCryptoScannerRows(allRows, options.filters || {})).slice(0, options.limit || 100);
  return {
    rows,
    allRows,
    topMovers: buildCryptoTopMovers(rows),
    alerts: buildCryptoSignalAlerts(rows, timestamp),
    categoryHeat: computeCryptoCategoryHeat(rows),
    stats: sessionStats(rows, allRows),
    lastScanAt: timestamp,
    dataQuality: rows.length ? "RECENT" : "UNAVAILABLE",
    providerMetadata: {
      coinGecko: rows.length ? "CONNECTED" : "EMPTY",
      binance: "READY_FOR_STREAM",
      coinGeckoKeyMode: coinGeckoApiKey ? "SAVED_KEY" : "PUBLIC_NO_KEY",
      source: "CoinGecko",
      warnings,
    },
  };
}
