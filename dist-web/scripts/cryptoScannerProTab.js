import { runCryptoScannerProScan } from "../services/crypto/cryptoScannerProService.js";
import {
  binancePairForSymbol,
  CRYPTO_CATEGORY_MAP,
  normalizeCryptoScannerSymbol,
} from "../services/crypto/cryptoScannerSignals.js";

const TIMEFRAMES = [
  ["1m", "1"],
  ["5m", "5"],
  ["15m", "15"],
  ["1H", "60"],
  ["4H", "240"],
  ["1D", "D"],
];

const PRESETS = {
  top_movers: { label: "Top Movers", symbolFilter: "", minChange: 2, minVolume: "high" },
  layer_1: { label: "Layer 1s", symbolFilter: "BTC ETH SOL ADA AVAX SUI XRP BNB", minChange: 0, minVolume: "any" },
  defi: { label: "DeFi Picks", symbolFilter: "UNI AAVE LINK CRV MKR INJ", minChange: 0, minVolume: "any" },
  meme: { label: "Meme Coins", symbolFilter: "DOGE SHIB PEPE WIF BONK FLOKI", minChange: 0, minVolume: "any" },
  watchlist: { label: "My Watchlist", symbolFilter: "XRP SUI XLM SOL BTC ETH", minChange: 0, minVolume: "any" },
};

