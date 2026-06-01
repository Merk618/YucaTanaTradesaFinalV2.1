export const MASKED_PROVIDER_SECRET = "************";

export const PROVIDER_SETTING_KEYS = {
  marketData: {
    finnhubApiKey: "FINNHUB_KEY",
    fredApiKey: "FRED_API_KEY",
    alphaVantageApiKey: "ALPHA_VANTAGE_API_KEY",
    fmpApiKey: "FMP_API_KEY",
    marketAuxApiKey: "MARKETAUX_API_KEY",
    coinGeckoApiKey: "COINGECKO_API_KEY",
    secUserAgentContact: "SEC_USER_AGENT_CONTACT",
  },
  ai: {
    apiProxyBase: "API_PROXY_BASE",
    perplexityEnabled: "PERPLEXITY_ENABLED",
    ollamaEnabled: "OLLAMA_ENABLED",
    ollamaEndpoint: "OLLAMA_ENDPOINT",
    ollamaModel: "OLLAMA_MODEL",
    ollamaProviderMode: "OLLAMA_PROVIDER_MODE",
  },
  localBridges: {
    moomooBridgeEnabled: "MOOMOO_OPEND_ENABLED",
    moomooBridgeUrl: "MOOMOO_BRIDGE_URL",
    moomooPrimaryStockEnabled: "MOOMOO_PRIMARY_STOCK_DATA",
    moomooOptionsEnabled: "MOOMOO_OPTIONS_DATA_ENABLED",
  },
  externalSignals: {
    externalSignalsEnabled: "PROSPERIO_SIGNALS_ENABLED",
    externalSignalsTrustLevel: "PROSPERIO_TRUST_LEVEL",
    externalSignalsRequireConfirmation: "PROSPERIO_REQUIRE_YTT_CONFIRMATION",
  },
};

export const PROVIDER_SETTING_ALIASES = {
  FINNHUB_KEY: ["FINNHUB_KEY", "FINNHUB_API_KEY"],
  COINGECKO_API_KEY: ["COINGECKO_API_KEY", "COINGECKO_KEY", "YTT_COINGECKO_API_KEY"],
};

export const PROVIDER_SETTING_DEFAULTS = {
  PERPLEXITY_ENABLED: "true",
  OLLAMA_ENABLED: "false",
  OLLAMA_ENDPOINT: "http://127.0.0.1:11434",
  OLLAMA_MODEL: "qwen2.5:7b",
  OLLAMA_PROVIDER_MODE: "auto",
  MOOMOO_OPEND_ENABLED: "false",
  MOOMOO_BRIDGE_URL: "http://127.0.0.1:8765",
  MOOMOO_PRIMARY_STOCK_DATA: "false",
  MOOMOO_OPTIONS_DATA_ENABLED: "false",
  PROSPERIO_SIGNALS_ENABLED: "false",
  PROSPERIO_TRUST_LEVEL: "low",
  PROSPERIO_REQUIRE_YTT_CONFIRMATION: "true",
};

export function readProviderSetting(storage, key, fallback = "") {
  const aliases = PROVIDER_SETTING_ALIASES[key] || [key];
  for (const alias of aliases) {
    try {
      const value = storage?.getItem?.(alias);
      if (value) return value;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function writeProviderSetting(storage, key, value) {
  if (!storage || !key) return;
  storage.setItem(key, String(value || ""));
}

export function clearProviderSetting(storage, key) {
  const aliases = PROVIDER_SETTING_ALIASES[key] || [key];
  for (const alias of aliases) {
    try {
      storage?.removeItem?.(alias);
    } catch {
      return;
    }
  }
}

export function isMaskedProviderSecret(value = "") {
  return /[●*]{4,}/.test(String(value || ""));
}

export function getProviderSettings(storage = globalThis.localStorage) {
  return {
    finnhubApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.finnhubApiKey),
    fredApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.fredApiKey),
    alphaVantageApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.alphaVantageApiKey),
    fmpApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.fmpApiKey),
    marketAuxApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.marketAuxApiKey),
    coinGeckoApiKey: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.coinGeckoApiKey),
    secUserAgentContact: readProviderSetting(storage, PROVIDER_SETTING_KEYS.marketData.secUserAgentContact),
    apiProxyBase: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.apiProxyBase),
    perplexityEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.perplexityEnabled, PROVIDER_SETTING_DEFAULTS.PERPLEXITY_ENABLED),
    ollamaEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaEnabled, PROVIDER_SETTING_DEFAULTS.OLLAMA_ENABLED),
    ollamaEndpoint: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaEndpoint, PROVIDER_SETTING_DEFAULTS.OLLAMA_ENDPOINT),
    ollamaModel: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaModel, PROVIDER_SETTING_DEFAULTS.OLLAMA_MODEL),
    ollamaProviderMode: readProviderSetting(storage, PROVIDER_SETTING_KEYS.ai.ollamaProviderMode, PROVIDER_SETTING_DEFAULTS.OLLAMA_PROVIDER_MODE),
    moomooBridgeEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.localBridges.moomooBridgeEnabled, PROVIDER_SETTING_DEFAULTS.MOOMOO_OPEND_ENABLED),
    moomooBridgeUrl: readProviderSetting(storage, PROVIDER_SETTING_KEYS.localBridges.moomooBridgeUrl, PROVIDER_SETTING_DEFAULTS.MOOMOO_BRIDGE_URL),
    moomooPrimaryStockEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.localBridges.moomooPrimaryStockEnabled, PROVIDER_SETTING_DEFAULTS.MOOMOO_PRIMARY_STOCK_DATA),
    moomooOptionsEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.localBridges.moomooOptionsEnabled, PROVIDER_SETTING_DEFAULTS.MOOMOO_OPTIONS_DATA_ENABLED),
    externalSignalsEnabled: readProviderSetting(storage, PROVIDER_SETTING_KEYS.externalSignals.externalSignalsEnabled, PROVIDER_SETTING_DEFAULTS.PROSPERIO_SIGNALS_ENABLED),
    externalSignalsTrustLevel: readProviderSetting(storage, PROVIDER_SETTING_KEYS.externalSignals.externalSignalsTrustLevel, PROVIDER_SETTING_DEFAULTS.PROSPERIO_TRUST_LEVEL),
    externalSignalsRequireConfirmation: readProviderSetting(storage, PROVIDER_SETTING_KEYS.externalSignals.externalSignalsRequireConfirmation, PROVIDER_SETTING_DEFAULTS.PROSPERIO_REQUIRE_YTT_CONFIRMATION),
  };
}
