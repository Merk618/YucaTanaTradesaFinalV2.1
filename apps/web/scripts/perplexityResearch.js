import { createPerplexityClient } from "../../../services/ai/perplexityClient.js";
import { createOllamaClient, DEFAULT_OLLAMA_ENDPOINT, DEFAULT_OLLAMA_MODEL } from "../../../services/ai/ollamaClient.js";
import { askWithProvider, AI_PROVIDER_IDS } from "../../../services/ai/providerRouter.js";
import { buildPerplexityContext, inferTickerFromQuery } from "../../../services/ai/contextBuilder.js";
import { DEFAULT_PERPLEXITY_MODE } from "../../../services/ai/perplexityModes.js";
import { resolveSymbolIntent } from "../../../services/ai/symbolIntentResolver.js";
import { buildAIDecisionContext } from "../../../services/ai/aiDecisionContextBuilder.js";
import { DEFAULT_MOOMOO_BRIDGE_URL, createMooMooClient } from "../../../services/marketData/moomooClient.js";
import { EXTERNAL_SIGNAL_SETTINGS, createExternalSignalProvider } from "../../../services/signals/externalSignalProvider.js";
import { adaptManualProsperioSignal } from "../../../services/signals/prosperioSignalAdapter.js";

const SETTINGS = {
  enabled: "PERPLEXITY_ENABLED",
  mode: "PERPLEXITY_RESEARCH_MODE",
  verbosity: "PERPLEXITY_VERBOSITY",
  length: "PERPLEXITY_RESPONSE_LENGTH",
  proxy: "API_PROXY_BASE",
  provider: "AI_PROVIDER_SELECTION",
  ollamaEnabled: "OLLAMA_ENABLED",
  ollamaEndpoint: "OLLAMA_ENDPOINT",
  ollamaModel: "OLLAMA_MODEL",
  ollamaProviderMode: "OLLAMA_PROVIDER_MODE",
  moomooEnabled: "MOOMOO_OPEND_ENABLED",
  moomooBridgeUrl: "MOOMOO_BRIDGE_URL",
  moomooPrimaryStocks: "MOOMOO_PRIMARY_STOCK_DATA",
  moomooOptionsEnabled: "MOOMOO_OPTIONS_DATA_ENABLED",
  prosperioEnabled: EXTERNAL_SIGNAL_SETTINGS.prosperioEnabled,
  prosperioInputMode: EXTERNAL_SIGNAL_SETTINGS.prosperioInputMode,
  prosperioTrustLevel: EXTERNAL_SIGNAL_SETTINGS.prosperioTrustLevel,
  prosperioRequireConfirmation: EXTERNAL_SIGNAL_SETTINGS.prosperioRequireConfirmation,
};

const CLIENT_COOLDOWN_MS = 5000;
const MAX_QUERY_LENGTH = 4000;
const panelState = new Map();
const externalSignalProvider = createExternalSignalProvider();
const ASSISTANT_MODES = [
  { id: "quick_summary", label: "Quick Summary" },
  { id: "setup_analysis", label: "Setup Analysis" },
  { id: "risk_review", label: "Risk Review" },
  { id: "deep_research", label: "Deep Research" },
];
const ASSISTANT_MODE_IDS = new Set(ASSISTANT_MODES.map((mode) => mode.id));
const COMMAND_MODE_CHIPS = [
  ["quick_summary", "Quick"],
  ["setup_analysis", "Setup"],
  ["risk_review", "Risk"],
  ["deep_research", "Research"],
];
const DEFAULT_PROMPT_CHIPS = [
  "Analyze Selected",
  "Rank Watchlist",
  "Find Strongest Crypto",
  "Risk Review",
  "Explain Data Quality",
];
const EXTERNAL_SIGNAL_PROMPT_CHIPS = [
  "Review Prosperio Plays",
  "Compare Prosperio vs YucaTana Score",
  "External Signals",
];
const SYMBOL_PROMPT_CHIPS = [
  "Why does this score this way?",
  "What would improve this setup?",
  "What are the risks?",
  "Find latest catalyst",
];
const CHIP_SYMBOL_STOP_WORDS = new Set(["WHY", "WHAT", "RISK", "RANK", "BEST", "FIND", "DEEP", "PRICE", "SETUP", "WATCH"]);
const WEB_RESEARCH_QUERY_PATTERN = /\b(latest|news|headline|headlines|catalyst|catalysts|earnings|analyst|estimate|estimates|rating|upgrade|downgrade|sec|filing|filings|insider|sources?|citations?|deep\s+research|why\s+(?:is|are).*(?:moving|move))\b/i;
const EXTERNAL_SIGNAL_QUERY_PATTERN = /\b(prosperio|external\s+signals?|external\s+plays?|signal\s+overlay|review\s+my\s+prosperio|prosperio\s+plays?|compare\s+prosperio)\b/i;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function getPanelState(panel) {
  const existing = panelState.get(panel) || {};
  panelState.set(panel, existing);
  return existing;
}

function formatTimestamp(value) {
  if (!value) return "TIME UNAVAILABLE";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "TIME UNAVAILABLE" : date.toLocaleString();
}

function requestKey(query, mode, contextName) {
  return [contextName, mode, query.trim().toLowerCase()].join("|");
}

function normalizeMode(mode = DEFAULT_PERPLEXITY_MODE) {
  return ASSISTANT_MODE_IDS.has(mode) ? mode : DEFAULT_PERPLEXITY_MODE;
}

function providerStatusLabel(provider = AI_PROVIDER_IDS.AUTO) {
  switch (provider) {
    case AI_PROVIDER_IDS.PERPLEXITY:
      return "PERPLEXITY";
    case AI_PROVIDER_IDS.OLLAMA:
      return "OLLAMA";
    default:
      return "AUTO";
  }
}

function setUnifiedAssistantOpen(open = true) {
  const drawer = document.getElementById("ai-drawer");
  const button = document.getElementById("ai-fab");
  if (!drawer) return;
  drawer.classList.toggle("open", Boolean(open));
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  button?.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) {
    window.setTimeout(() => drawer.querySelector("[data-perplexity-query]")?.focus(), 80);
  }
}

function toggleUnifiedAssistant() {
  const drawer = document.getElementById("ai-drawer");
  setUnifiedAssistantOpen(!drawer?.classList.contains("open"));
}

function bindUnifiedAssistantLauncher() {
  const launcher = document.getElementById("ai-fab");
  if (launcher && launcher.dataset.unifiedAiBound !== "true") {
    launcher.dataset.unifiedAiBound = "true";
    launcher.removeAttribute("onclick");
    launcher.onclick = null;
    launcher.setAttribute("aria-controls", "ai-drawer");
    launcher.setAttribute("aria-expanded", document.getElementById("ai-drawer")?.classList.contains("open") ? "true" : "false");
    launcher.dataset.aiStatus = launcher.dataset.aiStatus || "yellow";
    launcher.innerHTML = '<span class="ytt-ai-orb-mark">YTT</span><span class="ytt-ai-orb-copy">YucaTana AI</span><span class="ytt-ai-orb-dot" aria-hidden="true"></span>';
    launcher.addEventListener("click", toggleUnifiedAssistant);
  }

  const closeButton = document.querySelector("#ai-drawer .ai-close");
  if (closeButton && closeButton.dataset.unifiedAiBound !== "true") {
    closeButton.dataset.unifiedAiBound = "true";
    closeButton.removeAttribute("onclick");
    closeButton.onclick = null;
    closeButton.addEventListener("click", () => setUnifiedAssistantOpen(false));
  }

  window.openAIAssistant = () => setUnifiedAssistantOpen(true);
  window.closeAIAssistant = () => setUnifiedAssistantOpen(false);
}

function setBusy(panel, busy) {
  panel.classList.toggle("is-busy", Boolean(busy));
  panel.querySelectorAll("[data-perplexity-submit], [data-perplexity-retry], [data-perplexity-regenerate], [data-ytt-analyze-selected]").forEach((button) => {
    button.disabled = Boolean(busy);
  });
}

function setLocalNotice(panel, status, message) {
  updateOutput(panel, {
    answer: message,
    dataQuality: "UNAVAILABLE",
    timestamp: new Date().toISOString(),
    citations: [],
    sources: [],
    tickers: [],
  });
  updateSourceHealth(status, message);
}

function isEnabled() {
  return localStorage.getItem(SETTINGS.enabled) !== "false";
}

function isOllamaEnabled() {
  return localStorage.getItem(SETTINGS.ollamaEnabled) === "true";
}

function getProxyBase() {
  return (localStorage.getItem(SETTINGS.proxy) || "").trim().replace(/\/+$/, "");
}

function getOllamaEndpoint() {
  return (localStorage.getItem(SETTINGS.ollamaEndpoint) || DEFAULT_OLLAMA_ENDPOINT).trim().replace(/\/+$/, "");
}

