import { createPerplexityClient } from "../../../services/ai/perplexityClient.js";
import { buildPerplexityContext, inferTickerFromQuery } from "../../../services/ai/contextBuilder.js";
import { PERPLEXITY_RESEARCH_MODES, DEFAULT_PERPLEXITY_MODE } from "../../../services/ai/perplexityModes.js";

const SETTINGS = {
  enabled: "PERPLEXITY_ENABLED",
  mode: "PERPLEXITY_RESEARCH_MODE",
  verbosity: "PERPLEXITY_VERBOSITY",
  length: "PERPLEXITY_RESPONSE_LENGTH",
  proxy: "API_PROXY_BASE",
};

const CLIENT_COOLDOWN_MS = 5000;
const MAX_QUERY_LENGTH = 4000;
const panelState = new Map();

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

function getProxyBase() {
  return (localStorage.getItem(SETTINGS.proxy) || "").trim().replace(/\/+$/, "");
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
    mode: localStorage.getItem(SETTINGS.mode) || DEFAULT_PERPLEXITY_MODE,
    verbosity: localStorage.getItem(SETTINGS.verbosity) || "balanced",
    responseLength: localStorage.getItem(SETTINGS.length) || "medium",
    enabled: isEnabled(),
    proxyBase: getProxyBase(),
  };
}

function modeOptions(selected = DEFAULT_PERPLEXITY_MODE) {
  return PERPLEXITY_RESEARCH_MODES.map((mode) =>
    `<option value="${escapeHtml(mode.id)}"${mode.id === selected ? " selected" : ""}>${escapeHtml(mode.label)}</option>`
  ).join("");
}

