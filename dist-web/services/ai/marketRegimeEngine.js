import { firstFinite } from "./dataQualityEngine.js";

function changePercent(asset = {}) {
  return firstFinite(
    asset.changePercent,
    asset.changePct,
    asset.price_change_percentage_24h,
    asset.price_change_percentage_24h_in_currency,
    asset.price_change_percentage_7d_in_currency
  );
}

function collectAssets(context = {}, assetType = "") {
  const stocks = Object.values(context.stockQuotes || context.marketContext?.stockQuotes || {});
  const crypto = Object.values(context.cryptoMarkets || context.marketContext?.cryptoMarkets || {});
  if (assetType === "crypto") return crypto;
  if (assetType === "stock") return stocks;
  return [...stocks, ...crypto];
}

export function evaluateMarketRegime({ context = {}, assetType = "" } = {}) {
  const assets = collectAssets(context, assetType);
  const changes = assets.map(changePercent).filter((value) => value !== null);
  if (changes.length < 3) {
    return {
      regime: "UNKNOWN",
      confidence: 0.2,
      notes: ["Not enough connected breadth data to classify market regime."],
      dataQuality: "UNAVAILABLE",
    };
  }

  const positive = changes.filter((value) => value > 0).length;
  const average = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  const breadth = positive / changes.length;
  let regime = "MIXED";
  if (breadth >= 0.62 && average > 0) regime = "RISK_ON";
  if (breadth <= 0.38 && average < 0) regime = "RISK_OFF";
  const confidence = Math.min(0.9, Math.max(0.35, Math.abs(breadth - 0.5) * 1.8 + Math.min(Math.abs(average) / 10, 0.25)));

  return {
    regime,
    confidence: Number(confidence.toFixed(2)),
    notes: [
      `${positive}/${changes.length} connected assets are positive.`,
      `Average connected change is ${average.toFixed(2)}%.`,
      regime === "RISK_OFF"
        ? "Demand higher confirmation and cleaner risk/reward."
        : regime === "RISK_ON"
          ? "Momentum setups can receive more favorable interpretation."
          : "Mixed tape; selectivity matters.",
    ],
    dataQuality: "PARTIAL",
  };
}
