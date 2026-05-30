import { routeStockQuote } from "./stockQuoteRouter.js";

export const AI_HEATMAP_CRYPTO_UNIVERSE = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin", category: "Bitcoin", binancePair: "BTCUSDT" },
  { symbol: "ETH", name: "Ethereum", id: "ethereum", category: "Ethereum", binancePair: "ETHUSDT" },
  { symbol: "SOL", name: "Solana", id: "solana", category: "Solana", binancePair: "SOLUSDT" },
  { symbol: "XRP", name: "XRP", id: "ripple", category: "XRP Ledger", binancePair: "XRPUSDT" },
  { symbol: "XLM", name: "Stellar", id: "stellar", category: "Payments", binancePair: "XLMUSDT" },
  { symbol: "SUI", name: "Sui", id: "sui", category: "Layer 1", binancePair: "SUIUSDT" },
  { symbol: "DOGE", name: "Dogecoin", id: "dogecoin", category: "Meme", binancePair: "DOGEUSDT" },
  { symbol: "ADA", name: "Cardano", id: "cardano", category: "Layer 1", binancePair: "ADAUSDT" },
  { symbol: "AVAX", name: "Avalanche", id: "avalanche-2", category: "Layer 1", binancePair: "AVAXUSDT" },
  { symbol: "LINK", name: "Chainlink", id: "chainlink", category: "Oracle", binancePair: "LINKUSDT" },
  { symbol: "PEPE", name: "Pepe", id: "pepe", category: "Meme", binancePair: "PEPEUSDT" },
  { symbol: "BNB", name: "BNB", id: "binancecoin", category: "Exchange", binancePair: "BNBUSDT" },
  { symbol: "TRX", name: "TRON", id: "tron", category: "Layer 1", binancePair: "TRXUSDT" },
  { symbol: "LTC", name: "Litecoin", id: "litecoin", category: "Payments", binancePair: "LTCUSDT" },
  { symbol: "BCH", name: "Bitcoin Cash", id: "bitcoin-cash", category: "Payments", binancePair: "BCHUSDT" },
  { symbol: "NEAR", name: "NEAR Protocol", id: "near", category: "Layer 1", binancePair: "NEARUSDT" },
  { symbol: "FET", name: "Artificial Superintelligence Alliance", id: "artificial-superintelligence-alliance", category: "AI Token", binancePair: "FETUSDT" },
  { symbol: "RNDR", name: "Render", id: "render-token", category: "AI / Compute", binancePair: "RNDRUSDT" },
  { symbol: "ATOM", name: "Cosmos Hub", id: "cosmos", category: "Interoperability", binancePair: "ATOMUSDT" },
  { symbol: "DOT", name: "Polkadot", id: "polkadot", category: "Interoperability", binancePair: "DOTUSDT" },
  { symbol: "HBAR", name: "Hedera", id: "hedera-hashgraph", category: "Enterprise L1", binancePair: "HBARUSDT" },
  { symbol: "ARB", name: "Arbitrum", id: "arbitrum", category: "Layer 2", binancePair: "ARBUSDT" },
  { symbol: "SHIB", name: "Shiba Inu", id: "shiba-inu", category: "Meme", binancePair: "SHIBUSDT" },
  { symbol: "WIF", name: "dogwifhat", id: "dogwifcoin", category: "Meme", binancePair: "WIFUSDT" },
  { symbol: "GRT", name: "The Graph", id: "the-graph", category: "Data", binancePair: "GRTUSDT" },
];

export const AI_HEATMAP_STOCK_UNIVERSE = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", sector: "Mega Cap Tech" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", sector: "Cloud / AI" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", sector: "EV / Autonomy" },
  { symbol: "META", name: "Meta Platforms", exchange: "NASDAQ", sector: "AI / Ads" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "SOFI", name: "SoFi Technologies", exchange: "NASDAQ", sector: "Fintech" },
  { symbol: "PLTR", name: "Palantir Technologies", exchange: "NASDAQ", sector: "AI Software" },
  { symbol: "SNOW", name: "Snowflake", exchange: "NYSE", sector: "Cloud Data" },
  { symbol: "NOW", name: "ServiceNow", exchange: "NYSE", sector: "Enterprise Software" },
  { symbol: "ANET", name: "Arista Networks", exchange: "NYSE", sector: "Networking" },
  { symbol: "MU", name: "Micron Technology", exchange: "NASDAQ", sector: "Memory" },
  { symbol: "ORCL", name: "Oracle Corporation", exchange: "NYSE", sector: "Cloud Infrastructure" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", sector: "Payments" },
  { symbol: "KTOS", name: "Kratos Defense", exchange: "NASDAQ", sector: "Defense Tech" },
  { symbol: "ZETA", name: "Zeta Global", exchange: "NYSE", sector: "Marketing Software" },
  { symbol: "PGY", name: "Pagaya Technologies", exchange: "NASDAQ", sector: "AI Lending" },
  { symbol: "SOC", name: "Sable Offshore", exchange: "NYSE", sector: "Energy" },
  { symbol: "CLSK", name: "CleanSpark", exchange: "NASDAQ", sector: "Bitcoin Mining" },
  { symbol: "QXO", name: "QXO Inc.", exchange: "NASDAQ", sector: "Industrial Roll-Up" },
  { symbol: "WLDN", name: "Willdan Group", exchange: "NASDAQ", sector: "Energy Services" },
  { symbol: "HNST", name: "The Honest Company", exchange: "NASDAQ", sector: "Consumer" },
];

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const BINANCE_BASE = "https://api.binance.com/api/v3";

