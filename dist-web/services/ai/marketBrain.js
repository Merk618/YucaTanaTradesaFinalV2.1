import { evaluateMarketRegime } from "./marketRegimeEngine.js";
import { scoreOpportunity } from "./opportunityScorer.js";
import { classifyPlaybook } from "./playbookClassifier.js";

const RANKING_PATTERN = /\b(best\s+(plays?|setups?|stocks?|crypto)|rank|ranking|watchlist|what\s+should\s+i\s+watch|strongest\s+(stock|crypto|setup)|top\s+\d*)\b/i;
const CRYPTO_PATTERN = /\b(crypto|coin|token|btc|eth|sol|sui|xlm|pepe|xrp|bnb|avax|doge)\b/i;
const STOCK_PATTERN = /\b(stock|stocks|equity|ticker|shares)\b/i;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

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
    previousClose: Number(quote.previousClose ?? quote.pc),
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
    name: coin.name || symbol,
    assetType: "crypto",
    price: Number(coin.binancePrice ?? coin.current_price ?? coin.price),
    changePercent: Number(coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? coin.changePct),
    volume: Number(coin.total_volume ?? coin.volume),
    marketCap: Number(coin.market_cap ?? coin.marketCap),
    provider: coin.binancePrice ? "CoinGecko/Binance" : coin.source || "CoinGecko",
    dataQuality: finite(coin.binancePrice ?? coin.current_price ?? coin.price) ? "LIVE" : "UNAVAILABLE",
    timestamp: coin.last_updated || coin.lastUpdated || coin.timestamp,
  };
}

function selectedAssetFromContext(yttContext = {}, symbolIntent = {}) {
  const selected = symbolIntent.selectedAsset || yttContext.selectedAsset || {};
  const quote = selected.quote || selected.market || selected;
  if (!selected.symbol && !quote?.symbol) return null;
  return {
    ...quote,
    symbol: selected.symbol || quote.symbol,
    assetType: selected.assetType || quote.assetType || quote.type,
  };
}

function collectCandidates(query = "", state = {}) {
  const upper = String(query || "").toUpperCase();
  const watchlistOnly = /\bwatchlist\b/i.test(query);
  const cryptoOnly = CRYPTO_PATTERN.test(query) && !STOCK_PATTERN.test(query);
  const stockOnly = STOCK_PATTERN.test(query) && !CRYPTO_PATTERN.test(query);
  const watchlist = new Set(asArray(state.watchlist).map((symbol) => String(symbol || "").toUpperCase()));
  const stocks = Object.entries(state.stockQuotes || {})
    .filter(([symbol, quote]) => !watchlistOnly || watchlist.has(String(symbol).toUpperCase()))
    .filter(() => !cryptoOnly)
    .map(([symbol, quote]) => normalizeStock(String(symbol).toUpperCase(), quote))
    .filter((asset) => finite(asset.price) || finite(asset.changePercent));
  const crypto = Object.entries(state.cryptoMarkets || {})
    .filter(([symbol]) => !watchlistOnly || watchlist.has(String(symbol).toUpperCase()))
    .filter(() => !stockOnly)
    .map(([symbol, coin]) => normalizeCrypto(String(symbol).toUpperCase(), coin))
    .filter((asset) => finite(asset.price) || finite(asset.changePercent));
  const aiHeatmap = asArray(state.aiHeatmap?.aiHeatmapRows)
    .filter((row) => !watchlistOnly || watchlist.has(String(row.symbol || "").toUpperCase()))
    .filter((row) => !cryptoOnly || row.assetType === "crypto")
    .filter((row) => !stockOnly || row.assetType === "stock")
    .map((row) => ({
      ...row,
      symbol: String(row.symbol || "").toUpperCase(),
      assetType: row.assetType || "unknown",
      changePercent: row.changePercent ?? row.changePct,
    }))
    .filter((asset) => asset.symbol && (finite(asset.price) || finite(asset.changePercent)));
  const cryptoScannerPro = asArray(state.cryptoScannerPro?.cryptoScannerProRows)
    .filter((row) => !watchlistOnly || watchlist.has(String(row.symbol || "").toUpperCase()))
    .filter(() => !stockOnly)
    .map((row) => ({
      ...row,
      symbol: String(row.symbol || "").toUpperCase(),
      assetType: "crypto",
      changePercent: row.changePercent ?? row.changePct ?? row.change24h,
      source: row.provider || row.source || "Crypto Scanner Pro",
      dataQuality: row.dataQuality || state.cryptoScannerPro?.cryptoScannerProDataQuality || "RECENT",
    }))
    .filter((asset) => asset.symbol && (finite(asset.price) || finite(asset.changePercent)));

  if (watchlistOnly && !watchlist.size) return [];
  if (upper.includes("AIHEATMAP") || upper.includes("AI HEATMAP")) return aiHeatmap;
  if (upper.includes("CRYPTO")) return [...cryptoScannerPro, ...crypto, ...aiHeatmap.filter((row) => row.assetType === "crypto")];
  if (upper.includes("STOCK")) return [...stocks, ...aiHeatmap.filter((row) => row.assetType === "stock")];
  return [...stocks, ...cryptoScannerPro, ...crypto, ...aiHeatmap];
}

