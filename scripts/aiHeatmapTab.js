import { runAIHeatmapScan } from "../services/marketData/aiHeatmapScanEngine.js";
import {
  changeIntensity,
  compactPercent,
  compactPrice,
  tradingViewSymbolFor,
} from "../services/marketData/aiHeatmapDataService.js";

const state = {
  mode: localStorage.getItem("AI_HEATMAP_DEFAULT_MODE") || "crypto",
  colorMode: "change",
  rows: [],
  sortedRows: [],
  selectedSymbol: "",
  expandedSymbol: "",
  selectedRow: null,
  topMovers: [],
  scanTimestamp: "",
  dataQuality: "UNAVAILABLE",
  source: "Unavailable",
  warnings: [],
  scanning: false,
  tvWidget: null,
};

const SCAN_STAGES = {
  crypto: [
    "Opening digital asset data bus",
    "CoinGecko market snapshot",
    "Binance liquidity sweep",
    "TradingView context",
    "RSI / MACD / VWAP",
    "Momentum model",
    "Heatmap rebuild",
  ],
  stocks: [
    "Opening equity data bus",
    "MooMoo/Finnhub quote lane",
    "Alpha Vantage indicators if available",
    "TradingView context",
    "RSI / MACD / VWAP",
    "Volume anomaly model",
    "Heatmap rebuild",
  ],
};

