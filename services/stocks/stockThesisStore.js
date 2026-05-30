import { getLegacyStockTheses, normalizeStockThesis } from "./stockDeepDiveData.js";

export const STOCK_THESIS_STORAGE_KEYS = {
  overrides: "YTT_STOCK_DEEP_DIVE_OVERRIDES",
  selectedSymbol: "YTT_STOCK_DEEP_DIVE_SELECTED",
  filters: "YTT_STOCK_DEEP_DIVE_FILTERS",
};

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem?.(key, JSON.stringify(value));
  } catch {
    // Static GitHub Pages mode can run with storage disabled; keep UI alive.
  }
}

export function loadStockTheses({ storage = globalThis.localStorage } = {}) {
  const base = getLegacyStockTheses();
  const overrides = readJson(storage, STOCK_THESIS_STORAGE_KEYS.overrides, {});
  return base.map((thesis) => normalizeStockThesis({ ...thesis, ...(overrides[thesis.symbol] || {}) }));
}

export function saveStockThesisOverride(symbol, patch = {}, { storage = globalThis.localStorage } = {}) {
  const clean = String(symbol || "").trim().toUpperCase();
  if (!clean) return;
  const overrides = readJson(storage, STOCK_THESIS_STORAGE_KEYS.overrides, {});
  overrides[clean] = { ...(overrides[clean] || {}), ...patch, symbol: clean };
  writeJson(storage, STOCK_THESIS_STORAGE_KEYS.overrides, overrides);
}

export function getSelectedStockThesisSymbol({ storage = globalThis.localStorage } = {}) {
  try {
    return String(storage?.getItem?.(STOCK_THESIS_STORAGE_KEYS.selectedSymbol) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function setSelectedStockThesisSymbol(symbol = "", { storage = globalThis.localStorage } = {}) {
  try {
    const clean = String(symbol || "").trim().toUpperCase();
    if (clean) storage?.setItem?.(STOCK_THESIS_STORAGE_KEYS.selectedSymbol, clean);
    else storage?.removeItem?.(STOCK_THESIS_STORAGE_KEYS.selectedSymbol);
  } catch {
    // Ignore storage failures in static mode.
  }
}

export function loadStockThesisFilters({ storage = globalThis.localStorage } = {}) {
  return {
    rating: "all",
    sector: "all",
    sort: "marketBrain",
    confirmedOnly: false,
    ...readJson(storage, STOCK_THESIS_STORAGE_KEYS.filters, {}),
  };
}

export function saveStockThesisFilters(filters = {}, { storage = globalThis.localStorage } = {}) {
  writeJson(storage, STOCK_THESIS_STORAGE_KEYS.filters, {
    rating: filters.rating || "all",
    sector: filters.sector || "all",
    sort: filters.sort || "marketBrain",
    confirmedOnly: Boolean(filters.confirmedOnly),
  });
}
