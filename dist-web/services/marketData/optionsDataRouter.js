import { createMooMooClient } from "./moomooClient.js";
import { unavailableOptions } from "./moomooNormalizer.js";

function cleanSymbol(symbol = "") {
  return String(symbol || "").trim().toUpperCase();
}

export async function routeOptionsData({
  symbol = "",
  settings = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
} = {}) {
  const clean = cleanSymbol(symbol);
  if (!clean) return unavailableOptions("", "Options symbol is required.");
  const moomoo = settings.moomoo || {};

  if (!moomoo.enabled || !moomoo.optionsEnabled) {
    return unavailableOptions(clean, "Options data unavailable. Enable MooMoo OpenD options data and start the read-only local bridge.");
  }

  try {
    return await createMooMooClient({
      bridgeUrl: moomoo.bridgeUrl,
      fetchImpl,
      timeoutMs,
    }).getOptions(clean);
  } catch (error) {
    return unavailableOptions(clean, error?.message || "MooMoo options bridge unavailable.");
  }
}