function $(selector, root = document) {
  return root.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function fmtNumber(value, options = {}) {
  if (!finite(value)) return "Unavailable";
  return Intl.NumberFormat("en-US", options).format(Number(value));
}

function fmtCompact(value) {
  if (!finite(value)) return "Unavailable";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(Number(value));
}

function fmtTime(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function pctClass(value) {
  return Number(value) < 0 ? "is-down" : "";
}

function qualityClass(value = "") {
  const clean = String(value).toUpperCase();
  if (["LIVE", "READY", "CONNECTED"].includes(clean)) return "good";
  if (["UNAVAILABLE", "ERROR", "FAILED"].includes(clean)) return "bad";
  return "warn";
}

function stockSettings() {
  return {
    apiProxyBase: (localStorage.getItem("API_PROXY_BASE") || "").trim().replace(/\/+$/, ""),
    finnhubKey: localStorage.getItem("FINNHUB_KEY") || localStorage.getItem("FINNHUB_API_KEY") || "",
    moomoo: {
      enabled: localStorage.getItem("MOOMOO_OPEND_ENABLED") === "true",
      bridgeUrl: localStorage.getItem("MOOMOO_BRIDGE_URL") || "http://127.0.0.1:8765",
      primaryStocks: localStorage.getItem("MOOMOO_PRIMARY_STOCK_DATA") === "true",
      optionsEnabled: localStorage.getItem("MOOMOO_OPTIONS_DATA_ENABLED") === "true",
    },
  };
}

function appStockQuotes() {
  try {
    return typeof window.buildAIContext === "function" ? window.buildAIContext()?.stockQuotes || {} : {};
  } catch {
    return {};
  }
}

function appSourceHealth() {
  try {
    return window.YTTSourceHealth?.get?.() || {};
  } catch {
    return {};
  }
}

function compactContextRow(row = {}) {
  return {
    symbol: row.symbol,
    name: row.name,
    assetType: row.assetType,
    provider: row.provider,
    fallbackUsed: row.fallbackUsed,
    price: row.price,
    changePct: row.changePct,
    volume: row.volume,
    marketCap: row.marketCap,
    rsi: row.rsi,
    rsiState: row.rsiState,
    macdSignal: row.macdSignal,
    support: row.support,
    resistance: row.resistance,
    vwap: row.vwap,
    momentum: row.momentum,
    strength: row.strength,
    riskRewardRatio: row.riskRewardRatio,
    decision: row.decision,
    setupScore: row.setupScore,
    rating: row.rating,
    dataQuality: row.dataQuality,
    supportResistanceLabel: row.supportResistanceLabel,
    timestamp: row.timestamp,
    missingFields: row.missingFields,
  };
}

function getSelectedRow() {
  return state.rows.find((row) => row.symbol === state.selectedSymbol) || state.selectedRow || state.rows[0] || null;
}

function setSourceHealthFromState() {
  const tone = state.dataQuality === "UNAVAILABLE" ? "dn" : state.dataQuality === "PARTIAL" ? "warn" : "up";
  window.YTTSourceHealth?.set?.("aiheatmap-engine", {
    tone,
    label: state.dataQuality === "UNAVAILABLE" ? "UNAVAILABLE" : "READY",
    detail: `${state.mode.toUpperCase()} scan: ${state.rows.filter((row) => row.price != null).length}/${state.rows.length} rows hydrated.`,
  });
  window.YTTSourceHealth?.set?.("aiheatmap-technical", {
    tone: state.rows.some((row) => finite(row.rsi) || row.support != null) ? "up" : "warn",
    label: state.rows.some((row) => finite(row.rsi) || row.support != null) ? "READY" : "PARTIAL",
    detail: "RSI/MACD render only when enough series data exists; day-range levels are labeled provisional.",
  });
  window.YTTSourceHealth?.set?.("aiheatmap-tradingview", {
    tone: window.TradingView ? "up" : "warn",
    label: window.TradingView ? "CONNECTED" : "UNAVAILABLE",
    detail: window.TradingView ? "TradingView advanced chart library is available." : "TradingView script is still loading or blocked.",
  });
  window.YTTSourceHealth?.set?.(`aiheatmap-${state.mode === "stocks" ? "stock" : "crypto"}`, {
    tone,
    label: state.dataQuality,
    detail: `${state.source || "Provider route"} feeding AIheatmap ${state.mode}.`,
  });
}

function renderRoot() {
  const root = $("#tab-aiheatmap");
  if (!root) return;
  const modeLabel = state.mode === "stocks" ? "Stocks" : "Crypto";
  const modeCopy = state.mode === "stocks"
    ? "Stock-only heatmap. MooMoo/Finnhub rows stay unavailable until a visible manual scan is triggered."
    : "Crypto-only heatmap. CoinGecko/Binance rows stay unavailable until a visible manual scan is triggered.";
  root.innerHTML = `
    <div class="ytt-aiheatmap-shell">
      <section class="ytt-aiheatmap-hero" aria-label="AI Heatmap Intelligence">
        <div>
          <div class="ytt-aiheatmap-kicker">Market Terminal / AI Heatmap</div>
          <h1 class="ytt-aiheatmap-title">AI Heatmap Intelligence</h1>
          <p class="ytt-aiheatmap-subtitle">Stocks + crypto scanner with TradingView, RSI, MACD, support/resistance, VWAP context, and Market Brain decision support. Missing technicals stay labeled unavailable.</p>
        </div>
        <div class="ytt-aiheatmap-actions">
          <div class="ytt-aiheatmap-mode-toggle" role="tablist" aria-label="AIheatmap internal tabs">
            <button class="ytt-aiheatmap-toggle" type="button" role="tab" data-aih-mode="crypto">Crypto</button>
            <button class="ytt-aiheatmap-toggle" type="button" role="tab" data-aih-mode="stocks">Stocks</button>
          </div>
          <button id="aiheatmap-scan-now" class="ytt-aiheatmap-scan-button" type="button">
            <span>SCAN NOW</span>
            <small>${escapeHtml(modeLabel)} heatmap refresh</small>
          </button>
          <div class="ytt-aiheatmap-status-pills">
            <span class="ytt-aiheatmap-pill"><strong>Stocks</strong> MooMoo/Finnhub</span>
            <span class="ytt-aiheatmap-pill"><strong>Crypto</strong> CoinGecko/Binance</span>
            <span class="ytt-aiheatmap-pill"><strong>TradingView</strong> RSI/MACD</span>
            <span class="ytt-aiheatmap-pill"><strong>Data Quality</strong> <span id="aiheatmap-quality-pill">${escapeHtml(state.dataQuality)}</span></span>
            <span class="ytt-aiheatmap-pill"><strong>Live Trading</strong> Disabled</span>
          </div>
        </div>
      </section>

      <section class="ytt-aiheatmap-subtab-head" aria-live="polite">
        <div>
          <div class="ytt-aiheatmap-card-kicker">${escapeHtml(modeLabel)} Subtab</div>
          <h2>${escapeHtml(modeLabel)} Heatmap</h2>
          <p>${escapeHtml(modeCopy)}</p>
        </div>
        <span class="ytt-aiheatmap-symbol-badge">${escapeHtml(state.mode.toUpperCase())}</span>
      </section>

      <div class="ytt-aiheatmap-terminal">
        <section class="ytt-aiheatmap-heatmap-card">
          <div class="ytt-aiheatmap-heatmap-toolbar">
            <div>
              <div class="ytt-aiheatmap-card-kicker">${escapeHtml(modeLabel.toUpperCase())} TRADINGVIEW-STYLE HEATMAP</div>
              <div class="ytt-aiheatmap-name" id="aiheatmap-last-scan">Last scan: ${escapeHtml(fmtTime(state.scanTimestamp))}</div>
            </div>
            <div class="ytt-aiheatmap-color-toggle" aria-label="Heatmap color mode">
              <button class="ytt-aiheatmap-color-btn" type="button" data-aih-color="change">Change</button>
              <button class="ytt-aiheatmap-color-btn" type="button" data-aih-color="volume">Volume</button>
              <button class="ytt-aiheatmap-color-btn" type="button" data-aih-color="volatility">Volatility</button>
            </div>
          </div>
          <div id="aiheatmap-grid" class="ytt-aiheatmap-heatmap-grid"></div>
          <div id="aiheatmap-expanded-slot" class="ytt-aiheatmap-expanded-slot"></div>
        </section>

        <section class="ytt-aiheatmap-chart-card">
          <div class="ytt-aiheatmap-panel-header">
            <span>TRADINGVIEW PRICE / RSI / MACD</span>
            <span id="aiheatmap-tv-symbol" class="ytt-aiheatmap-symbol-badge">AWAITING SCAN</span>
          </div>
          <div id="aiheatmap-tv-frame" class="ytt-aiheatmap-tv-frame"><div class="ytt-aiheatmap-tv-empty">Run Scan Now to load the TradingView chart.</div></div>
        </section>

        <aside id="aiheatmap-detail-panel" class="ytt-aiheatmap-detail-panel"></aside>

        <section id="aiheatmap-scan-console" class="ytt-aiheatmap-scan-console">
          <div class="ytt-aiheatmap-panel-header">
            <span>SCAN CONSOLE</span>
            <span class="ytt-aiheatmap-quality-badge">IDLE</span>
          </div>
          <div id="aiheatmap-console-steps" class="ytt-aiheatmap-console-steps"></div>
        </section>
      </div>
    </div>
  `;
}

function bind() {
  $("#tab-aiheatmap")?.addEventListener("click", (event) => {
    if (event.target.closest("#aiheatmap-scan-now")) {
      scanNow();
      return;
    }

    const modeButton = event.target.closest("[data-aih-mode]");
    if (modeButton) {
      state.mode = modeButton.dataset.aihMode || "crypto";
      localStorage.setItem("AI_HEATMAP_DEFAULT_MODE", state.mode);
      state.rows = [];
      state.sortedRows = [];
      state.selectedSymbol = "";
      state.selectedRow = null;
      state.expandedSymbol = "";
      state.topMovers = [];
      state.scanTimestamp = "";
      state.dataQuality = "UNAVAILABLE";
      state.source = "Unavailable";
      state.warnings = [];
      renderRoot();
      updateModeButtons();
      updateColorButtons();
      setConsoleStage({ index: -1 });
      renderDetail();
      renderHeatmap();
      publishSelectionContext();
      return;
    }

    const colorButton = event.target.closest("[data-aih-color]");
    if (colorButton) {
      state.colorMode = colorButton.dataset.aihColor || "change";
      updateColorButtons();
      renderHeatmap();
      return;
    }

    const cell = event.target.closest("[data-aih-symbol]");
    if (cell) {
      selectSymbol(cell.dataset.aihSymbol);
      return;
    }

    if (event.target.closest("[data-aih-deep-dive]")) {
      const row = getSelectedRow();
      if (row) {
        state.expandedSymbol = state.expandedSymbol === row.symbol ? "" : row.symbol;
        renderHeatmap();
      }
      return;
    }

    const expandedMinimize = event.target.closest("[data-aih-minimize]");
    if (expandedMinimize) {
      state.expandedSymbol = "";
      renderHeatmap();
    }
  });
}

function updateModeButtons() {
  document.querySelectorAll("[data-aih-mode]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.aihMode === state.mode);
  });
}

function updateColorButtons() {
  document.querySelectorAll("[data-aih-color]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.aihColor === state.colorMode);
  });
}

