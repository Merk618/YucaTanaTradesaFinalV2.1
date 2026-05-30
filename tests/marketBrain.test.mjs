import assert from "node:assert/strict";
import { buildMarketBrain } from "../services/ai/marketBrain.js";
import { scoreOpportunity } from "../services/ai/opportunityScorer.js";

const appState = {
  activeTab: "stocks",
  stockQuotes: {
    NVDA: { symbol: "NVDA", price: 211.14, changePct: 2.8, volume: 1000000, source: "FINNHUB", updatedAt: new Date().toISOString() },
    SOFI: { symbol: "SOFI", price: 15.2, changePct: -1.1, volume: 900000, source: "FINNHUB", updatedAt: new Date().toISOString() },
  },
  cryptoMarkets: {
    XLM: { symbol: "xlm", name: "Stellar", current_price: 0.16, price_change_percentage_24h: 4.2, total_volume: 10000000, market_cap: 4800000000, last_updated: new Date().toISOString() },
    BTC: { symbol: "btc", name: "Bitcoin", current_price: 69000, price_change_percentage_24h: 1.2, total_volume: 25000000000, market_cap: 1300000000000, last_updated: new Date().toISOString() },
  },
  watchlist: ["NVDA", "XLM", "MISSING"],
  sourceHealth: {
    finnhub: { tone: "up", label: "CONNECTED" },
    coingecko: { tone: "up", label: "CONNECTED" },
  },
};

const symbolIntent = {
  assetType: "crypto",
  selectedAsset: {
    symbol: "XLM",
    assetType: "crypto",
    market: appState.cryptoMarkets.XLM,
    quote: appState.cryptoMarkets.XLM,
  },
  metadata: {
    requestedSymbol: "XLM",
    resolvedSymbol: "XLM",
    assetType: "crypto",
    primaryDataSource: "CoinGecko/Binance",
    fallbackUsed: false,
    dataQuality: "LIVE",
    resolutionConfidence: "symbol-match",
  },
};

const yttContext = {
  selectedTab: "crypto",
  selectedAsset: symbolIntent.selectedAsset,
  marketContext: {
    stockQuotes: appState.stockQuotes,
    cryptoMarkets: appState.cryptoMarkets,
    sourceHealth: appState.sourceHealth,
  },
};

const brain = buildMarketBrain({ query: "XLM setup", mode: "setup_analysis", appState, yttContext, symbolIntent });
assert.equal(brain.symbol, "XLM");
assert.equal(brain.assetType, "crypto");
assert.ok(brain.opportunity.setupScore >= 0 && brain.opportunity.setupScore <= 100);
assert.ok(["AVOID", "WEAK / LOW QUALITY", "WATCH", "CANDIDATE", "STRONG CANDIDATE"].includes(brain.opportunity.rating));
assert.notEqual(brain.opportunity.rating, "BUY");
assert.notEqual(brain.opportunity.rating, "SELL");
assert.ok(brain.missingData.includes("catalysts"), "missing catalysts should be explicit");

const ranked = buildMarketBrain({ query: "Rank my watchlist", mode: "scanner_summary", appState, yttContext: {}, symbolIntent: {} });
assert.ok(ranked.rankings.length >= 2, "rankings should include only connected watchlist data");
assert.ok(ranked.rankings.every((item) => item.symbol !== "MISSING"), "missing watchlist symbols should not be ranked");
assert.ok(ranked.rankings.every((item) => item.setupScore >= 0 && item.setupScore <= 100));

const lowInfo = scoreOpportunity({ symbol: "ZZZZ", assetType: "stock" }, { sourceHealth: {} });
assert.equal(lowInfo.dataQuality, "UNAVAILABLE");
assert.ok(lowInfo.missingData.includes("price"));

console.log("marketBrain tests passed");
