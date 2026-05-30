import { buildMarketBrain } from "./marketBrain.js";

export const MARKET_STRATEGIST_SYSTEM_PROMPT = "You are the YucaTana AI Market Strategist. Use only supplied YucaTanaTrades data as factual. Do not invent prices, targets, stop losses, analyst ratings, earnings data, SEC filings, catalysts, valuation metrics, or trading signals. Explain the computed opportunity score, setup quality, risks, and what to watch next. Do not issue direct buy/sell orders. Use AVOID / WATCH / CANDIDATE / STRONG CANDIDATE language only.";

function compact(value, depth = 0) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 18).map((item) => compact(item, depth + 1));
  if (typeof value !== "object" || depth > 4) return null;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
      .slice(0, 42)
      .map(([key, entry]) => [key, compact(entry, depth + 1)])
  );
}

export function buildAIDecisionContext({ query = "", mode = "", appState = {}, yttContext = {}, symbolIntent = {} } = {}) {
  const marketBrain = buildMarketBrain({ query, mode, appState, yttContext, symbolIntent });
  const selected = yttContext.selectedAsset || symbolIntent.selectedAsset || {};
  const quote = selected.quote || selected.market || selected;

  return {
    ...yttContext,
    selectedAsset: selected,
    marketBrain,
    decisionContext: {
      requestedSymbol: symbolIntent.metadata?.requestedSymbol || marketBrain.symbol,
      resolvedSymbol: symbolIntent.metadata?.resolvedSymbol || marketBrain.symbol,
      assetType: symbolIntent.metadata?.assetType || marketBrain.assetType,
      directPriceData: compact(marketBrain.directPriceData),
      providerMetadata: compact(symbolIntent.metadata || {}),
      quoteSnapshot: compact(quote || {}),
      cryptoSnapshot: marketBrain.assetType === "crypto" ? compact(quote || {}) : null,
      stockSnapshot: marketBrain.assetType === "stock" ? compact(quote || {}) : null,
      technicalSnapshot: compact(appState.technicalSnapshot || yttContext.technicalSnapshot || {}),
      marketBrain: compact(marketBrain),
      scoreBreakdown: compact(marketBrain.opportunity?.scoreBreakdown || {}),
      marketRegime: compact(marketBrain.marketRegime),
      playbook: compact(marketBrain.playbook),
      sourceHealth: compact(appState.sourceHealth || yttContext.marketContext?.sourceHealth || {}),
      externalSignals: compact(appState.externalSignals || yttContext.externalSignals || []),
      stockDeepDive: compact(appState.stockDeepDive || yttContext.stockDeepDive || null),
      aiHeatmap: compact(appState.aiHeatmap || yttContext.aiHeatmap || null),
      missingData: marketBrain.missingData || [],
      timestamp: new Date().toISOString(),
    },
    dataBoundary: "Use only supplied YucaTanaTrades data as factual. Missing fields remain unavailable. This is read-only decision support, not trade execution.",
  };
}