function setConsoleStage(stageInfo = {}) {
  const stages = SCAN_STAGES[state.mode] || SCAN_STAGES.crypto;
  const activeIndex = stageInfo.index ?? -1;
  const target = $("#aiheatmap-console-steps");
  const badge = $("#aiheatmap-scan-console .ytt-aiheatmap-quality-badge");
  if (badge) badge.textContent = state.scanning ? "SCANNING" : state.dataQuality;
  if (!target) return;
  target.innerHTML = stages.map((stage, index) => {
    const className = index < activeIndex ? "is-done" : index === activeIndex ? "is-active" : "";
    const status = index < activeIndex ? "DONE" : index === activeIndex ? "RUNNING" : "PENDING";
    return `<div class="ytt-aiheatmap-console-step ${className}">
      <span>${escapeHtml(stage)}</span><strong>${status}</strong>
    </div>`;
  }).join("");
}

function setLoadingState() {
  const grid = $("#aiheatmap-grid");
  if (grid) grid.innerHTML = `<div class="ytt-aiheatmap-empty">Scanning ${escapeHtml(state.mode)} providers. Provider failures will be labeled, not fabricated.</div>`;
  const detail = $("#aiheatmap-detail-panel");
  if (detail) detail.innerHTML = `<div class="ytt-aiheatmap-detail-scroll"><div class="ytt-aiheatmap-empty">Selected ticker panel awaiting scan data.</div></div>`;
}

