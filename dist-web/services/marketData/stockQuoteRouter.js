import { createMooMooClient } from "./moomooClient.js";
import { normalizeFinnhubQuote, unavailableStockQuote } from "./moomooNormalizer.js";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

function cleanSymbol(symbol = "") {
  return String(symbol || "").trim().toUpperCase();
}

function cleanProxyBase(proxyBase = "") {
  return String(proxyBase || "").trim().replace(/\/+$/, "");
}

async function readJson(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Stock quote route returned invalid JSON.");
  }
}

async function fetchFinnhubQuote(symbol, { fetchImpl = globalThis.fetch, apiProxyBase = "", finnhubKey = "", timeoutMs = 9000 } = {}) {
  if (!fetchImpl) throw new Error("Fetch implementation unavailable.");
  const base = cleanProxyBase(apiProxyBase);
  const url = base
    ? `${base}/finnhub/quote?symbol=${encodeURIComponent(symbol)}`
    : finnhubKey
      ? `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(finnhubKey)}`
      : "";
  if (!url) throw new Error("Finnhub key or API proxy is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { "Accept": "application/json" }, signal: controller.signal });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(payload.error || `Finnhub quote failed. HTTP ${response.status}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function routeStockQuote({
  symbol = "",
  settings = {},
  fallbackQuote = null,
  fetchImpl = globalThis.fetch,
  timeoutMs = 9000,
} = {}) {
  const clean = cleanSymbol(symbol);
  if (!clean) return unavailableStockQuote("", "Stock symbol is required.");
  const moomoo = settings.moomoo || {};
  const shouldUseMooMoo = moomoo.enabled === true && moomoo.primaryStocks === true;

  if (shouldUseMooMoo) {
    try {
      const quote = await createMooMooClient({
        bridgeUrl: moomoo.bridgeUrl,
        fetchImpl,
        timeoutMs,
      }).getQuote(clean);
      return quote;
    } catch (error) {
      const fallback = await routeFinnhubFallback(clean, {
        settings,
        fallbackQuote,
        fetchImpl,
        timeoutMs,
        errorPrefix: error?.message || "MooMoo bridge unavailable.",
      });
      return {
        ...fallback,
        primaryProvider: "MOOMOO_OPEND",
        fallbackUsed: fallback.dataQuality !== "UNAVAILABLE",
        error: fallback.dataQuality === "UNAVAILABLE" ? `${error?.message || "MooMoo bridge unavailable."} Finnhub fallback unavailable.` : error?.message || "",
      };
    }
  }

  return routeFinnhubFallback(clean, { settings, fallbackQuote, fetchImpl, timeoutMs, errorPrefix: "" });
}

async function routeFinnhubFallback(symbol, { settings = {}, fallbackQuote = null, fetchImpl, timeoutMs, errorPrefix = "" } = {}) {
  if (fallbackQuote) {
    return normalizeFinnhubQuote({ ...fallbackQuote, symbol }, symbol, { fallbackUsed: true });
  }

  try {
    const payload = await fetchFinnhubQuote(symbol, {
      fetchImpl,
      apiProxyBase: settings.apiProxyBase,
      finnhubKey: settings.finnhubKey,
      timeoutMs,
    });
    return normalizeFinnhubQuote(payload, symbol, { fallbackUsed: true });
  } catch (error) {
    return unavailableStockQuote(symbol, [errorPrefix, error?.message || "Finnhub fallback unavailable."].filter(Boolean).join(" "));
  }
}