const state = {
  mounted: false,
  scanStarted: false,
  isScanning: false,
  rows: [],
  allRows: [],
  topMovers: [],
  alerts: [],
  categoryHeat: [],
  selectedSymbol: "BTC",
  selectedRow: null,
  lastScanAt: "",
  dataQuality: "UNAVAILABLE",
  providerMetadata: {},
  activeInterval: "60",
  activeSignals: new Set(),
  socket: null,
  socketSymbols: [],
  tvWidget: null,
  clockTimer: null,
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function formatMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  if (Math.abs(number) < 0.01) return `$${number.toLocaleString(undefined, { maximumFractionDigits: 8 })}`;
  if (Math.abs(number) < 1) return `$${number.toLocaleString(undefined, { maximumFractionDigits: 5 })}`;
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPct(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function formatCompact(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(number);
}

function classForChange(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "neutral";
  return number >= 0 ? "up" : "down";
}

function appRoot() {
  return document.querySelector("#tab-crypto .ytt-crypto-scanner-pro");
}

function setSourceHealth(key, tone, label, detail) {
  window.YTTSourceHealth?.set?.(key, { tone, label, detail });
}

function getApiProxyBase() {
  return (localStorage.getItem("API_PROXY_BASE") || "").trim().replace(/\/+$/, "");
}

function renderShell() {
  const root = appRoot();
  if (!root) return;
  root.innerHTML = `
    <div class="yt-header">
      <div class="yt-brand">
        <span class="yt-logo-mark">YT</span>
        <div>
          <div class="yt-kicker">YucaTanaTrades</div>
          <h2>Crypto Scanner Pro</h2>
        </div>
      </div>
      <div class="yt-header-meta">
        <span class="yt-clock" data-crypto-clock>--:--:--</span>
        <span class="yt-live-badge" data-crypto-live-badge>PARTIAL</span>
      </div>
    </div>

    <div class="yt-nav" aria-label="Crypto scanner modes">
      <button class="is-active" type="button">Crypto Scanner</button>
      <button type="button" disabled>Portfolio</button>
      <button type="button" disabled>Alerts</button>
      <button type="button" disabled>Watchlist</button>
    </div>

    <section class="tv-chart-card">
      <div class="tv-chart-head">
        <div>
          <span class="yt-section-label">TradingView Crypto Chart</span>
          <h3 data-crypto-chart-title>BTCUSDT</h3>
          <p>Click any token to load chart. Scanner rows use CoinGecko snapshots with Binance live ticks where available.</p>
        </div>
        <div class="timeframe-row">${TIMEFRAMES.map(([label, interval]) => `<button class="tf-btn${interval === state.activeInterval ? " is-active" : ""}" type="button" data-crypto-interval="${interval}">${label}</button>`).join("")}</div>
      </div>
      <div id="crypto-pro-tv-widget" class="tv-chart-wrap"><div class="crypto-tv-empty">TradingView chart initializing.</div></div>
    </section>

    <div class="scanner-layout">
      <aside class="scanner-panel">
        <div class="yt-card scanner-summary">
          <span class="yt-section-label">Scanner Console</span>
          <h3>Digital Asset Sweep</h3>
          <p>Provider-driven CoinGecko scan with Binance public live-price overlay. Missing data stays unavailable.</p>
          <button id="crypto-scan-now" class="scan-now-btn" type="button">Scan Now</button>
        </div>

        <div class="yt-card">
          <div class="yt-card-head"><h3>Scan Parameters</h3><span class="source-pill">NO EXCHANGE KEYS</span></div>
          <label class="field-row"><span>Symbol Filter</span><input id="crypto-symbol-filter" type="text" placeholder="BTC ETH XLM"></label>
          <label class="field-row"><span>Minimum % Change</span><input id="crypto-min-change" type="range" min="0" max="20" step="0.5" value="0"><strong data-min-change-label>0%</strong></label>
          <label class="field-row"><span>Minimum Volume</span><select id="crypto-min-volume"><option value="any">Any</option><option value="medium">Medium $50M+</option><option value="high">High $250M+</option><option value="very_high">Very High $1B+</option></select></label>
          <div class="signal-buttons" aria-label="Signal filters">
            ${["Breakout", "Momentum", "Surge", "Reversal", "Support", "Overbought"].map((label) => `<button class="signal-filter" type="button" data-signal-filter="${label.toUpperCase()}">${label}</button>`).join("")}
          </div>
        </div>

        <div class="yt-card">
          <div class="yt-card-head"><h3>Quick Presets</h3><span class="source-pill">SAFE</span></div>
          <div class="preset-grid">${Object.entries(PRESETS).map(([key, preset]) => `<button type="button" data-crypto-preset="${key}">${preset.label}</button>`).join("")}</div>
        </div>

        <div class="yt-card session-stats">
          <div class="yt-card-head"><h3>Session Stats</h3><span data-scan-quality class="source-pill">UNAVAILABLE</span></div>
          <div class="stats-grid" id="crypto-session-stats"></div>
        </div>
      </aside>

      <main class="results-column">
        <section class="yt-card results-panel">
          <div class="yt-card-head">
            <div><h3>Scanner Results</h3><p id="crypto-results-summary">Run Scan Now to load provider-driven rows.</p></div>
            <span class="source-pill" id="crypto-results-source">COINGECKO</span>
          </div>
          <div class="results-table-wrap">
            <table class="results-table">
              <thead><tr><th>#</th><th>Symbol</th><th>Price</th><th>24H %</th><th>Volume</th><th>Signal</th><th>Market Cap</th><th>7D Sparkline</th></tr></thead>
              <tbody id="crypto-body"></tbody>
            </table>
          </div>
        </section>

        <div class="side-grid">
          <section class="yt-card">
            <div class="yt-card-head"><h3>Category Heat</h3><span class="source-pill">COMPUTED</span></div>
            <div id="crypto-category-heat" class="category-heat-grid"></div>
          </section>
          <section class="yt-card">
            <div class="yt-card-head"><h3>Top Movers</h3><span class="source-pill">SCAN</span></div>
            <div id="crypto-top-movers" class="movers-list"></div>
          </section>
          <section class="yt-card alerts-card">
            <div class="yt-card-head"><h3>Signal Alerts</h3><span class="source-pill">GENERATED NOW</span></div>
            <div id="crypto-signal-alerts" class="alerts-list"></div>
          </section>
        </div>
      </main>
    </div>

    <div id="binance-status" class="live-price-badge"><span class="status-dot"></span><span>PRICES: BINANCE PARTIAL</span></div>

    <div id="crypto-scan-overlay" class="scan-overlay" hidden>
      <div class="scan-modal">
        <span class="yt-section-label">Scanner Running</span>
        <h3>Opening crypto data bus</h3>
        <p data-scan-stage>Preparing CoinGecko market snapshot.</p>
        <div class="scan-progress"><span data-scan-progress></span></div>
      </div>
    </div>
  `;
  renderEmptyState();
}

function renderEmptyState() {
  const body = document.getElementById("crypto-body");
  if (body) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">Run Scan Now to load CoinGecko scanner rows. No fake crypto data is shown.</td></tr>`;
  }
  renderCategoryHeat([]);
  renderTopMovers([]);
  renderAlerts([]);
  renderStats(null);
}

function bindEvents() {
  const root = appRoot();
  if (!root || root.dataset.bound === "true") return;
  root.dataset.bound = "true";
  root.addEventListener("click", (event) => {
    const scanButton = event.target.closest("#crypto-scan-now");
    if (scanButton) scanNow();

    const signalButton = event.target.closest("[data-signal-filter]");
    if (signalButton) {
      const signal = signalButton.dataset.signalFilter;
      if (state.activeSignals.has(signal)) state.activeSignals.delete(signal);
      else state.activeSignals.add(signal);
      signalButton.classList.toggle("is-active", state.activeSignals.has(signal));
      scanNow();
    }

    const presetButton = event.target.closest("[data-crypto-preset]");
    if (presetButton) {
      applyPreset(presetButton.dataset.cryptoPreset);
      scanNow();
    }

    const intervalButton = event.target.closest("[data-crypto-interval]");
    if (intervalButton) {
      state.activeInterval = intervalButton.dataset.cryptoInterval;
      root.querySelectorAll("[data-crypto-interval]").forEach((button) => button.classList.toggle("is-active", button === intervalButton));
      renderTradingView(state.selectedSymbol);
    }

    const resultRow = event.target.closest("#crypto-body tr[data-symbol]");
    if (resultRow) selectSymbol(resultRow.dataset.symbol);

    const mover = event.target.closest("[data-crypto-mover]");
    if (mover) selectSymbol(mover.dataset.cryptoMover);
  });

  root.addEventListener("input", (event) => {
    if (event.target.id === "crypto-min-change") {
      const label = root.querySelector("[data-min-change-label]");
      if (label) label.textContent = `${event.target.value}%`;
    }
  });
}

function applyPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  const symbolFilter = document.getElementById("crypto-symbol-filter");
  const minChange = document.getElementById("crypto-min-change");
  const minVolume = document.getElementById("crypto-min-volume");
  const minChangeLabel = document.querySelector("[data-min-change-label]");
  if (symbolFilter) symbolFilter.value = preset.symbolFilter;
  if (minChange) minChange.value = String(preset.minChange);
  if (minChangeLabel) minChangeLabel.textContent = `${preset.minChange}%`;
  if (minVolume) minVolume.value = preset.minVolume;
}