async function scanNow() {
  if (state.scanning) return;
  state.scanning = true;
  state.warnings = [];
  state.rows = [];
  state.sortedRows = [];
  state.expandedSymbol = "";
  setLoadingState();
  setConsoleStage({ index: 0 });

  try {
    const scan = await runAIHeatmapScan({
      mode: state.mode,
      settings: stockSettings(),
      stockQuotes: appStockQuotes(),
      sourceHealth: appSourceHealth(),
      stageDelayMs: 105,
      onStage: setConsoleStage,
    });
    state.rows = scan.rows || [];
    state.sortedRows = scan.sortedRows || scan.rows || [];
    state.selectedRow = scan.selectedRow || state.sortedRows[0] || null;
    state.selectedSymbol = state.selectedRow?.symbol || "";
    state.topMovers = scan.topMovers || [];
    state.scanTimestamp = scan.timestamp || new Date().toISOString();
    state.dataQuality = scan.dataQuality || "UNAVAILABLE";
    state.source = scan.source || "Unavailable";
    state.warnings = scan.warnings || [];
    renderAll();
  } catch (error) {
    state.dataQuality = "UNAVAILABLE";
    state.warnings = [error.message || "AIheatmap scan failed."];
    renderAll();
  } finally {
    state.scanning = false;
    setConsoleStage({ index: SCAN_STAGES[state.mode].length });
    setSourceHealthFromState();
  }
}

function renderAll() {
  updateModeButtons();
  updateColorButtons();
  $("#aiheatmap-quality-pill") && ($("#aiheatmap-quality-pill").textContent = state.dataQuality);
  $("#aiheatmap-last-scan") && ($("#aiheatmap-last-scan").textContent = `Last scan: ${fmtTime(state.scanTimestamp)}`);
  renderDetail();
  renderHeatmap();
  const selected = getSelectedRow();
  if (selected) {
    renderTradingView(selected);
  } else {
    const frame = $("#aiheatmap-tv-frame");
    const badge = $("#aiheatmap-tv-symbol");
    if (badge) badge.textContent = "AWAITING SCAN";
    if (frame) frame.innerHTML = `<div class="ytt-aiheatmap-tv-empty">Run Scan Now to load the ${state.mode === "stocks" ? "stock" : "crypto"} TradingView chart.</div>`;
  }
}

function selectSymbol(symbol = "") {
  const row = state.rows.find((item) => item.symbol === symbol);
  if (!row) return;
  const sameExpanded = state.expandedSymbol === symbol && state.selectedSymbol === symbol;
  state.selectedSymbol = symbol;
  state.selectedRow = row;
  state.expandedSymbol = sameExpanded ? "" : symbol;
  renderDetail();
  renderHeatmap();
  renderTradingView(row);
  publishSelectionContext(row);
}

