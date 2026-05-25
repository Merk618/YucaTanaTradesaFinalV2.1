export const PERPLEXITY_MODE_IDS = {
  QUICK_SUMMARY: "quick_summary",
  WHY_MOVING: "why_is_this_moving",
  EARNINGS_RECAP: "earnings_recap",
  VALUATION_CHECK: "valuation_check",
  BULL_BEAR: "bull_vs_bear_case",
  ANALYST_ESTIMATES: "analyst_estimates",
  SECTOR_ROTATION: "sector_rotation",
  ETF_BREAKDOWN: "etf_breakdown",
  INSIDER_ACTIVITY: "insider_activity",
  MACRO_ANALYSIS: "macro_analysis",
  DEEP_RESEARCH: "deep_research",
};

export const PERPLEXITY_RESEARCH_MODES = [
  { id: PERPLEXITY_MODE_IDS.QUICK_SUMMARY, label: "Quick Summary", intent: "Summarize the most decision-relevant facts, catalysts, and risks." },
  { id: PERPLEXITY_MODE_IDS.WHY_MOVING, label: "Why Is This Moving?", intent: "Explain likely price drivers, news catalysts, flows, and uncertainty." },
  { id: PERPLEXITY_MODE_IDS.EARNINGS_RECAP, label: "Earnings Recap", intent: "Summarize reported earnings, guidance, revisions, and market reaction." },
  { id: PERPLEXITY_MODE_IDS.VALUATION_CHECK, label: "Valuation Check", intent: "Frame valuation, growth expectations, peer context, and risk." },
  { id: PERPLEXITY_MODE_IDS.BULL_BEAR, label: "Bull vs Bear Case", intent: "Present balanced upside and downside arguments with signposts." },
  { id: PERPLEXITY_MODE_IDS.ANALYST_ESTIMATES, label: "Analyst Estimates", intent: "Identify consensus changes, estimate revisions, and notable analyst views." },
  { id: PERPLEXITY_MODE_IDS.SECTOR_ROTATION, label: "Sector Rotation", intent: "Connect the asset to sector flows, leadership, breadth, and macro rotation." },
  { id: PERPLEXITY_MODE_IDS.ETF_BREAKDOWN, label: "ETF Breakdown", intent: "Explain ETF composition, exposures, concentration, and macro sensitivity." },
  { id: PERPLEXITY_MODE_IDS.INSIDER_ACTIVITY, label: "Insider Activity", intent: "Check reported insider activity and separate signal from noise." },
  { id: PERPLEXITY_MODE_IDS.MACRO_ANALYSIS, label: "Macro Analysis", intent: "Analyze rates, dollar, inflation, growth, policy, and cross-asset context." },
  { id: PERPLEXITY_MODE_IDS.DEEP_RESEARCH, label: "Deep Research", intent: "Produce a structured research brief with sources, catalysts, risks, and open questions." },
];

export const DEFAULT_PERPLEXITY_MODE = PERPLEXITY_MODE_IDS.QUICK_SUMMARY;

export function getPerplexityMode(modeId = DEFAULT_PERPLEXITY_MODE) {
  return PERPLEXITY_RESEARCH_MODES.find((mode) => mode.id === modeId) || PERPLEXITY_RESEARCH_MODES[0];
}

export function isPerplexityMode(modeId) {
  return PERPLEXITY_RESEARCH_MODES.some((mode) => mode.id === modeId);
}
