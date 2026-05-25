import { normalizePerplexityResponse, unavailablePerplexityResponse } from "./perplexityNormalizer.js";

export class PerplexityProxyError extends Error {
  constructor(message, code = "PERPLEXITY_PROXY_ERROR") {
    super(message);
    this.name = "PerplexityProxyError";
    this.code = code;
  }
}

function cleanProxyBase(proxyBase = "") {
  return String(proxyBase || "").trim().replace(/\/+$/, "");
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function createPerplexityClient({ proxyBase, fetchImpl = globalThis.fetch, timeoutMs = 18000 } = {}) {
  const base = cleanProxyBase(proxyBase);
  if (!fetchImpl) throw new PerplexityProxyError("Fetch implementation unavailable.", "FETCH_UNAVAILABLE");

  async function askFinance(request) {
    if (!base) {
      throw new PerplexityProxyError("Perplexity proxy not configured.", "PROXY_REQUIRED");
    }
    const response = await fetchWithTimeout(fetchImpl, `${base}/perplexity/finance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }, timeoutMs);
    if (!response.ok) {
      throw new PerplexityProxyError(`Perplexity research unavailable — retrying. HTTP ${response.status}`, "REQUEST_FAILED");
    }
    return normalizePerplexityResponse(await response.json());
  }

  async function healthCheck() {
    if (!base) {
      return { status: "PROXY REQUIRED", dataQuality: "UNAVAILABLE", latencyMs: null, lastSuccessAt: null };
    }
    const started = Date.now();
    try {
      const result = await askFinance({
        query: "Perplexity source health check. Reply with a one sentence readiness status.",
        mode: "quick_summary",
        selectedTab: "settings",
        watchlist: [],
        marketContext: {},
        scannerContext: {},
      });
      return {
        status: "CONNECTED",
        dataQuality: result.dataQuality || "WEB-GROUNDED",
        latencyMs: Date.now() - started,
        lastSuccessAt: result.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      const code = error?.code === "PROXY_REQUIRED" ? "PROXY REQUIRED" : "FAILED";
      return {
        status: code,
        dataQuality: "UNAVAILABLE",
        latencyMs: Date.now() - started,
        lastSuccessAt: null,
        error: error?.message || "Perplexity research unavailable — retrying.",
      };
    }
  }

  return { askFinance, healthCheck, unavailable: unavailablePerplexityResponse };
}