function currentFilters() {
  return {
    symbolFilter: document.getElementById("crypto-symbol-filter")?.value || "",
    minChange: Number(document.getElementById("crypto-min-change")?.value || 0),
    minVolume: document.getElementById("crypto-min-volume")?.value || "any",
    signalTypes: [...state.activeSignals],
  };
}

function setOverlay(open, stage = "", progress = 0) {
  const overlay = document.getElementById("crypto-scan-overlay");
  if (!overlay) return;
  overlay.hidden = !open;
  const stageEl = overlay.querySelector("[data-scan-stage]");
  const progressEl = overlay.querySelector("[data-scan-progress]");
  if (stageEl) stageEl.textContent = stage;
  if (progressEl) progressEl.style.width = `${Math.max(4, Math.min(100, progress))}%`;
}

async function scanNow() {
  if (state.isScanning) return;
  state.isScanning = true;
  state.scanStarted = true;
  setOverlay(true, "Opening CoinGecko market snapshot.", 12);
  setSourceHealth("crypto-scanner-pro-ui", "warn", "SCANNING", "Crypto Scanner Pro scan is running.");

  try {
    setOverlay(true, "Fetching top crypto markets.", 34);
    const result = await runCryptoScannerProScan({
      filters: currentFilters(),
      apiProxyBase: getApiProxyBase(),
      storage: localStorage,
      pages: [1, 2],
      limit: 100,
    });
    setOverlay(true, "Classifying momentum and rebuilding tables.", 72);
    state.rows = result.rows;
    state.allRows = result.allRows;
    state.topMovers = result.topMovers;
    state.alerts = result.alerts;
    state.categoryHeat = result.categoryHeat;
    state.lastScanAt = result.lastScanAt;
    state.dataQuality = result.dataQuality;
    state.providerMetadata = result.providerMetadata;
    renderScanResult(result);
    const selected = state.rows.find((row) => row.symbol === state.selectedSymbol) || state.rows[0];
    if (selected) selectSymbol(selected.symbol, { skipChart: false });
    startBinanceStream(state.rows);
    setSourceHealth("crypto-scanner-pro-ui", "up", "READY", `${state.rows.length} scanner rows rendered.`);
    setSourceHealth("crypto-scanner-coingecko", state.rows.length ? "up" : "dn", result.dataQuality === "RATE_LIMITED" ? "RATE_LIMITED" : state.rows.length ? "CONNECTED" : "UNAVAILABLE", result.providerMetadata?.warnings?.join(" ") || "CoinGecko scanner data loaded.");
    setSourceHealth("crypto-scanner-signals", "up", "READY", "Signal classifier used provider snapshot fields only.");
    setSourceHealth("crypto-scanner-category-heat", "up", "READY", "Category heat computed from current scan rows.");
  } catch (error) {
    renderError(error);
    setSourceHealth("crypto-scanner-pro-ui", "dn", "ERROR", error.message);
  } finally {
    state.isScanning = false;
    setOverlay(false);
    publishContext();
  }
}