function publishSelectionContext(row = getSelectedRow()) {
  window.dispatchEvent(new CustomEvent("ytt:aiheatmap-select", {
    detail: {
      mode: state.mode,
      selectedAIHeatmapMode: state.mode,
      selectedAIHeatmapSymbol: row?.symbol || "",
      row: row ? compactContextRow(row) : null,
      assetType: state.mode === "stocks" ? "stock" : "crypto",
    },
  }));
}

function renderTradingView(row) {
  const frame = $("#aiheatmap-tv-frame");
  const badge = $("#aiheatmap-tv-symbol");
  if (!frame) return;
  const symbol = row ? tradingViewSymbolFor(row) : "BINANCE:BTCUSDT";
  if (badge) badge.textContent = symbol;
  frame.innerHTML = `<div id="aiheatmap-tv-widget"></div>`;
  if (!window.TradingView) {
    frame.innerHTML = `<div class="ytt-aiheatmap-tv-empty">TradingView script unavailable. Chart will load when the CDN is reachable.</div>`;
    return;
  }
  try {
    state.tvWidget?.remove?.();
  } catch {
    // TradingView widgets do not always expose remove().
  }
  try {
    state.tvWidget = new window.TradingView.widget({
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      withdateranges: true,
      hide_side_toolbar: false,
      studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
      container_id: "aiheatmap-tv-widget",
    });
  } catch (error) {
    frame.innerHTML = `<div class="ytt-aiheatmap-tv-empty">TradingView failed to initialize: ${escapeHtml(error.message)}</div>`;
  }
}

function renderDetail() {
  const target = $("#aiheatmap-detail-panel");
  if (!target) return;
  const row = getSelectedRow();
  if (!row) {
    target.innerHTML = `<div class="ytt-aiheatmap-detail-scroll"><div class="ytt-aiheatmap-empty">Run Scan Now to populate the right-side selected ticker detail panel.</div></div>`;
    return;
  }
  const quality = row.dataQuality || "UNAVAILABLE";
  target.innerHTML = `
    <div class="ytt-aiheatmap-panel-header">
      <span>SELECTED TICKER DETAIL</span>
      <span class="ytt-aiheatmap-quality-badge">${escapeHtml(quality)}</span>
    </div>
    <div class="ytt-aiheatmap-detail-scroll">
      ${state.warnings.length ? `<div class="ytt-aiheatmap-warning">${state.warnings.map(escapeHtml).join("<br>")}</div>` : ""}
      <div class="ytt-aiheatmap-detail-title">
        <div class="ytt-aiheatmap-detail-symbol">${escapeHtml(row.displaySymbol || row.symbol)}</div>
        <div class="ytt-aiheatmap-change ${pctClass(row.changePct)}">${escapeHtml(compactPercent(row.changePct))}</div>
      </div>
      <div class="ytt-aiheatmap-name">${escapeHtml(row.name || row.symbol)} / ${escapeHtml(row.sectorOrCategory || row.assetType)} / ${escapeHtml(row.provider || "Unavailable")}</div>
      <div class="ytt-aiheatmap-chip-row">
        <span class="ytt-aiheatmap-chip ${qualityClass(row.dataQuality)}">${escapeHtml(row.dataQuality || "UNAVAILABLE")}</span>
        <span class="ytt-aiheatmap-chip warn">${escapeHtml(row.decision || "NEUTRAL / WAIT FOR CONFIRMATION")}</span>
        <span class="ytt-aiheatmap-chip">${escapeHtml(row.rating || "WATCH")}</span>
        <button class="ytt-aiheatmap-small-btn" type="button" data-aih-deep-dive>Deep Dive</button>
      </div>
      <div class="ytt-aiheatmap-metric-grid">
        ${metric("Price", compactPrice(row.price))}
        ${metric(row.assetType === "crypto" ? "Market Cap" : "Previous Close", row.assetType === "crypto" ? fmtCompact(row.marketCap) : compactPrice(row.previousClose))}
        ${metric("Volume", fmtCompact(row.volume))}
        ${metric(row.assetType === "crypto" ? "Circulating Supply" : "Range", row.assetType === "crypto" ? fmtCompact(row.circulatingSupply) : rangeText(row))}
        ${metric("Range", rangeText(row))}
        ${metric("Relative Strength", scoreText(row.relativeStrength))}
      </div>
      <div class="ytt-aiheatmap-mini-chart">${renderChartSvg(row, { height: 154, compact: true })}</div>
      <div class="ytt-aiheatmap-desk-read">${escapeHtml(row.deskRead || "Desk read unavailable from supplied data.")}</div>
      <div class="ytt-aiheatmap-metric-grid">
        ${metric("RSI", row.rsi == null ? "Unavailable" : `${row.rsi} / ${row.rsiState}`)}
        ${metric("MACD", row.macdSignal || "Unavailable")}
        ${metric("VWAP", row.vwap == null ? "Unavailable" : compactPrice(row.vwap))}
        ${metric("Volume", fmtCompact(row.volume))}
        ${metric("Momentum", scoreText(row.momentum))}
        ${metric("Volatility", scoreText(row.volatility))}
        ${metric("Peer Avg", "Unavailable")}
        ${metric("Benchmark", "Unavailable")}
        ${metric("Sentiment", row.sentiment || "Unavailable")}
        ${metric("R/R", row.riskRewardRatio == null ? "Unavailable" : `${row.riskRewardRatio}:1`)}
      </div>
    </div>
  `;
}

