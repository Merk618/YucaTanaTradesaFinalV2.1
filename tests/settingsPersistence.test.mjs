import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const index = await readFile(new URL("../apps/web/index.html", import.meta.url), "utf8");
const aiPanel = await readFile(new URL("../apps/web/scripts/perplexityResearch.js", import.meta.url), "utf8");

for (const key of [
  "FINNHUB_KEY",
  "API_PROXY_BASE",
  "PERPLEXITY_ENABLED",
  "PERPLEXITY_RESEARCH_MODE",
  "AI_PROVIDER_SELECTION",
  "OLLAMA_ENABLED",
  "OLLAMA_ENDPOINT",
  "OLLAMA_MODEL",
  "OLLAMA_PROVIDER_MODE",
  "MOOMOO_OPEND_ENABLED",
  "MOOMOO_BRIDGE_URL",
  "MOOMOO_PRIMARY_STOCK_DATA",
  "MOOMOO_OPTIONS_DATA_ENABLED",
  "PROSPERIO_SIGNALS_ENABLED",
  "PROSPERIO_INPUT_MODE",
  "PROSPERIO_TRUST_LEVEL",
  "PROSPERIO_REQUIRE_YTT_CONFIRMATION",
  "YTT_EXTERNAL_SIGNALS",
]) {
assert.ok(index.includes(key) || aiPanel.includes(key), `${key} must be represented in settings persistence code`);
}

assert.ok(index.includes("'input-finnhub': 'FINNHUB_KEY'"), "Finnhub key should be mapped into the provider vault");
assert.ok(index.includes("'input-api-proxy': 'API_PROXY_BASE'"), "API proxy should be mapped into the provider vault");
assert.ok(index.includes("localStorage.setItem(key, value)"), "Provider vault values should save to localStorage");
assert.ok(index.includes("localStorage.removeItem(key)"), "Provider vault values should clear when fields are emptied");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.ollamaEndpoint"), "Ollama endpoint should persist");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.moomooBridgeUrl"), "MooMoo bridge URL should persist");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.prosperioEnabled"), "Prosperio enabled setting should persist");
assert.ok(aiPanel.includes("adaptManualProsperioSignal"), "Manual Prosperio signal entry should be normalized before storage");
assert.ok(index.includes("DIRECT_CRYPTO_SYMBOLS"), "Legacy fallback should have crypto symbol guard");
assert.ok(index.includes("YTTStockDeepDive?.getContext"), "Stock Deep-Dive context should feed AI context");

console.log("settings persistence checks passed");
