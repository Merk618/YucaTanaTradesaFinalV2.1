import { getCryptoPriceSnapshot, resolveCryptoSymbol } from "../crypto/cryptoSymbolResolver.js";
import { routeOptionsData } from "../marketData/optionsDataRouter.js";
import { routeStockQuote } from "../marketData/stockQuoteRouter.js";

const STOP_WORDS = new Set([
  "A", "AI", "ALL", "AN", "AND", "ANY", "ARE", "AS", "ASK", "BE", "BULL", "BEAR", "BUY", "CAN",
  "CASE", "CHECK", "DATA", "DEEP", "DO", "FOR", "FROM", "GIVE", "HOW", "I", "IN", "IS", "IT",
  "ME", "MOVING", "NEWS", "NO", "OF", "ON", "OR", "PRICE", "QUOTE", "RISK", "SELL", "SETUP",
  "SHOULD", "SUMMARY", "THE", "THIS", "TODAY", "WATCH", "WHAT", "WHY", "WITH", "YOU",
]);
const KNOWN_CRYPTO_SYMBOLS = new Set(["BTC", "ETH", "SOL", "XRP", "SUI", "BNB", "AVAX", "DOGE", "XLM", "PEPE", "ADA", "LINK", "DOT", "LTC", "BCH", "FET"]);

function cleanSymbol(value = "") {
  return String(value || "").replace(/^\$/, "").trim().toUpperCase();
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function extractCandidates(query = "") {
  const matches = String(query || "").match(/\$?[A-Za-z][A-Za-z0-9.]{0,9}/g) || [];
  return matches
    .map(cleanSymbol)
    .filter((token) => token && !STOP_WORDS.has(token) && token.length <= 10);
}

function firstExplicitSymbol(query = "", state = {}) {
  const candidates = extractCandidates(query);
  const stockSymbols = new Set(Object.keys(state.stockQuotes || {}).map(cleanSymbol));
  const cryptoSymbols = new Set(Object.keys(state.cryptoMarkets || {}).map(cleanSymbol));
  return candidates.find((symbol) => KNOWN_CRYPTO_SYMBOLS.has(symbol) || cryptoSymbols.has(symbol) || stockSymbols.has(symbol) || /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(symbol)) || "";
}

function classifyRequest(query = "", symbol = "", state = {}) {
  const text = String(query || "");
  const upper = text.toUpperCase();
  const isOptions = /\b(options?|option\s+chain|calls?|puts?)\b/i.test(text);
  const isPrice = /\b(price|quote|snapshot)\b/i.test(text);
  const cryptoSymbols = new Set(Object.keys(state.cryptoMarkets || {}).map(cleanSymbol));
  if (!symbol) return { requestType: isOptions ? "options" : isPrice ? "price" : "analysis", assetType: "unknown" };
  if (isOptions) return { requestType: "options", assetType: "option" };
  if (KNOWN_CRYPTO_SYMBOLS.has(symbol) || cryptoSymbols.has(symbol) || /\b(crypto|coin|token|chain|binance|coingecko)\b/i.test(text)) {
    return { requestType: isPrice ? "price" : "analysis", assetType: "crypto" };
  }
  if (/\b(STOCK|SHARES|EQUITY|EARNINGS|OPTIONS|CALLS|PUTS)\b/.test(upper)) {
    return { requestType: isPrice ? "price" : "analysis", assetType: "stock" };
  }
  return { requestType: isPrice ? "price" : "analysis", assetType: "stock" };
}

function selectedSymbolFromState(state = {}) {
  const selected = state.selectedSymbol || state.ticker || state.crypto || state.heatmapSelection?.symbol || "";
  return cleanSymbol(selected);
}

function selectedAssetTypeFromState(state = {}) {
  if (state.selectedAssetType) return state.selectedAssetType;
  if (state.activeTab === "crypto") return "crypto";
  if (state.activeTab === "stocks") return "stock";
  return "unknown";
}

function metadata({ requestedSymbol = "", resolvedSymbol = "", assetType = "unknown", primaryDataSource = "Unavailable", fallbackUsed = false, dataQuality = "UNAVAILABLE", confidence = "none" } = {}) {
  return {
    requestedSymbol: requestedSymbol || "Unavailable",
    resolvedSymbol: resolvedSymbol || "Unavailable",
    assetType,
    primaryDataSource,
    fallbackUsed: Boolean(fallbackUsed),
    timestamp: new Date().toISOString(),
    dataQuality,
    resolutionConfidence: confidence,
  };
}

function formatMoney(value) {
  if (!isFiniteNumber(value)) return "Unavailable";
  const number = Number(value);
  return number >= 1 ? `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${number.toLocaleString(undefined, { maximumSignificantDigits: 6 })}`;
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) return "Unavailable";
  return `${Number(value).toFixed(2)}%`;
}