function metric(label, value) {
  return `<div class="ytt-aiheatmap-metric"><label>${escapeHtml(label)}</label><strong>${escapeHtml(value)}</strong></div>`;
}

function scoreText(value) {
  return finite(value) ? `${Math.round(Number(value))}/100` : "Unavailable";
}

function rangeText(row = {}) {
  if (finite(row.dayLow) && finite(row.dayHigh)) return `${compactPrice(row.dayLow)} - ${compactPrice(row.dayHigh)}`;
  return "Unavailable";
}

function cellStyle(row = {}) {
  const intensity = changeIntensity(row, state.colorMode);
  const isChange = state.colorMode === "change";
  const positive = !isChange || intensity >= 0;
  const power = isChange ? Math.min(0.78, 0.12 + Math.abs(intensity) * 0.7) : Math.min(0.70, 0.12 + intensity * 0.65);
  const color = positive ? "rgba(0, 233, 154, 0.70)" : "rgba(255, 82, 111, 0.72)";
  const text = positive ? "var(--aih-green)" : "var(--aih-red)";
  return `--cell-power:${power};--cell-color:${color};--cell-text:${text};`;
}

function renderHeatmap() {
  const grid = $("#aiheatmap-grid");
  const slot = $("#aiheatmap-expanded-slot");
  if (!grid || !slot) return;
  if (!state.rows.length) {
    grid.classList.remove("has-selection");
    grid.innerHTML = `<div class="ytt-aiheatmap-empty">${state.mode === "stocks" ? "Stock" : "Crypto"} heatmap unavailable until Scan Now. No ${state.mode === "stocks" ? "crypto assets" : "stock tickers"} are shown in this subtab.</div>`;
    slot.innerHTML = "";
    return;
  }
  const rows = state.sortedRows.length ? state.sortedRows : state.rows;
  grid.classList.toggle("has-selection", Boolean(state.selectedSymbol));
  grid.innerHTML = rows.map((row) => `
    <button class="ytt-aiheatmap-cell ${row.symbol === state.selectedSymbol ? "is-selected" : ""}" type="button" data-aih-symbol="${escapeHtml(row.symbol)}" style="${cellStyle(row)}">
      <strong>${escapeHtml(row.displaySymbol || row.symbol)}</strong>
      <span>${escapeHtml(compactPercent(row.changePct))}</span>
      <small>${escapeHtml(row.sectorOrCategory || row.name || row.assetType)}</small>
    </button>
  `).join("");
  const expanded = state.expandedSymbol ? state.rows.find((row) => row.symbol === state.expandedSymbol) : null;
  slot.innerHTML = expanded ? renderExpanded(expanded) : "";
}