function renderScanResult(result) {
  renderRows(result.rows);
  renderCategoryHeat(result.categoryHeat);
  renderTopMovers(result.topMovers);
  renderAlerts(result.alerts);
  renderStats(result.stats);
  const summary = document.getElementById("crypto-results-summary");
  if (summary) summary.textContent = `${result.rows.length} matches from ${result.allRows.length} scanned assets. Last scan ${formatTime(result.lastScanAt)}.`;
  const source = document.getElementById("crypto-results-source");
  if (source) source.textContent = result.providerMetadata?.coinGeckoKeyMode === "SAVED_KEY" ? "COINGECKO KEY" : "COINGECKO PUBLIC";
  const quality = document.querySelector("[data-scan-quality]");
  if (quality) quality.textContent = result.dataQuality || "UNAVAILABLE";
}

function renderRows(rows = []) {
  const body = document.getElementById("crypto-body");
  if (!body) return;
  if (!rows.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">Crypto data unavailable from currently connected providers. No fallback stock data is used.</td></tr>`;
    return;
  }
  body.innerHTML = rows.map((row, index) => `
    <tr data-symbol="${escapeHtml(row.symbol)}" data-scanner-pro-row="true" class="${row.symbol === state.selectedSymbol ? "is-selected" : ""}">
      <td>${index + 1}</td>
      <td>
        <button class="symbol-cell" type="button">
          <strong>${escapeHtml(row.symbol)}</strong>
          <span>${escapeHtml(row.name)}</span>
        </button>
      </td>
      <td data-price-symbol="${escapeHtml(row.symbol)}">${formatMoney(row.price)}</td>
      <td class="${classForChange(row.change24h)}" data-change-symbol="${escapeHtml(row.symbol)}">${formatPct(row.change24h)}</td>
      <td data-volume-symbol="${escapeHtml(row.symbol)}">${formatCompact(row.volume)}</td>
      <td><span class="signal-pill ${escapeHtml(String(row.signal || "neutral").toLowerCase())}">${escapeHtml(row.signal || "NEUTRAL")}</span><small>${escapeHtml(row.signalSource || "price-change model")}</small></td>
      <td>${formatCompact(row.marketCap)}</td>
      <td>${sparkline(row.sparkline, row.change7d ?? row.change24h)}</td>
    </tr>
  `).join("");
}