function priceCard({
  requestedSymbol = "",
  resolvedSymbol = "",
  assetType = "unknown",
  name = "Unavailable",
  price = null,
  change = null,
  changePct = null,
  primaryDataSource = "Unavailable",
  fallbackUsed = false,
  timestamp = "",
  dataQuality = "UNAVAILABLE",
  confidence = "none",
} = {}) {
  return [
    `Requested Symbol: ${requestedSymbol || "Unavailable"}`,
    `Resolved Symbol: ${resolvedSymbol || "Unavailable"}`,
    `Asset Type: ${assetType || "Unavailable"}`,
    `Name: ${name || "Unavailable"}`,
    `Price: ${formatMoney(price)}`,
    `Change: ${isFiniteNumber(change) ? formatMoney(change) : "Unavailable"}`,
    `Change %: ${formatPercent(changePct)}`,
    `Primary Data Source: ${primaryDataSource || "Unavailable"}`,
    `Fallback Used: ${fallbackUsed ? "true" : "false"}`,
    `Timestamp: ${timestamp || "Unavailable"}`,
    `Data Quality: ${dataQuality || "UNAVAILABLE"}`,
    `Resolution Confidence: ${confidence || "none"}`,
  ].join("\n");
}

function stockPriceAnswer(quote, meta) {
  const unavailable = quote.dataQuality === "UNAVAILABLE";
  const card = priceCard({
    requestedSymbol: meta.requestedSymbol,
    resolvedSymbol: quote.symbol || meta.resolvedSymbol,
    assetType: "stock",
    name: "Unavailable",
    price: quote.price,
    change: quote.change,
    changePct: quote.changePct,
    primaryDataSource: quote.provider || meta.primaryDataSource,
    fallbackUsed: quote.fallbackUsed,
    timestamp: quote.timestamp,
    dataQuality: quote.dataQuality,
    confidence: meta.resolutionConfidence,
  });
  return {
    answer: unavailable ? `${card}\n\n${quote.symbol} price is unavailable from currently connected stock data providers.` : card,
    provider: "YTT DATA ROUTER",
    dataQuality: quote.dataQuality,
    timestamp: quote.timestamp,
    citations: [],
    sources: [],
    tickers: [quote.symbol],
    resolution: meta,
  };
}

function cryptoPriceAnswer(snapshot, meta) {
  const unavailable = snapshot.dataQuality === "UNAVAILABLE";
  const card = priceCard({
    requestedSymbol: meta.requestedSymbol,
    resolvedSymbol: snapshot.symbol || meta.resolvedSymbol,
    assetType: "crypto",
    name: snapshot.name || "Unavailable",
    price: snapshot.price,
    change: null,
    changePct: snapshot.changePct24h,
    primaryDataSource: snapshot.source || snapshot.provider || meta.primaryDataSource,
    fallbackUsed: false,
    timestamp: snapshot.timestamp,
    dataQuality: snapshot.dataQuality,
    confidence: meta.resolutionConfidence,
  });
  return {
    answer: unavailable ? `${card}\n\n${snapshot.symbol} price is unavailable from currently connected crypto data providers.` : card,
    provider: "YTT DATA ROUTER",
    dataQuality: snapshot.dataQuality,
    timestamp: snapshot.timestamp,
    citations: [],
    sources: [],
    tickers: [snapshot.symbol],
    resolution: meta,
  };
}

function optionsAnswer(options, meta) {
  return {
    answer: options.dataQuality === "UNAVAILABLE"
      ? `${options.symbol} options data unavailable. MooMoo OpenD options bridge is required; no fake options chain was generated.`
      : `${options.symbol} options chain loaded from ${options.provider}. Expirations: ${options.expirationDates.length}. Chains: ${options.chains.length}.`,
    provider: "YTT DATA ROUTER",
    dataQuality: options.dataQuality,
    timestamp: options.timestamp,
    citations: [],
    sources: [],
    tickers: [options.symbol],
    resolution: meta,
  };
}

