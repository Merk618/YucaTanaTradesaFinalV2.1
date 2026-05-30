export const MOOMOO_PROVIDER_ID = "MOOMOO_OPEND";
export const FINNHUB_PROVIDER_ID = "FINNHUB";

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrEmpty(value) {
  return value == null ? "" : String(value);
}

export function normalizeMooMooQuote(payload = {}, symbol = "") {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const quote = data.quote || data.data || data;
  const normalizedSymbol = stringOrEmpty(quote.symbol || quote.code || symbol).toUpperCase();
  const price = numberOrNull(quote.price ?? quote.lastPrice ?? quote.last ?? quote.close ?? quote.c);
  const previousClose = numberOrNull(quote.previousClose ?? quote.prevClose ?? quote.preClose ?? quote.pc);
  const change = numberOrNull(quote.change ?? quote.changeValue ?? quote.d);
  const changePct = numberOrNull(quote.changePct ?? quote.changePercent ?? quote.dp);

  return {
    symbol: normalizedSymbol,
    assetType: "stock",
    provider: MOOMOO_PROVIDER_ID,
    primaryProvider: MOOMOO_PROVIDER_ID,
    fallbackUsed: false,
    price,
    change,
    changePct,
    previousClose,
    open: numberOrNull(quote.open ?? quote.o),
    dayHigh: numberOrNull(quote.dayHigh ?? quote.high ?? quote.h),
    dayLow: numberOrNull(quote.dayLow ?? quote.low ?? quote.l),
    volume: numberOrNull(quote.volume ?? quote.vol ?? quote.v),
    timestamp: quote.timestamp || quote.time || data.timestamp || new Date().toISOString(),
    dataQuality: price == null ? "UNAVAILABLE" : "LIVE",
    error: price == null ? "MooMoo bridge returned no stock price." : "",
  };
}

export function normalizeFinnhubQuote(payload = {}, symbol = "", { fallbackUsed = true } = {}) {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const price = numberOrNull(data.price ?? data.c);
  const previousClose = numberOrNull(data.previousClose ?? data.pc);
  const change = numberOrNull(data.change ?? data.d ?? (price != null && previousClose != null ? price - previousClose : null));
  const changePct = numberOrNull(data.changePct ?? data.dp);

  return {
    symbol: stringOrEmpty(data.symbol || symbol).toUpperCase(),
    assetType: "stock",
    provider: FINNHUB_PROVIDER_ID,
    primaryProvider: MOOMOO_PROVIDER_ID,
    fallbackUsed,
    price,
    change,
    changePct,
    previousClose,
    open: numberOrNull(data.open ?? data.o),
    dayHigh: numberOrNull(data.dayHigh ?? data.high ?? data.h),
    dayLow: numberOrNull(data.dayLow ?? data.low ?? data.l),
    volume: numberOrNull(data.volume ?? data.v),
    timestamp: data.timestamp || data.t || new Date().toISOString(),
    dataQuality: price == null ? "UNAVAILABLE" : fallbackUsed ? "FALLBACK" : "DELAYED",
    error: price == null ? "Finnhub returned no stock price." : "",
  };
}

export function unavailableStockQuote(symbol = "", error = "Stock quote data unavailable.") {
  return {
    symbol: stringOrEmpty(symbol).toUpperCase(),
    assetType: "stock",
    provider: "UNAVAILABLE",
    primaryProvider: MOOMOO_PROVIDER_ID,
    fallbackUsed: false,
    price: null,
    change: null,
    changePct: null,
    previousClose: null,
    volume: null,
    timestamp: new Date().toISOString(),
    dataQuality: "UNAVAILABLE",
    error,
  };
}

export function normalizeMooMooOptions(payload = {}, symbol = "") {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const chain = data.options || data.chains || data.data || data;
  const expirationDates = Array.isArray(chain.expirationDates) ? chain.expirationDates : Array.isArray(data.expirationDates) ? data.expirationDates : [];
  const chains = Array.isArray(chain.chains) ? chain.chains : Array.isArray(chain) ? chain : [];

  return {
    symbol: stringOrEmpty(data.symbol || symbol).toUpperCase(),
    assetType: "option_chain",
    provider: MOOMOO_PROVIDER_ID,
    expirationDates,
    chains,
    timestamp: data.timestamp || new Date().toISOString(),
    dataQuality: chains.length || expirationDates.length ? "LIVE" : "UNAVAILABLE",
    error: chains.length || expirationDates.length ? "" : "MooMoo bridge returned no options chain data.",
  };
}

export function unavailableOptions(symbol = "", error = "Options data unavailable from currently connected providers.") {
  return {
    symbol: stringOrEmpty(symbol).toUpperCase(),
    assetType: "option_chain",
    provider: "UNAVAILABLE",
    expirationDates: [],
    chains: [],
    timestamp: new Date().toISOString(),
    dataQuality: "UNAVAILABLE",
    error,
  };
}
