import { evaluateCatalystQuality } from "./catalystQualityEngine.js";
import { evaluateRiskReward } from "./riskRewardEngine.js";
import { firstFinite, finiteNumber, scoreDataQuality } from "./dataQualityEngine.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function changePercent(asset = {}) {
  return firstFinite(
    asset.changePercent,
    asset.changePct,
    asset.price_change_percentage_24h,
    asset.price_change_percentage_24h_in_currency,
    asset.price_change_percentage_7d_in_currency
  );
}

export function ratingFromScore(score) {
  if (score >= 85) return "STRONG CANDIDATE";
  if (score >= 70) return "CANDIDATE";
  if (score >= 55) return "WATCH";
  if (score >= 40) return "WEAK / LOW QUALITY";
  return "AVOID";
}

function scoreTrend(asset = {}) {
  const change = changePercent(asset);
  const trend = String(asset.trend || asset.setup || "").toLowerCase();
  const missingData = [];
  const strongestFactors = [];
  const weakestFactors = [];
  let score = 5;

  if (trend.includes("bull") || trend.includes("up") || trend.includes("breakout")) {
    score += 7;
    strongestFactors.push("Supplied trend/setup text is constructive.");
  } else if (trend.includes("bear") || trend.includes("broken") || trend.includes("down")) {
    score -= 2;
    weakestFactors.push("Supplied trend/setup text is weak.");
  }

  if (finiteNumber(change)) {
    if (change > 3) {
      score += 6;
      strongestFactors.push("Connected price change shows upside trend pressure.");
    } else if (change > 0) {
      score += 3;
      strongestFactors.push("Connected price change is positive.");
    } else if (change < -3) {
      score -= 3;
      weakestFactors.push("Connected price change is sharply negative.");
    }
  } else {
    missingData.push("changePercent");
  }

  if (asset.priceAboveMovingAverages === true || asset.maAlignment === "bullish") {
    score += 5;
    strongestFactors.push("Moving average alignment is constructive.");
  } else if (asset.priceAboveMovingAverages === false || asset.maAlignment === "bearish") {
    score -= 2;
    weakestFactors.push("Moving average alignment is not constructive.");
  } else {
    missingData.push("movingAverages");
  }

  return { score: clamp(Math.round(score), 0, 20), strongestFactors, weakestFactors, missingData };
}

function scoreMomentum(asset = {}) {
  const change = changePercent(asset);
  const rsi = firstFinite(asset.rsi);
  const macd = String(asset.macdState || asset.macd || "").toLowerCase();
  const missingData = [];
  const strongestFactors = [];
  const weakestFactors = [];
  let score = 4;

  if (finiteNumber(rsi)) {
    if (rsi >= 45 && rsi <= 68) {
      score += 5;
      strongestFactors.push("RSI is in a healthy momentum zone.");
    } else if (rsi > 75) {
      score -= 2;
      weakestFactors.push("RSI is extreme, raising chase risk.");
    } else if (rsi < 35) {
      score -= 1;
      weakestFactors.push("RSI is weak from supplied data.");
    }
  } else {
    missingData.push("rsi");
  }

  if (macd.includes("bull") || macd.includes("cross up")) {
    score += 4;
    strongestFactors.push("MACD state is constructive.");
  } else if (macd.includes("bear") || macd.includes("cross down")) {
    score -= 2;
    weakestFactors.push("MACD state is bearish.");
  } else {
    missingData.push("macdState");
  }

  if (finiteNumber(change)) {
    if (change > 0) score += Math.min(3, Math.abs(change) / 3);
    if (change < -4) score -= 2;
  } else {
    missingData.push("rateOfChange");
  }

  return { score: clamp(Math.round(score), 0, 15), strongestFactors, weakestFactors, missingData };
}

function scoreVolume(asset = {}) {
  const volume = firstFinite(asset.volume, asset.total_volume);
  const volumeRatio = firstFinite(asset.volumeRatio, asset.relativeVolume, asset.volumeMultiple);
  const marketCap = firstFinite(asset.marketCap, asset.market_cap);
  const missingData = [];
  const strongestFactors = [];
  const weakestFactors = [];
  let score = 4;

  if (finiteNumber(volumeRatio)) {
    if (volumeRatio >= 2) {
      score += 7;
      strongestFactors.push("Relative volume confirms participation.");
    } else if (volumeRatio >= 1.2) {
      score += 4;
      strongestFactors.push("Volume is above baseline.");
    } else {
      weakestFactors.push("Relative volume confirmation is weak.");
    }
  } else if (finiteNumber(volume) && Number(volume) > 0) {
    score += 3;
    strongestFactors.push("Liquidity/volume field is present.");
    missingData.push("averageVolume");
  } else {
    missingData.push("volume");
  }

  if (finiteNumber(marketCap) && Number(marketCap) > 0) {
    score += 2;
    strongestFactors.push("Market cap/liquidity field is present.");
  }

  return { score: clamp(Math.round(score), 0, 15), strongestFactors, weakestFactors, missingData };
}

