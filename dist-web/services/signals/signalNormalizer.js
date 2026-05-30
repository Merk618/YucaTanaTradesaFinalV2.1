export const EXTERNAL_SIGNAL_PROVIDERS = {
  PROSPERIO_AI: "PROSPERIO_AI",
};

export const SIGNAL_CONFIRMATION = {
  CONFIRMED: "CONFIRMED",
  PARTIALLY_CONFIRMED: "PARTIALLY_CONFIRMED",
  NOT_CONFIRMED: "NOT_CONFIRMED",
  CONFLICTING: "CONFLICTING",
  DATA_INSUFFICIENT: "DATA_INSUFFICIENT",
};

const VALID_ASSET_TYPES = new Set(["stock", "crypto"]);
const VALID_HORIZONS = new Set(["short-term", "long-term"]);
const VALID_DIRECTIONS = new Set(["bullish", "bearish", "neutral"]);
const VALID_INGESTION_MODES = new Set(["manual", "import", "api_future"]);

function cleanSymbol(value = "") {
  return String(value || "").replace(/^\$/, "").trim().toUpperCase();
}

function cleanEnum(value, allowed, fallback) {
  const normalized = String(value || "").trim().toLowerCase().replace(/_/g, "-");
  return allowed.has(normalized) ? normalized : fallback;
}

function cleanNullable(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function normalizeExternalSignal(input = {}) {
  const now = new Date().toISOString();
  const symbol = cleanSymbol(input.symbol);
  const createdAt = cleanNullable(input.createdAt) || cleanNullable(input.timestamp) || now;
  return {
    id: cleanNullable(input.id) || `${EXTERNAL_SIGNAL_PROVIDERS.PROSPERIO_AI}:${symbol || "UNKNOWN"}:${Date.now()}`,
    provider: input.provider || EXTERNAL_SIGNAL_PROVIDERS.PROSPERIO_AI,
    symbol,
    assetType: cleanEnum(input.assetType, VALID_ASSET_TYPES, "stock"),
    horizon: cleanEnum(input.horizon || input.timeHorizon, VALID_HORIZONS, "short-term"),
    direction: cleanEnum(input.direction, VALID_DIRECTIONS, "neutral"),
    providerConfidence: cleanNullable(input.providerConfidence ?? input.confidence),
    entryZone: cleanNullable(input.entryZone),
    target: cleanNullable(input.target),
    riskNote: cleanNullable(input.riskNote),
    sourceUrl: cleanNullable(input.sourceUrl),
    notes: cleanNullable(input.notes),
    createdAt,
    updatedAt: cleanNullable(input.updatedAt) || now,
    ingestionMode: cleanEnum(input.ingestionMode || input.inputMode, VALID_INGESTION_MODES, "manual"),
  };
}

export function validateExternalSignal(signal = {}) {
  const normalized = normalizeExternalSignal(signal);
  const errors = [];
  if (!normalized.symbol) errors.push("Symbol is required.");
  if (!VALID_ASSET_TYPES.has(normalized.assetType)) errors.push("Asset type must be stock or crypto.");
  if (!VALID_HORIZONS.has(normalized.horizon)) errors.push("Time horizon must be short-term or long-term.");
  if (!VALID_DIRECTIONS.has(normalized.direction)) errors.push("Direction must be bullish, bearish, or neutral.");
  return { valid: errors.length === 0, errors, signal: normalized };
}
