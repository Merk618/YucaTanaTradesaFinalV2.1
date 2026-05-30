import { normalizeMooMooOptions, normalizeMooMooQuote } from "./moomooNormalizer.js";

export const DEFAULT_MOOMOO_BRIDGE_URL = "http://127.0.0.1:8765";

export class MooMooClientError extends Error {
  constructor(message, code = "MOOMOO_ERROR", status = null) {
    super(message);
    this.name = "MooMooClientError";
    this.code = code;
    this.status = status;
  }
}

function cleanBridgeUrl(value = DEFAULT_MOOMOO_BRIDGE_URL) {
  return String(value || DEFAULT_MOOMOO_BRIDGE_URL).trim().replace(/\/+$/, "");
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new MooMooClientError("MooMoo bridge request timed out.", "MOOMOO_TIMEOUT");
    }
    throw new MooMooClientError("MooMoo bridge unavailable. Start the local bridge/OpenD before using MooMoo data.", "MOOMOO_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new MooMooClientError("MooMoo bridge returned invalid JSON.", "MOOMOO_INVALID_RESPONSE", response.status);
  }
}

function classifyHttp(status, payload = {}) {
  const message = payload.error || payload.message || `MooMoo bridge request failed. HTTP ${status}`;
  if (status === 404) return new MooMooClientError(message, "MOOMOO_NOT_FOUND", status);
  if (status === 429) return new MooMooClientError(message, "MOOMOO_RATE_LIMITED", status);
  return new MooMooClientError(message, "MOOMOO_FAILED", status);
}

export function createMooMooClient({ bridgeUrl = DEFAULT_MOOMOO_BRIDGE_URL, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const base = cleanBridgeUrl(bridgeUrl);
  if (!fetchImpl) throw new MooMooClientError("Fetch implementation unavailable.", "FETCH_UNAVAILABLE");

  async function request(path) {
    const response = await fetchWithTimeout(fetchImpl, `${base}${path}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
    }, timeoutMs);
    const payload = await readJson(response);
    if (!response.ok) throw classifyHttp(response.status, payload);
    return payload;
  }

  async function healthCheck() {
    const started = Date.now();
    try {
      const payload = await request("/health");
      const running = /^(ok|running|connected)$/i.test(String(payload.status || payload.serviceStatus || ""));
      return {
        status: running ? "RUNNING" : "ERROR",
        bridgeUrl: base,
        dataQuality: running ? "LIVE" : "UNAVAILABLE",
        latencyMs: Date.now() - started,
        lastSuccessAt: running ? payload.timestamp || new Date().toISOString() : null,
        detail: payload.service || payload.message || (running ? "MooMoo bridge is reachable." : "MooMoo bridge health response was not running."),
      };
    } catch (error) {
      return {
        status: error?.code === "MOOMOO_INVALID_RESPONSE" ? "ERROR" : "UNAVAILABLE",
        bridgeUrl: base,
        dataQuality: "UNAVAILABLE",
        latencyMs: Date.now() - started,
        lastSuccessAt: null,
        detail: error?.message || "MooMoo bridge unavailable.",
        error: error?.message || "MooMoo bridge unavailable.",
      };
    }
  }

  async function getQuote(symbol = "") {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) throw new MooMooClientError("Stock symbol is required.", "MOOMOO_BAD_REQUEST", 400);
    return normalizeMooMooQuote(await request(`/quotes/${encodeURIComponent(cleanSymbol)}`), cleanSymbol);
  }

  async function getCandles(symbol = "", { timeframe = "1d", limit = 100 } = {}) {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) throw new MooMooClientError("Stock symbol is required.", "MOOMOO_BAD_REQUEST", 400);
    return request(`/candles/${encodeURIComponent(cleanSymbol)}?timeframe=${encodeURIComponent(timeframe)}&limit=${encodeURIComponent(limit)}`);
  }

  async function getSnapshot(symbol = "") {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) throw new MooMooClientError("Stock symbol is required.", "MOOMOO_BAD_REQUEST", 400);
    return request(`/snapshot/${encodeURIComponent(cleanSymbol)}`);
  }

  async function getOptions(symbol = "") {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) throw new MooMooClientError("Stock symbol is required.", "MOOMOO_BAD_REQUEST", 400);
    return normalizeMooMooOptions(await request(`/options/${encodeURIComponent(cleanSymbol)}`), cleanSymbol);
  }

  async function search(symbol = "") {
    const cleanSymbol = String(symbol || "").trim().toUpperCase();
    if (!cleanSymbol) return [];
    const payload = await request(`/search/${encodeURIComponent(cleanSymbol)}`);
    return Array.isArray(payload.results) ? payload.results : Array.isArray(payload.data) ? payload.data : [];
  }

  return {
    bridgeUrl: base,
    healthCheck,
    getQuote,
    getCandles,
    getSnapshot,
    getOptions,
    search,
  };
}
