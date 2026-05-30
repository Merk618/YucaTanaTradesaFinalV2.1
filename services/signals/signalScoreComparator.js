import { buildMarketBrain } from "../ai/marketBrain.js";
import { SIGNAL_CONFIRMATION, normalizeExternalSignal } from "./signalNormalizer.js";

function finite(value) {
  return Number.isFinite(Number(value));
}

function normalizeStock(symbol, quote = {}) {
  return {
    ...quote,
    symbol,
    assetType: "stock",
    price: Number(quote.price ?? quote.c),
    changePercent: Number(quote.changePercent ?? quote.changePct ?? quote.dp),
    volume: Number(quote.volume),
    provider: quote.provider || quote.source || "Finnhub fallback",
    dataQuality: quote.dataQuality || (finite(quote.price ?? quote.c) ? "FALLBACK" : "UNAVAILABLE"),
    timestamp: quote.timestamp || quote.updatedAt || quote.lastUpdated,
  };
}

function normalizeCrypto(symbol, coin = {}) {
  return {
    ...coin,
    symbol,
    assetType: "crypto",
    name: coin.name || symbol,
    price: Number(coin.binancePrice ?? coin.current_price ?? coin.price),
    changePercent: Number(coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? coin.changePct),
    volume: Number(coin.total_volume ?? coin.volume),
    marketCap: Number(coin.market_cap ?? coin.marketCap),
    provider: coin.binancePrice ? "CoinGecko/Binance" : coin.source || "CoinGecko",
    dataQuality: finite(coin.binancePrice ?? coin.current_price ?? coin.price) ? "LIVE" : "UNAVAILABLE",
    timestamp: coin.last_updated || coin.lastUpdated || coin.timestamp,
  };
}

export function resolveSignalMarketAsset(signal = {}, appState = {}) {
  const normalized = normalizeExternalSignal(signal);
  if (!normalized.symbol) return null;
  if (normalized.assetType === "crypto") {
    const market = appState.cryptoMarkets?.[normalized.symbol];
    return market ? normalizeCrypto(normalized.symbol, market) : null;
  }
  const quote = appState.stockQuotes?.[normalized.symbol];
  return quote ? normalizeStock(normalized.symbol, quote) : null;
}

function confirmationFromScore(signal, opportunity) {
  if (!opportunity || opportunity.dataQuality === "UNAVAILABLE") return SIGNAL_CONFIRMATION.DATA_INSUFFICIENT;
  const score = Number(opportunity.setupScore || 0);
  const direction = signal.direction;

  if (direction === "bullish") {
    if (score >= 70) return SIGNAL_CONFIRMATION.CONFIRMED;
    if (score >= 55) return SIGNAL_CONFIRMATION.PARTIALLY_CONFIRMED;
    if (score <= 39) return SIGNAL_CONFIRMATION.CONFLICTING;
    return SIGNAL_CONFIRMATION.NOT_CONFIRMED;
  }

  if (direction === "bearish") {
    if (score <= 39) return SIGNAL_CONFIRMATION.CONFIRMED;
    if (score <= 54) return SIGNAL_CONFIRMATION.PARTIALLY_CONFIRMED;
    if (score >= 70) return SIGNAL_CONFIRMATION.CONFLICTING;
    return SIGNAL_CONFIRMATION.NOT_CONFIRMED;
  }

  if (score >= 55 && score < 70) return SIGNAL_CONFIRMATION.PARTIALLY_CONFIRMED;
  return SIGNAL_CONFIRMATION.NOT_CONFIRMED;
}

export function compareExternalSignal(signal = {}, appState = {}, options = {}) {
  const normalized = normalizeExternalSignal(signal);
  const marketAsset = resolveSignalMarketAsset(normalized, appState);
  const symbolIntent = {
    explicit: true,
    requestType: "analysis",
    assetType: normalized.assetType,
    selectedAsset: marketAsset ? {
      symbol: normalized.symbol,
      assetType: normalized.assetType,
      quote: marketAsset,
      market: normalized.assetType === "crypto" ? marketAsset : null,
    } : null,
    metadata: {
      requestedSymbol: normalized.symbol,
      resolvedSymbol: normalized.symbol,
      assetType: normalized.assetType,
      primaryDataSource: marketAsset?.provider || "YucaTana data unavailable",
      fallbackUsed: Boolean(marketAsset?.fallbackUsed),
      dataQuality: marketAsset?.dataQuality || "UNAVAILABLE",
      resolutionConfidence: marketAsset ? "external-signal-symbol-match" : "data-missing",
      timestamp: marketAsset?.timestamp || new Date().toISOString(),
    },
  };
  const yttContext = marketAsset ? {
    selectedTab: normalized.assetType === "crypto" ? "crypto" : "stocks",
    selectedAsset: symbolIntent.selectedAsset,
    marketContext: {
      stockQuotes: appState.stockQuotes || {},
      cryptoMarkets: appState.cryptoMarkets || {},
      sourceHealth: appState.sourceHealth || {},
    },
  } : {};
  const marketBrain = marketAsset ? buildMarketBrain({
    query: `${normalized.symbol} ${normalized.horizon} ${normalized.direction} external signal review`,
    mode: "external_signals",
    appState,
    yttContext,
    symbolIntent,
  }) : {
    symbol: normalized.symbol,
    assetType: normalized.assetType,
    opportunity: null,
    missingData: ["current YucaTana market data"],
    timestamp: new Date().toISOString(),
  };
  const confirmationStatus = confirmationFromScore(normalized, marketBrain.opportunity);
  const yucaTanaScore = marketBrain.opportunity?.setupScore ?? null;
  const yucaTanaRating = marketBrain.opportunity?.rating || "DATA INSUFFICIENT";
  const finalRating = yucaTanaRating === "STRONG CANDIDATE"
    ? confirmationStatus === SIGNAL_CONFIRMATION.CONFIRMED ? "STRONG CANDIDATE" : "CANDIDATE"
    : yucaTanaRating;

  return {
    signal: normalized,
    marketAsset,
    marketBrain,
    yucaTanaScore,
    yucaTanaRating,
    finalRating,
    confirmationStatus,
    requireYucaTanaConfirmation: options.requireConfirmation !== false,
    notes: [
      "External signal is an overlay only; YucaTana market data remains source of truth.",
      confirmationStatus === SIGNAL_CONFIRMATION.DATA_INSUFFICIENT
        ? "Current YucaTana data is insufficient to confirm this signal."
        : `YucaTana score ${yucaTanaScore}/100 compares against a ${normalized.direction} ${normalized.horizon} external signal.`,
      "No order placement or direct buy/sell instruction was generated.",
    ],
    timestamp: new Date().toISOString(),
  };
}

export function compareExternalSignals(signals = [], appState = {}, options = {}) {
  return signals.map((signal) => compareExternalSignal(signal, appState, options));
}