function buildRankings(query = "", state = {}, sourceHealth = {}) {
  if (!RANKING_PATTERN.test(query)) return [];
  const candidates = collectCandidates(query, state);
  return candidates
    .map((asset) => {
      const opportunity = scoreOpportunity(asset, { peers: candidates, sourceHealth });
      const playbook = classifyPlaybook(asset, opportunity.scoreBreakdown, opportunity.scoreBreakdown.riskReward);
      return {
        symbol: opportunity.symbol,
        assetType: opportunity.assetType,
        rating: opportunity.rating,
        setupScore: opportunity.setupScore,
        dataQuality: opportunity.dataQuality,
        playbook: playbook.primaryPlaybook,
        strongestFactors: opportunity.strongestFactors.slice(0, 2),
        weakestFactors: opportunity.weakestFactors.slice(0, 2),
        missingData: opportunity.missingData.slice(0, 5),
      };
    })
    .sort((a, b) => b.setupScore - a.setupScore)
    .slice(0, 5);
}

function priceDataFromAsset(asset = {}, resolution = {}) {
  if (!asset) return null;
  return {
    requestedSymbol: resolution.requestedSymbol || asset.symbol || "Unavailable",
    resolvedSymbol: resolution.resolvedSymbol || asset.symbol || "Unavailable",
    assetType: resolution.assetType || asset.assetType || "unknown",
    name: asset.name || "Unavailable",
    price: asset.price ?? asset.current_price ?? null,
    changePercent: asset.changePercent ?? asset.changePct ?? asset.price_change_percentage_24h ?? null,
    provider: resolution.primaryDataSource || asset.provider || asset.source || "Unavailable",
    fallbackUsed: Boolean(resolution.fallbackUsed || asset.fallbackUsed),
    timestamp: resolution.timestamp || asset.timestamp || asset.lastUpdated || asset.updatedAt || asset.last_updated || new Date().toISOString(),
    dataQuality: resolution.dataQuality || asset.dataQuality || "UNKNOWN",
    confidence: resolution.resolutionConfidence || "unknown",
  };
}

export function isRankingQuery(query = "") {
  return RANKING_PATTERN.test(query);
}

export function buildMarketBrain({ query = "", mode = "", appState = {}, yttContext = {}, symbolIntent = {} } = {}) {
  const selectedAsset = selectedAssetFromContext(yttContext, symbolIntent);
  const sourceHealth = appState.sourceHealth || yttContext.sourceHealth || yttContext.marketContext?.sourceHealth || {};
  const marketRegime = evaluateMarketRegime({
    context: appState,
    assetType: symbolIntent.assetType || selectedAsset?.assetType || "",
  });
  const rankings = buildRankings(query, appState, sourceHealth);
  const opportunity = selectedAsset
    ? scoreOpportunity(selectedAsset, {
        peers: collectCandidates(query, appState),
        sourceHealth,
        catalyst: yttContext.catalyst,
        newsItems: yttContext.newsItems,
      })
    : null;
  const playbook = opportunity
    ? classifyPlaybook(opportunity.normalizedAsset, opportunity.scoreBreakdown, opportunity.scoreBreakdown.riskReward)
    : {
        primaryPlaybook: "No Clear Setup",
        secondaryPlaybook: "Confirmation Needed",
        invalidationDataAvailable: false,
        notes: ["No selected or requested asset was available for setup classification."],
      };
  const priceData = priceDataFromAsset(opportunity?.normalizedAsset || selectedAsset, symbolIntent.metadata || {});
  const missingData = [
    ...(opportunity?.missingData || []),
    ...(marketRegime.regime === "UNKNOWN" ? ["market breadth/regime inputs"] : []),
  ];

  return {
    symbol: opportunity?.symbol || symbolIntent.metadata?.resolvedSymbol || "Unavailable",
    assetType: opportunity?.assetType || symbolIntent.assetType || "unknown",
    query,
    mode,
    directPriceData: priceData,
    opportunity,
    marketRegime,
    playbook,
    rankings,
    missingData: [...new Set(missingData)],
    sourceHealth,
    timestamp: new Date().toISOString(),
    safetyBoundary: "Read-only decision support. No order placement, broker execution, or direct buy/sell instructions.",
  };
}
