export const STOCK_REASONING_SYSTEM_PROMPT = "You are the YucaTanaTrades Stock Intelligence Engine. Use only supplied market data as factual. Do not invent prices, price targets, stop losses, analyst ratings, earnings data, SEC filings, catalysts, valuation metrics, financial values, or trading signals. If a field is missing, say Unavailable. Do not provide direct buy/sell instructions. Provide an action framework only. Separate facts from interpretation. Use the supplied data to explain trend, momentum, volume, RSI/MACD, support/resistance if supplied, catalyst quality if supplied, risk/reward, account fit, and data quality.";

const REQUIRED_FIELDS = [
  "ticker",
  "assetType",
  "activeTab",
  "selectedStock",
  "selectedCrypto",
  "watchlist",
  "scannerRows",
  "quoteSnapshot",
  "technicalSnapshot",
  "heatmapSelection",
  "sourceHealth",
  "timestamp",
];

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function compact(value, depth = 0) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => compact(item, depth + 1));
  if (typeof value !== "object" || depth > 3) return null;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && typeof entry !== "function")
      .slice(0, 36)
      .map(([key, entry]) => [key, compact(entry, depth + 1)])
  );
}

function selectedQuote(context = {}) {
  const selected = safeObject(context.selectedAsset);
  return selected.quote || selected.market || selected;
}

export function buildYTTDataBlock({ query = "", mode = "", ticker = "", assetType = "", selectedTab = "", context = {} } = {}) {
  const selected = safeObject(context.selectedAsset);
  const normalizedAssetType = assetType || selected.assetType || selectedTab || "unknown";
  const normalizedTicker = ticker || selected.symbol || "";
  const quoteSnapshot = selectedQuote(context);
  const scannerContext = safeObject(context.scannerContext);
  const marketContext = safeObject(context.marketContext);

  const data = {
    ticker: normalizedTicker || "Unavailable",
    assetType: normalizedAssetType || "Unavailable",
    activeTab: selectedTab || context.selectedTab || "Unavailable",
    selectedStock: normalizedAssetType === "stock" ? compact(quoteSnapshot) : null,
    selectedCrypto: normalizedAssetType === "crypto" ? compact(quoteSnapshot) : null,
    watchlist: compact(context.watchlist || []),
    scannerRows: compact(scannerContext),
    quoteSnapshot: compact(quoteSnapshot),
    technicalSnapshot: compact(context.technicalSnapshot || marketContext.technicalSnapshot || scannerContext.technicalSnapshot || {}),
    heatmapSelection: compact(context.heatmapSelection || {}),
    sourceHealth: compact(marketContext.sourceHealth || context.sourceHealth || {}),
    timestamp: new Date().toISOString(),
  };

  for (const field of REQUIRED_FIELDS) {
    if (!(field in data)) data[field] = field === "timestamp" ? new Date().toISOString() : null;
  }

  return {
    query,
    mode,
    data,
  };
}

export function buildStockReasoningPrompt(options = {}) {
  const block = buildYTTDataBlock(options);
  return [
    "LOCAL MODEL SAFETY CONTRACT:",
    "Ticker symbols are labels only. Do not use background knowledge about any company, crypto asset, sector, product, industry, historical performance, management team, or narrative unless it appears in the JSON block below.",
    "If the JSON does not supply catalysts, sector, industry, earnings, filings, analyst ratings, or valuation metrics, say those fields are Unavailable. Do not provide examples or generic possibilities.",
    "",
    "USER REQUEST:",
    block.query || "Analyze the supplied YucaTanaTrades context.",
    "",
    "REQUESTED RESEARCH MODE:",
    block.mode || "Local reasoning",
    "",
    "DATA PROVIDED BY YUCATANATRADES:",
    JSON.stringify(block.data, null, 2),
    "",
    "MISSING DATA POLICY:",
    "If price is missing, say \"Price: Unavailable.\"",
    "If target is missing, say \"Target: Unavailable.\"",
    "If stop loss is missing, say \"Stop loss: Unavailable.\"",
    "If valuation metrics are missing, say \"Valuation metrics: Unavailable.\"",
    "If analyst ratings are missing, say \"Analyst ratings: Unavailable.\"",
    "If earnings data is missing, say \"Earnings data: Unavailable.\"",
    "If SEC filings are missing, say \"SEC filings: Unavailable.\"",
    "",
    "REQUIRED OUTPUT:",
    "1. Snapshot",
    "2. Bull case",
    "3. Bear case",
    "4. Risk/reward framework",
    "5. What to watch next",
    "6. Data quality warning",
    "",
    "SNAPSHOT MUST INCLUDE THESE EXACT MISSING-FIELD LINES WHEN VALUES ARE ABSENT:",
    "Do not bold, italicize, rewrite, or add punctuation inside these exact lines:",
    "Price: Unavailable.",
    "Target: Unavailable.",
    "Stop loss: Unavailable.",
    "Valuation metrics: Unavailable.",
    "Analyst ratings: Unavailable.",
    "Earnings data: Unavailable.",
    "SEC filings: Unavailable.",
    "",
    "STRICT RESPONSE RULES:",
    "- Use only the JSON block above as factual market data.",
    "- Do not invent prices, targets, stops, valuation metrics, analyst ratings, earnings, SEC filings, catalysts, or signals.",
    "- Do not mention company history, industry, products, sector, market share, or business quality unless supplied in the JSON.",
    "- If bull or bear evidence is not supplied, say the case is unavailable from supplied data.",
    "- Do not provide direct buy/sell instructions.",
    "- If a requested field is absent from the JSON, label it Unavailable.",
    "- Keep the answer useful as an action framework, not a trade command.",
  ].join("\n");
}
