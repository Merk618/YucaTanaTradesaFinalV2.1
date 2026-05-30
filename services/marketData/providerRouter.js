export const MARKET_DATA_PROVIDERS = {
  MOOMOO: "MOOMOO_OPEND",
  FINNHUB: "FINNHUB",
  COINGECKO: "COINGECKO",
  BINANCE: "BINANCE",
  TRADINGVIEW: "TRADINGVIEW",
};

export function stockProviderPriority(settings = {}) {
  const moomoo = settings.moomoo || {};
  if (moomoo.enabled && moomoo.primaryStocks) {
    return [MARKET_DATA_PROVIDERS.MOOMOO, MARKET_DATA_PROVIDERS.FINNHUB];
  }
  return [MARKET_DATA_PROVIDERS.FINNHUB];
}

export function cryptoProviderPriority() {
  return [MARKET_DATA_PROVIDERS.COINGECKO, MARKET_DATA_PROVIDERS.BINANCE];
}

export function optionsProviderPriority(settings = {}) {
  return settings.moomoo?.enabled && settings.moomoo?.optionsEnabled ? [MARKET_DATA_PROVIDERS.MOOMOO] : [];
}