function cleanProxyBase(apiProxyBase = "") {
  return String(apiProxyBase || "").trim().replace(/\/+$/, "");
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
}

function withTimeout(fetchImpl, url, options = {}, timeoutMs = 12000) {
  if (!fetchImpl) throw new Error("Fetch implementation unavailable.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetchImpl(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Market data provider returned invalid JSON.");
  }
}

function marketUrl(path, query, apiProxyBase = "") {
  const proxyBase = cleanProxyBase(apiProxyBase);
  const fullPath = `${path}${query ? `?${query}` : ""}`;
  if (proxyBase) {
    const proxyPath = path === "/coins/markets" ? "markets" : path.replace(/^\//, "");
    return `${proxyBase}/coingecko/${proxyPath}${query ? `?${query}` : ""}`;
  }
  return `${COINGECKO_BASE}${fullPath}`;
}

async function fetchCoinGeckoMarkets(universe, { fetchImpl = globalThis.fetch, apiProxyBase = "", timeoutMs = 12000 } = {}) {
  const ids = universe.map((item) => item.id).filter(Boolean).join(",");
  if (!ids) return [];
  const query = new URLSearchParams({
    vs_currency: "usd",
    ids,
    order: "market_cap_desc",
    per_page: String(Math.max(1, universe.length)),
    page: "1",
    sparkline: "true",
    price_change_percentage: "1h,24h,7d",
  }).toString();
  const response = await withTimeout(fetchImpl, marketUrl("/coins/markets", query, apiProxyBase), {
    method: "GET",
    headers: { "Accept": "application/json" },
  }, timeoutMs);
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload?.error || `CoinGecko markets failed. HTTP ${response.status}`);
  return Array.isArray(payload) ? payload : [];
}

