import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clearProviderSetting,
  getProviderSettings,
  isMaskedProviderSecret,
  PROVIDER_SETTING_ALIASES,
  PROVIDER_SETTING_KEYS,
  readProviderSetting,
  writeProviderSetting,
} from "../services/settings/providerSettings.js";

const index = await readFile(new URL("../apps/web/index.html", import.meta.url), "utf8");
const aiPanel = await readFile(new URL("../apps/web/scripts/perplexityResearch.js", import.meta.url), "utf8");
const cryptoScanner = await readFile(new URL("../services/crypto/cryptoScannerProService.js", import.meta.url), "utf8");

for (const key of [
  "FINNHUB_KEY",
  "FRED_API_KEY",
  "ALPHA_VANTAGE_API_KEY",
  "FMP_API_KEY",
  "MARKETAUX_API_KEY",
  "COINGECKO_API_KEY",
  "SEC_USER_AGENT_CONTACT",
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
  "PROSPERIO_TRUST_LEVEL",
  "PROSPERIO_REQUIRE_YTT_CONFIRMATION",
  "YTT_EXTERNAL_SIGNALS",
]) {
  assert.ok(index.includes(key) || aiPanel.includes(key), `${key} must be represented in settings persistence code`);
}

for (const [fieldId, storageKey] of [
  ["input-finnhub", "FINNHUB_KEY"],
  ["input-fred", "FRED_API_KEY"],
  ["input-alpha-vantage", "ALPHA_VANTAGE_API_KEY"],
  ["input-fmp", "FMP_API_KEY"],
  ["input-marketaux", "MARKETAUX_API_KEY"],
  ["input-coingecko", "COINGECKO_API_KEY"],
  ["input-api-proxy", "API_PROXY_BASE"],
  ["input-sec-contact", "SEC_USER_AGENT_CONTACT"],
]) {
  assert.ok(index.includes(`'${fieldId}': ${storageKey === "API_PROXY_BASE" || storageKey === "SEC_USER_AGENT_CONTACT" ? "PROVIDER_SETTING_KEYS" : ""}`) || index.includes(`'${fieldId}': '${storageKey}'`) || index.includes(`'${fieldId}': PROVIDER_SETTING_KEYS`), `${fieldId} should be mapped for save/load`);
}

for (const clearId of ["input-finnhub", "input-fred", "input-alpha-vantage", "input-fmp", "input-marketaux", "input-coingecko"]) {
  assert.ok(index.includes(`clearVaultSecret('${clearId}')`), `${clearId} should have an explicit clear button`);
}

assert.ok(index.includes("YucaTana Data &amp; AI Vault"), "Vault should use the Data & AI Provider naming");
assert.ok(index.includes("clearVaultSecret(id)"), "Clear key behavior should be implemented");
assert.ok(index.includes("if (value && !isMaskedSecret(value)) localStorage.setItem(key, value);"), "Masked or blank secrets must not overwrite saved keys");
assert.ok(index.includes("readVaultSecret(storeKey)"), "Loaded secrets should use alias-aware masked reads");
assert.ok(index.includes("COINGECKO_API_KEY"), "CoinGecko optional key should be saved in the vault");
assert.ok(cryptoScanner.includes("PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey"), "Crypto scanner should read the centralized CoinGecko setting");
assert.ok(index.includes("PUBLIC_MODE"), "CoinGecko should support public/no-key mode");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.ollamaEndpoint"), "Ollama endpoint should persist");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.moomooBridgeUrl"), "MooMoo bridge URL should persist");
assert.ok(aiPanel.includes("localStorage.setItem(SETTINGS.prosperioEnabled"), "Prosperio enabled setting should persist");
assert.ok(aiPanel.includes("adaptManualProsperioSignal"), "Manual Prosperio signal entry should be normalized before storage");
assert.ok(index.includes("DIRECT_CRYPTO_SYMBOLS"), "Legacy fallback should have crypto symbol guard");
assert.ok(index.includes("YTTStockDeepDive?.getContext"), "Stock Deep-Dive context should feed AI context");

const vaultHtml = index.slice(index.indexOf("YucaTana Data &amp; AI Vault"), index.indexOf("Provider Diagnostics"));
const deprecatedHtml = vaultHtml.slice(vaultHtml.indexOf("Deprecated / Future Broker Integrations"));
assert.ok(deprecatedHtml.includes("Tradier API Key"), "Tradier should only appear in the deprecated/future section");
assert.ok(deprecatedHtml.includes("Alpaca API Key / Secret"), "Alpaca should only appear in the deprecated/future section");
assert.ok(!/Perplexity API Key/i.test(vaultHtml.replace("Perplexity API keys", "")), "No frontend Perplexity API key field should exist");
assert.ok(!/<input[^>]+(?:coinbase|kraken)/i.test(vaultHtml), "No active Coinbase/Kraken frontend key fields should exist");

const mapStore = new Map();
const storage = {
  getItem: (key) => mapStore.has(key) ? mapStore.get(key) : null,
  setItem: (key, value) => mapStore.set(key, String(value)),
  removeItem: (key) => mapStore.delete(key),
};

writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.finnhubApiKey, "finnhub-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.fredApiKey, "fred-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.alphaVantageApiKey, "alpha-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.fmpApiKey, "fmp-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.marketAuxApiKey, "marketaux-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey, "cg-secret");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.apiProxyBase, "https://worker.example");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaEndpoint, "http://127.0.0.1:11434");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaModel, "qwen2.5:7b");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.localBridges.moomooBridgeUrl, "http://127.0.0.1:8765");
writeProviderSetting(storage, PROVIDER_SETTING_KEYS.externalSignals.externalSignalsEnabled, "true");

const saved = getProviderSettings(storage);
assert.equal(saved.finnhubApiKey, "finnhub-secret");
assert.equal(saved.fredApiKey, "fred-secret");
assert.equal(saved.alphaVantageApiKey, "alpha-secret");
assert.equal(saved.fmpApiKey, "fmp-secret");
assert.equal(saved.marketAuxApiKey, "marketaux-secret");
assert.equal(saved.coinGeckoApiKey, "cg-secret");
assert.equal(saved.apiProxyBase, "https://worker.example");
assert.equal(saved.ollamaEndpoint, "http://127.0.0.1:11434");
assert.equal(saved.ollamaModel, "qwen2.5:7b");
assert.equal(saved.moomooBridgeUrl, "http://127.0.0.1:8765");
assert.equal(saved.externalSignalsEnabled, "true");

assert.ok(isMaskedProviderSecret("●●●●●●●●●●●●"), "bullet mask should be detected");
assert.ok(isMaskedProviderSecret("************"), "asterisk mask should be detected");
assert.deepEqual(PROVIDER_SETTING_ALIASES.COIN_GECKO_API_KEY, undefined);
assert.equal(readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey), "cg-secret");
clearProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey);
assert.equal(readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey), "");

console.log("settings persistence checks passed");
