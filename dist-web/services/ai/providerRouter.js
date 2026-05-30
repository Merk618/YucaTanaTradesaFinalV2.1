import { createPerplexityClient } from "./perplexityClient.js";
import { createOllamaClient } from "./ollamaClient.js";

export const AI_PROVIDER_IDS = {
  AUTO: "auto",
  PERPLEXITY: "perplexity",
  OLLAMA: "ollama",
};

export class AIProviderRouterError extends Error {
  constructor(message, code = "AI_PROVIDER_ERROR") {
    super(message);
    this.name = "AIProviderRouterError";
    this.code = code;
  }
}

const WEB_RESEARCH_PATTERN = /\b(today|recent|latest|news|headline|headlines|catalyst|catalysts|earnings|analyst|estimate|estimates|rating|upgrade|downgrade|sec|filing|filings|insider|why\s+(?:is|are).*(?:moving|move)|why\s+moving|sources?|citations?)\b/i;
const LOCAL_REASONING_PATTERN = /\b(scanner|watchlist|rank|ranking|setup|rsi|macd|vwap|support|resistance|momentum|strength|volume|risk\/reward|risk reward|heatmap|supplied data|loaded data|internal data)\b/i;
const WEB_RESEARCH_MODES = new Set([
  "why_is_this_moving",
  "earnings_recap",
  "analyst_estimates",
  "sector_rotation",
  "etf_breakdown",
  "insider_activity",
  "macro_analysis",
  "deep_research",
]);

function isPerplexityAvailable(settings = {}) {
  return settings.perplexity?.enabled !== false && Boolean(settings.perplexity?.proxyBase);
}

function isOllamaAvailable(settings = {}) {
  return settings.ollama?.enabled === true && settings.ollama?.providerMode !== "disabled";
}

export function routeAIProvider({ query = "", mode = "", providerSelection = AI_PROVIDER_IDS.AUTO, settings = {} } = {}) {
  if (providerSelection === AI_PROVIDER_IDS.PERPLEXITY) return AI_PROVIDER_IDS.PERPLEXITY;
  if (providerSelection === AI_PROVIDER_IDS.OLLAMA) return AI_PROVIDER_IDS.OLLAMA;

  if (settings.ollama?.providerMode === "local_reasoning" && isOllamaAvailable(settings)) {
    return AI_PROVIDER_IDS.OLLAMA;
  }

  const combined = `${query} ${mode}`;
  const wantsWebResearch = WEB_RESEARCH_MODES.has(String(mode || "").toLowerCase()) || WEB_RESEARCH_PATTERN.test(combined);
  const wantsLocalReasoning = LOCAL_REASONING_PATTERN.test(combined);

  if (wantsWebResearch && isPerplexityAvailable(settings)) return AI_PROVIDER_IDS.PERPLEXITY;
  if (wantsWebResearch && !isPerplexityAvailable(settings) && isOllamaAvailable(settings)) return AI_PROVIDER_IDS.OLLAMA;
  if (wantsLocalReasoning && isOllamaAvailable(settings)) return AI_PROVIDER_IDS.OLLAMA;
  if (isPerplexityAvailable(settings)) return AI_PROVIDER_IDS.PERPLEXITY;
  if (isOllamaAvailable(settings)) return AI_PROVIDER_IDS.OLLAMA;
  return AI_PROVIDER_IDS.PERPLEXITY;
}

export async function askWithProvider({
  query = "",
  mode = "",
  providerSelection = AI_PROVIDER_IDS.AUTO,
  context = {},
  settings = {},
  ticker = "",
  assetType = "",
  selectedTab = "",
  fetchImpl = globalThis.fetch,
} = {}) {
  const provider = routeAIProvider({ query, mode, providerSelection, settings });
  const selected = context.selectedAsset || {};

  if (provider === AI_PROVIDER_IDS.OLLAMA) {
    if (!isOllamaAvailable(settings)) {
      throw new AIProviderRouterError("Local AI is disabled. Enable Local AI / Ollama in Settings/Admin.", "LOCAL_AI_DISABLED");
    }
    const client = createOllamaClient({
      endpoint: settings.ollama.endpoint,
      model: settings.ollama.model,
      fetchImpl,
      timeoutMs: settings.ollama.timeoutMs || 30000,
    });
    const result = await client.askStockReasoning({
      query,
      mode,
      ticker: ticker || selected.symbol,
      assetType: assetType || selected.assetType || selectedTab,
      selectedTab: selectedTab || context.selectedTab,
      context,
    });
    return { ...result, routedProvider: AI_PROVIDER_IDS.OLLAMA };
  }

  if (!isPerplexityAvailable(settings)) {
    if (isOllamaAvailable(settings)) {
      const client = createOllamaClient({
        endpoint: settings.ollama.endpoint,
        model: settings.ollama.model,
        fetchImpl,
        timeoutMs: settings.ollama.timeoutMs || 30000,
      });
      const result = await client.askStockReasoning({
        query,
        mode,
        ticker: ticker || selected.symbol,
        assetType: assetType || selected.assetType || selectedTab,
        selectedTab: selectedTab || context.selectedTab,
        context,
      });
      return {
        ...result,
        routedProvider: AI_PROVIDER_IDS.OLLAMA,
        answer: `${result.answer}\n\nData quality warning: Perplexity is not configured, so this local answer uses only supplied YucaTanaTrades context and no live web citations.`,
      };
    }
    throw new AIProviderRouterError("Perplexity proxy not configured. Set API_PROXY_BASE or choose Local Ollama.", "PROXY_REQUIRED");
  }

  const client = createPerplexityClient({
    proxyBase: settings.perplexity.proxyBase,
    fetchImpl,
    timeoutMs: settings.perplexity.timeoutMs || 18000,
  });
  const result = await client.askFinance({
    query,
    mode,
    ticker: ticker || selected.symbol,
    assetType: assetType || selected.assetType || selectedTab,
    selectedTab: selectedTab || context.selectedTab,
    watchlist: context.watchlist,
    marketContext: context.marketContext,
    scannerContext: context.scannerContext,
    sourceHealth: context.marketContext?.sourceHealth || context.sourceHealth || {},
  });
  return { ...result, provider: "PERPLEXITY", routedProvider: AI_PROVIDER_IDS.PERPLEXITY };
}
