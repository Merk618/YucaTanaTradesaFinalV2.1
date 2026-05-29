import { normalizePerplexityResponse, unavailablePerplexityResponse } from "./perplexityNormalizer.js";

export class PerplexityProxyError extends Error {
  constructor(message, code = "PERPLEXITY_PROXY_ERROR", status = null) {
    super(message);
    this.name = "PerplexityProxyError";
    this.code = code;
    this.status = status;
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

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new PerplexityProxyError("Invalid response from Perplexity proxy.", "INVALID_RESPONSE", response.status);
  }
}

function classifyHttpError(status, payload = {}) {
  if (status === 400) {
    return new PerplexityProxyError(payload.error || "Invalid Perplexity research request.", "BAD_REQUEST", status);
  }
  if (status === 429) {
    return new PerplexityProxyError(
      payload.error || "Rate limit active. Please wait before asking another research question.",
      "RATE_LIMITED",
      status
    );
  }
  if (status === 503) {
    return new PerplexityProxyError("Perplexity proxy is online but not configured server-side.", "PERPLEXITY_UNAVAILABLE", status);
  }
  if (status === 504) {
    return new PerplexityProxyError("Perplexity proxy timed out. Please retry shortly.", "REQUEST_TIMEOUT", status);
  }
  if (status === 502) {
    return new PerplexityProxyError("Perplexity research unavailable — retrying.", "PERPLEXITY_UNAVAILABLE", status);
  }
  return new PerplexityProxyError(payload.error || `Perplexity proxy request failed. HTTP ${status}`, "REQUEST_FAILED", status);
}

async function requestWithProxyHandling(fetchImpl, url, options, timeoutMs) {
  try {
    return await fetchWithTimeout(fetchImpl, url, options, timeoutMs);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new PerplexityProxyError("Perplexity proxy timed out. Please retry shortly.", "REQUEST_TIMEOUT");
    }
    throw new PerplexityProxyError("Perplexity proxy offline. Check API_PROXY_BASE or Worker deployment.", "PROXY_OFFLINE");
  }
}

export function createPerplexityClient({ proxyBase, fetchImpl = globalThis.fetch, timeoutMs = 18000 } = {}) {
  const base = cleanProxyBase(proxyBase);
  if (!fetchImpl) throw new PerplexityProxyError("Fetch implementation unavailable.", "FETCH_UNAVAILABLE");

  async function askFinance(request) {
    if (!base) {
      throw new PerplexityProxyError("Perplexity proxy not configured.", "PROXY_REQUIRED");
    }
    const response = await requestWithProxyHandling(fetchImpl, `${base}/perplexity/finance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }, timeoutMs);
    const payload = await readJsonSafely(response);
    if (!response.ok) {
      throw classifyHttpError(response.status, payload);
    }
    return normalizePerplexityResponse(payload);
  }

  async function healthCheck() {
    if (!base) {
      return { status: "PROXY REQUIRED", dataQuality: "UNAVAILABLE", latencyMs: null, lastSuccessAt: null, error: "API_PROXY_BASE is missing." };
    }
    const started = Date.now();
    try {
      const response = await requestWithProxyHandling(fetchImpl, `${base}/health`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      }, timeoutMs);
      const result = await readJsonSafely(response);
      if (!response.ok) {
        const classified = classifyHttpError(response.status, result);
        return {
          status: classified.code === "RATE_LIMITED" ? "RATE LIMITED" : "FAILED",
          dataQuality: "UNAVAILABLE",
          latencyMs: Date.now() - started,
          lastSuccessAt: null,
          error: classified.message,
        };
      }
      if (result?.status !== "ok") {
        return {
          status: "DEGRADED",
          dataQuality: "UNAVAILABLE",
          latencyMs: Date.now() - started,
          lastSuccessAt: null,
          error: "Proxy health response was invalid.",
        };
      }
      if (!result.perplexityConfigured) {
        return {
          status: "DEGRADED",
          dataQuality: "UNAVAILABLE",
          latencyMs: Date.now() - started,
          lastSuccessAt: null,
          error: "Proxy online; Perplexity secret is not configured server-side.",
        };
      }
      return {
        status: "CONNECTED",
        dataQuality: "WEB-GROUNDED",
        latencyMs: Date.now() - started,
        lastSuccessAt: result.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      const code = error?.code === "RATE_LIMITED" ? "RATE LIMITED" : error?.code === "PROXY_REQUIRED" ? "PROXY REQUIRED" : "FAILED";
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
