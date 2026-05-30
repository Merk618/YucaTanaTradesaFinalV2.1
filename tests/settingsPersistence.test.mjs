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
]) {
  assert.ok(index.includes(key) || aiPanel.includes(key), `${key} must be represented in settings persistence code`);
}

assert.ok(index.includes("localStorage.setItem('FINNHUB_KEY'"), "Finnhub key should save to localStorage");
assert.ok(index.includes("localStorage.setItem('API_PROXY_BASE'"), "API proxy should save to localStorage");
assert.ok(index.includes("localStorage.removeItem('API_PROXY_BASE'"), "API proxy should clear when field is emptied");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.ollamaEndpoint"), "Ollama endpoint should persist");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.moomooBridgeUrl"), "MooMoo bridge URL should persist");
assert.ok(index.includes("DIRECT_CRYPTO_SYMBOLS"), "Legacy fallback should have crypto symbol guard");

console.log("settings persistence checks passed");