function scoreRelativeStrength(asset = {}, peers = []) {
  const relativeStrength = firstFinite(asset.relativeStrength, asset.strength);
  const change = changePercent(asset);
  const peerChanges = peers.map(changePercent).filter((value) => value !== null);
  const missingData = [];
  const strongestFactors = [];
  const weakestFactors = [];
  let score = 3;

  if (finiteNumber(relativeStrength)) {
    if (relativeStrength >= 70) {
      score += 5;
      strongestFactors.push("Supplied relative strength is high.");
    } else if (relativeStrength >= 50) {
      score += 3;
      strongestFactors.push("Supplied relative strength is acceptable.");
    } else {
      weakestFactors.push("Supplied relative strength is weak.");
    }
  } else if (change !== null && peerChanges.length >= 3) {
    const peerAverage = peerChanges.reduce((sum, value) => sum + value, 0) / peerChanges.length;
    if (change > peerAverage) {
      score += 4;
      strongestFactors.push("Symbol is outperforming connected peers.");
    } else {
      weakestFactors.push("Symbol is not outperforming connected peers.");
    }
  } else {
    missingData.push("relativeStrength");
  }

  return { score: clamp(Math.round(score), 0, 10), strongestFactors, weakestFactors, missingData };
}

function normalizeAsset(asset = {}) {
  return {
    ...asset,
    symbol: asset.symbol || asset.ticker || String(asset.id || "").toUpperCase(),
    assetType: asset.assetType || asset.type || (asset.current_price != null ? "crypto" : "stock"),
    price: firstFinite(asset.price, asset.current_price, asset.last, asset.close),
    changePercent: changePercent(asset),
    volume: firstFinite(asset.volume, asset.total_volume),
    marketCap: firstFinite(asset.marketCap, asset.market_cap),
    provider: asset.provider || asset.source || asset.primaryDataSource || (asset.current_price != null ? "CoinGecko/Binance" : "Unknown"),
    dataQuality: asset.dataQuality || (asset.price != null || asset.current_price != null ? "PARTIAL" : "UNAVAILABLE"),
    timestamp: asset.timestamp || asset.lastUpdated || asset.updatedAt || asset.last_updated || new Date().toISOString(),
  };
}

export function scoreOpportunity(asset = {}, context = {}) {
  const normalized = normalizeAsset(asset);
  const peers = Array.isArray(context.peers) ? context.peers : [];
  const trend = scoreTrend(normalized);
  const momentum = scoreMomentum(normalized);
  const volume = scoreVolume(normalized);
  const relativeStrength = scoreRelativeStrength(normalized, peers);
  const catalyst = evaluateCatalystQuality(normalized, context);
  const riskReward = evaluateRiskReward(normalized);
  const dataQuality = scoreDataQuality({
    asset: normalized,
    sourceHealth: context.sourceHealth,
    requiredFields: ["price", "changePercent", "volume"],
  });

  const scoreBreakdown = {
    trend: { label: "Trend", max: 20, ...trend },
    momentum: { label: "Momentum", max: 15, ...momentum },
    volume: { label: "Volume / Participation", max: 15, ...volume },
    relativeStrength: { label: "Relative Strength", max: 10, ...relativeStrength },
    catalyst: { label: "Catalyst", max: 15, ...catalyst },
    riskReward: { label: "Risk / Reward", max: 15, ...riskReward },
    dataQuality: { label: "Data Quality", max: 10, score: dataQuality.score, strongestFactors: [], weakestFactors: [], missingData: dataQuality.missingData },
  };

  const setupScore = clamp(Object.values(scoreBreakdown).reduce((sum, item) => sum + (Number(item.score) || 0), 0), 0, 100);
  const strongestFactors = unique(Object.values(scoreBreakdown).flatMap((item) => item.strongestFactors || [])).slice(0, 5);
  const weakestFactors = unique(Object.values(scoreBreakdown).flatMap((item) => item.weakestFactors || [])).slice(0, 5);
  const missingData = unique(Object.values(scoreBreakdown).flatMap((item) => item.missingData || [])).slice(0, 12);

  return {
    symbol: normalized.symbol || "Unavailable",
    assetType: normalized.assetType || "unknown",
    setupScore,
    rating: ratingFromScore(setupScore),
    scoreBreakdown,
    strongestFactors,
    weakestFactors,
    missingData,
    dataQuality: dataQuality.quality,
    confidence: dataQuality.score >= 7 && missingData.length <= 4 ? "medium" : missingData.length > 6 ? "low" : "guarded",
    normalizedAsset: normalized,
    timestamp: new Date().toISOString(),
  };
}