function renderExpanded(row = {}) {
  return `
    <article class="ytt-aiheatmap-expanded-panel">
      <div class="ytt-aiheatmap-expanded-symbol">
        <label>EXPANDED SYMBOL</label>
        <button type="button" data-aih-minimize>${escapeHtml(row.displaySymbol || row.symbol)}</button>
        <div class="ytt-aiheatmap-name">Click symbol again to minimize</div>
      </div>
      <div class="ytt-aiheatmap-expanded-body">
        <div class="ytt-aiheatmap-expanded-title">
          <div>
            <h3>${escapeHtml(row.name || row.symbol)}</h3>
            <div class="ytt-aiheatmap-name">${escapeHtml(row.assetType)} / ${escapeHtml(row.sectorOrCategory || "Unavailable")} / ${escapeHtml(row.provider || "Unavailable")}</div>
          </div>
          <span class="ytt-aiheatmap-change ${pctClass(row.changePct)}">${escapeHtml(compactPercent(row.changePct))}</span>
        </div>
        <div class="ytt-aiheatmap-metric-grid">
          ${metric("Price", compactPrice(row.price))}
          ${metric("Momentum", scoreText(row.momentum))}
          ${metric("Support", row.support == null ? "Unavailable" : compactPrice(row.support))}
          ${metric("Resist", row.resistance == null ? "Unavailable" : compactPrice(row.resistance))}
          ${metric("RSI", row.rsi == null ? "Unavailable" : `${row.rsi} / ${row.rsiState}`)}
          ${metric("MACD", row.macdSignal || "Unavailable")}
          ${metric("Volume", fmtCompact(row.volume))}
          ${metric("Strength", scoreText(row.strength))}
          ${metric("Decision", row.decision || "Unavailable")}
          ${metric("Reward to Resist", row.rewardToResistancePct == null ? "Unavailable" : `${row.rewardToResistancePct}%`)}
          ${metric("Risk to Support", row.riskToSupportPct == null ? "Unavailable" : `${row.riskToSupportPct}%`)}
          ${metric("R/R", row.riskRewardRatio == null ? "Unavailable" : `${row.riskRewardRatio}:1`)}
        </div>
        <div class="ytt-aiheatmap-decision-strip">
          <span class="ytt-aiheatmap-chip ${qualityClass(row.dataQuality)}">${escapeHtml(row.dataQuality || "UNAVAILABLE")}</span>
          <span class="ytt-aiheatmap-chip warn">${escapeHtml(row.supportResistanceLabel || "Support/resistance unavailable")}</span>
          <span class="ytt-aiheatmap-chip">${escapeHtml(row.rating || "WATCH")}</span>
          <span class="ytt-aiheatmap-chip">${escapeHtml(row.setupScore == null ? "Score unavailable" : `Score ${row.setupScore}/100`)}</span>
        </div>
        <div class="ytt-aiheatmap-deep-chart">
          <div class="ytt-aiheatmap-chart-tags"><span>Price</span><span>Volume</span><span>RSI</span><span>MACD</span></div>
          ${renderChartSvg(row, { height: 280 })}
        </div>
        <div class="ytt-aiheatmap-name">${escapeHtml(row.series?.length ? "Chart uses provider sparkline series where available." : "Provisional visual from available data.")}</div>
        <div class="ytt-aiheatmap-thesis-grid">
          ${thesisCard("Why It Has Potential", row.thesis?.potential)}
          ${thesisCard("Why It May Fail", row.thesis?.fail)}
          ${thesisCard("Confirmation Needed", row.thesis?.confirm)}
        </div>
      </div>
    </article>
  `;
}

function thesisCard(title, items = []) {
  const list = Array.isArray(items) && items.length ? items : ["Unavailable from supplied data."];
  return `<div class="ytt-aiheatmap-thesis-card">
    <h4>${escapeHtml(title)}</h4>
    <ul>${list.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </div>`;
}

function chartSeries(row = {}) {
  const series = Array.isArray(row.series) ? row.series.filter(finite).map(Number) : [];
  if (series.length >= 3) return series.slice(-80);
  const values = [row.support, row.dayLow, row.previousClose, row.price, row.dayHigh, row.resistance].filter(finite).map(Number);
  return values.length >= 2 ? values : [];
}

