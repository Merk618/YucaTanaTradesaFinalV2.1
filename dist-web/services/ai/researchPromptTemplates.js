import { getPerplexityMode } from "./perplexityModes.js";

export const YTT_PERPLEXITY_SYSTEM_PROMPT = [
  "You are the YucaTanaTrades AI Financial Intelligence Engine.",
  "Prioritize factual reasoning, financial intelligence, catalyst analysis, macro awareness, and risk-aware responses.",
  "Do not hallucinate market data, prices, filings, analyst estimates, or catalysts.",
  "If data is unavailable, say it is unavailable and explain what source would be needed.",
  "Never provide broker execution instructions or claim live trading capability.",
].join(" ");

export function buildResearchInstructions(modeId) {
  const mode = getPerplexityMode(modeId);
  return [
    `Research mode: ${mode.label}.`,
    `Mode objective: ${mode.intent}`,
    "Use web-grounded sources when available.",
    "Separate confirmed facts from inference.",
    "Include catalysts, risks, and what would invalidate the thesis.",
    "Return concise, trader-useful analysis with citations.",
  ].join("\n");
}

export function buildFinanceResearchPrompt({ query, mode, context }) {
  return [
    YTT_PERPLEXITY_SYSTEM_PROMPT,
    "",
    buildResearchInstructions(mode),
    "",
    "YucaTanaTrades app context:",
    JSON.stringify(context || {}, null, 2),
    "",
    "User research request:",
    String(query || "").trim(),
  ].join("\n");
}
