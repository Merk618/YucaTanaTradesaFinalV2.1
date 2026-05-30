const QUALITY_POINTS = {
  LIVE: 10,
  WEB_GROUNDED: 9,
  "WEB-GROUNDED": 9,
  RECENT: 8,
  LOCAL_CONTEXT: 7,
  FALLBACK: 6,
  DELAYED: 5,
  PARTIAL: 4,
  UNKNOWN: 3,
  UNAVAILABLE: 0,
};

const PROVIDER_POINTS = {
  BINANCE: 10,
  COINGECKO: 9,
  "COINGECKO/BINANCE": 9,
  MOOMOO_OPEND: 9,
  FINNHUB: 7,
  "PROXY/FINNHUB": 7,
  "YTT DATA ROUTER": 7,
  UNKNOWN: 3,
};

export function finiteNumber(value) {
  return Number.isFinite(Number(value));
}

export function firstFinite(...values) {
  for (const value of values) {
    if (finiteNumber(value)) return Number(value);
  }
  return null;
}

export function normalizeQuality(value = "UNKNOWN") {
  return String(value || "UNKNOWN").trim().toUpperCase().replace(/\s+/g, "_");
}

export function providerReliability(provider = "") {
  const normalized = String(provider || "UNKNOWN").trim().toUpperCase();
  if (normalized.includes("BINANCE") && normalized.includes("COINGECKO")) return 9;
  if (normalized.includes("BINANCE")) return 10;
  if (normalized.includes("COINGECKO")) return 9;
  if (normalized.includes("MOOMOO")) return 9;
  if (normalized.includes("FINNHUB")) return 7;
  return PROVIDER_POINTS[normalized] ?? PROVIDER_POINTS.UNKNOWN;
}

export function freshnessScore(timestamp) {
  if (!timestamp) return { score: 2, ageMinutes: null, label: "timestamp unavailable" };
  const time = new Date(timestamp).getTime();
  if (!Number.isFinite(time)) return { score: 2, ageMinutes: null, label: "timestamp invalid" };
  const ageMinutes = Math.max(0, (Date.now() - time) / 60000);
  if (ageMinutes <= 5) return { score: 10, ageMinutes, label: "fresh" };
  if (ageMinutes <= 60) return { score: 8, ageMinutes, label: "recent" };
  if (ageMinutes <= 24 * 60) return { score: 5, ageMinutes, label: "stale intraday" };
  return { score: 2, ageMinutes, label: "stale" };
}

export function collectMissingFields(asset = {}, requiredFields = []) {
  return requiredFields.filter((field) => {
    const value = asset?.[field];
    if (value === null || value === undefined || value === "") return true;
    if (typeof value === "number" && !Number.isFinite(value)) return true;
    return false;
  });
}

export function scoreDataQuality({
  asset = {},
  sourceHealth = {},
  requiredFields = ["price", "changePercent", "volume"],
} = {}) {
  const missingData = collectMissingFields(asset, requiredFields);
  const quality = normalizeQuality(asset.dataQuality || asset.quality || (asset.price != null ? "PARTIAL" : "UNAVAILABLE"));
  const qualityScore = QUALITY_POINTS[quality] ?? QUALITY_POINTS.UNKNOWN;
  const sourceScore = providerReliability(asset.provider || asset.source || asset.primaryDataSource);
  const fresh = freshnessScore(asset.timestamp || asset.lastUpdated || asset.updatedAt || asset.last_updated);
  const fieldCoverage = requiredFields.length
    ? Math.max(0, 10 - Math.round((missingData.length / requiredFields.length) * 10))
    : 7;
  const sourceDown = Object.values(sourceHealth || {}).some((source) => source?.tone === "dn" || source?.label === "FAILED");
  const sourcePenalty = sourceDown ? 1 : 0;
  const score = Math.max(0, Math.min(10, Math.round(((qualityScore + sourceScore + fresh.score + fieldCoverage) / 4) - sourcePenalty)));

  return {
    score,
    quality,
    missingData,
    freshness: fresh,
    providerReliability: sourceScore,
    notes: [
      `Quality label ${quality}.`,
      `Provider reliability ${sourceScore}/10.`,
      `Freshness ${fresh.score}/10 (${fresh.label}).`,
      missingData.length ? `Missing ${missingData.join(", ")}.` : "Core required fields present.",
    ],
  };
}
