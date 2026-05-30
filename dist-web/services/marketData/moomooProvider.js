import { DEFAULT_MOOMOO_BRIDGE_URL, createMooMooClient } from "./moomooClient.js";

export const MOOMOO_SETTINGS_KEYS = {
  enabled: "MOOMOO_OPEND_ENABLED",
  bridgeUrl: "MOOMOO_BRIDGE_URL",
  primaryStocks: "MOOMOO_PRIMARY_STOCK_DATA",
  optionsEnabled: "MOOMOO_OPTIONS_DATA_ENABLED",
};

function storageValue(storage, key) {
  try {
    return storage?.getItem?.(key) || "";
  } catch {
    return "";
  }
}

export function getMooMooSettings(storage = globalThis.localStorage) {
  return {
    enabled: storageValue(storage, MOOMOO_SETTINGS_KEYS.enabled) === "true",
    bridgeUrl: storageValue(storage, MOOMOO_SETTINGS_KEYS.bridgeUrl) || DEFAULT_MOOMOO_BRIDGE_URL,
    primaryStocks: storageValue(storage, MOOMOO_SETTINGS_KEYS.primaryStocks) === "true",
    optionsEnabled: storageValue(storage, MOOMOO_SETTINGS_KEYS.optionsEnabled) === "true",
  };
}

export function createMooMooProvider(options = {}) {
  const settings = {
    ...getMooMooSettings(options.storage),
    ...(options.settings || {}),
  };
  const client = createMooMooClient({
    bridgeUrl: settings.bridgeUrl,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
  });

  return {
    id: "MOOMOO_OPEND",
    mode: "READ_ONLY_MARKET_DATA",
    settings,
    client,
    tradingSupported: false,
    brokerCredentialsSupportedInFrontend: false,
  };
}

export function describeMooMooMode(settings = {}) {
  if (!settings.enabled) return "DISABLED";
  if (settings.primaryStocks && settings.optionsEnabled) return "READ_ONLY_STOCKS_OPTIONS_PRIMARY";
  if (settings.primaryStocks) return "READ_ONLY_STOCKS_PRIMARY";
  if (settings.optionsEnabled) return "READ_ONLY_OPTIONS";
  return "READ_ONLY_AVAILABLE";
}