function getOllamaModel() {
  return (localStorage.getItem(SETTINGS.ollamaModel) || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL;
}

function getOllamaProviderMode() {
  return localStorage.getItem(SETTINGS.ollamaProviderMode) || "auto";
}

function isMooMooEnabled() {
  return localStorage.getItem(SETTINGS.moomooEnabled) === "true";
}

function getMooMooBridgeUrl() {
  return (localStorage.getItem(SETTINGS.moomooBridgeUrl) || DEFAULT_MOOMOO_BRIDGE_URL).trim().replace(/\/+$/, "");
}

function isMooMooPrimaryStocks() {
  return localStorage.getItem(SETTINGS.moomooPrimaryStocks) === "true";
}

function isMooMooOptionsEnabled() {
  return localStorage.getItem(SETTINGS.moomooOptionsEnabled) === "true";
}

function selectedSymbolForContext(contextName) {
  const selector = contextName === "crypto"
    ? "#crypto-body tr.is-selected, #crypto-production-heatmap .ytt-heatmap-cell.is-selected"
    : contextName === "stocks"
      ? "#stocks-body tr.is-selected, #stocks-production-heatmap .ytt-heatmap-cell.is-selected"
      : ".data-table tr.is-selected, .ytt-heatmap-cell.is-selected";
  const selected = document.querySelector(selector);
  return selected?.dataset?.symbol || selected?.dataset?.heatmapSymbol || "";
}

function getAppState(contextName, query = "") {
  const raw = typeof window.buildAIContext === "function" ? window.buildAIContext() : {};
  const selectedSymbol = selectedSymbolForContext(contextName) || raw.selectedSymbol || inferTickerFromQuery(query);
  return {
    ...raw,
    activeTab: document.body?.dataset?.activeTab || raw.activeTab || contextName,
    selectedSymbol,
    heatmapSelection: {
      symbol: selectedSymbol,
      context: contextName,
    },
    scannerContext: {
      context: contextName,
      stockRows: document.querySelectorAll("#stocks-body tr").length,
      cryptoRows: document.querySelectorAll("#crypto-body tr").length,
      dataPolicy: "Unavailable indicators remain unavailable until repo services calculate them.",
    },
    externalSignals: externalSignalProvider.listSignals(),
  };
}

function currentSettings() {
  return {
    mode: normalizeMode(localStorage.getItem(SETTINGS.mode) || DEFAULT_PERPLEXITY_MODE),
    verbosity: localStorage.getItem(SETTINGS.verbosity) || "balanced",
    responseLength: localStorage.getItem(SETTINGS.length) || "medium",
    enabled: isEnabled(),
    proxyBase: getProxyBase(),
    provider: localStorage.getItem(SETTINGS.provider) || AI_PROVIDER_IDS.AUTO,
    ollamaEnabled: isOllamaEnabled(),
    ollamaEndpoint: getOllamaEndpoint(),
    ollamaModel: getOllamaModel(),
    ollamaProviderMode: getOllamaProviderMode(),
    finnhubKey: localStorage.getItem("FINNHUB_KEY") || localStorage.getItem("FINNHUB_API_KEY") || "",
    moomoo: {
      enabled: isMooMooEnabled(),
      bridgeUrl: getMooMooBridgeUrl(),
      primaryStocks: isMooMooPrimaryStocks(),
      optionsEnabled: isMooMooOptionsEnabled(),
    },
    externalSignals: externalSignalProvider.settings(),
  };
}

function modeOptions(selected = DEFAULT_PERPLEXITY_MODE) {
  const normalized = normalizeMode(selected);
  return ASSISTANT_MODES.map((mode) =>
    `<option value="${escapeHtml(mode.id)}"${mode.id === normalized ? " selected" : ""}>${escapeHtml(mode.label)}</option>`
  ).join("");
}

function providerOptions(selected = AI_PROVIDER_IDS.AUTO) {
  const options = [
    [AI_PROVIDER_IDS.AUTO, "Auto"],
    [AI_PROVIDER_IDS.OLLAMA, "Local Ollama"],
    [AI_PROVIDER_IDS.PERPLEXITY, "Perplexity"],
  ];
  return options.map(([value, label]) =>
    `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`
  ).join("");
}

function hasVisibleExternalSignals(settings = currentSettings()) {
  return Boolean(settings.externalSignals?.prosperio?.enabled && externalSignalProvider.listSignals().length);
}

function assistantPromptChips(settings = currentSettings()) {
  return hasVisibleExternalSignals(settings)
    ? [...DEFAULT_PROMPT_CHIPS, ...EXTERNAL_SIGNAL_PROMPT_CHIPS]
    : DEFAULT_PROMPT_CHIPS;
}

function statusText(value, fallback = "Unavailable") {
  return value ? String(value).replace(/_/g, " ").toUpperCase() : fallback;
}

function signalSettingsHtml(settings) {
  const signal = settings.externalSignals.prosperio;
  return `
      <div class="panel-header ytt-perplexity-section-title">External Signal Providers <span class="source-tag">OVERLAY ONLY</span></div>
      <div class="ytt-perplexity-warning">Prosperio.AI signals are manual overlays only. YucaTanaTrades market data remains the source of truth. No scraping, login automation, API key field, order placement, or broker execution is supported.</div>
      <label class="ytt-perplexity-toggle-row"><span>Enable Prosperio Signals</span><select id="prosperio-enabled" class="ytt-perplexity-setting"><option value="false"${!signal.enabled ? " selected" : ""}>Disabled</option><option value="true"${signal.enabled ? " selected" : ""}>Enabled</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>Input Mode</span><select id="prosperio-input-mode" class="ytt-perplexity-setting"><option value="manual"${signal.inputMode === "manual" ? " selected" : ""}>Manual Entry</option><option value="import"${signal.inputMode === "import" ? " selected" : ""}>CSV/JSON Import Future</option><option value="api_future"${signal.inputMode === "api_future" ? " selected" : ""}>API Future</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>Source Label</span><input class="ytt-perplexity-setting" type="text" value="Prosperio.AI" readonly></label>
      <label class="ytt-perplexity-setting-row"><span>Default Trust</span><select id="prosperio-trust-level" class="ytt-perplexity-setting"><option value="low"${signal.trustLevel === "low" ? " selected" : ""}>Low</option><option value="medium"${signal.trustLevel === "medium" ? " selected" : ""}>Medium</option><option value="high"${signal.trustLevel === "high" ? " selected" : ""}>High</option></select></label>
      <label class="ytt-perplexity-toggle-row"><span>Require YucaTana Confirmation</span><select id="prosperio-require-confirmation" class="ytt-perplexity-setting"><option value="true"${signal.requireConfirmation ? " selected" : ""}>On</option><option value="false"${!signal.requireConfirmation ? " selected" : ""}>Off</option></select></label>
      <div class="ytt-external-signal-entry">
        <div class="panel-header ytt-perplexity-section-title">Manual Signal Entry <span class="source-tag">LOCAL</span></div>
        <div class="ytt-signal-form-grid">
          <input id="prosperio-symbol" class="ytt-perplexity-setting" placeholder="Symbol">
          <select id="prosperio-asset-type" class="ytt-perplexity-setting"><option value="stock">Stock</option><option value="crypto">Crypto</option></select>
          <select id="prosperio-horizon" class="ytt-perplexity-setting"><option value="short-term">Short-term</option><option value="long-term">Long-term</option></select>
          <select id="prosperio-direction" class="ytt-perplexity-setting"><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option></select>
          <input id="prosperio-confidence" class="ytt-perplexity-setting" placeholder="Signal confidence if provided">
          <input id="prosperio-entry-zone" class="ytt-perplexity-setting" placeholder="Entry zone if provided">
          <input id="prosperio-target" class="ytt-perplexity-setting" placeholder="Target if provided">
          <input id="prosperio-risk-note" class="ytt-perplexity-setting" placeholder="Risk note if provided">
          <input id="prosperio-source-url" class="ytt-perplexity-setting" placeholder="Source URL/note if provided">
          <input id="prosperio-timestamp" class="ytt-perplexity-setting" type="datetime-local">
          <textarea id="prosperio-notes" class="ytt-perplexity-setting" placeholder="Notes" rows="2"></textarea>
        </div>
        <div class="ytt-perplexity-actions"><button class="ytt-perplexity-btn" type="button" id="add-prosperio-signal">Add Prosperio Signal</button><button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" id="refresh-prosperio-signals">Refresh Comparison</button></div>
        <div id="prosperio-signal-message" class="ytt-perplexity-warning" style="display:none;"></div>
      </div>
      <div class="panel-header ytt-perplexity-section-title">External Signal Watchlist <span class="source-tag">LOCAL</span></div>
      <div id="external-signal-watchlist" class="ytt-external-signal-watchlist"></div>`;
}

function promptChipHtml(prompts = DEFAULT_PROMPT_CHIPS) {
  return prompts.map((prompt) =>
    `<button class="ytt-ai-prompt-chip" type="button" data-ytt-prompt-chip="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
  ).join("");
}

function setModeChipState(panel, selectedMode) {
  panel.querySelectorAll("[data-ytt-mode-chip]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.yttModeChip === selectedMode);
  });
}

function promptForMode(mode, contextName) {
  const selected = selectedSymbolForContext(contextName);
  switch (mode) {
    case "price":
      return selected ? `${selected} price` : "BTC price";
    case "setup_analysis":
      return selected ? `${selected} setup analysis` : "Analyze selected setup";
    case "scanner_summary":
      return "Rank watchlist";
    case "risk_review":
      return selected ? `${selected} risk review` : "Risk review";
    case "catalyst":
      return selected ? `Find latest catalyst for ${selected}` : "Find latest catalyst";
    case "portfolio":
      return "Portfolio risk review";
    case "external_signals":
      return "Review Prosperio plays";
    case "deep_research":
      return selected ? `Deep research ${selected}` : "Deep research";
    default:
      return "Analyze selected setup";
  }
}

function updateSymbolChipFromQuery(panel, query = "", contextName = "ai-lab") {
  const inferred = inferTickerFromQuery(query);
  const symbol = (inferred && !CHIP_SYMBOL_STOP_WORDS.has(inferred) ? inferred : "") || selectedSymbolForContext(contextName);
  const chip = panel.querySelector("[data-ytt-symbol-chip]");
  if (chip) chip.textContent = symbol ? `${symbol} · pending resolution` : "No symbol locked";
}

function compactPanelTemplate(hostId, contextName, settings, status, providerStatus) {
  return `<section class="ytt-perplexity-panel" data-perplexity-instance="${escapeHtml(hostId)}">
    <div class="ytt-perplexity-head">
      <div>
        <div class="ytt-perplexity-title">YucaTana AI Research</div>
        <div class="ytt-perplexity-subtitle">Context-aware research from Perplexity or Local Ollama using supplied YTT data.</div>
      </div>
      <div class="ytt-perplexity-head-actions">
        <span class="ytt-provider-status" data-provider-status="${escapeHtml(settings.provider)}">${providerStatus}</span>
        <span class="ytt-perplexity-status" data-perplexity-quality data-quality="${status}">${status}</span>
      </div>
    </div>
    <form class="ytt-perplexity-form" data-perplexity-form>
      <label class="ytt-perplexity-label" for="${escapeHtml(hostId)}-provider">Provider</label>
      <div class="ytt-perplexity-mode-row">
        <select id="${escapeHtml(hostId)}-provider" class="ytt-perplexity-mode" data-ai-provider aria-label="AI provider">${providerOptions(settings.provider)}</select>
        <span class="ytt-perplexity-provider-badge" data-provider-badge>${providerStatus}</span>
      </div>
      <label class="ytt-perplexity-label" for="${escapeHtml(hostId)}-mode">Mode</label>
      <div class="ytt-perplexity-mode-row">
        <select id="${escapeHtml(hostId)}-mode" class="ytt-perplexity-mode" data-perplexity-mode aria-label="Research mode">${modeOptions(settings.mode)}</select>
        <button class="ytt-perplexity-btn" type="button" data-perplexity-retry>Retry</button>
      </div>
      <div class="ytt-perplexity-query-row">
        <textarea class="ytt-perplexity-input" data-perplexity-query placeholder="Ask YucaTana AI..." rows="3"></textarea>
        <button class="ytt-perplexity-btn" type="submit" data-perplexity-submit>Ask</button>
        <button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" data-perplexity-clear>Clear</button>
      </div>
    </form>
    <div class="ytt-perplexity-output" data-perplexity-output>${settings.proxyBase || settings.ollamaEnabled ? "Ask a finance question to start AI research." : "Perplexity proxy is not configured. Add API_PROXY_BASE in Settings/Admin."}</div>
    <div class="ytt-perplexity-meta" data-perplexity-meta>
      <span>${settings.enabled ? "ENABLED" : "DISABLED"}</span>
      <span>${settings.proxyBase ? "PERPLEXITY READY" : "PERPLEXITY PROXY REQUIRED"}</span>
      <span>${settings.ollamaEnabled ? "OLLAMA ENABLED" : "OLLAMA DISABLED"}</span>
    </div>
    <div class="ytt-perplexity-tickers" data-perplexity-tickers></div>
    <div class="ytt-perplexity-citations" data-perplexity-citations></div>
    <div class="ytt-perplexity-actions">
      <button class="ytt-perplexity-btn" type="button" data-perplexity-copy>Copy</button>
      <button class="ytt-perplexity-btn" type="button" data-perplexity-regenerate>Regenerate</button>
    </div>
  </section>`;
}

function panelTemplate(hostId, contextName) {
  const settings = currentSettings();
  const status = settings.enabled && settings.proxyBase ? "WEB-GROUNDED" : settings.ollamaEnabled ? "LOCAL_CONTEXT" : "UNAVAILABLE";
  const providerStatus = providerStatusLabel(settings.provider);
  const isFloatingAssistant = contextName === "ai-lab";
  if (!isFloatingAssistant) return compactPanelTemplate(hostId, contextName, settings, status, providerStatus);
  const modeChips = COMMAND_MODE_CHIPS.map(([value, label]) =>
    `<button class="ytt-ai-chip${value === settings.mode ? " is-active" : ""}" type="button" data-ytt-mode-chip="${escapeHtml(value)}">${escapeHtml(label)}</button>`
  ).join("");
  const visiblePromptChips = promptChipHtml(assistantPromptChips(settings));
  const ollamaStatus = settings.ollamaEnabled ? "Enabled" : "Disabled";
  const perplexityStatus = settings.proxyBase ? "Proxy Ready" : "Proxy Required";
  return `<section class="ytt-perplexity-panel ytt-ai-command-center" data-perplexity-instance="${escapeHtml(hostId)}">
    <div class="ytt-perplexity-head">
      <div>
        <div class="ytt-perplexity-title">YucaTana AI</div>
        <div class="ytt-perplexity-subtitle">Market Brain</div>
      </div>
      <div class="ytt-perplexity-head-actions">
        <span class="ytt-provider-status" data-provider-status="${escapeHtml(settings.provider)}">${providerStatus}</span>
        <span class="ytt-perplexity-status" data-perplexity-quality data-quality="${status}">${status}</span>
        <button class="ytt-perplexity-close" type="button" data-ai-panel-close aria-label="Close AI assistant">Close</button>
      </div>
    </div>
    <div class="ytt-ai-status-row" data-ytt-intel-strip>
      <span><b>Provider</b><em data-ytt-provider>${providerStatus}</em></span>
      <span><b>Data Quality</b><em data-ytt-data-quality>${statusText(status)}</em></span>
      <span><b>Ollama</b><em data-ytt-ollama>${escapeHtml(ollamaStatus)}</em></span>
      <span><b>Perplexity</b><em data-ytt-perplexity>${escapeHtml(perplexityStatus)}</em></span>
    </div>
    <div class="ytt-ai-mode-chips" data-ytt-mode-chips>${modeChips}</div>
    <form class="ytt-perplexity-form" data-perplexity-form>
      <div class="ytt-ai-control-grid">
        <label class="ytt-perplexity-label" for="${escapeHtml(hostId)}-provider"><span>Provider</span><select id="${escapeHtml(hostId)}-provider" class="ytt-perplexity-mode" data-ai-provider aria-label="AI provider">${providerOptions(settings.provider)}</select></label>
        <label class="ytt-perplexity-label" for="${escapeHtml(hostId)}-mode"><span>Mode</span><select id="${escapeHtml(hostId)}-mode" class="ytt-perplexity-mode" data-perplexity-mode aria-label="Research mode">${modeOptions(settings.mode)}</select></label>
      </div>
      <div class="ytt-ai-symbol-row">
        <span class="ytt-ai-symbol-chip" data-ytt-symbol-chip>No symbol locked</span>
        <button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" data-ytt-analyze-selected>Analyze Selected</button>
      </div>
      <div class="ytt-perplexity-query-row">
        <textarea class="ytt-perplexity-input" data-perplexity-query placeholder="Ask YucaTana AI about a ticker, setup, scanner, risk, catalyst, or portfolio move..." rows="3"></textarea>
        <div class="ytt-ai-input-actions">
          <button class="ytt-perplexity-btn" type="submit" data-perplexity-submit>Ask</button>
          <button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" data-perplexity-clear>Clear</button>
          <button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" data-perplexity-retry hidden>Retry</button>
        </div>
      </div>
    </form>
    <div class="ytt-ai-prompt-chips" data-ytt-prompt-chips>${visiblePromptChips}</div>
    <div class="ytt-perplexity-output ytt-ai-response-stack" data-perplexity-output>${settings.proxyBase || settings.ollamaEnabled ? "Ask a ticker, setup, ranking, risk, or catalyst question to start Market Brain analysis." : "Perplexity proxy is not configured. Add API_PROXY_BASE in Settings/Admin."}</div>
    <div class="ytt-perplexity-meta" data-perplexity-meta hidden>
      <span>${settings.enabled ? "ENABLED" : "DISABLED"}</span>
      <span>${settings.proxyBase ? "PERPLEXITY READY" : "PERPLEXITY PROXY REQUIRED"}</span>
      <span>${settings.ollamaEnabled ? "OLLAMA ENABLED" : "OLLAMA DISABLED"}</span>
    </div>
    <div class="ytt-perplexity-tickers" data-perplexity-tickers></div>
    <div class="ytt-perplexity-citations" data-perplexity-citations></div>
    <div class="ytt-perplexity-actions ytt-ai-response-actions" data-ytt-response-actions hidden>
      <button class="ytt-perplexity-btn" type="button" data-perplexity-copy>Copy</button>
      <button class="ytt-perplexity-btn" type="button" data-perplexity-regenerate>Regenerate</button>
    </div>
  </section>`;
}

function renderMarkdownLite(text) {
  return escapeHtml(text)
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function compactValue(value) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

function renderCard(title, body = "", tone = "") {
  return `<article class="ytt-ai-card ${escapeHtml(tone)}"><div class="ytt-ai-card-title">${escapeHtml(title)}</div>${body}</article>`;
}

function renderRows(items = []) {
  return `<div class="ytt-ai-card-grid">${items.map((item) => `
    <div class="ytt-ai-card-row">
      <span>${escapeHtml(item.label || item[0] || "")}</span>
      <strong>${escapeHtml(compactValue(item.value ?? item[1]))}</strong>
    </div>`).join("")}</div>`;
}

function renderList(items = [], empty = "Unavailable") {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return `<p>${escapeHtml(empty)}</p>`;
  return `<ul class="ytt-ai-list">${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderScoreBreakdown(scoreBreakdown = {}) {
  const rows = Object.values(scoreBreakdown).map((item) => ({
    label: item.label || "Score",
    value: `${Number(item.score || 0)}/${Number(item.max || 0)}`,
  }));
  return renderRows(rows);
}

function renderRankings(rankings = []) {
  if (!rankings.length) return "";
  const rows = rankings.map((item, index) => `
    <div class="ytt-ai-rank-row">
      <span>#${index + 1}</span>
      <strong>${escapeHtml(item.symbol)} <em>${escapeHtml(item.assetType)}</em></strong>
      <b>${escapeHtml(item.rating)}</b>
      <i>${Number(item.setupScore || 0)}/100</i>
    </div>`).join("");
  return renderCard("Ranked Candidates", `<div class="ytt-ai-rank-list">${rows}</div>`, "rank");
}

function renderExternalSignalCards(review = {}) {
  if (!review || !Array.isArray(review.comparisons)) return [];
  const settings = review.settings || {};
  const cards = [
    renderCard("External Signal Summary", renderRows([
      ["Provider", "Prosperio.AI"],
      ["Status", settings.enabled ? "Manual / Import / API Future" : "Disabled"],
      ["Stored Signals", review.comparisons.length],
      ["Default Trust", settings.trustLevel || "low"],
      ["YucaTana Confirmation", settings.requireConfirmation === false ? "Optional" : "Required"],
    ]), "sources"),
  ];

  if (!review.comparisons.length) {
    cards.push(renderCard("Signal Watchlist", "<p>No Prosperio signals are stored locally yet. Add one in Settings/Admin under External Signal Providers.</p>", "risk"));
    return cards;
  }

  const rows = review.comparisons.map((item) => `
    <div class="ytt-ai-rank-row">
      <span>${escapeHtml(item.signal.horizon)}</span>
      <strong>${escapeHtml(item.signal.symbol)} <em>${escapeHtml(item.signal.assetType)}</em></strong>
      <b>${escapeHtml(item.confirmationStatus)}</b>
      <i>${item.yucaTanaScore == null ? "N/A" : `${item.yucaTanaScore}/100`}</i>
    </div>`).join("");
  cards.push(renderCard("YucaTana Confirmation Engine", `<div class="ytt-ai-rank-list">${rows}</div>`, "rank"));

  const top = review.comparisons[0];
  if (top) {
    cards.push(renderCard("Bull Case", renderList(top.marketBrain?.opportunity?.strongestFactors || [], "No bullish confirmation from supplied YucaTana data."), "case"));
    cards.push(renderCard("Bear Case", renderList(top.marketBrain?.opportunity?.weakestFactors || [], "No bear case supplied by YucaTana data."), "risk"));
    cards.push(renderCard("Risk Framework", renderList([
      top.signal.riskNote ? `Prosperio note: ${top.signal.riskNote}` : "",
      ...(top.marketBrain?.missingData || []).length ? `Missing YucaTana data: ${(top.marketBrain?.missingData || []).join(", ")}.` : "",
      "External signals never override YucaTana market data.",
    ].filter(Boolean)), "risk"));
    cards.push(renderCard("What Would Confirm It", renderList([
      "Fresh YucaTana price and volume data for the symbol.",
      "Market Brain score at CANDIDATE or better for bullish plays, or weak/avoid confirmation for bearish plays.",
      "Support/resistance, RSI/MACD, volume, and catalyst fields if those are part of the external thesis.",
    ]), "watch"));
    cards.push(renderCard("Data Quality Warning", renderRows([
      ["Confirmation Status", top.confirmationStatus],
      ["YucaTana Rating", top.yucaTanaRating],
      ["Provider Confidence", top.signal.providerConfidence || "Unavailable"],
      ["Source URL/Note", top.signal.sourceUrl || top.signal.notes || "Unavailable"],
    ]), "sources"));
  }
  return cards;
}

function marketBrainCards(brain = {}) {
  if (!brain || !brain.opportunity) {
    return brain?.rankings?.length ? [renderRankings(brain.rankings)] : [];
  }
  const opportunity = brain.opportunity;
  const regime = brain.marketRegime || {};
  const playbook = brain.playbook || {};
  const source = brain.directPriceData || {};
  const riskItems = [
    ...(opportunity.scoreBreakdown?.riskReward?.weakestFactors || []),
    (brain.missingData || []).length ? `Missing data: ${(brain.missingData || []).join(", ")}.` : "",
  ].filter(Boolean);
  const cards = [
    renderRankings(brain.rankings),
    renderCard("Verdict Card", renderRows([
      ["Symbol", opportunity.symbol],
      ["Asset Type", opportunity.assetType],
      ["Rating", opportunity.rating],
      ["Setup Score", `${opportunity.setupScore}/100`],
      ["Confidence", opportunity.confidence],
      ["Data Quality", opportunity.dataQuality],
    ]), "verdict"),
    renderCard("Score Breakdown", renderScoreBreakdown(opportunity.scoreBreakdown), "score"),
    renderCard("Bull / Bear Case", `
      <div class="ytt-ai-split">
        <div><h4>Strongest</h4>${renderList(opportunity.strongestFactors, "No strong positive factors supplied.")}</div>
        <div><h4>Weakest</h4>${renderList(opportunity.weakestFactors, "No risk factors supplied.")}</div>
      </div>`, "case"),
    renderCard("Market Context", renderRows([
      ["Market Regime", regime.regime || "UNKNOWN"],
      ["Regime Confidence", regime.confidence ?? "Unavailable"],
      ["Regime Data Quality", regime.dataQuality || "UNAVAILABLE"],
    ]) + renderList(regime.notes, "No regime notes available."), "context"),
    renderCard("Playbook", renderRows([
      ["Primary", playbook.primaryPlaybook || "No Clear Setup"],
      ["Secondary", playbook.secondaryPlaybook || "Confirmation Needed"],
      ["Invalidation Data", playbook.invalidationDataAvailable ? "Available" : "Unavailable"],
    ]) + renderList(playbook.notes, "No playbook notes available."), "playbook"),
    renderCard("Risk Card", renderList(riskItems, "No risk framework available from supplied data."), "risk"),
    renderCard("Watch Next", renderList([
      "Confirm price, volume, and trend data remain fresh.",
      playbook.invalidationDataAvailable ? "Monitor supplied support/resistance invalidation data." : "Add support/resistance or VWAP data for cleaner invalidation.",
      (opportunity.missingData || []).includes("catalysts") ? "Use Perplexity Research for latest catalysts if proxy is configured." : "Monitor supplied catalyst quality and timestamp.",
    ]), "watch"),
    renderCard("Sources / Data Quality", renderRows([
      ["Provider", source.provider || source.primaryDataSource || "Unavailable"],
      ["Fallback Used", source.fallbackUsed ? "true" : "false"],
      ["Timestamp", source.timestamp || brain.timestamp],
      ["Missing Fields", (brain.missingData || []).join(", ") || "None listed"],
    ]), "sources"),
  ].filter(Boolean);
  return cards;
}

function renderStructuredOutput(result = {}) {
  const cards = [];
  if (Array.isArray(result.cards) && result.cards.length) {
    for (const card of result.cards) {
      cards.push(renderCard(card.title || "Price Card", renderRows(card.items || []), card.type || "price"));
    }
  }
  if (result.externalSignalReview) cards.push(...renderExternalSignalCards(result.externalSignalReview));
  if (result.marketBrain) cards.push(...marketBrainCards(result.marketBrain));
  const hasPriceCard = Array.isArray(result.cards) && result.cards.some((card) => card.type === "price");
  const answer = result.answer || "";
  const shouldShowNarrative = answer && (!hasPriceCard || /unavailable from currently connected/i.test(answer) || result.provider === "OLLAMA" || result.provider === "PERPLEXITY");
  if (shouldShowNarrative) {
    cards.push(renderCard(result.provider === "OLLAMA" || result.provider === "PERPLEXITY" ? "AI Explanation" : "Research Note", `<p>${renderMarkdownLite(answer)}</p>`, "narrative"));
  }
  return cards.length ? cards.join("") : renderMarkdownLite(answer || "Ask a finance question to start AI research.");
}

function updateAssistantChrome(panel, result = {}) {
  const provider = result.provider || result.routedProvider || "";
  const brain = result.marketBrain || {};
  const quality = result.dataQuality || brain.opportunity?.dataQuality || "UNAVAILABLE";
  const regime = brain.marketRegime?.regime || "UNKNOWN";
  const resolution = result.resolution || result.metadata || brain.directPriceData || {};
  const symbolText = resolution.requestedSymbol
    ? `${resolution.resolvedSymbol || resolution.requestedSymbol} · ${resolution.assetType || "unknown"} · ${resolution.primaryDataSource || resolution.provider || "source unavailable"}`
    : "No symbol locked";
  const setText = (selector, value) => {
    const el = panel.querySelector(selector);
    if (el) el.textContent = value;
  };
  setText("[data-ytt-regime]", regime);
  setText("[data-ytt-data-quality]", quality);
  setText("[data-ytt-provider]", providerStatusLabel(provider === "PERPLEXITY" ? AI_PROVIDER_IDS.PERPLEXITY : provider === "OLLAMA" ? AI_PROVIDER_IDS.OLLAMA : currentSettings().provider));
  setText("[data-ytt-ollama]", currentSettings().ollamaEnabled ? "ENABLED" : "DISABLED");
  setText("[data-ytt-perplexity]", currentSettings().proxyBase ? "PROXY READY" : "PROXY REQUIRED");
  setText("[data-ytt-symbol-chip]", symbolText);
  const promptHost = panel.querySelector("[data-ytt-prompt-chips]");
  if (promptHost && resolution.requestedSymbol && resolution.requestedSymbol !== "Unavailable") {
    const resolved = resolution.resolvedSymbol || resolution.requestedSymbol;
    promptHost.innerHTML = promptChipHtml(SYMBOL_PROMPT_CHIPS.map((prompt) => {
      if (prompt === "Why does this score this way?") return `Why does ${resolved} score this way?`;
      if (prompt === "What would improve this setup?") return `What would improve ${resolved} setup?`;
      if (prompt === "What are the risks?") return `What are ${resolved} risks?`;
      if (prompt === "Find latest catalyst") return `Find latest catalyst for ${resolved}`;
      return prompt;
    }));
  }
  const launcher = document.getElementById("ai-fab");
  if (launcher) launcher.dataset.aiStatus = quality === "UNAVAILABLE" ? "red" : quality === "FALLBACK" || quality === "PARTIAL" || quality === "LOCAL_CONTEXT" ? "yellow" : "green";
}

function setResponseControls(panel, { hasResponse = false, failed = false } = {}) {
  const actions = panel.querySelector("[data-ytt-response-actions]");
  const retry = panel.querySelector("[data-perplexity-retry]");
  if (actions) actions.hidden = !hasResponse;
  if (retry) retry.hidden = !failed;
}

function setQuality(panel, quality) {
  const chip = panel.querySelector("[data-perplexity-quality]");
  if (!chip) return;
  chip.dataset.quality = quality;
  chip.textContent = quality;
}

function updateOutput(panel, result = {}) {
  const output = panel.querySelector("[data-perplexity-output]");
  const citations = panel.querySelector("[data-perplexity-citations]");
  const tickers = panel.querySelector("[data-perplexity-tickers]");
  const meta = panel.querySelector("[data-perplexity-meta]");
  const state = getPanelState(panel);
  const answer = result.answer || "Perplexity research unavailable — retrying.";
  const quality = result.dataQuality || "UNAVAILABLE";
  const provider = result.provider || (quality === "LOCAL_CONTEXT" ? "OLLAMA" : "");
  const model = result.model || "";
  const resolution = result.resolution || result.metadata || {};
  updateAssistantChrome(panel, result);
  if (output) {
    output.classList.remove("is-loading");
    output.innerHTML = renderStructuredOutput(result);
  }
  setResponseControls(panel, { hasResponse: Boolean(answer), failed: Boolean(result.failed) });
  setQuality(panel, quality);
  if (meta) {
    const stamp = formatTimestamp(result.timestamp);
    const lastRequest = state.lastRequestAt ? formatTimestamp(state.lastRequestAt) : "";
    const latency = Number.isFinite(Number(result.latencyMs)) ? `<span>${Math.round(Number(result.latencyMs))}MS</span>` : "";
    const resolutionHtml = resolution.requestedSymbol
      ? `<span>REQUESTED: ${escapeHtml(resolution.requestedSymbol)}</span><span>RESOLVED: ${escapeHtml(resolution.resolvedSymbol || "Unavailable")}</span><span>ASSET: ${escapeHtml(resolution.assetType || "unknown")}</span><span>SOURCE: ${escapeHtml(resolution.primaryDataSource || resolution.provider || "Unavailable")}</span><span>FALLBACK: ${resolution.fallbackUsed ? "YES" : "NO"}</span><span>CONFIDENCE: ${escapeHtml(resolution.resolutionConfidence || resolution.confidence || "unknown")}</span>`
      : "";
    meta.innerHTML = `${provider ? `<span>PROVIDER: ${escapeHtml(provider)}</span>` : ""}${model ? `<span>MODEL: ${escapeHtml(model)}</span>` : ""}${resolutionHtml}<span>DATA QUALITY: ${escapeHtml(quality)}</span><span>${escapeHtml(stamp)}</span>${lastRequest ? `<span>LAST REQUEST ${escapeHtml(lastRequest)}</span>` : ""}${latency}`;
  }
  if (tickers) {
    tickers.innerHTML = (Array.isArray(result.tickers) ? result.tickers : []).map((ticker) => `<span>${escapeHtml(ticker)}</span>`).join("");
  }
  if (citations) {
    const sourceList = Array.isArray(result.citations) && result.citations.length ? result.citations : Array.isArray(result.sources) ? result.sources : [];
    const links = sourceList.slice(0, 5).map((source, index) => {
      const sourceObject = typeof source === "string" ? { title: source, url: source } : source || {};
      const title = sourceObject.title || sourceObject.url || `Source ${index + 1}`;
      return sourceObject.url
        ? `<a href="${escapeHtml(sourceObject.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
        : `<span>${escapeHtml(title)}</span>`;
    });
    citations.innerHTML = links.length ? links.join("") : quality === "LOCAL_CONTEXT" ? "<span>Local reasoning from supplied YucaTanaTrades context. No web citations.</span>" : "<span>No citations returned.</span>";
  }
}

function updateSourceHealth(status, detail, latencyMs = null, lastSuccessAt = null) {
  const warnStatuses = new Set(["DISABLED", "DEGRADED", "RATE LIMITED", "PROXY REQUIRED"]);
  const tone = status === "CONNECTED" ? "up" : warnStatuses.has(status) ? "warn" : "dn";
  const detailParts = [detail];
  if (Number.isFinite(Number(latencyMs))) detailParts.push(`Latency ${Math.round(Number(latencyMs))}ms.`);
  if (lastSuccessAt) detailParts.push(`Last success ${formatTimestamp(lastSuccessAt)}.`);
  window.YTTSourceHealth?.set?.("perplexity", {
    tone,
    label: status,
    detail: detailParts.filter(Boolean).join(" "),
    latencyMs,
    lastSuccessAt,
    lastFailureReason: status === "CONNECTED" ? "" : detail,
  });
}

function updateOllamaSourceHealth(status, detail, latencyMs = null, lastSuccessAt = null) {
  const tone = status === "RUNNING" ? "up" : status === "DISABLED" ? "warn" : "dn";
  const detailParts = [detail];
  if (Number.isFinite(Number(latencyMs))) detailParts.push(`Latency ${Math.round(Number(latencyMs))}ms.`);
  if (lastSuccessAt) detailParts.push(`Last success ${formatTimestamp(lastSuccessAt)}.`);
  const state = {
    tone,
    label: status,
    detail: detailParts.filter(Boolean).join(" "),
    latencyMs,
    lastSuccessAt,
    lastFailureReason: status === "RUNNING" ? "" : detail,
  };
  window.YTTSourceHealth?.set?.("ollama", {
    ...state,
  });
  renderOllamaHealthRow(state);
}

function renderProviderHealthRow(key, label, fallbackDetail, state = {}) {
  const list = document.getElementById("source-health-list");
  if (!list) return;
  const safeKey = String(key || "").replace(/[^a-z0-9_-]/gi, "");
  const existing = list.querySelector(`[data-source-health-key="${safeKey}"]`);
  const tone = state.tone || "warn";
  const rowHtml = `<span class="health-dot ${escapeHtml(tone)}"></span>
      <div><div class="source-name">${escapeHtml(label)}</div><div class="source-detail">${escapeHtml(state.detail || fallbackDetail)}</div></div>
      <span class="status-chip ${tone === "up" ? "green" : tone === "dn" ? "red" : ""}">${escapeHtml(state.label || "DISABLED")}</span>`;
  if (existing) {
    existing.innerHTML = rowHtml;
    return;
  }
  const row = document.createElement("div");
  row.className = "source-health-row";
  row.dataset.sourceHealthKey = safeKey;
  row.innerHTML = rowHtml;
  list.appendChild(row);
}

function renderOllamaHealthRow(state = {}) {
  renderProviderHealthRow("ollama", "Local Ollama", "Local qwen reasoning from supplied YTT data only.", state);
}

function updateMooMooSourceHealth(status, detail, latencyMs = null, lastSuccessAt = null) {
  const tone = status === "RUNNING" ? "up" : status === "DISABLED" || status === "FALLBACK_ACTIVE" ? "warn" : "dn";
  const detailParts = [detail];
  if (Number.isFinite(Number(latencyMs))) detailParts.push(`Latency ${Math.round(Number(latencyMs))}ms.`);
  if (lastSuccessAt) detailParts.push(`Last success ${formatTimestamp(lastSuccessAt)}.`);
  const state = {
    tone,
    label: status,
    detail: detailParts.filter(Boolean).join(" "),
    latencyMs,
    lastSuccessAt,
    lastFailureReason: status === "RUNNING" ? "" : detail,
  };
  window.YTTSourceHealth?.set?.("moomoo", state);
  renderProviderHealthRow("moomoo", "MooMoo OpenD Bridge", "Read-only local stock/options bridge. Unavailable until configured.", state);
}

function renderExecutionSafetyHealth() {
  const state = {
    tone: "warn",
    label: "DISABLED",
    detail: "Broker and crypto exchange execution are disabled. This phase is read-only market data only.",
  };
  renderProviderHealthRow("broker-execution", "Broker Execution", state.detail, state);
  renderProviderHealthRow("crypto-execution", "Crypto Exchange Execution", state.detail, state);
}

function renderSupplementalMarketHealthRows() {
  renderProviderHealthRow("sec-edgar", "SEC EDGAR", "Filings provider is optional and not connected in this static frontend phase.", {
    tone: "warn",
    label: "UNKNOWN",
    detail: "Optional filings source. Use a backend/proxy before adding higher-volume SEC workflows.",
  });
  renderProviderHealthRow("fred", "FRED Macro", "Optional macro provider is disabled.", {
    tone: "warn",
    label: "DISABLED",
    detail: "Optional macro provider. No frontend secret field is exposed.",
  });
  renderProviderHealthRow("fmp", "FMP Optional", "Optional market-data provider is disabled.", {
    tone: "warn",
    label: "DISABLED",
    detail: "Optional future provider. Keep paid API keys server-side.",
  });
  renderProviderHealthRow("marketaux", "MarketAux Optional", "Optional news provider is disabled.", {
    tone: "warn",
    label: "DISABLED",
    detail: "Optional future news provider. Keep paid API keys server-side.",
  });
  const signalSettings = externalSignalProvider.settings().prosperio;
  renderProviderHealthRow("prosperio-signals", "Prosperio.AI Signals", "External signal overlay only; manual/import/API future.", {
    tone: signalSettings.enabled ? "warn" : "dn",
    label: signalSettings.enabled ? "MANUAL" : "DISABLED",
    detail: signalSettings.enabled
      ? "Manual Prosperio signal overlay enabled. YucaTana confirmation is required before scoring."
      : "Prosperio signal overlay disabled. No scraping or login automation is supported.",
  });
}

function classifyClientError(error) {
  switch (error?.code) {
    case "PROXY_REQUIRED":
      return { status: "PROXY REQUIRED", message: "Perplexity proxy is not configured. Add API_PROXY_BASE in Settings/Admin." };
    case "PROXY_OFFLINE":
      return { status: "FAILED", message: "Perplexity proxy offline. Check API_PROXY_BASE or Cloudflare Worker deployment." };
    case "RATE_LIMITED":
      return { status: "RATE LIMITED", message: "Rate limit active. Please wait before asking another research question." };
    case "PERPLEXITY_UNAVAILABLE":
      return { status: "DEGRADED", message: "Perplexity research unavailable — retrying." };
    case "INVALID_RESPONSE":
      return { status: "FAILED", message: "Invalid response from Perplexity proxy." };
    case "REQUEST_TIMEOUT":
      return { status: "DEGRADED", message: "Perplexity proxy timed out. Please retry shortly." };
    case "BAD_REQUEST":
      return { status: "FAILED", message: error.message || "Invalid Perplexity research request." };
    case "LOCAL_AI_DISABLED":
      return { status: "DISABLED", message: "Local AI is disabled. Enable Local AI / Ollama in Settings/Admin." };
    case "OLLAMA_UNAVAILABLE":
    case "OLLAMA_MODEL_UNAVAILABLE":
      return { status: "UNAVAILABLE", message: error.message || "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running." };
    case "OLLAMA_INVALID_RESPONSE":
      return { status: "ERROR", message: "Invalid response from local Ollama." };
    case "OLLAMA_TIMEOUT":
      return { status: "UNAVAILABLE", message: "Local AI request timed out. Confirm Ollama is running." };
    default:
      return { status: "FAILED", message: error?.message || "Perplexity research unavailable — retrying." };
  }
}

function requiresWebResearch(query = "", mode = "") {
  return WEB_RESEARCH_QUERY_PATTERN.test(`${query} ${mode}`) || mode === "deep_research" || mode === "catalyst";
}

function deterministicBrainAnswer(brain = {}, note = "") {
  if (brain.rankings?.length) {
    const ranked = brain.rankings.map((item, index) => `${index + 1}. ${item.symbol} (${item.assetType}) - ${item.rating}, ${item.setupScore}/100, ${item.playbook}`).join("\n");
    return [
      note || "YucaTana Market Brain ranked only assets with connected data.",
      "",
      "Top candidates:",
      ranked,
      "",
      "This is read-only decision support, not a buy/sell instruction.",
    ].join("\n");
  }
  const opportunity = brain.opportunity;
  if (!opportunity) return note || "Market Brain could not score this request because no matching symbol or scanner data was supplied.";
  return [
    note || "YucaTana Market Brain computed a read-only setup score before any LLM explanation.",
    "",
    `Symbol: ${opportunity.symbol}`,
    `Asset Type: ${opportunity.assetType}`,
    `Rating: ${opportunity.rating}`,
    `Setup Score: ${opportunity.setupScore}/100`,
    `Data Quality: ${opportunity.dataQuality}`,
    `Market Regime: ${brain.marketRegime?.regime || "UNKNOWN"}`,
    `Playbook: ${brain.playbook?.primaryPlaybook || "No Clear Setup"}`,
    "",
    "Missing Data:",
    (brain.missingData || []).join(", ") || "None listed.",
    "",
    "This is read-only decision support, not a buy/sell instruction.",
  ].join("\n");
}

function deterministicBrainResult(brain = {}, note = "", resolution = {}) {
  return {
    answer: deterministicBrainAnswer(brain, note),
    provider: "YTT MARKET BRAIN",
    dataQuality: brain.opportunity?.dataQuality || (brain.rankings?.length ? "PARTIAL" : "UNAVAILABLE"),
    timestamp: brain.timestamp || new Date().toISOString(),
    citations: [],
    sources: [],
    tickers: brain.rankings?.length ? brain.rankings.map((item) => item.symbol) : brain.symbol ? [brain.symbol] : [],
    resolution,
    marketBrain: brain,
  };
}

function isExternalSignalQuery(query = "", mode = "") {
  return mode === "external_signals" || EXTERNAL_SIGNAL_QUERY_PATTERN.test(query);
}

function externalSignalReviewResult(query = "", appState = {}) {
  const settings = currentSettings().externalSignals.prosperio;
  const comparisons = settings.enabled
    ? externalSignalProvider.compareSignals(appState)
    : [];
  const stored = externalSignalProvider.listSignals();
  const answer = !settings.enabled
    ? "External Signal Providers are disabled. Enable Prosperio signals in Settings/Admin to review locally stored plays."
    : !stored.length
      ? "No Prosperio signals are stored locally yet. Add a manual signal in Settings/Admin; YucaTana will verify it against current market data before scoring."
      : [
          "External Signal Review",
          `Provider: Prosperio.AI`,
          `Signals reviewed: ${comparisons.length}`,
          "",
          ...comparisons.map((item, index) => `${index + 1}. ${item.signal.symbol} ${item.signal.horizon} ${item.signal.direction} - ${item.confirmationStatus}; YucaTana score ${item.yucaTanaScore ?? "Unavailable"}/100; rating ${item.yucaTanaRating}.`),
          "",
          "Prosperio is an overlay only. YucaTana market data remains source of truth. No buy/sell or order instruction was generated.",
        ].join("\n");

  return {
    answer,
    provider: "YTT EXTERNAL SIGNALS",
    dataQuality: comparisons.some((item) => item.confirmationStatus !== "DATA_INSUFFICIENT") ? "PARTIAL" : "UNAVAILABLE",
    timestamp: new Date().toISOString(),
    citations: [],
    sources: [],
    tickers: comparisons.map((item) => item.signal.symbol),
    externalSignalReview: {
      query,
      settings,
      comparisons,
      storedSignals: stored,
    },
  };
}

async function ask(panel, contextName, forceQuery = "") {
  const settings = currentSettings();
  const input = panel.querySelector("[data-perplexity-query]");
  const mode = panel.querySelector("[data-perplexity-mode]")?.value || settings.mode;
  const providerSelection = panel.querySelector("[data-ai-provider]")?.value || settings.provider || AI_PROVIDER_IDS.AUTO;
  const query = (forceQuery || input?.value || "").trim();
  const output = panel.querySelector("[data-perplexity-output]");
  const state = getPanelState(panel);
  if (!query) {
    setLocalNotice(panel, "DEGRADED", "Enter an AI research question before asking.");
    return;
  }
  if (query.length > MAX_QUERY_LENGTH) {
    setLocalNotice(panel, "FAILED", `Query is too long. Keep it under ${MAX_QUERY_LENGTH} characters.`);
    return;
  }
  if (state.inFlight) {
    setLocalNotice(panel, "RATE LIMITED", "A Perplexity research request is already running.");
    return;
  }
  const now = Date.now();
  const key = requestKey(query, `${mode}:${providerSelection}`, contextName);
  const elapsed = now - (state.lastRequestAt || 0);
  if (state.lastRequestAt && elapsed < CLIENT_COOLDOWN_MS) {
    const remaining = Math.ceil((CLIENT_COOLDOWN_MS - elapsed) / 1000);
    setLocalNotice(panel, "RATE LIMITED", `Local cooldown active. Please wait ${remaining}s before asking another research question.`);
    return;
  }
  if (state.lastRequestKey === key && state.lastCompletedAt && now - state.lastCompletedAt < CLIENT_COOLDOWN_MS) {
    setLocalNotice(panel, "RATE LIMITED", "Duplicate research request blocked. Please wait before retrying the same question.");
    return;
  }
  localStorage.setItem(SETTINGS.mode, mode);
  localStorage.setItem(SETTINGS.provider, providerSelection);
  if (!settings.enabled && providerSelection === AI_PROVIDER_IDS.PERPLEXITY) {
    updateOutput(panel, { answer: "Perplexity research is disabled in Settings.", provider: "PERPLEXITY", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    updateSourceHealth("DISABLED", "Perplexity AI is disabled in Settings.");
    return;
  }
  if (!settings.enabled) {
    updateSourceHealth("DISABLED", "Perplexity AI is disabled in Settings.");
  }
  Object.assign(state, { query, mode, contextName, lastRequestAt: now, lastRequestKey: key, inFlight: true });
  if (output) {
    output.classList.add("is-loading");
    output.textContent = providerSelection === AI_PROVIDER_IDS.OLLAMA ? "Running local context-only reasoning..." : "Routing AI research...";
  }
  setBusy(panel, true);
  try {
    const appState = getAppState(contextName, query);
    if (isExternalSignalQuery(query, mode)) {
      const result = externalSignalReviewResult(query, appState);
      state.lastCompletedAt = Date.now();
      state.lastSuccessAt = result.timestamp;
      updateOutput(panel, result);
      return;
    }
    const symbolIntent = await resolveSymbolIntent({
      query,
      state: appState,
      settings: {
        apiProxyBase: settings.proxyBase,
        finnhubKey: settings.finnhubKey,
        moomoo: settings.moomoo,
      },
      fetchImpl: globalThis.fetch,
    });
    if (symbolIntent.directAnswer) {
      state.lastCompletedAt = Date.now();
      state.lastSuccessAt = symbolIntent.directAnswer.timestamp || new Date().toISOString();
      updateOutput(panel, symbolIntent.directAnswer);
      if (symbolIntent.assetType === "stock" && symbolIntent.directAnswer.resolution?.fallbackUsed) {
        updateMooMooSourceHealth("FALLBACK_ACTIVE", "MooMoo bridge unavailable or disabled for this stock request; Finnhub fallback was used.");
        window.YTTSourceHealth?.set?.("finnhub", {
          tone: "warn",
          label: "FALLBACK_ACTIVE",
          detail: "Finnhub is serving stock quotes while MooMoo OpenD bridge is unavailable.",
        });
      }
      return;
    }
    const baseContext = buildPerplexityContext({ ...appState, symbolIntent });
    const yttContext = buildAIDecisionContext({
      query,
      mode,
      appState,
      yttContext: baseContext,
      symbolIntent,
    });
    state.lastBrain = yttContext.marketBrain;
    if (requiresWebResearch(query, mode) && providerSelection !== AI_PROVIDER_IDS.OLLAMA && (!settings.enabled || !settings.proxyBase)) {
      const warning = "Perplexity proxy is not configured. Add API_PROXY_BASE in Settings/Admin for latest catalysts, news, filings, analyst changes, or cited deep research.";
      updateOutput(panel, deterministicBrainResult(yttContext.marketBrain, warning, symbolIntent.metadata));
      updateSourceHealth("PROXY REQUIRED", warning);
      return;
    }
    const selected = yttContext.selectedAsset || {};
    const started = Date.now();
    const result = await askWithProvider({
      query,
      mode,
      providerSelection,
      context: yttContext,
      ticker: selected.symbol || inferTickerFromQuery(query),
      assetType: selected.assetType || contextName,
      selectedTab: yttContext.selectedTab,
      settings: {
        perplexity: {
          enabled: settings.enabled,
          proxyBase: settings.proxyBase,
          timeoutMs: settings.responseLength === "long" ? 26000 : 18000,
        },
        ollama: {
          enabled: settings.ollamaEnabled,
          endpoint: settings.ollamaEndpoint,
          model: settings.ollamaModel,
          providerMode: settings.ollamaProviderMode,
          timeoutMs: settings.responseLength === "long" ? 42000 : 30000,
        },
      },
    });
    result.latencyMs = result.latencyMs || Date.now() - started;
    result.resolution = symbolIntent.metadata;
    result.marketBrain = yttContext.marketBrain;
    state.lastCompletedAt = Date.now();
    state.lastSuccessAt = result.timestamp || new Date().toISOString();
    state.lastFailureReason = "";
    updateOutput(panel, result);
    if (result.provider === "OLLAMA") {
      updateOllamaSourceHealth("RUNNING", `Local model ${result.model || settings.ollamaModel} answered from supplied YucaTanaTrades context.`, result.latencyMs, result.timestamp);
    } else {
      updateSourceHealth("CONNECTED", `Last success ${formatTimestamp(result.timestamp)}.`, result.latencyMs, result.timestamp);
    }
  } catch (error) {
    const classified = classifyClientError(error);
    state.lastFailureReason = classified.message;
    const isLocalError = String(error?.code || "").startsWith("OLLAMA") || error?.code === "LOCAL_AI_DISABLED";
    const fallbackResult = state.lastBrain
      ? deterministicBrainResult(state.lastBrain, classified.message, state.lastBrain?.directPriceData || {})
      : { answer: classified.message, provider: isLocalError ? "OLLAMA" : "PERPLEXITY", model: isLocalError ? settings.ollamaModel : "", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] };
    fallbackResult.provider = fallbackResult.provider || (isLocalError ? "OLLAMA" : "PERPLEXITY");
    fallbackResult.model = isLocalError ? settings.ollamaModel : fallbackResult.model;
    fallbackResult.failed = true;
    updateOutput(panel, fallbackResult);
    if (isLocalError) updateOllamaSourceHealth(classified.status, `Last failure: ${classified.message}`);
    else updateSourceHealth(classified.status, `Last failure: ${classified.message}`);
  } finally {
    state.inFlight = false;
    setBusy(panel, false);
  }
}

function bindPanel(host, contextName) {
  if (host.dataset.perplexityBound === "true") return;
  host.dataset.perplexityBound = "true";
  const hostId = host.id || `perplexity-${Math.random().toString(36).slice(2)}`;
  if (!host.id) host.id = hostId;
  host.innerHTML = panelTemplate(hostId, contextName);
  const panel = host.querySelector(".ytt-perplexity-panel");
  const form = panel.querySelector("[data-perplexity-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(panel, contextName);
  });
  const queryInput = panel.querySelector("[data-perplexity-query]");
  queryInput?.addEventListener("input", () => updateSymbolChipFromQuery(panel, queryInput.value, contextName));
  panel.querySelectorAll("[data-ytt-mode-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = normalizeMode(button.dataset.yttModeChip || currentSettings().mode);
      const modeSelect = panel.querySelector("[data-perplexity-mode]");
      if (modeSelect) modeSelect.value = mode;
      setModeChipState(panel, mode);
      const input = panel.querySelector("[data-perplexity-query]");
      if (input && !input.value.trim()) input.value = promptForMode(mode, contextName);
      updateSymbolChipFromQuery(panel, input?.value || "", contextName);
      input?.focus();
    });
  });
  panel.querySelector("[data-ytt-prompt-chips]")?.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-ytt-prompt-chip]");
    if (!button) return;
    const selected = selectedSymbolForContext(contextName);
    const base = button.dataset.yttPromptChip || "";
    const prompt = base === "Find latest catalyst" && selected ? `${base} for ${selected}` : base;
    const input = panel.querySelector("[data-perplexity-query]");
    if (input) {
      input.value = prompt;
      updateSymbolChipFromQuery(panel, prompt, contextName);
      input.focus();
    }
  });
  panel.querySelector("[data-ytt-analyze-selected]")?.addEventListener("click", () => {
    const selected = selectedSymbolForContext(contextName);
    const input = panel.querySelector("[data-perplexity-query]");
    if (input) input.value = selected ? `${selected} setup analysis` : "Analyze selected setup";
    ask(panel, contextName, input?.value || "Analyze selected setup");
  });
  panel.querySelector("[data-ai-provider]")?.addEventListener("change", (event) => {
    localStorage.setItem(SETTINGS.provider, event.target.value || AI_PROVIDER_IDS.AUTO);
    const badge = panel.querySelector("[data-provider-badge]");
    const status = panel.querySelector("[data-provider-status]");
    const label = providerStatusLabel(event.target.value || AI_PROVIDER_IDS.AUTO);
    if (badge) badge.textContent = label;
    if (status) {
      status.textContent = label;
      status.dataset.providerStatus = event.target.value || AI_PROVIDER_IDS.AUTO;
    }
    const stripProvider = panel.querySelector("[data-ytt-provider]");
    if (stripProvider) stripProvider.textContent = label;
  });
  panel.querySelector("[data-ai-panel-close]")?.addEventListener("click", () => setUnifiedAssistantOpen(false));
  panel.querySelector("[data-perplexity-clear]")?.addEventListener("click", () => {
    const input = panel.querySelector("[data-perplexity-query]");
    if (input) input.value = "";
    updateOutput(panel, {
      answer: "Ask a finance question to start AI research.",
      dataQuality: "UNAVAILABLE",
      timestamp: new Date().toISOString(),
      citations: [],
      sources: [],
      tickers: [],
    });
    setResponseControls(panel, { hasResponse: false, failed: false });
  });
  panel.querySelector("[data-perplexity-retry]")?.addEventListener("click", () => {
    const previous = panelState.get(panel);
    ask(panel, contextName, previous?.query || panel.querySelector("[data-perplexity-query]")?.value || "");
  });
  panel.querySelector("[data-perplexity-regenerate]")?.addEventListener("click", () => {
    const previous = panelState.get(panel);
    ask(panel, contextName, previous?.query || "");
  });
  panel.querySelector("[data-perplexity-copy]")?.addEventListener("click", async () => {
    const text = panel.querySelector("[data-perplexity-output]")?.innerText || "";
    if (navigator.clipboard && text) await navigator.clipboard.writeText(text);
  });
}

function appStateForSignalComparison() {
  if (typeof window.buildAIContext === "function") return window.buildAIContext();
  return {
    activeTab: document.body?.dataset?.activeTab || "dashboard",
    stockQuotes: {},
    cryptoMarkets: {},
    sourceHealth: window.YTTSourceHealth?.get?.() || {},
    watchlist: [],
  };
}

function setSignalMessage(message, tone = "warn") {
  const box = document.getElementById("prosperio-signal-message");
  if (!box) return;
  box.style.display = "block";
  box.textContent = message;
  box.dataset.tone = tone;
}

function addProsperioSignalFromSettings() {
  const timestampValue = document.getElementById("prosperio-timestamp")?.value;
  const timestamp = timestampValue ? new Date(timestampValue).toISOString() : new Date().toISOString();
  const validation = adaptManualProsperioSignal({
    symbol: document.getElementById("prosperio-symbol")?.value,
    assetType: document.getElementById("prosperio-asset-type")?.value,
    horizon: document.getElementById("prosperio-horizon")?.value,
    direction: document.getElementById("prosperio-direction")?.value,
    providerConfidence: document.getElementById("prosperio-confidence")?.value,
    entryZone: document.getElementById("prosperio-entry-zone")?.value,
    target: document.getElementById("prosperio-target")?.value,
    riskNote: document.getElementById("prosperio-risk-note")?.value,
    sourceUrl: document.getElementById("prosperio-source-url")?.value,
    notes: document.getElementById("prosperio-notes")?.value,
    createdAt: timestamp,
    updatedAt: new Date().toISOString(),
  });
  if (!validation.valid) {
    setSignalMessage(validation.errors.join(" "), "error");
    return;
  }
  externalSignalProvider.addSignal(validation.signal);
  ["prosperio-symbol", "prosperio-confidence", "prosperio-entry-zone", "prosperio-target", "prosperio-risk-note", "prosperio-source-url", "prosperio-notes"].forEach((id) => {
    const field = document.getElementById(id);
    if (field) field.value = "";
  });
  setSignalMessage("Prosperio signal saved locally. YucaTana confirmation is required before it can affect Market Brain review.", "success");
  renderExternalSignalWatchlist();
}

function renderExternalSignalWatchlist() {
  const host = document.getElementById("external-signal-watchlist");
  if (!host) return;
  const settings = currentSettings().externalSignals.prosperio;
  const signals = externalSignalProvider.listSignals();
  const comparisons = settings.enabled ? externalSignalProvider.compareSignals(appStateForSignalComparison()) : [];
  if (!signals.length) {
    host.innerHTML = `<div class="ytt-perplexity-warning">No external signals stored yet. Manual Prosperio entries remain local to this browser.</div>`;
    return;
  }
  const comparisonById = new Map(comparisons.map((item) => [item.signal.id, item]));
  host.innerHTML = `<table class="data-table ytt-external-signal-table">
    <thead><tr><th>Symbol</th><th>Asset Type</th><th>Horizon</th><th>Direction</th><th>Prosperio Confidence</th><th>YucaTana Score</th><th>Confirmation Status</th><th>Last Updated</th><th></th></tr></thead>
    <tbody>${signals.map((signal) => {
      const comparison = comparisonById.get(signal.id);
      return `<tr>
        <td>${escapeHtml(signal.symbol)}</td>
        <td>${escapeHtml(signal.assetType)}</td>
        <td>${escapeHtml(signal.horizon)}</td>
        <td>${escapeHtml(signal.direction)}</td>
        <td>${escapeHtml(signal.providerConfidence || "Unavailable")}</td>
        <td>${comparison?.yucaTanaScore == null ? "Unavailable" : `${comparison.yucaTanaScore}/100`}</td>
        <td>${escapeHtml(settings.enabled ? (comparison?.confirmationStatus || "DATA_INSUFFICIENT") : "PROVIDER_DISABLED")}</td>
        <td>${escapeHtml(formatTimestamp(signal.updatedAt))}</td>
        <td><button class="ytt-perplexity-btn ytt-perplexity-btn-ghost" type="button" data-remove-signal="${escapeHtml(signal.id)}">Remove</button></td>
      </tr>`;
    }).join("")}</tbody>
  </table>`;
}

function bindSettingsPanel() {
  const host = document.getElementById("perplexity-settings-panel");
  if (!host || host.dataset.perplexitySettingsBound === "true") return;
  host.dataset.perplexitySettingsBound = "true";
  const settings = currentSettings();
  host.innerHTML = `<div class="panel-header">Perplexity AI <span class="source-tag">PROXY ONLY</span></div>
    <div class="ytt-perplexity-settings-grid">
      <div class="ytt-perplexity-warning">Perplexity API keys must remain server-side. Never place secrets in GitHub Pages frontend code.</div>
      <label class="ytt-perplexity-toggle-row"><span>Enable Perplexity</span><select id="perplexity-enabled" class="ytt-perplexity-setting"><option value="true"${settings.enabled ? " selected" : ""}>Enabled</option><option value="false"${!settings.enabled ? " selected" : ""}>Disabled</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>API_PROXY_BASE</span><input id="input-perplexity-proxy" class="ytt-perplexity-setting" type="url" placeholder="https://your-domain.com/api" value="${escapeHtml(settings.proxyBase)}"></label>
      <label class="ytt-perplexity-setting-row"><span>Verbosity</span><select id="perplexity-verbosity" class="ytt-perplexity-setting"><option value="concise">Concise</option><option value="balanced">Balanced</option><option value="detailed">Detailed</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>Response Length</span><select id="perplexity-length" class="ytt-perplexity-setting"><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>Default Mode</span><select id="perplexity-default-mode" class="ytt-perplexity-setting">${modeOptions(settings.mode)}</select></label>
      <label class="ytt-perplexity-setting-row"><span>Panel Provider</span><select id="ai-provider-selection" class="ytt-perplexity-setting">${providerOptions(settings.provider)}</select></label>
      <div class="panel-header ytt-perplexity-section-title">Local AI / Ollama <span class="source-tag">LOCAL ONLY</span></div>
      <div class="ytt-perplexity-warning">Ollama has no live market data unless YucaTanaTrades supplies it. Keep Ollama bound to localhost; never expose it publicly.</div>
      <label class="ytt-perplexity-toggle-row"><span>Enable Local AI</span><select id="ollama-enabled" class="ytt-perplexity-setting"><option value="false"${!settings.ollamaEnabled ? " selected" : ""}>Disabled</option><option value="true"${settings.ollamaEnabled ? " selected" : ""}>Enabled</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>Ollama Endpoint</span><input id="ollama-endpoint" class="ytt-perplexity-setting" type="url" placeholder="${escapeHtml(DEFAULT_OLLAMA_ENDPOINT)}" value="${escapeHtml(settings.ollamaEndpoint)}"></label>
      <label class="ytt-perplexity-setting-row"><span>Ollama Model</span><input id="ollama-model" class="ytt-perplexity-setting" type="text" value="${escapeHtml(settings.ollamaModel)}"></label>
      <label class="ytt-perplexity-setting-row"><span>Provider Mode</span><select id="ollama-provider-mode" class="ytt-perplexity-setting"><option value="disabled">Disabled</option><option value="local_reasoning">Local Reasoning</option><option value="auto">Auto</option></select></label>
      <div class="panel-header ytt-perplexity-section-title">Market Data Providers <span class="source-tag">READ ONLY</span></div>
      <div class="ytt-perplexity-warning">MooMoo OpenD is prepared as the future primary stock/options source through a local read-only bridge. No account credentials, trading passwords, order endpoints, or broker execution controls are supported here.</div>
      <label class="ytt-perplexity-toggle-row"><span>Enable MooMoo OpenD Data</span><select id="moomoo-enabled" class="ytt-perplexity-setting"><option value="false"${!settings.moomoo.enabled ? " selected" : ""}>Disabled</option><option value="true"${settings.moomoo.enabled ? " selected" : ""}>Enabled</option></select></label>
      <label class="ytt-perplexity-setting-row"><span>MooMoo Bridge URL</span><input id="moomoo-bridge-url" class="ytt-perplexity-setting" type="url" placeholder="${escapeHtml(DEFAULT_MOOMOO_BRIDGE_URL)}" value="${escapeHtml(settings.moomoo.bridgeUrl)}"></label>
      <label class="ytt-perplexity-toggle-row"><span>Primary Stock Data</span><select id="moomoo-primary-stocks" class="ytt-perplexity-setting"><option value="false"${!settings.moomoo.primaryStocks ? " selected" : ""}>Finnhub Fallback First</option><option value="true"${settings.moomoo.primaryStocks ? " selected" : ""}>MooMoo Primary</option></select></label>
      <label class="ytt-perplexity-toggle-row"><span>Options Data</span><select id="moomoo-options-enabled" class="ytt-perplexity-setting"><option value="false"${!settings.moomoo.optionsEnabled ? " selected" : ""}>Disabled</option><option value="true"${settings.moomoo.optionsEnabled ? " selected" : ""}>MooMoo Read Only</option></select></label>
      <div class="ytt-perplexity-warning">Broker / Execution Safety: Live Trading DISABLED. Paper Trading DISABLED unless separately enabled by an existing safe module. Broker integrations are future server-side only.</div>
      ${signalSettingsHtml(settings)}
      <div class="ytt-perplexity-actions"><button class="ytt-perplexity-btn" type="button" id="save-perplexity-settings">Save AI Settings</button><button class="ytt-perplexity-btn" type="button" id="test-perplexity-settings">Check Proxy Health</button><button class="ytt-perplexity-btn" type="button" id="test-ollama-settings">Test Ollama</button><button class="ytt-perplexity-btn" type="button" id="test-moomoo-settings">Test MooMoo Bridge</button></div>
    </div>`;
  host.querySelector("#perplexity-verbosity").value = settings.verbosity;
  host.querySelector("#perplexity-length").value = settings.responseLength;
  host.querySelector("#ollama-provider-mode").value = settings.ollamaProviderMode;
  host.querySelector("#save-perplexity-settings")?.addEventListener("click", saveSettings);
  host.querySelector("#test-perplexity-settings")?.addEventListener("click", refreshHealth);
  host.querySelector("#test-ollama-settings")?.addEventListener("click", () => refreshOllamaHealth({ test: true }));
  host.querySelector("#test-moomoo-settings")?.addEventListener("click", () => refreshMooMooHealth({ test: true }));
  host.querySelector("#add-prosperio-signal")?.addEventListener("click", addProsperioSignalFromSettings);
  host.querySelector("#refresh-prosperio-signals")?.addEventListener("click", renderExternalSignalWatchlist);
  host.querySelector("#external-signal-watchlist")?.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-remove-signal]");
    if (!button) return;
    externalSignalProvider.removeSignal(button.dataset.removeSignal);
    renderExternalSignalWatchlist();
  });
  renderExternalSignalWatchlist();
}

function saveSettings() {
  const enabled = document.getElementById("perplexity-enabled")?.value || "true";
  const proxy = document.getElementById("input-perplexity-proxy")?.value?.trim() || "";
  localStorage.setItem(SETTINGS.enabled, enabled);
  localStorage.setItem(SETTINGS.proxy, proxy);
  localStorage.setItem(SETTINGS.verbosity, document.getElementById("perplexity-verbosity")?.value || "balanced");
  localStorage.setItem(SETTINGS.length, document.getElementById("perplexity-length")?.value || "medium");
  localStorage.setItem(SETTINGS.mode, normalizeMode(document.getElementById("perplexity-default-mode")?.value || DEFAULT_PERPLEXITY_MODE));
  localStorage.setItem(SETTINGS.provider, document.getElementById("ai-provider-selection")?.value || AI_PROVIDER_IDS.AUTO);
  localStorage.setItem(SETTINGS.ollamaEnabled, document.getElementById("ollama-enabled")?.value || "false");
  localStorage.setItem(SETTINGS.ollamaEndpoint, (document.getElementById("ollama-endpoint")?.value || DEFAULT_OLLAMA_ENDPOINT).trim());
  localStorage.setItem(SETTINGS.ollamaModel, (document.getElementById("ollama-model")?.value || DEFAULT_OLLAMA_MODEL).trim());
  localStorage.setItem(SETTINGS.ollamaProviderMode, document.getElementById("ollama-provider-mode")?.value || "auto");
  localStorage.setItem(SETTINGS.moomooEnabled, document.getElementById("moomoo-enabled")?.value || "false");
  localStorage.setItem(SETTINGS.moomooBridgeUrl, (document.getElementById("moomoo-bridge-url")?.value || DEFAULT_MOOMOO_BRIDGE_URL).trim());
  localStorage.setItem(SETTINGS.moomooPrimaryStocks, document.getElementById("moomoo-primary-stocks")?.value || "false");
  localStorage.setItem(SETTINGS.moomooOptionsEnabled, document.getElementById("moomoo-options-enabled")?.value || "false");
  localStorage.setItem(SETTINGS.prosperioEnabled, document.getElementById("prosperio-enabled")?.value || "false");
  localStorage.setItem(SETTINGS.prosperioInputMode, document.getElementById("prosperio-input-mode")?.value || "manual");
  localStorage.setItem(SETTINGS.prosperioTrustLevel, document.getElementById("prosperio-trust-level")?.value || "low");
  localStorage.setItem(SETTINGS.prosperioRequireConfirmation, document.getElementById("prosperio-require-confirmation")?.value || "true");
  const mainProxy = document.getElementById("input-api-proxy");
  if (mainProxy) mainProxy.value = proxy;
  document.querySelectorAll("[data-perplexity-panel]").forEach((host) => {
    delete host.dataset.perplexityBound;
  });
  mountAll();
  refreshHealth();
  refreshOllamaHealth({ test: false });
  refreshMooMooHealth({ test: false });
  renderExternalSignalWatchlist();
}

async function refreshHealth() {
  const settings = currentSettings();
  if (!settings.enabled) {
    updateSourceHealth("DISABLED", "Perplexity AI is disabled in Settings.");
    return;
  }
  if (!settings.proxyBase) {
    updateSourceHealth("PROXY REQUIRED", "Perplexity requires API_PROXY_BASE. No frontend API key field is provided.");
    return;
  }
  updateSourceHealth("DEGRADED", "Checking Perplexity proxy.");
  const result = await createPerplexityClient({ proxyBase: settings.proxyBase, timeoutMs: 12000 }).healthCheck();
  const detail = result.error || (result.status === "CONNECTED"
    ? "Perplexity proxy health route is connected and server-side secret is configured."
    : "Perplexity proxy health check completed with degraded status.");
  updateSourceHealth(result.status, detail, result.latencyMs, result.lastSuccessAt);
}

async function refreshOllamaHealth({ test = false } = {}) {
  const settings = currentSettings();
  if (!settings.ollamaEnabled || settings.ollamaProviderMode === "disabled") {
    updateOllamaSourceHealth("DISABLED", "Local Ollama is disabled in Settings/Admin.");
    return;
  }

  if (!test) {
    updateOllamaSourceHealth("UNAVAILABLE", "Local AI enabled. Use Test Ollama to confirm 127.0.0.1 is running.");
    return;
  }

  updateOllamaSourceHealth("UNAVAILABLE", "Checking local Ollama endpoint.");
  const result = await createOllamaClient({
    endpoint: settings.ollamaEndpoint,
    model: settings.ollamaModel,
    timeoutMs: 12000,
  }).healthCheck();
  if (result.status === "RUNNING") {
    const modelDetail = result.modelInstalled
      ? `Model ${settings.ollamaModel} is installed.`
      : `Ollama is running, but ${settings.ollamaModel} was not listed by /api/tags.`;
    updateOllamaSourceHealth("RUNNING", `${modelDetail} Endpoint ${result.endpoint}.`, result.latencyMs, result.lastSuccessAt);
  } else {
    updateOllamaSourceHealth(result.status, result.error || "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running.", result.latencyMs);
  }
}

async function refreshMooMooHealth({ test = false } = {}) {
  const settings = currentSettings();
  if (!settings.moomoo.enabled) {
    updateMooMooSourceHealth("DISABLED", "MooMoo OpenD data is disabled. Finnhub remains the stock quote fallback.");
    renderExecutionSafetyHealth();
    renderSupplementalMarketHealthRows();
    return;
  }

  if (!test) {
    updateMooMooSourceHealth("UNKNOWN", "MooMoo OpenD data is enabled. Use Test MooMoo Bridge to confirm the local read-only bridge is running.");
    renderExecutionSafetyHealth();
    renderSupplementalMarketHealthRows();
    return;
  }

  updateMooMooSourceHealth("UNAVAILABLE", "Checking MooMoo local bridge.");
  const result = await createMooMooClient({
    bridgeUrl: settings.moomoo.bridgeUrl,
    timeoutMs: 8000,
  }).healthCheck();
  updateMooMooSourceHealth(result.status, result.detail || "MooMoo bridge health check completed.", result.latencyMs, result.lastSuccessAt);
  if (result.status !== "RUNNING") {
    window.YTTSourceHealth?.set?.("finnhub", {
      tone: "warn",
      label: "FALLBACK_ACTIVE",
      detail: "Finnhub remains active as fallback while the MooMoo OpenD bridge is unavailable.",
    });
  }
  renderExecutionSafetyHealth();
  renderSupplementalMarketHealthRows();
}

function mountAll() {
  bindUnifiedAssistantLauncher();
  document.querySelectorAll("[data-perplexity-panel]").forEach((host) => {
    bindPanel(host, host.dataset.panelContext || "ai-lab");
  });
  bindSettingsPanel();
}

function scheduleMount() {
  window.clearTimeout(scheduleMount.timer);
  scheduleMount.timer = window.setTimeout(mountAll, 80);
}

window.YTTPerplexity = { mountAll, refreshHealth, saveSettings };
window.YTTOllama = { refreshHealth: () => refreshOllamaHealth({ test: true }) };
window.YTTMooMoo = { refreshHealth: () => refreshMooMooHealth({ test: true }) };
window.YTTUnifiedAI = { open: () => setUnifiedAssistantOpen(true), close: () => setUnifiedAssistantOpen(false), toggle: toggleUnifiedAssistant };
window.addEventListener("ytt:source-health-refresh", refreshHealth);
window.addEventListener("ytt:source-health-refresh", () => refreshOllamaHealth({ test: false }));
window.addEventListener("ytt:source-health-refresh", () => refreshMooMooHealth({ test: false }));
document.addEventListener("DOMContentLoaded", () => {
  mountAll();
  refreshHealth();
  refreshOllamaHealth({ test: false });
  refreshMooMooHealth({ test: false });
  renderExecutionSafetyHealth();
  renderSupplementalMarketHealthRows();
  const observerRoot = document.body || document.documentElement;
  if (observerRoot && observerRoot instanceof Node) {
    try {
      new MutationObserver(scheduleMount).observe(observerRoot, { childList: true, subtree: true });
    } catch (error) {
      // Some embedded browser wrappers expose a body-like object before it is a native Node.
      scheduleMount();
    }
  }
});
