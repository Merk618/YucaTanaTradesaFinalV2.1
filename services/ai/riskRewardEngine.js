import { firstFinite, finiteNumber } from "./dataQualityEngine.js";

export function evaluateRiskReward(asset = {}) {
  const price = firstFinite(asset.price, asset.current_price, asset.last, asset.close);
  const support = firstFinite(asset.support, asset.supportLevel, asset.vwap);
  const resistance = firstFinite(asset.resistance, asset.resistanceLevel);
  const volatility = firstFinite(asset.volatility, asset.atrPercent, asset.beta);
  const rsi = firstFinite(asset.rsi);
  const missingData = [];
  const strongestFactors = [];
  const weakestFactors = [];
  let score = 4;
  let rewardRiskRatio = null;

  if (price == null) {
    missingData.push("price");
    weakestFactors.push("Price is unavailable, so risk/reward cannot be anchored.");
  }

  if (price != null && support != null && resistance != null && resistance > price && price > support) {
    const downside = Math.max(price - support, 0.000001);
    const upside = Math.max(resistance - price, 0);
    rewardRiskRatio = upside / downside;
    if (rewardRiskRatio >= 2) {
      score += 6;
      strongestFactors.push("Supplied support/resistance imply favorable upside versus downside.");
    } else if (rewardRiskRatio >= 1) {
      score += 3;
      strongestFactors.push("Supplied support/resistance show a balanced risk/reward profile.");
    } else {
      weakestFactors.push("Supplied resistance is close relative to support risk.");
    }
  } else {
    if (support == null) missingData.push("support");
    if (resistance == null) missingData.push("resistance");
    weakestFactors.push("Support/resistance data is missing, so invalidation clarity is limited.");
  }

  if (finiteNumber(volatility)) {
    if (Number(volatility) <= 35) {
      score += 2;
      strongestFactors.push("Volatility appears manageable from supplied data.");
    } else if (Number(volatility) >= 75) {
      score -= 2;
      weakestFactors.push("Volatility is elevated from supplied data.");
    }
  } else {
    missingData.push("volatility");
  }

  if (finiteNumber(rsi)) {
    if (rsi > 75) {
      score -= 2;
      weakestFactors.push("RSI is extreme, increasing chase risk.");
    } else if (rsi >= 45 && rsi <= 68) {
      score += 2;
      strongestFactors.push("RSI is in a healthier participation zone.");
    }
  } else {
    missingData.push("rsi");
  }

  return {
    score: Math.max(0, Math.min(15, Math.round(score))),
    rewardRiskRatio,
    invalidationDataAvailable: support != null && resistance != null,
    strongestFactors,
    weakestFactors,
    missingData: [...new Set(missingData)],
    notes: [
      rewardRiskRatio == null ? "Reward/risk ratio unavailable." : `Reward/risk ratio ${rewardRiskRatio.toFixed(2)} from supplied support/resistance.`,
    ],
  };
}
