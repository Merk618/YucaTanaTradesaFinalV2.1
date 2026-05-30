function listCatalysts(asset = {}, context = {}) {
  const raw = [
    asset.catalyst,
    asset.catalysts,
    asset.news,
    asset.event,
    context.catalyst,
    context.catalysts,
    context.newsItems,
  ].flat().filter(Boolean);
  return raw.map((item) => typeof item === "string" ? { label: item } : item);
}

export function evaluateCatalystQuality(asset = {}, context = {}) {
  const catalysts = listCatalysts(asset, context);
  if (!catalysts.length) {
    return {
      score: 0,
      status: "UNAVAILABLE",
      catalysts: [],
      strongestFactors: [],
      weakestFactors: ["No supplied catalyst/news/filing data."],
      missingData: ["catalysts"],
      notes: ["Catalyst score is unavailable because YucaTanaTrades did not supply a catalyst field."],
    };
  }

  const labels = catalysts.map((item) => String(item.label || item.title || item.type || "Catalyst").trim());
  const hasHighQualitySource = catalysts.some((item) => item.source || item.url || item.publishedAt || item.timestamp);
  const score = Math.min(15, 6 + catalysts.length * 2 + (hasHighQualitySource ? 3 : 0));

  return {
    score,
    status: hasHighQualitySource ? "SUPPORTED" : "PARTIAL",
    catalysts,
    strongestFactors: labels.slice(0, 3).map((label) => `Supplied catalyst: ${label}.`),
    weakestFactors: hasHighQualitySource ? [] : ["Catalyst exists, but source/timestamp detail is limited."],
    missingData: hasHighQualitySource ? [] : ["catalyst source metadata"],
    notes: labels.slice(0, 3),
  };
}
