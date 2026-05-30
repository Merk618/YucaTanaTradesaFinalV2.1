import { scoreOpportunity } from "../ai/opportunityScorer.js";
import {
  fetchAIHeatmapCryptoRows,
  fetchAIHeatmapStockRows,
  formatProviderSummary,
} from "./aiHeatmapDataService.js";
import { enrichAIHeatmapTechnicals } from "./aiHeatmapTechnicalEngine.js";

const CRYPTO_SCAN_STAGES = [
  "Opening digital asset data bus",
  "CoinGecko market snapshot",
  "Binance liquidity sweep",
  "TradingView context",
  "RSI / MACD / VWAP",
  "Momentum model",
  "Heatmap rebuild",
];

const STOCK_SCAN_STAGES = [
  "Opening equity data bus",
  "MooMoo/Finnhub quote lane",
  "Alpha Vantage indicators if available",
  "TradingView context",
  "RSI / MACD / VWAP",
  "Volume anomaly model",
  "Heatmap rebuild",
];

function normalizeMode(mode = "") {
  return String(mode || "").toLowerCase() === "stocks" || String(mode || "").toLowerCase() === "stock"
    ? "stocks"
    : "crypto";
}

function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decisionFromOpportunity(opportunity = {}, row = {}) {
  if (row.dataQuality === "UNAVAILABLE") return "WATCH / DATA UNAVAILABLE";
  const score = Number(opportunity.setupScore);
  if (!Number.isFinite(score)) return row.decision || "NEUTRAL / WAIT FOR CONFIRMATION";
  if (score >= 85) return "STRONG CANDIDATE / CONFIRMATION REQUIRED";
  if (score >= 70) return "CANDIDATE / MOMENTUM CONFIRMING";
  if (score >= 55) return "WATCH / WAIT FOR CONFIRMATION";
  if (score >= 40) return "WEAK / LOW QUALITY";
  return "AVOID / WEAK SETUP";
}

function compactRowForScore(row = {}) {
  return {
    ...row,
    changePercent: row.changePct,
    macdState: row.macdSignal,
    catalysts: [],
    setup: row.setup || row.decision,
  };
}

function enrichRows(rows = [], { sourceHealth = {} } = {}) {
  const base = rows.map((row) => enrichAIHeatmapTechnicals(row));
  return base.map((row) => {
    const opportunity = scoreOpportunity(compactRowForScore(row), {
      peers: base,
      sourceHealth,
    });
    const enriched = {
      ...row,
      marketBrain: opportunity,
      setupScore: opportunity.setupScore,
      rating: opportunity.rating,
      decision: decisionFromOpportunity(opportunity, row),
    };
    return enrichAIHeatmapTechnicals(enriched);
  });
}

function rowQuality(rows = []) {
  if (!rows.length) return "UNAVAILABLE";
  const available = rows.filter((row) => row.price != null && row.dataQuality !== "UNAVAILABLE").length;
  if (available === rows.length) return rows.some((row) => row.dataQuality === "RECENT" || row.dataQuality === "FALLBACK") ? "PARTIAL" : "LIVE";
  return available > 0 ? "PARTIAL" : "UNAVAILABLE";
}

function sortRows(rows = []) {
  return [...rows].sort((a, b) => {
    const aScore = Number(a.setupScore ?? -1);
    const bScore = Number(b.setupScore ?? -1);
    if (Number.isFinite(aScore) || Number.isFinite(bScore)) return bScore - aScore;
    return Number(b.changePct ?? -999) - Number(a.changePct ?? -999);
  });
}

export async function runAIHeatmapScan({
  mode = "crypto",
  fetchImpl = globalThis.fetch,
  settings = {},
  stockQuotes = {},
  sourceHealth = {},
  onStage = null,
  stageDelayMs = 120,
  cryptoUniverse,
  stockUniverse,
} = {}) {
  const normalizedMode = normalizeMode(mode);
  const stages = normalizedMode === "stocks" ? STOCK_SCAN_STAGES : CRYPTO_SCAN_STAGES;
  const scanStartedAt = new Date().toISOString();
  for (let index = 0; index < stages.length; index += 1) {
    if (typeof onStage === "function") onStage({ stage: stages[index], index, total: stages.length });
    if (stageDelayMs > 0) await delay(stageDelayMs);
  }

  const result = normalizedMode === "stocks"
    ? await fetchAIHeatmapStockRows({
      universe: stockUniverse,
      fetchImpl,
      settings,
      stockQuotes,
    })
    : await fetchAIHeatmapCryptoRows({
      universe: cryptoUniverse,
      fetchImpl,
      apiProxyBase: settings.apiProxyBase,
    });

  const rows = enrichRows(result.rows || [], { sourceHealth });
  const sorted = sortRows(rows);
  const providerSummary = formatProviderSummary(rows);
  const selectedRow = sorted.find((row) => row.price != null && row.dataQuality !== "UNAVAILABLE") || sorted[0] || null;
  const topMovers = [...rows]
    .filter((row) => row.price != null)
    .sort((a, b) => Math.abs(Number(b.changePct || 0)) - Math.abs(Number(a.changePct || 0)))
    .slice(0, 8);

  return {
    mode: normalizedMode,
    rows,
    sortedRows: sorted,
    topMovers,
    selectedRow,
    warnings: result.warnings || [],
    source: result.source,
    scanStartedAt,
    timestamp: result.timestamp || new Date().toISOString(),
    dataQuality: rowQuality(rows),
    providerSummary,
    stages,
  };
}

export function summarizeAIHeatmapScan(scan = {}) {
  const rows = Array.isArray(scan.rows) ? scan.rows : [];
  const summary = scan.providerSummary || formatProviderSummary(rows);
  return {
    mode: scan.mode || "crypto",
    rows: rows.length,
    dataQuality: scan.dataQuality || summary.dataQuality,
    source: scan.source || "Unavailable",
    timestamp: scan.timestamp || new Date().toISOString(),
    detail: summary.detail,
    topSymbols: (scan.topMovers || []).slice(0, 5).map((row) => row.symbol),
  };
}
