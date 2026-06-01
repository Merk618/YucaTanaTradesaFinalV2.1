import { DEFAULT_MOOMOO_BRIDGE_URL, createMooMooClient } from "./moomooClient.js";
import { PROVIDER_SETTING_KEYS, readProviderSetting } from "../settings/providerSettings.js";

export const MOOMOO_SETTINGS_KEYS = {
  enabled: PROVIDER_SETTING_KEYS.localBridges.moomooBridgeEnabled,
  bridgeUrl: PROVIDER_SETTING_KEYS.localBridges.moomooBridgeUrl,
  primaryStocks: PROVIDER_SETTING_KEYS.localBridges.moomooPrimaryStockEnabled,
  optionsEnabled: PROVIDER_SETTING_KEYS.localBridges.moomooOptionsEnabled,
};

function storageValue(storage, key) {
  return readProviderSetting(storage, key);
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