function panelTemplate(hostId, contextName) {
  const settings = currentSettings();
  const status = settings.enabled ? settings.proxyBase ? "WEB-GROUNDED" : "UNAVAILABLE" : "UNAVAILABLE";
  return `<section class="ytt-perplexity-panel" data-perplexity-instance="${escapeHtml(hostId)}">
    <div class="ytt-perplexity-head">
      <div>
        <div class="ytt-perplexity-title">Perplexity Finance Research</div>
        <div class="ytt-perplexity-subtitle">Context-aware research for ${escapeHtml(contextName === "ai-lab" ? "AI Lab" : contextName)}. Routes through API_PROXY_BASE only.</div>
      </div>
      <span class="ytt-perplexity-status" data-perplexity-quality data-quality="${status}">${status}</span>
    </div>
    <form class="ytt-perplexity-form" data-perplexity-form>
      <div class="ytt-perplexity-mode-row">
        <select class="ytt-perplexity-mode" data-perplexity-mode aria-label="Research mode">${modeOptions(settings.mode)}</select>
        <button class="ytt-perplexity-btn" type="button" data-perplexity-retry>Retry</button>
      </div>
      <div class="ytt-perplexity-query-row">
        <input class="ytt-perplexity-input" data-perplexity-query placeholder="Ask Perplexity Finance..." autocomplete="off">
        <button class="ytt-perplexity-btn" type="submit" data-perplexity-submit>Ask</button>
      </div>
    </form>
    <div class="ytt-perplexity-output" data-perplexity-output>${settings.proxyBase ? "Ask a finance question to start web-grounded research." : "Perplexity proxy not configured."}</div>
    <div class="ytt-perplexity-meta" data-perplexity-meta>
      <span>${settings.enabled ? "ENABLED" : "DISABLED"}</span>
      <span>${settings.proxyBase ? "PROXY READY" : "PROXY REQUIRED"}</span>
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
  if (output) {
    output.classList.remove("is-loading");
    output.innerHTML = renderMarkdownLite(answer);
  }
  setQuality(panel, quality);
  if (meta) {
    const stamp = formatTimestamp(result.timestamp);
    const lastRequest = state.lastRequestAt ? formatTimestamp(state.lastRequestAt) : "";
    const latency = Number.isFinite(Number(result.latencyMs)) ? `<span>${Math.round(Number(result.latencyMs))}MS</span>` : "";
    meta.innerHTML = `<span>${escapeHtml(quality)}</span><span>${escapeHtml(stamp)}</span>${lastRequest ? `<span>LAST REQUEST ${escapeHtml(lastRequest)}</span>` : ""}${latency}`;
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
    citations.innerHTML = links.length ? links.join("") : "<span>No citations returned.</span>";
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

function classifyClientError(error) {
  switch (error?.code) {
    case "PROXY_REQUIRED":
      return { status: "PROXY REQUIRED", message: "Perplexity proxy not configured. Set API_PROXY_BASE in Settings/Admin." };
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
    default:
      return { status: "FAILED", message: error?.message || "Perplexity research unavailable — retrying." };
  }
}

async function ask(panel, contextName, forceQuery = "") {
  const settings = currentSettings();
  const input = panel.querySelector("[data-perplexity-query]");
  const mode = panel.querySelector("[data-perplexity-mode]")?.value || settings.mode;
  const query = (forceQuery || input?.value || "").trim();
  const output = panel.querySelector("[data-perplexity-output]");
  const state = getPanelState(panel);
  if (!query) {
    setLocalNotice(panel, "DEGRADED", "Enter a Perplexity Finance question before asking.");
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
  const key = requestKey(query, mode, contextName);
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
  if (!settings.enabled) {
    updateOutput(panel, { answer: "Perplexity research is disabled in Settings.", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    updateSourceHealth("DISABLED", "Perplexity AI is disabled in Settings.");
    return;
  }
  if (!settings.proxyBase) {
    updateOutput(panel, { answer: "Perplexity proxy not configured.", dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    updateSourceHealth("PROXY REQUIRED", "Set API_PROXY_BASE before using Perplexity. Keys must remain server-side.");
    return;
  }
  Object.assign(state, { query, mode, contextName, lastRequestAt: now, lastRequestKey: key, inFlight: true });
  if (output) {
    output.classList.add("is-loading");
    output.textContent = "Scanning web-grounded finance sources...";
  }
  setBusy(panel, true);
  try {
    const yttContext = buildPerplexityContext(getAppState(contextName, query));
    const selected = yttContext.selectedAsset || {};
    const client = createPerplexityClient({ proxyBase: settings.proxyBase, timeoutMs: settings.responseLength === "long" ? 26000 : 18000 });
    const started = Date.now();
    const result = await client.askFinance({
      query,
      mode,
      ticker: selected.symbol || inferTickerFromQuery(query),
      assetType: selected.assetType || contextName,
      selectedTab: yttContext.selectedTab,
      watchlist: yttContext.watchlist,
      marketContext: {
        ...yttContext.marketContext,
        verbosity: settings.verbosity,
        responseLength: settings.responseLength,
      },
      scannerContext: yttContext.scannerContext,
    });
    result.latencyMs = result.latencyMs || Date.now() - started;
    state.lastCompletedAt = Date.now();
    state.lastSuccessAt = result.timestamp || new Date().toISOString();
    state.lastFailureReason = "";
    updateOutput(panel, result);
    updateSourceHealth("CONNECTED", `Last success ${new Date(result.timestamp).toLocaleString()}.`, result.latencyMs, result.timestamp);
  } catch (error) {
    const classified = classifyClientError(error);
    state.lastFailureReason = classified.message;
    updateOutput(panel, { answer: classified.message, dataQuality: "UNAVAILABLE", timestamp: new Date().toISOString(), citations: [], tickers: [] });
    updateSourceHealth(classified.status, `Last failure: ${classified.message}`);
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
      <div class="ytt-perplexity-actions"><button class="ytt-perplexity-btn" type="button" id="save-perplexity-settings">Save AI Settings</button><button class="ytt-perplexity-btn" type="button" id="test-perplexity-settings">Check Proxy Health</button></div>
    </div>`;
  host.querySelector("#perplexity-verbosity").value = settings.verbosity;
  host.querySelector("#perplexity-length").value = settings.responseLength;
  host.querySelector("#save-perplexity-settings")?.addEventListener("click", saveSettings);
  host.querySelector("#test-perplexity-settings")?.addEventListener("click", refreshHealth);
}

function saveSettings() {
  const enabled = document.getElementById("perplexity-enabled")?.value || "true";
  const proxy = document.getElementById("input-perplexity-proxy")?.value?.trim() || "";
  localStorage.setItem(SETTINGS.enabled, enabled);
  localStorage.setItem(SETTINGS.proxy, proxy);
  localStorage.setItem(SETTINGS.verbosity, document.getElementById("perplexity-verbosity")?.value || "balanced");
  localStorage.setItem(SETTINGS.length, document.getElementById("perplexity-length")?.value || "medium");
  localStorage.setItem(SETTINGS.mode, document.getElementById("perplexity-default-mode")?.value || DEFAULT_PERPLEXITY_MODE);
  const mainProxy = document.getElementById("input-api-proxy");
  if (mainProxy) mainProxy.value = proxy;
  document.querySelectorAll("[data-perplexity-panel]").forEach((host) => {
    delete host.dataset.perplexityBound;
  });
  mountAll();
  refreshHealth();
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

function mountAll() {
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
window.addEventListener("ytt:source-health-refresh", refreshHealth);
document.addEventListener("DOMContentLoaded", () => {
  mountAll();
  refreshHealth();
  const observerRoot = document.body || document.documentElement;
  if (observerRoot) {
    new MutationObserver(scheduleMount).observe(observerRoot, { childList: true, subtree: true });
  }
});