async function fetchBinanceTickers(universe, { fetchImpl = globalThis.fetch, timeoutMs = 9000 } = {}) {
  const pairs = universe.map((item) => item.binancePair).filter(Boolean);
  if (!pairs.length || !fetchImpl) return new Map();
  const encoded = encodeURIComponent(JSON.stringify(pairs));
  try {
    const response = await withTimeout(fetchImpl, `${BINANCE_BASE}/ticker/24hr?symbols=${encoded}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    }, timeoutMs);
    const payload = await readJson(response);
    if (!response.ok || !Array.isArray(payload)) return new Map();
    return new Map(payload.map((item) => [String(item.symbol || "").toUpperCase(), item]));
  } catch {
    return new Map();
  }
}

function unavailableRow(meta, assetType, error = "Data unavailable from currently connected providers.") {
  return {
    symbol: meta.symbol,
    displaySymbol: meta.symbol,
    name: meta.name || meta.symbol,
    assetType,
    provider: "UNAVAILABLE",
    fallbackUsed: false,
    timestamp: new Date().toISOString(),
    price: null,
    change: null,
    changePct: null,
    dayHigh: null,
    dayLow: null,
    volume: null,
    marketCap: null,
    circulatingSupply: null,
    rank: null,
    sectorOrCategory: meta.category || meta.sector || "Unavailable",
    source: "Unavailable",
    dataQuality: "UNAVAILABLE",
    missingFields: ["price", "changePct", "volume"],
    error,
  };
}

function normalizeCryptoMarket(meta, market, binanceTicker) {
  if (!market && !binanceTicker) {
    return unavailableRow(meta, "crypto", `${meta.symbol} price is unavailable from currently connected crypto data providers.`);
  }
  const coinPrice = numberOrNull(market?.current_price);
  const binancePrice = numberOrNull(binanceTicker?.lastPrice);
  const price = binancePrice ?? coinPrice;
  const binanceChangePct = numberOrNull(binanceTicker?.priceChangePercent);
  const changePct = binanceChangePct ?? numberOrNull(market?.price_change_percentage_24h_in_currency ?? market?.price_change_percentage_24h);
  const change = numberOrNull(binanceTicker?.priceChange) ?? numberOrNull(market?.price_change_24h);
  const volume = numberOrNull(binanceTicker?.quoteVolume) ?? numberOrNull(market?.total_volume);
  const high = numberOrNull(binanceTicker?.highPrice) ?? numberOrNull(market?.high_24h);
  const low = numberOrNull(binanceTicker?.lowPrice) ?? numberOrNull(market?.low_24h);
  const source = binanceTicker ? "CoinGecko + Binance public ticker" : "CoinGecko";
  return {
    symbol: meta.symbol,
    displaySymbol: meta.symbol,
    name: market?.name || meta.name || meta.symbol,
    assetType: "crypto",
    provider: binanceTicker ? "CoinGecko/Binance" : "CoinGecko",
    fallbackUsed: false,
    timestamp: market?.last_updated || new Date().toISOString(),
    price,
    change,
    changePct,
    dayHigh: high,
    dayLow: low,
    volume,
    marketCap: numberOrNull(market?.market_cap),
    circulatingSupply: numberOrNull(market?.circulating_supply),
    rank: numberOrNull(market?.market_cap_rank),
    sectorOrCategory: meta.category || "Crypto",
    priceChange1h: numberOrNull(market?.price_change_percentage_1h_in_currency),
    priceChange7d: numberOrNull(market?.price_change_percentage_7d_in_currency),
    series: Array.isArray(market?.sparkline_in_7d?.prices) ? market.sparkline_in_7d.prices : [],
    source,
    dataQuality: price == null ? "UNAVAILABLE" : binanceTicker ? "LIVE" : "RECENT",
    missingFields: [
      price == null ? "price" : "",
      changePct == null ? "changePct" : "",
      volume == null ? "volume" : "",
    ].filter(Boolean),
    error: price == null ? `${meta.symbol} price is unavailable from currently connected crypto data providers.` : "",
  };
}

export async function fetchAIHeatmapCryptoRows({
  universe = AI_HEATMAP_CRYPTO_UNIVERSE,
  fetchImpl = globalThis.fetch,
  apiProxyBase = "",
  timeoutMs = 12000,
} = {}) {
  const warnings = [];
  let markets = [];
  try {
    markets = await fetchCoinGeckoMarkets(universe, { fetchImpl, apiProxyBase, timeoutMs });
  } catch (error) {
    warnings.push(`CoinGecko unavailable: ${error.message}`);
  }
  const binanceTickers = await fetchBinanceTickers(universe, { fetchImpl, timeoutMs });
  const marketsById = new Map(markets.map((market) => [market.id, market]));
  const rows = universe.map((meta) => normalizeCryptoMarket(meta, marketsById.get(meta.id), binanceTickers.get(meta.binancePair)));
  return { rows, warnings, source: binanceTickers.size ? "CoinGecko/Binance" : "CoinGecko", timestamp: new Date().toISOString() };
}

function quoteFromApp(symbol, stockQuotes = {}) {
  const quote = stockQuotes?.[symbol];
  if (!quote) return null;
  const price = numberOrNull(quote.price ?? quote.c);
  return {
    symbol,
    price,
    change: numberOrNull(quote.change ?? quote.d),
    changePct: numberOrNull(quote.changePct ?? quote.changePercent ?? quote.dp),
    previousClose: numberOrNull(quote.previousClose ?? quote.pc),
    volume: numberOrNull(quote.volume ?? quote.v),
    dayHigh: numberOrNull(quote.dayHigh ?? quote.high ?? quote.h),
    dayLow: numberOrNull(quote.dayLow ?? quote.low ?? quote.l),
    provider: quote.provider || quote.source || "FINNHUB",
    dataQuality: price == null ? "UNAVAILABLE" : quote.dataQuality || "FALLBACK",
    timestamp: quote.timestamp || quote.lastUpdated || quote.updatedAt || new Date().toISOString(),
    fallbackUsed: Boolean(quote.fallbackUsed),
  };
}

function normalizeStockRow(meta, quote) {
  const price = numberOrNull(quote?.price);
  if (!quote || quote.dataQuality === "UNAVAILABLE" || price == null) {
    return unavailableRow(meta, "stock", quote?.error || `${meta.symbol} stock quote unavailable from MooMoo/Finnhub route.`);
  }
  return {
    symbol: meta.symbol,
    displaySymbol: meta.symbol,
    name: meta.name || meta.symbol,
    assetType: "stock",
    provider: quote.provider || "FINNHUB",
    primaryProvider: quote.primaryProvider || "MOOMOO_OPEND",
    fallbackUsed: Boolean(quote.fallbackUsed),
    timestamp: quote.timestamp || new Date().toISOString(),
    price,
    change: numberOrNull(quote.change),
    changePct: numberOrNull(quote.changePct),
    previousClose: numberOrNull(quote.previousClose),
    dayHigh: numberOrNull(quote.dayHigh ?? quote.high),
    dayLow: numberOrNull(quote.dayLow ?? quote.low),
    volume: numberOrNull(quote.volume),
    marketCap: numberOrNull(quote.marketCap),
    circulatingSupply: null,
    rank: null,
    sectorOrCategory: meta.sector || "Stock",
    exchange: meta.exchange || "NASDAQ",
    source: quote.provider || "FINNHUB",
    series: [],
    dataQuality: quote.dataQuality || "FALLBACK",
    missingFields: [
      price == null ? "price" : "",
      quote.changePct == null ? "changePct" : "",
      quote.volume == null ? "volume" : "",
    ].filter(Boolean),
    error: quote.error || "",
  };
}

export async function fetchAIHeatmapStockRows({
  universe = AI_HEATMAP_STOCK_UNIVERSE,
  fetchImpl = globalThis.fetch,
  settings = {},
  stockQuotes = {},
  timeoutMs = 9000,
} = {}) {
  const warnings = [];
  const rows = await Promise.all(universe.map(async (meta) => {
    const fallbackQuote = quoteFromApp(meta.symbol, stockQuotes);
    try {
      const quote = await routeStockQuote({
        symbol: meta.symbol,
        settings,
        fallbackQuote,
        fetchImpl,
        timeoutMs,
      });
      return normalizeStockRow(meta, quote);
    } catch (error) {
      warnings.push(`${meta.symbol}: ${error.message}`);
      return normalizeStockRow(meta, { ...fallbackQuote, error: error.message });
    }
  }));
  return { rows, warnings, source: "MooMoo/Finnhub", timestamp: new Date().toISOString() };
}

export function tradingViewSymbolFor(row = {}) {
  const symbol = String(row.symbol || row.displaySymbol || "").toUpperCase();
  if (!symbol) return "BINANCE:BTCUSDT";
  if (row.assetType === "crypto") {
    const meta = AI_HEATMAP_CRYPTO_UNIVERSE.find((item) => item.symbol === symbol);
    return `BINANCE:${meta?.binancePair || `${symbol}USDT`}`;
  }
  const meta = AI_HEATMAP_STOCK_UNIVERSE.find((item) => item.symbol === symbol);
  const exchange = meta?.exchange || row.exchange || "NASDAQ";
  return `${exchange}:${symbol}`;
}

export function formatProviderSummary(rows = []) {
  const available = rows.filter((row) => row.dataQuality !== "UNAVAILABLE" && row.price != null).length;
  const total = rows.length;
  const fallbackCount = rows.filter((row) => row.fallbackUsed).length;
  const unavailable = total - available;
  return {
    available,
    unavailable,
    total,
    fallbackCount,
    dataQuality: available === total ? "LIVE" : available > 0 ? "PARTIAL" : "UNAVAILABLE",
    detail: `${available}/${total} rows available${fallbackCount ? `, ${fallbackCount} fallback` : ""}${unavailable ? `, ${unavailable} unavailable` : ""}.`,
  };
}

export function changeIntensity(row = {}, mode = "change") {
  const value = mode === "volume"
    ? numberOrNull(row.volumeSpike)
    : mode === "volatility"
      ? numberOrNull(row.volatility)
      : numberOrNull(row.changePct);
  if (value == null) return 0;
  if (mode === "change") return Math.max(-1, Math.min(1, value / 8));
  return Math.max(0, Math.min(1, value / 100));
}

export function compactPrice(value) {
  const number = numberOrNull(value);
  if (number == null) return "Unavailable";
  return number >= 100 ? `$${number.toFixed(2)}` : `$${number.toPrecision(number >= 1 ? 4 : 3)}`;
}

export function compactPercent(value) {
  const number = numberOrNull(value);
  if (number == null) return "Unavailable";
  return `${number >= 0 ? "+" : ""}${round(number, 2)}%`;
}