function sparkline(values = [], change = 0) {
  const points = Array.isArray(values) ? values.map(Number).filter(Number.isFinite).slice(-28) : [];
  if (points.length < 2) return `<span class="sparkline-empty">Unavailable</span>`;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 116;
  const height = 34;
  const d = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 5) - 2.5;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const tone = Number(change) >= 0 ? "#00f5a0" : "#ff4d5d";
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="7 day sparkline"><path d="${d}" fill="none" stroke="${tone}" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function renderCategoryHeat(items = []) {
  const host = document.getElementById("crypto-category-heat");
  if (!host) return;
  const source = items.length ? items : Object.keys(CRYPTO_CATEGORY_MAP).map((category) => ({
    category,
    value: null,
    label: "Unavailable",
    count: 0,
    dataQuality: "UNAVAILABLE",
  }));
  host.innerHTML = source.map((item) => `
    <div class="heat-card ${classForChange(item.value)}">
      <span>${escapeHtml(item.category)}</span>
      <strong>${escapeHtml(item.label || "Unavailable")}</strong>
      <small>${item.count ? `${item.count} assets` : "Unavailable"}</small>
    </div>
  `).join("");
}

function renderTopMovers(rows = []) {
  const host = document.getElementById("crypto-top-movers");
  if (!host) return;
  if (!rows.length) {
    host.innerHTML = `<div class="empty-module">Unavailable until scanner rows load.</div>`;
    return;
  }
  host.innerHTML = rows.map((row) => `
    <button type="button" data-crypto-mover="${escapeHtml(row.symbol)}" class="mover-row">
      <span><strong>${escapeHtml(row.symbol)}</strong><em>${escapeHtml(row.name)}</em></span>
      <b class="${classForChange(row.change24h)}">${formatPct(row.change24h)}</b>
      <i>${formatMoney(row.price)}</i>
    </button>
  `).join("");
}

function renderAlerts(alerts = []) {
  const host = document.getElementById("crypto-signal-alerts");
  if (!host) return;
  if (!alerts.length) {
    host.innerHTML = `<div class="empty-module">No generated scan alerts yet.</div>`;
    return;
  }
  host.innerHTML = alerts.map((alert) => `
    <div class="alert-row">
      <span>${escapeHtml(alert.label)}</span>
      <strong>${escapeHtml(alert.symbol)}</strong>
      <p>${escapeHtml(alert.detail)}</p>
      <small>Generated ${formatTime(alert.timestamp)}</small>
    </div>
  `).join("");
}

