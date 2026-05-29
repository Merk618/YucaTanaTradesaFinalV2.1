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
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const answer = data.answer || data.response || data.content || data.text || "";
  const citations = asArray(data.citations || data.sources).map(normalizeCitation).filter((item) => item.title || item.url);
  const sources = asArray(data.sources).map(normalizeCitation).filter((item) => item.title || item.url);
  const dataQuality = DATA_QUALITY_VALUES.has(data.dataQuality) ? data.dataQuality : citations.length ? "WEB-GROUNDED" : "UNAVAILABLE";
  return {
    answer: answer || "Perplexity research unavailable — retrying.",
    citations,
    sources: sources.length ? sources : citations,
    tickers: asArray(data.tickers).map((ticker) => String(ticker).toUpperCase()).filter(Boolean),
    timestamp: data.timestamp || new Date().toISOString(),
    categories: asArray(data.categories).map(String),
    dataQuality,
    latencyMs: Number.isFinite(Number(data.latencyMs)) ? Number(data.latencyMs) : null,
  };
}

export function unavailablePerplexityResponse(message = "Perplexity research unavailable — retrying.") {
  return normalizePerplexityResponse({
    answer: message,
    timestamp: new Date().toISOString(),
    dataQuality: "UNAVAILABLE",
  });
}
