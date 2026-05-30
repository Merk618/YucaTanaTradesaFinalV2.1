import { createPerplexityClient } from "../services/ai/perplexityClient.js";
import { createOllamaClient, DEFAULT_OLLAMA_ENDPOINT, DEFAULT_OLLAMA_MODEL } from "../services/ai/ollamaClient.js";
import { askWithProvider, AI_PROVIDER_IDS } from "../services/ai/providerRouter.js";
import { buildPerplexityContext, inferTickerFromQuery } from "../services/ai/contextBuilder.js";
import { DEFAULT_PERPLEXITY_MODE } from "../services/ai/perplexityModes.js";

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
};

const CLIENT_COOLDOWN_MS = 5000;
const MAX_QUERY_LENGTH = 4000;
const panelState = new Map();
const ASSISTANT_MODES = [
  { id: "quick_summary", label: "Quick Summary" },
  { id: "deep_research", label: "Deep Research / Cited Research" },
  { id: "setup_analysis", label: "Setup Analysis" },
  { id: "scanner_summary", label: "Scanner Summary" },
  { id: "risk_review", label: "Risk Review" },
];
const ASSISTANT_MODE_IDS = new Set(ASSISTANT_MODES.map((mode) => mode.id));

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
  panel.querySelectorAll("[data-perplexity-submit], [data-perplexity-retry], [data-perplexity-regenerate]").forEach((button) => {
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
    [AI_PROVIDER_IDS.PERPLEXITY, "Perplexity Research"],
    [AI_PROVIDER_IDS.OLLAMA, "Local Ollama"],
  ];
  return options.map(([value, label]) =>
    `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`
  ).join("");
}

