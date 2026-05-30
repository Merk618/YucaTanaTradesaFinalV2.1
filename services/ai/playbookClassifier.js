import { firstFinite } from "./dataQualityEngine.js";

function changePercent(asset = {}) {
  return firstFinite(asset.changePercent, asset.changePct, asset.price_change_percentage_24h, asset.price_change_percentage_24h_in_currency);
}

export function classifyPlaybook(asset = {}, scoreBreakdown = {}, riskReward = {}) {
  const assetType = asset.assetType || asset.type || "unknown";
  const change = changePercent(asset);
  const rsi = firstFinite(asset.rsi);
  const macd = String(asset.macdState || asset.macd || "").toLowerCase();
  const volumeRatio = firstFinite(asset.volumeRatio, asset.relativeVolume, asset.volumeMultiple);
  const liquidity = firstFinite(asset.liquidityRank);
  const notes = [];
  let primaryPlaybook = "No Clear Setup";
  let secondaryPlaybook = "Confirmation Needed";

  if (rsi != null && rsi >= 78) {
    primaryPlaybook = "Overextended / Chase Risk";
    notes.push("RSI is extreme from supplied data.");
  } else if (change != null && change >= (assetType === "crypto" ? 8 : 4)) {
    primaryPlaybook = "Momentum Breakout";
    notes.push("Connected price change shows momentum.");
  } else if (macd.includes("bull")) {
    primaryPlaybook = assetType === "crypto" ? "Trend Recovery" : "Trend Continuation";
    notes.push("Supplied MACD state leans bullish.");
  } else if (volumeRatio != null && volumeRatio >= 1.5) {
    primaryPlaybook = assetType === "crypto" ? "Volume Spike" : "Volume Expansion";
    notes.push("Supplied relative volume is elevated.");
  } else if (riskReward.invalidationDataAvailable) {
    primaryPlaybook = "Pullback to Support";
    notes.push("Support/resistance data gives an invalidation framework.");
  } else if ((scoreBreakdown?.trend?.score || 0) < 6 && (scoreBreakdown?.momentum?.score || 0) < 5) {
    primaryPlaybook = "Broken Trend";
    notes.push("Trend and momentum components are weak.");
  }

  if (assetType === "crypto" && liquidity != null && liquidity > 150) {
    secondaryPlaybook = "Weak Liquidity Risk";
    notes.push("Liquidity rank is weak from supplied data.");
  } else if ((scoreBreakdown?.catalyst?.score || 0) > 0) {
    secondaryPlaybook = assetType === "crypto" ? "Narrative/Catalyst Watch" : "Earnings Catalyst";
  } else if ((scoreBreakdown?.volume?.score || 0) >= 9) {
    secondaryPlaybook = assetType === "crypto" ? "Volume Spike" : "Volume Expansion";
  }

  return {
    primaryPlaybook,
    secondaryPlaybook,
    invalidationDataAvailable: Boolean(riskReward.invalidationDataAvailable),
    notes: notes.length ? notes : ["No clear setup classification from supplied data."],
  };
}
