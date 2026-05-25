const DATA_QUALITY_VALUES = new Set(["LIVE", "DELAYED", "WEB-GROUNDED", "FALLBACK", "UNAVAILABLE"]);

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeCitation(citation) {
  if (typeof citation === "string") return { title: citation, url: citation };
  return {
    title: citation?.title || citation?.name || citation?.url || "Source",
    url: citation?.url || citation?.link || "",
    publisher: citation?.publisher || citation?.source || "",
  };
}

export function normalizePerplexityResponse(payload = {}) {
  const answer = payload.answer || payload.response || payload.content || payload.text || "";
  const citations = asArray(payload.citations || payload.sources).map(normalizeCitation).filter((item) => item.title || item.url);
  const sources = asArray(payload.sources).map(normalizeCitation).filter((item) => item.title || item.url);
  const dataQuality = DATA_QUALITY_VALUES.has(payload.dataQuality) ? payload.dataQuality : citations.length ? "WEB-GROUNDED" : "UNAVAILABLE";
  return {
    answer: answer || "Perplexity research unavailable — retrying.",
    citations,
    sources: sources.length ? sources : citations,
    tickers: asArray(payload.tickers).map((ticker) => String(ticker).toUpperCase()).filter(Boolean),
    timestamp: payload.timestamp || new Date().toISOString(),
    categories: asArray(payload.categories).map(String),
    dataQuality,
    latencyMs: Number.isFinite(Number(payload.latencyMs)) ? Number(payload.latencyMs) : null,
  };
}

export function unavailablePerplexityResponse(message = "Perplexity research unavailable — retrying.") {
  return normalizePerplexityResponse({
    answer: message,
    timestamp: new Date().toISOString(),
    dataQuality: "UNAVAILABLE",
  });
}
