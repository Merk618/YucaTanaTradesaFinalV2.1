export const COINGECKO_COIN_LIST_TTL_MS = 24 * 60 * 60 * 1000;
export const BINANCE_EXCHANGE_INFO_TTL_MS = 6 * 60 * 60 * 1000;

export const COMMON_CRYPTO_ASSETS = [
  { symbol: "BTC", id: "bitcoin", name: "Bitcoin" },
  { symbol: "ETH", id: "ethereum", name: "Ethereum" },
  { symbol: "SOL", id: "solana", name: "Solana" },
  { symbol: "XRP", id: "ripple", name: "XRP" },
  { symbol: "SUI", id: "sui", name: "Sui" },
  { symbol: "BNB", id: "binancecoin", name: "BNB" },
  { symbol: "AVAX", id: "avalanche-2", name: "Avalanche" },
  { symbol: "DOGE", id: "dogecoin", name: "Dogecoin" },
  { symbol: "XLM", id: "stellar", name: "Stellar" },
  { symbol: "PEPE", id: "pepe", name: "Pepe" },
  { symbol: "ADA", id: "cardano", name: "Cardano" },
  { symbol: "LINK", id: "chainlink", name: "Chainlink" },
  { symbol: "DOT", id: "polkadot", name: "Polkadot" },
  { symbol: "LTC", id: "litecoin", name: "Litecoin" },
  { symbol: "BCH", id: "bitcoin-cash", name: "Bitcoin Cash" },
  { symbol: "FET", id: "fetch-ai", name: "Artificial Superintelligence Alliance" },
];

const memoryCache = {
  coingecko: { timestamp: 0, list: [] },
  binance: { timestamp: 0, symbols: new Map() },
};

function now() {
  return Date.now();
}

function fromLocalStorage(key, ttlMs) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(key) || "null");
    if (!parsed || now() - Number(parsed.timestamp || 0) > ttlMs) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function toLocalStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify({ timestamp: now(), value }));
  } catch {
    // LocalStorage is optional in tests and locked-down browser contexts.
  }
}

function cleanProxyBase(apiProxyBase = "") {
  return String(apiProxyBase || "").trim().replace(/\/+$/, "");
}

async function fetchJson(fetchImpl, url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function knownCryptoBySymbol(symbol = "") {
  const clean = String(symbol || "").trim().toUpperCase();
  return COMMON_CRYPTO_ASSETS.filter((asset) => asset.symbol === clean);
}

export async function loadCoinGeckoCoinList({ fetchImpl = globalThis.fetch, apiProxyBase = "", force = false } = {}) {
  if (!force && memoryCache.coingecko.list.length && now() - memoryCache.coingecko.timestamp < COINGECKO_COIN_LIST_TTL_MS) {
    return memoryCache.coingecko.list;
  }
  const cached = !force ? fromLocalStorage("YTT_COINGECKO_COIN_LIST", COINGECKO_COIN_LIST_TTL_MS) : null;
  if (cached) {
    memoryCache.coingecko = { timestamp: now(), list: cached };
    return cached;
  }
  if (!fetchImpl) return COMMON_CRYPTO_ASSETS;
  const base = cleanProxyBase(apiProxyBase);
  const url = base ? `${base}/coingecko/coins/list` : "https://api.coingecko.com/api/v3/coins/list";
  try {
    const list = await fetchJson(fetchImpl, url);
    const normalized = Array.isArray(list)
      ? list.map((coin) => ({ id: coin.id, symbol: String(coin.symbol || "").toUpperCase(), name: coin.name || coin.id })).filter((coin) => coin.id && coin.symbol)
      : [];
    const merged = mergeKnownAssets(normalized);
    memoryCache.coingecko = { timestamp: now(), list: merged };
    toLocalStorage("YTT_COINGECKO_COIN_LIST", merged);
    return merged;
  } catch {
    return COMMON_CRYPTO_ASSETS;
  }
}

export async function loadBinanceExchangeInfo({ fetchImpl = globalThis.fetch, force = false } = {}) {
  if (!force && memoryCache.binance.symbols.size && now() - memoryCache.binance.timestamp < BINANCE_EXCHANGE_INFO_TTL_MS) {
    return memoryCache.binance.symbols;
  }
  const cached = !force ? fromLocalStorage("YTT_BINANCE_EXCHANGE_INFO", BINANCE_EXCHANGE_INFO_TTL_MS) : null;
  if (cached) {
    const symbols = new Map(cached.map((item) => [item.baseAsset, item]));
    memoryCache.binance = { timestamp: now(), symbols };
    return symbols;
  }
  if (!fetchImpl) return fallbackBinanceSymbols();
  try {
    const payload = await fetchJson(fetchImpl, "https://api.binance.com/api/v3/exchangeInfo");
    const rows = Array.isArray(payload.symbols) ? payload.symbols : [];
    const usdtPairs = rows
      .filter((row) => row.status === "TRADING" && row.quoteAsset === "USDT")
      .map((row) => ({ baseAsset: row.baseAsset, symbol: row.symbol, quoteAsset: row.quoteAsset }));
    const symbols = new Map(usdtPairs.map((item) => [item.baseAsset, item]));
    for (const [symbol, item] of fallbackBinanceSymbols()) {
      if (!symbols.has(symbol)) symbols.set(symbol, item);
    }
    memoryCache.binance = { timestamp: now(), symbols };
    toLocalStorage("YTT_BINANCE_EXCHANGE_INFO", Array.from(symbols.values()));
    return symbols;
  } catch {
    return fallbackBinanceSymbols();
  }
}

function mergeKnownAssets(list) {
  const byKey = new Map(list.map((asset) => [`${asset.symbol}:${asset.id}`, asset]));
  for (const asset of COMMON_CRYPTO_ASSETS) byKey.set(`${asset.symbol}:${asset.id}`, asset);
  return Array.from(byKey.values());
}

function fallbackBinanceSymbols() {
  return new Map([
    ["BTC", { baseAsset: "BTC", symbol: "BTCUSDT", quoteAsset: "USDT" }],
    ["ETH", { baseAsset: "ETH", symbol: "ETHUSDT", quoteAsset: "USDT" }],
    ["SOL", { baseAsset: "SOL", symbol: "SOLUSDT", quoteAsset: "USDT" }],
    ["XRP", { baseAsset: "XRP", symbol: "XRPUSDT", quoteAsset: "USDT" }],
    ["SUI", { baseAsset: "SUI", symbol: "SUIUSDT", quoteAsset: "USDT" }],
    ["XLM", { baseAsset: "XLM", symbol: "XLMUSDT", quoteAsset: "USDT" }],
    ["PEPE", { baseAsset: "PEPE", symbol: "PEPEUSDT", quoteAsset: "USDT" }],
  ]);
}