function renderStats(stats) {
  const host = document.getElementById("crypto-session-stats");
  if (!host) return;
  const rows = stats ? [
    ["Scanned", stats.scanned],
    ["Matched", stats.matched],
    ["Gainers", stats.gainers],
    ["Decliners", stats.decliners],
    ["Avg 24H", Number.isFinite(stats.avgChange) ? formatPct(stats.avgChange) : "Unavailable"],
    ["Updated", stats.generatedAt ? formatTime(stats.generatedAt) : "Unavailable"],
  ] : [
    ["Scanned", "Unavailable"],
    ["Matched", "Unavailable"],
    ["Gainers", "Unavailable"],
    ["Decliners", "Unavailable"],
  ];
  host.innerHTML = rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function renderError(error) {
  const body = document.getElementById("crypto-body");
  if (body) {
    body.innerHTML = `<tr class="empty-row error"><td colspan="8">Crypto scanner unavailable: ${escapeHtml(error.message)}. No fake rows were generated.</td></tr>`;
  }
  renderTopMovers([]);
  renderAlerts([]);
  renderCategoryHeat([]);
}

function selectSymbol(symbol, options = {}) {
  const normalized = normalizeCryptoScannerSymbol(symbol) || "BTC";
  state.selectedSymbol = normalized;
  state.selectedRow = state.rows.find((row) => row.symbol === normalized) || null;
  document.querySelectorAll("#crypto-body tr[data-symbol]").forEach((row) => row.classList.toggle("is-selected", row.dataset.symbol === normalized));
  if (!options.skipChart) renderTradingView(normalized);
  publishContext();
}

function tradingViewSymbol(symbol = "BTC") {
  const pair = binancePairForSymbol(symbol);
  return pair ? `BINANCE:${pair}` : "";
}

function renderTradingView(symbol = state.selectedSymbol) {
  const frame = document.getElementById("crypto-pro-tv-widget");
  const title = document.querySelector("[data-crypto-chart-title]");
  const tvSymbol = tradingViewSymbol(symbol) || "BINANCE:BTCUSDT";
  if (title) title.textContent = tvSymbol.replace("BINANCE:", "");
  if (!frame) return;
  frame.innerHTML = "";
  if (!window.TradingView?.widget) {
    frame.innerHTML = `<div class="crypto-tv-empty">TradingView unavailable. The chart will load when the official widget script is reachable.</div>`;
    setSourceHealth("crypto-scanner-tradingview", "warn", "UNAVAILABLE", "TradingView script is not currently available.");
    return;
  }
  try {
    state.tvWidget = new window.TradingView.widget({
      autosize: true,
      symbol: tvSymbol,
      interval: state.activeInterval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#08080a",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      studies: ["RSI@tv-studilib", "MACD@tv-studilib"],
      container_id: "crypto-pro-tv-widget",
      overrides: {
        "paneProperties.background": "#08080a",
        "paneProperties.backgroundType": "solid",
      },
    });
    setSourceHealth("crypto-scanner-tradingview", "up", "CONNECTED", `TradingView loaded ${tvSymbol}.`);
  } catch (error) {
    frame.innerHTML = `<div class="crypto-tv-empty">TradingView pair unavailable for ${escapeHtml(symbol)}.</div>`;
    setSourceHealth("crypto-scanner-tradingview", "dn", "ERROR", error.message);
  }
}

function startBinanceStream(rows = []) {
  closeBinanceStream();
  const pairs = rows.map((row) => binancePairForSymbol(row.symbol)).filter(Boolean).slice(0, 32);
  state.socketSymbols = pairs;
  if (!pairs.length || !window.WebSocket) {
    updateLiveBadge("PRICES: BINANCE UNAVAILABLE", "red");
    setSourceHealth("crypto-scanner-binance", "dn", "UNAVAILABLE", "No supported Binance pairs were available for this scan.");
    return;
  }
  const stream = pairs.map((pair) => `${pair.toLowerCase()}@ticker`).join("/");
  try {
    state.socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);
    state.socket.onopen = () => {
      updateLiveBadge("PRICES: BINANCE LIVE", "green");
      setSourceHealth("crypto-scanner-binance", "up", "CONNECTED", `${pairs.length} Binance public ticker streams open.`);
    };
    state.socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        const pair = String(data.s || "");
        const symbol = pair.replace(/USDT$/, "");
        applyLiveTick(symbol, Number(data.c), Number(data.P), Number(data.q));
      } catch {
        // Ignore malformed WebSocket payloads without interrupting the scanner.
      }
    };
    state.socket.onerror = () => {
      updateLiveBadge("PRICES: BINANCE PARTIAL", "yellow");
      setSourceHealth("crypto-scanner-binance", "warn", "PARTIAL", "Binance public stream reported an error.");
    };
    state.socket.onclose = () => {
      if (state.scanStarted) updateLiveBadge("PRICES: BINANCE PARTIAL", "yellow");
    };
  } catch (error) {
    updateLiveBadge("PRICES: BINANCE UNAVAILABLE", "red");
    setSourceHealth("crypto-scanner-binance", "dn", "ERROR", error.message);
  }
}

function closeBinanceStream() {
  if (state.socket && state.socket.readyState <= 1) {
    state.socket.close();
  }
  state.socket = null;
}

