import { knownCryptoBySymbol, loadBinanceExchangeInfo, loadCoinGeckoCoinList } from "./cryptoSymbolRegistry.js";

const PRICE_CACHE_TTL_MS = 60 * 1000;
const priceCache = new Map();

function cleanSymbol(symbol = "") {
  return String(symbol || "").trim().toUpperCase();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanProxyBase(apiProxyBase = "") {
  return String(apiProxyBase || "").trim().replace(/\/+$/, "");
}

function fromLiveMarkets(symbol, cryptoMarkets = {}) {
  const market = cryptoMarkets?.[symbol];
  if (!market) return null;
  const price = numberOrNull(market.current_price ?? market.price);
  return {
    symbol,
    name: market.name || symbol,
    assetType: "crypto",
    provider: market.binancePrice ? "CoinGecko/Binance" : "CoinGecko",
    price: market.binancePrice ?? price,
    changePct24h: numberOrNull(market.price_change_percentage_24h_in_currency ?? market.price_change_percentage_24h),
    marketCap: numberOrNull(market.market_cap),
    volume: numberOrNull(market.total_volume),
    timestamp: market.lastUpdated || market.last_updated || new Date().toISOString(),
    dataQuality: price == null && market.binancePrice == null ? "UNAVAILABLE" : "LIVE",
    source: market.binancePrice ? "CoinGecko metadata + Binance live stream" : "CoinGecko",
    error: price == null && market.binancePrice == null ? `${symbol} price is unavailable from currently connected crypto data providers.` : "",
  };
}

export async function resolveCryptoSymbol(symbol = "", { cryptoMarkets = {}, fetchImpl = globalThis.fetch, apiProxyBase = "" } = {}) {
  const clean = cleanSymbol(symbol);
  if (!clean) {
    return { status: "UNAVAILABLE", symbol: "", assetType: "crypto", candidates: [], confidence: "none", error: "Crypto symbol is required." };
  }
  const live = fromLiveMarkets(clean, cryptoMarkets);
  const known = knownCryptoBySymbol(clean);
  const [coinList, binancePairs] = await Promise.all([
    loadCoinGeckoCoinList({ fetchImpl, apiProxyBase }),
    loadBinanceExchangeInfo({ fetchImpl }),
  ]);
  const listed = coinList.filter((coin) => coin.symbol === clean);
  const candidates = [...known, ...listed].filter(Boolean);
  const deduped = Array.from(new Map(candidates.map((coin) => [coin.id || coin.name, coin])).values());
  const binance = binancePairs.get(clean) || null;
  const primary = live || deduped[0] || (binance ? { symbol: clean, name: clean, id: "" } : null);

  if (!primary) {
    return { status: "UNAVAILABLE", symbol: clean, assetType: "crypto", candidates: [], confidence: "none", error: `${clean} is not resolved by CoinGecko or Binance.` };
  }

  return {
    status: "RESOLVED",
    symbol: clean,
    resolvedSymbol: clean,
    name: primary.name || clean,
    coinGeckoId: primary.id || "",
    binancePair: binance?.symbol || "",
    assetType: "crypto",
    candidates: deduped.slice(0, 8),
    confidence: live ? "live-market-match" : deduped.length > 1 && !known.length ? "ambiguous" : "symbol-match",
    liveSnapshot: live,
  };
}

export async function getCryptoPriceSnapshot(symbol = "", { cryptoMarkets = {}, fetchImpl = globalThis.fetch, apiProxyBase = "" } = {}) {
  const clean = cleanSymbol(symbol);
  const live = fromLiveMarkets(clean, cryptoMarkets);
  if (live && live.dataQuality !== "UNAVAILABLE") return live;

  const cacheKey = clean;
  const cached = priceCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < PRICE_CACHE_TTL_MS) return cached.value;

  const resolution = await resolveCryptoSymbol(clean, { cryptoMarkets, fetchImpl, apiProxyBase });
  if (resolution.liveSnapshot && resolution.liveSnapshot.dataQuality !== "UNAVAILABLE") return resolution.liveSnapshot;

  const fetched = await fetchCoinGeckoSnapshot(resolution, { fetchImpl, apiProxyBase });
  priceCache.set(cacheKey, { cachedAt: Date.now(), value: fetched });
  return fetched;
}

async function fetchCoinGeckoSnapshot(resolution, { fetchImpl = globalThis.fetch, apiProxyBase = "" } = {}) {
  const symbol = cleanSymbol(resolution.symbol);
  const id = resolution.coinGeckoId;
  if (!id || !fetchImpl) return unavailableCryptoSnapshot(symbol, resolution.name);

  const base = cleanProxyBase(apiProxyBase);
  const query = `vs_currency=usd&ids=${encodeURIComponent(id)}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
  const url = base
    ? `${base}/coingecko/markets?${query}`
    : `https://api.coingecko.com/api/v3/coins/markets?${query}`;
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { "Accept": "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const market = Array.isArray(payload) ? payload[0] : null;
    if (!market) return unavailableCryptoSnapshot(symbol, resolution.name);
    const price = numberOrNull(market.current_price);
    return {
      symbol,
      name: market.name || resolution.name || symbol,
      assetType: "crypto",
      provider: "CoinGecko",
      price,
      changePct24h: numberOrNull(market.price_change_percentage_24h_in_currency ?? market.price_change_percentage_24h),
      marketCap: numberOrNull(market.market_cap),
      volume: numberOrNull(market.total_volume),
      timestamp: market.last_updated || new Date().toISOString(),
      dataQuality: price == null ? "UNAVAILABLE" : "LIVE",
      source: "CoinGecko",
      error: price == null ? `${symbol} price is unavailable from currently connected crypto data providers.` : "",
    };
  } catch {
    return unavailableCryptoSnapshot(symbol, resolution.name);
  }
}

export function unavailableCryptoSnapshot(symbol = "", name = "") {
  const clean = cleanSymbol(symbol);
  return {
    symbol: clean,
    name: name || clean,
    assetType: "crypto",
    provider: "CoinGecko/Binance",
    price: null,
    changePct24h: null,
    marketCap: null,
    volume: null,
    timestamp: new Date().toISOString(),
    dataQuality: "UNAVAILABLE",
    source: "CoinGecko/Binance",
    error: `${clean} price is unavailable from currently connected crypto data providers.`,
  };
}
