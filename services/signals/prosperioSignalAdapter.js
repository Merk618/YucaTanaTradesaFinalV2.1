import { EXTERNAL_SIGNAL_PROVIDERS, normalizeExternalSignal, validateExternalSignal } from "./signalNormalizer.js";

export const PROSPERIO_INPUT_MODES = {
  MANUAL: "manual",
  IMPORT_FUTURE: "import",
  API_FUTURE: "api_future",
};

export function adaptManualProsperioSignal(formInput = {}) {
  return validateExternalSignal({
    provider: EXTERNAL_SIGNAL_PROVIDERS.PROSPERIO_AI,
    ingestionMode: PROSPERIO_INPUT_MODES.MANUAL,
    ...formInput,
  });
}

export function normalizeProsperioSignal(input = {}) {
  return normalizeExternalSignal({
    provider: EXTERNAL_SIGNAL_PROVIDERS.PROSPERIO_AI,
    ...input,
  });
}

export function prosperioProviderDescriptor(settings = {}) {
  return {
    id: EXTERNAL_SIGNAL_PROVIDERS.PROSPERIO_AI,
    label: "Prosperio.AI",
    status: settings.enabled ? "MANUAL" : "DISABLED",
    supportedModes: ["Manual Entry", "CSV/JSON Import Future", "API Future"],
    sourceOfTruth: false,
    notes: [
      "Prosperio.AI signals are manual/import overlays only.",
      "YucaTanaTrades market data remains source of truth.",
      "No scraping, login automation, order placement, or API key field is included.",
    ],
  };
}