function panelTemplate(hostId, contextName) {
  const settings = currentSettings();
  const status = settings.enabled && settings.proxyBase ? "WEB-GROUNDED" : settings.ollamaEnabled ? "LOCAL_CONTEXT" : "UNAVAILABLE";
  const providerStatus = providerStatusLabel(settings.provider);
  const isFloatingAssistant = contextName === "ai-lab";
  return `<section class="ytt-perplexity-panel" data-perplexity-instance="${escapeHtml(hostId)}">
    <div class="ytt-perplexity-head">
      <div>
        <div class="ytt-perplexity-title">${isFloatingAssistant ? "YucaTana AI" : "YucaTana AI Research"}</div>
        <div class="ytt-perplexity-subtitle">One assistant, routed through Perplexity for cited research or Local Ollama for context-only reasoning.</div>
      </div>
      <div class="ytt-perplexity-head-actions">
        <span class="ytt-provider-status" data-provider-status="${escapeHtml(settings.provider)}">${providerStatus}</span>
        <span class="ytt-perplexity-status" data-perplexity-quality data-quality="${status}">${status}</span>
        ${isFloatingAssistant ? '<button class="ytt-perplexity-close" type="button" data-ai-panel-close aria-label="Close AI assistant">Close</button>' : ""}
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

function renderMarkdownLite(text) {
  return escapeHtml(text)
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
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
  if (output) {
    output.classList.remove("is-loading");
    output.innerHTML = renderMarkdownLite(answer);
  }
  setQuality(panel, quality);
  if (meta) {
    const stamp = formatTimestamp(result.timestamp);
    const lastRequest = state.lastRequestAt ? formatTimestamp(state.lastRequestAt) : "";
    const latency = Number.isFinite(Number(result.latencyMs)) ? `<span>${Math.round(Number(result.latencyMs))}MS</span>` : "";
    meta.innerHTML = `${provider ? `<span>PROVIDER: ${escapeHtml(provider)}</span>` : ""}${model ? `<span>MODEL: ${escapeHtml(model)}</span>` : ""}<span>DATA QUALITY: ${escapeHtml(quality)}</span><span>${escapeHtml(stamp)}</span>${lastRequest ? `<span>LAST REQUEST ${escapeHtml(lastRequest)}</span>` : ""}${latency}`;
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

function renderOllamaHealthRow(state = {}) {
  const list = document.getElementById("source-health-list");
  if (!list) return;
  const existing = list.querySelector('[data-source-health-key="ollama"]');
  const tone = state.tone || "warn";
  const rowHtml = `<span class="health-dot ${escapeHtml(tone)}"></span>
      <div><div class="source-name">Local Ollama</div><div class="source-detail">${escapeHtml(state.detail || "Local qwen reasoning from supplied YTT data only.")}</div></div>
      <span class="status-chip ${tone === "up" ? "green" : tone === "dn" ? "red" : ""}">${escapeHtml(state.label || "DISABLED")}</span>`;
  if (existing) {
    existing.innerHTML = rowHtml;
    return;
  }
  const row = document.createElement("div");
  row.className = "source-health-row";
  row.dataset.sourceHealthKey = "ollama";
  row.innerHTML = rowHtml;
  list.appendChild(row);
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
  if (!settings.enabled) {
    updateOutput(panel, { answer: "Perplexity research is disabled in Settings.", provider: "PERPLEXITY", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    updateSourceHealth("DISABLED", "Perplexity AI is disabled in Settings.");
    if (providerSelection !== AI_PROVIDER_IDS.PERPLEXITY && settings.ollamaEnabled) {
      updateOutput(panel, { answer: "Perplexity is disabled; Local Ollama remains available when selected.", provider: "OLLAMA", model: settings.ollamaModel, dataQuality: "LOCAL_CONTEXT", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    } else {
      return;
    }
  }
  Object.assign(state, { query, mode, contextName, lastRequestAt: now, lastRequestKey: key, inFlight: true });
  if (output) {
    output.classList.add("is-loading");
    output.textContent = providerSelection === AI_PROVIDER_IDS.OLLAMA ? "Running local context-only reasoning..." : "Routing AI research...";
  }
  setBusy(panel, true);
  try {
    const yttContext = buildPerplexityContext(getAppState(contextName, query));
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
    updateOutput(panel, { answer: classified.message, provider: isLocalError ? "OLLAMA" : "PERPLEXITY", model: isLocalError ? settings.ollamaModel : "", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
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
      <div class="ytt-perplexity-actions"><button class="ytt-perplexity-btn" type="button" id="save-perplexity-settings">Save AI Settings</button><button class="ytt-perplexity-btn" type="button" id="test-perplexity-settings">Check Proxy Health</button><button class="ytt-perplexity-btn" type="button" id="test-ollama-settings">Test Ollama</button></div>
    </div>`;
  host.querySelector("#perplexity-verbosity").value = settings.verbosity;
  host.querySelector("#perplexity-length").value = settings.responseLength;
  host.querySelector("#ollama-provider-mode").value = settings.ollamaProviderMode;
  host.querySelector("#save-perplexity-settings")?.addEventListener("click", saveSettings);
  host.querySelector("#test-perplexity-settings")?.addEventListener("click", refreshHealth);
  host.querySelector("#test-ollama-settings")?.addEventListener("click", () => refreshOllamaHealth({ test: true }));
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
  const mainProxy = document.getElementById("input-api-proxy");
  if (mainProxy) mainProxy.value = proxy;
  document.querySelectorAll("[data-perplexity-panel]").forEach((host) => {
    delete host.dataset.perplexityBound;
  });
  mountAll();
  refreshHealth();
  refreshOllamaHealth({ test: false });
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
window.YTTUnifiedAI = { open: () => setUnifiedAssistantOpen(true), close: () => setUnifiedAssistantOpen(false), toggle: toggleUnifiedAssistant };
window.addEventListener("ytt:source-health-refresh", refreshHealth);
window.addEventListener("ytt:source-health-refresh", () => refreshOllamaHealth({ test: false }));
document.addEventListener("DOMContentLoaded", () => {
  mountAll();
  refreshHealth();
  refreshOllamaHealth({ test: false });
  const observerRoot = document.body || document.documentElement;
  if (observerRoot) {
    new MutationObserver(scheduleMount).observe(observerRoot, { childList: true, subtree: true });
  }
});
