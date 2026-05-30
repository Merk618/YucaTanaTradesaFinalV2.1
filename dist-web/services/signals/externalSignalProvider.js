import { prosperioProviderDescriptor } from "./prosperioSignalAdapter.js";
import { addExternalSignal, clearExternalSignals, loadExternalSignals, removeExternalSignal } from "./signalStorage.js";
import { compareExternalSignals } from "./signalScoreComparator.js";

export const EXTERNAL_SIGNAL_SETTINGS = {
  prosperioEnabled: "PROSPERIO_SIGNALS_ENABLED",
  prosperioInputMode: "PROSPERIO_INPUT_MODE",
  prosperioTrustLevel: "PROSPERIO_TRUST_LEVEL",
  prosperioRequireConfirmation: "PROSPERIO_REQUIRE_YTT_CONFIRMATION",
};

export function currentExternalSignalSettings(storage = globalThis.localStorage) {
  const get = (key, fallback) => {
    try {
      return storage?.getItem?.(key) ?? fallback;
    } catch {
      return fallback;
    }
  };
  return {
    prosperio: {
      enabled: get(EXTERNAL_SIGNAL_SETTINGS.prosperioEnabled, "false") === "true",
      inputMode: get(EXTERNAL_SIGNAL_SETTINGS.prosperioInputMode, "manual"),
      sourceLabel: "Prosperio.AI",
      trustLevel: get(EXTERNAL_SIGNAL_SETTINGS.prosperioTrustLevel, "low"),
      requireConfirmation: get(EXTERNAL_SIGNAL_SETTINGS.prosperioRequireConfirmation, "true") !== "false",
      status: "Manual / Import / API Future",
    },
  };
}

export function createExternalSignalProvider({ storage = globalThis.localStorage } = {}) {
  function settings() {
    return currentExternalSignalSettings(storage);
  }

  function providers() {
    const current = settings();
    return [prosperioProviderDescriptor(current.prosperio)];
  }

  function listSignals() {
    return loadExternalSignals({ storage });
  }

  function addSignal(signal) {
    return addExternalSignal(signal, { storage });
  }

  function removeSignal(id) {
    return removeExternalSignal(id, { storage });
  }

  function clearSignals() {
    return clearExternalSignals({ storage });
  }

  function compareSignals(appState = {}) {
    const current = settings();
    return compareExternalSignals(listSignals(), appState, {
      requireConfirmation: current.prosperio.requireConfirmation,
      trustLevel: current.prosperio.trustLevel,
    });
  }

  return {
    settings,
    providers,
    listSignals,
    addSignal,
    removeSignal,
    clearSignals,
    compareSignals,
  };
}
