import assert from "node:assert/strict";
import {
  getLegacyStockTheses,
  normalizeStockThesis,
  STOCK_DEEP_DIVE_SOURCE_LABEL,
} from "../services/stocks/stockDeepDiveData.js";
import {
  loadStockTheses,
  saveStockThesisOverride,
  setSelectedStockThesisSymbol,
  getSelectedStockThesisSymbol,
} from "../services/stocks/stockThesisStore.js";

function memoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
}

const theses = getLegacyStockTheses();
assert.deepEqual(theses.map((item) => item.symbol), ["OXY", "NVDA", "META", "TSLA", "XLE", "CVX", "AAPL", "MSFT"]);

for (const thesis of theses) {
  assert.equal(thesis.sourceLabel, STOCK_DEEP_DIVE_SOURCE_LABEL);
  assert.equal(thesis.thesisStatus, "manual");
  assert.equal(thesis.manualTarget, null, `${thesis.symbol} should not ship stale target data`);
  assert.equal(thesis.manualStop, null, `${thesis.symbol} should not ship stale stop data`);
  assert.ok(thesis.manualThesisText.includes("Manual thesis"), `${thesis.symbol} must disclose manual thesis status`);
}

const normalized = normalizeStockThesis({ ticker: "nvda", name: "NVIDIA" });
assert.equal(normalized.symbol, "NVDA");
assert.equal(normalized.rating, "WATCH");

const storage = memoryStorage();
saveStockThesisOverride("NVDA", { sector: "AI", manualThesisHeadline: "Override headline" }, { storage });
const loaded = loadStockTheses({ storage });
assert.equal(loaded.find((item) => item.symbol === "NVDA").manualThesisHeadline, "Override headline");
setSelectedStockThesisSymbol("meta", { storage });
assert.equal(getSelectedStockThesisSymbol({ storage }), "META");

console.log("stock deep dive checks passed");
