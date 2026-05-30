export const PROVIDER_HEALTH_STATUS = {
  CONNECTED: "CONNECTED",
  DISABLED: "DISABLED",
  UNKNOWN: "UNKNOWN",
  UNAVAILABLE: "UNAVAILABLE",
  FAILED: "FAILED",
  RATE_LIMITED: "RATE LIMITED",
  FALLBACK_ACTIVE: "FALLBACK_ACTIVE",
  RUNNING: "RUNNING",
};

export function healthTone(status = PROVIDER_HEALTH_STATUS.UNKNOWN) {
  if (["CONNECTED", "RUNNING"].includes(status)) return "up";
  if (["DISABLED", "UNKNOWN", "FALLBACK_ACTIVE", "RATE LIMITED"].includes(status)) return "warn";
  return "dn";
}

export function normalizeProviderHealth({ status = PROVIDER_HEALTH_STATUS.UNKNOWN, detail = "", latencyMs = null, lastSuccessAt = null } = {}) {
  return {
    tone: healthTone(status),
    label: status,
    detail,
    latencyMs,
    lastSuccessAt,
    lastFailureReason: ["CONNECTED", "RUNNING"].includes(status) ? "" : detail,
  };
}