export async function resolveSymbolIntent({ query = "", state = {}, settings = {}, fetchImpl = globalThis.fetch } = {}) {
  const explicitSymbol = firstExplicitSymbol(query, state);
  const selectedSymbol = selectedSymbolFromState(state);
  const symbol = explicitSymbol || selectedSymbol;
  const explicit = Boolean(explicitSymbol);
  const classified = classifyRequest(query, explicitSymbol, state);

  if (!symbol) {
    const meta = metadata({ assetType: "unknown", primaryDataSource: "Unavailable", confidence: "no-symbol" });
    return { explicit, requestType: classified.requestType, assetType: "unknown", selectedAsset: null, metadata: meta };
  }

  if (!explicit) {
    const assetType = selectedAssetTypeFromState(state);
    const selectedAsset = {
      symbol,
      assetType,
      quote: state.stockQuotes?.[symbol] || null,
      market: state.cryptoMarkets?.[symbol] || null,
    };
    const meta = metadata({
      requestedSymbol: symbol,
      resolvedSymbol: symbol,
      assetType,
      primaryDataSource: assetType === "crypto" ? "CoinGecko/Binance selected context" : "Selected dashboard context",
      fallbackUsed: false,
      dataQuality: "LOCAL_CONTEXT",
      confidence: "selected-context",
    });
    return { explicit, requestType: classified.requestType, assetType, selectedAsset, metadata: meta };
  }

  if (classified.assetType === "crypto") {
    const resolution = await resolveCryptoSymbol(symbol, {
      cryptoMarkets: state.cryptoMarkets,
      fetchImpl,
      apiProxyBase: settings.apiProxyBase,
    });
    const snapshot = await getCryptoPriceSnapshot(symbol, {
      cryptoMarkets: state.cryptoMarkets,
      fetchImpl,
      apiProxyBase: settings.apiProxyBase,
    });
    const meta = metadata({
      requestedSymbol: explicitSymbol,
      resolvedSymbol: snapshot.symbol || resolution.resolvedSymbol || symbol,
      assetType: "crypto",
      primaryDataSource: "CoinGecko/Binance",
      fallbackUsed: false,
      dataQuality: snapshot.dataQuality,
      confidence: resolution.confidence || "symbol-match",
    });
    return {
      explicit,
      requestType: classified.requestType,
      assetType: "crypto",
      selectedAsset: { symbol: snapshot.symbol || symbol, assetType: "crypto", market: snapshot, quote: snapshot },
      metadata: meta,
      directAnswer: classified.requestType === "price" ? cryptoPriceAnswer(snapshot, meta) : null,
    };
  }

  if (classified.assetType === "option") {
    const options = await routeOptionsData({ symbol, settings, fetchImpl });
    const meta = metadata({
      requestedSymbol: explicitSymbol,
      resolvedSymbol: options.symbol || symbol,
      assetType: "option_chain",
      primaryDataSource: "MooMoo OpenD",
      fallbackUsed: false,
      dataQuality: options.dataQuality,
      confidence: "explicit-symbol",
    });
    return {
      explicit,
      requestType: "options",
      assetType: "option_chain",
      selectedAsset: { symbol: options.symbol || symbol, assetType: "option_chain", quote: options },
      metadata: meta,
      directAnswer: optionsAnswer(options, meta),
    };
  }

  const quote = await routeStockQuote({
    symbol,
    settings,
    fallbackQuote: state.stockQuotes?.[symbol],
    fetchImpl,
  });
  const meta = metadata({
    requestedSymbol: explicitSymbol,
    resolvedSymbol: quote.symbol || symbol,
    assetType: "stock",
    primaryDataSource: quote.provider === "MOOMOO_OPEND" ? "MooMoo OpenD" : "MooMoo OpenD -> Finnhub fallback",
    fallbackUsed: quote.fallbackUsed,
    dataQuality: quote.dataQuality,
    confidence: "explicit-symbol",
  });
  return {
    explicit,
    requestType: classified.requestType,
    assetType: "stock",
    selectedAsset: { symbol: quote.symbol || symbol, assetType: "stock", quote },
    metadata: meta,
    directAnswer: classified.requestType === "price" ? stockPriceAnswer(quote, meta) : null,
  };
}
