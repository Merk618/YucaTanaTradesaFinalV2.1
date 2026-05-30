import assert from "node:assert/strict";
import { createExternalSignalProvider, EXTERNAL_SIGNAL_SETTINGS } from "../services/signals/externalSignalProvider.js";
import { adaptManualProsperioSignal } from "../services/signals/prosperioSignalAdapter.js";
import { compareExternalSignal } from "../services/signals/signalScoreComparator.js";
import { SIGNAL_CONFIRMATION } from "../services/signals/signalNormalizer.js";

function memoryStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

const storage = memoryStorage({
  [EXTERNAL_SIGNAL_SETTINGS.prosperioEnabled]: "true",
  [EXTERNAL_SIGNAL_SETTINGS.prosperioTrustLevel]: "low",
  [EXTERNAL_SIGNAL_SETTINGS.prosperioRequireConfirmation]: "true",
});
const provider = createExternalSignalProvider({ storage });
const validation = adaptManualProsperioSignal({
  symbol: "XLM",
  assetType: "crypto",
  horizon: "short-term",
  direction: "bullish",
  providerConfidence: "Medium",
  entryZone: "provided by user",
  target: "provided by user",
  riskNote: "Volatility risk",
  sourceUrl: "manual note",
});

assert.equal(validation.valid, true);
provider.addSignal(validation.signal);
assert.equal(provider.listSignals().length, 1);

const appState = {
  cryptoMarkets: {
    XLM: {
      symbol: "xlm",
      name: "Stellar",
      current_price: 0.16,
      price_change_percentage_24h: 4.2,
      total_volume: 10000000,
      market_cap: 4800000000,
      last_updated: new Date().toISOString(),
    },
  },
  stockQuotes: {},
  sourceHealth: {
    coingecko: { tone: "up", label: "CONNECTED" },
    binance: { tone: "up", label: "CONNECTED" },
  },
};

const comparison = provider.compareSignals(appState)[0];
assert.equal(comparison.signal.provider, "PROSPERIO_AI");
assert.equal(comparison.signal.symbol, "XLM");
assert.equal(comparison.marketBrain.assetType, "crypto");
assert.notEqual(comparison.confirmationStatus, SIGNAL_CONFIRMATION.CONFLICTING);
assert.notEqual(comparison.finalRating, "BUY");
assert.notEqual(comparison.finalRating, "SELL");
assert.ok(comparison.notes.some((note) => note.includes("overlay only")));

const missing = compareExternalSignal({ symbol: "SNOW", assetType: "stock", direction: "bullish" }, appState);
assert.equal(missing.confirmationStatus, SIGNAL_CONFIRMATION.DATA_INSUFFICIENT);
assert.equal(missing.yucaTanaScore, null);

console.log("external signal tests passed");