function renderChartSvg(row = {}, { height = 220, compact = false } = {}) {
  const series = chartSeries(row);
  if (series.length < 2) {
    return `<div class="ytt-aiheatmap-empty">Chart unavailable. Provider series or range data is required.</div>`;
  }
  const width = 620;
  const padding = compact ? 16 : 28;
  const min = Math.min(...series, ...(finite(row.support) ? [Number(row.support)] : []));
  const max = Math.max(...series, ...(finite(row.resistance) ? [Number(row.resistance)] : []));
  const span = max - min || 1;
  const points = series.map((value, index) => {
    const x = padding + (index / Math.max(1, series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const supportY = finite(row.support) ? height - padding - ((Number(row.support) - min) / span) * (height - padding * 2) : null;
  const resistanceY = finite(row.resistance) ? height - padding - ((Number(row.resistance) - min) / span) * (height - padding * 2) : null;
  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(row.symbol)} technical chart">
      <defs>
        <linearGradient id="aihLine${escapeHtml(row.symbol)}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#d7b56d" />
          <stop offset="0.55" stop-color="#00e99a" />
          <stop offset="1" stop-color="#7fc8ff" />
        </linearGradient>
      </defs>
      ${resistanceY == null ? "" : `<line x1="${padding}" x2="${width - padding}" y1="${resistanceY}" y2="${resistanceY}" stroke="rgba(255,82,111,0.65)" stroke-dasharray="5 5" /><text x="${width - padding - 108}" y="${Math.max(14, resistanceY - 7)}" fill="#ff9aae" font-size="10">RESIST ${escapeHtml(compactPrice(row.resistance))}</text>`}
      ${supportY == null ? "" : `<line x1="${padding}" x2="${width - padding}" y1="${supportY}" y2="${supportY}" stroke="rgba(0,233,154,0.65)" stroke-dasharray="5 5" /><text x="${width - padding - 110}" y="${Math.min(height - 7, supportY + 14)}" fill="#8fffd6" font-size="10">SUPPORT ${escapeHtml(compactPrice(row.support))}</text>`}
      <polyline fill="none" stroke="url(#aihLine${escapeHtml(row.symbol)})" stroke-width="${compact ? 3 : 4}" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
      <circle cx="${points.split(" ").at(-1)?.split(",")[0] || width - padding}" cy="${points.split(" ").at(-1)?.split(",")[1] || height / 2}" r="${compact ? 4 : 6}" fill="#ffd87a" />
    </svg>
  `;
}

function mount() {
  if (!$("#tab-aiheatmap")) return;
  renderRoot();
  bind();
  updateModeButtons();
  updateColorButtons();
  setConsoleStage({ index: -1 });
  renderDetail();
  renderHeatmap();
  publishSelectionContext();
}

function ensureReady() {
  if (!$("#tab-aiheatmap")) return;
  renderAll();
}

export function getAIHeatmapContext() {
  const selected = getSelectedRow();
  return {
    selectedAIHeatmapMode: state.mode,
    selectedAIHeatmapSymbol: selected?.symbol || "",
    selectedAIHeatmapRow: selected ? compactContextRow(selected) : null,
    aiHeatmapRows: (state.sortedRows.length ? state.sortedRows : state.rows).slice(0, 30).map(compactContextRow),
    aiHeatmapTopMovers: state.topMovers.slice(0, 8).map(compactContextRow),
    aiHeatmapScanTimestamp: state.scanTimestamp,
    aiHeatmapDataQuality: state.dataQuality,
    aiHeatmapTechnicalContext: selected ? {
      rsi: selected.rsi,
      rsiState: selected.rsiState,
      macdSignal: selected.macdSignal,
      vwap: selected.vwap,
      momentum: selected.momentum,
      strength: selected.strength,
      volatility: selected.volatility,
      riskRewardRatio: selected.riskRewardRatio,
      supportResistanceLabel: selected.supportResistanceLabel,
    } : null,
    aiHeatmapSupportResistance: selected ? {
      support: selected.support,
      resistance: selected.resistance,
      rewardToResistancePct: selected.rewardToResistancePct,
      riskToSupportPct: selected.riskToSupportPct,
      source: selected.supportResistanceSource,
      label: selected.supportResistanceLabel,
    } : null,
    aiHeatmapProviderMetadata: {
      source: state.source,
      warnings: state.warnings,
      mode: state.mode,
      rowCount: state.rows.length,
    },
  };
}

window.YTTAIHeatmap = {
  mount,
  scanNow,
  ensureReady,
  getContext: getAIHeatmapContext,
  selectSymbol,
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
