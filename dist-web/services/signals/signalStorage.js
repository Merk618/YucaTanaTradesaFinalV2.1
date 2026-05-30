import { normalizeExternalSignal } from "./signalNormalizer.js";

export const EXTERNAL_SIGNALS_STORAGE_KEY = "YTT_EXTERNAL_SIGNALS";

let memorySignals = [];

function getStorage(storage = globalThis.localStorage) {
  try {
    if (storage && typeof storage.getItem === "function") return storage;
  } catch {
    return null;
  }
  return null;
}

export function loadExternalSignals({ storage = globalThis.localStorage } = {}) {
  const target = getStorage(storage);
  if (!target) return memorySignals.map(normalizeExternalSignal);
  try {
    const parsed = JSON.parse(target.getItem(EXTERNAL_SIGNALS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeExternalSignal) : [];
  } catch {
    return [];
  }
}

export function saveExternalSignals(signals = [], { storage = globalThis.localStorage } = {}) {
  const normalized = signals.map(normalizeExternalSignal);
  const target = getStorage(storage);
  if (!target) {
    memorySignals = normalized;
    return normalized;
  }
  target.setItem(EXTERNAL_SIGNALS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function addExternalSignal(signal = {}, options = {}) {
  const signals = loadExternalSignals(options);
  const normalized = normalizeExternalSignal(signal);
  const next = [normalized, ...signals.filter((item) => item.id !== normalized.id)].slice(0, 100);
  return saveExternalSignals(next, options);
}

export function removeExternalSignal(id, options = {}) {
  const next = loadExternalSignals(options).filter((item) => item.id !== id);
  return saveExternalSignals(next, options);
}

export function clearExternalSignals(options = {}) {
  return saveExternalSignals([], options);
}