export function applyLiveTick(symbol, price, changePct, quoteVolume) {
  const normalized = normalizeCryptoScannerSymbol(symbol);
  const priceCell = document.querySelector(`[data-price-symbol="${normalized}"]`);
  const changeCell = document.querySelector(`[data-change-symbol="${normalized}"]`);
  const volumeCell = document.querySelector(`[data-volume-symbol="${normalized}"]`);
  if (priceCell && Number.isFinite(price)) {
    const previous = Number(priceCell.dataset.rawPrice || 0);
    priceCell.dataset.rawPrice = String(price);
    priceCell.textContent = formatMoney(price);
    priceCell.classList.remove("tick-up", "tick-down");
    if (previous && previous !== price) priceCell.classList.add(price > previous ? "tick-up" : "tick-down");
  }
  if (changeCell && Number.isFinite(changePct)) {
    changeCell.textContent = formatPct(changePct);
    changeCell.className = classForChange(changePct);
  }
  if (volumeCell && Number.isFinite(quoteVolume)) {
    volumeCell.textContent = formatCompact(quoteVolume);
  }
  const row = state.rows.find((item) => item.symbol === normalized);
  if (row) {
    if (Number.isFinite(price)) row.price = price;
    if (Number.isFinite(changePct)) row.change24h = changePct;
    if (Number.isFinite(quoteVolume)) row.volume = quoteVolume;
    row.provider = "CoinGecko/Binance";
    row.dataQuality = "LIVE";
    row.timestamp = new Date().toISOString();
  }
}

function updateLiveBadge(label, tone) {
  const badge = document.getElementById("binance-status");
  const header = document.querySelector("[data-crypto-live-badge]");
  if (badge) {
    badge.dataset.tone = tone;
    const labelEl = badge.querySelector("span:last-child");
    if (labelEl) labelEl.textContent = label;
  }
  if (header) {
    header.dataset.tone = tone;
    header.textContent = label.includes("LIVE") ? "LIVE" : label.includes("UNAVAILABLE") ? "UNAVAILABLE" : "PARTIAL";
  }
}

function formatTime(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function startClock() {
  const tick = () => {
    const el = document.querySelector("[data-crypto-clock]");
    if (el) el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  tick();
  if (!state.clockTimer) state.clockTimer = setInterval(tick, 1000);
}

function publishContext() {
  window.dispatchEvent(new CustomEvent("ytt:crypto-scanner-pro-updated", {
    detail: getContext(),
  }));
}

export function getContext() {
  return {
    cryptoScannerProRows: state.rows.slice(0, 50),
    cryptoScannerProSelectedSymbol: state.selectedSymbol,
    cryptoScannerProSelectedRow: state.selectedRow,
    cryptoScannerProTopMovers: state.topMovers,
    cryptoScannerProAlerts: state.alerts,
    cryptoScannerProCategoryHeat: state.categoryHeat,
    cryptoScannerProLastScanAt: state.lastScanAt,
    cryptoScannerProDataQuality: state.dataQuality,
    cryptoScannerProProviderMetadata: state.providerMetadata,
    cryptoScannerProActiveFilters: currentFilters(),
  };
}

export function ensureReady({ autoScan = false } = {}) {
  if (!state.mounted) {
    renderShell();
    bindEvents();
    renderTradingView(state.selectedSymbol);
    startClock();
    state.mounted = true;
    setSourceHealth("crypto-scanner-pro-ui", "up", "READY", "Scoped Crypto Scanner Pro UI is mounted.");
    setSourceHealth("crypto-scanner-signals", "warn", "READY", "Signal classifier is ready and waits for provider rows.");
    setSourceHealth("crypto-scanner-category-heat", "warn", "UNAVAILABLE", "Category heat appears after scanner rows load.");
  }
  const body = document.getElementById("crypto-body");
  if (!state.scanStarted && body && !body.querySelector("[data-scanner-pro-row]") && !body.querySelector(".empty-row")) {
    renderEmptyState();
  }
  if (autoScan && !state.scanStarted) scanNow();
}

document.addEventListener("DOMContentLoaded", () => {
  ensureReady({ autoScan: false });
});

window.YTTCryptoScannerPro = {
  ensureReady,
  scanNow,
  getContext,
  applyLiveTick,
};
