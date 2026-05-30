import { scoreOpportunity } from "../../../services/ai/opportunityScorer.js";
import { routeStockQuote } from "../../../services/marketData/stockQuoteRouter.js";
import {
  STOCK_DEEP_DIVE_CONFIRMATION,
  STOCK_DEEP_DIVE_RATINGS,
} from "../../../services/stocks/stockDeepDiveData.js";
import {
  loadStockTheses,
  loadStockThesisFilters,
  saveStockThesisFilters,
  getSelectedStockThesisSymbol,
  setSelectedStockThesisSymbol,
} from "../../../services/stocks/stockThesisStore.js";

const state = {
  cards: [],
  selectedSymbol: "",
  filters: loadStockThesisFilters(),
  refreshing: false,
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

function finite(value) {
  return Number.isFinite(Number(value));
}

function money(value) {
  if (!finite(value)) return "Unavailable";
  const number = Number(value);
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: number >= 100 ? 2 : 4,
  }).format(number);
}

function pct(value) {
  if (!finite(value)) return "Unavailable";
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}

function compact(value) {
  if (!finite(value)) return "Unavailable";
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(Number(value));
}

function formatTime(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function appContext() {
  try {
    return typeof window.buildAIContext === "function" ? window.buildAIContext() || {} : {};
  } catch {
    return {};
  }
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

function quoteFromApp(symbol) {
  const quote = appContext().stockQuotes?.[symbol];
  if (!quote) return null;
  const price = Number(quote.price ?? quote.c);
  return {
    symbol,
    assetType: "stock",
    name: quote.name || symbol,
    price,
    changePercent: Number(quote.changePercent ?? quote.changePct ?? quote.dp),
    previousClose: Number(quote.previousClose ?? quote.pc),
    volume: Number(quote.volume),
    provider: quote.provider || quote.source || "FINNHUB",
    dataQuality: finite(price) ? quote.dataQuality || "FALLBACK" : "UNAVAILABLE",
    timestamp: quote.timestamp || quote.lastUpdated || quote.updatedAt || new Date().toISOString(),
    fallbackUsed: Boolean(quote.fallbackUsed),
  };
}

async function resolveQuote(thesis) {
  const fallbackQuote = quoteFromApp(thesis.symbol);
  if (fallbackQuote && finite(fallbackQuote.price)) return fallbackQuote;
  return routeStockQuote({
    symbol: thesis.symbol,
    settings: stockSettings(),
    fallbackQuote,
    timeoutMs: 9000,
  });
}

function confirmationFromOpportunity(opportunity, quote) {
  if (!quote || quote.dataQuality === "UNAVAILABLE" || !finite(quote.price)) {
    return STOCK_DEEP_DIVE_CONFIRMATION.DATA_INSUFFICIENT;
  }
  const score = Number(opportunity?.setupScore);
  if (!Number.isFinite(score)) return STOCK_DEEP_DIVE_CONFIRMATION.DATA_INSUFFICIENT;
  if (score >= 76) return STOCK_DEEP_DIVE_CONFIRMATION.CONFIRMED;
  if (score >= 58) return STOCK_DEEP_DIVE_CONFIRMATION.PARTIAL;
  if (score >= 42) return STOCK_DEEP_DIVE_CONFIRMATION.NOT_CONFIRMED;
  return STOCK_DEEP_DIVE_CONFIRMATION.CONFLICTING;
}

function buildCard(thesis, quote) {
  const asset = {
    ...quote,
    symbol: thesis.symbol,
    name: thesis.name,
    assetType: "stock",
    sector: thesis.sector,
    setup: thesis.manualThesisHeadline,
    catalysts: thesis.catalysts,
  };
  const opportunity = scoreOpportunity(asset, {
    peers: Object.entries(appContext().stockQuotes || {}).map(([symbol, row]) => ({ ...row, symbol, assetType: "stock" })),
    sourceHealth: appContext().sourceHealth || {},
    catalyst: thesis.catalysts,
  });
  const confirmationStatus = confirmationFromOpportunity(opportunity, quote);
  return {
    ...thesis,
    quote,
    livePriceAvailable: quote?.dataQuality !== "UNAVAILABLE" && finite(quote?.price),
    marketBrain: opportunity,
    confirmationStatus,
    dataQuality: quote?.dataQuality || "UNAVAILABLE",
    provider: quote?.provider || quote?.source || "Unavailable",
    fallbackUsed: Boolean(quote?.fallbackUsed),
    timestamp: quote?.timestamp || new Date().toISOString(),
  };
}

function visibleCards() {
  const filters = state.filters;
  const selectedRating = String(filters.rating || "all").toUpperCase();
  const selectedSector = String(filters.sector || "all").toUpperCase();
  let cards = [...state.cards];
  if (selectedRating !== "ALL") {
    cards = cards.filter((card) => String(card.marketBrain?.rating || card.rating).toUpperCase() === selectedRating);
  }
  if (selectedSector !== "ALL") {
    cards = cards.filter((card) => String(card.sector || "").toUpperCase() === selectedSector);
  }
  if (filters.confirmedOnly) {
    cards = cards.filter((card) => [
      STOCK_DEEP_DIVE_CONFIRMATION.CONFIRMED,
      STOCK_DEEP_DIVE_CONFIRMATION.PARTIAL,
    ].includes(card.confirmationStatus));
  }
  cards.sort((a, b) => {
    switch (filters.sort) {
      case "manualConfidence":
        return (b.manualConfidence ?? -1) - (a.manualConfidence ?? -1);
      case "ticker":
        return a.symbol.localeCompare(b.symbol);
      case "lastUpdated":
        return new Date(b.timestamp || b.lastReviewedAt).getTime() - new Date(a.timestamp || a.lastReviewedAt).getTime();
      case "marketBrain":
      default:
        return (b.marketBrain?.setupScore ?? -1) - (a.marketBrain?.setupScore ?? -1);
    }
  });
  return cards;
}

function confirmationClass(status = "") {
  const normalized = status.toLowerCase();
  if (normalized.includes("confirmed by")) return "confirmed";
  if (normalized.includes("partially")) return "partial";
  if (normalized.includes("conflicting")) return "conflicting";
  if (normalized.includes("not")) return "not-confirmed";
  return "insufficient";
}

function ratingClass(rating = "") {
  const normalized = String(rating).toLowerCase();
  if (normalized.includes("strong")) return "strong";
  if (normalized.includes("candidate")) return "candidate";
  if (normalized.includes("short")) return "short";
  if (normalized.includes("avoid")) return "avoid";
  return "watch";
}

function catalystHtml(catalysts = []) {
  if (!catalysts.length) return `<div class="stock-thesis-empty">Catalysts unavailable.</div>`;
  return catalysts.map((item) => `<div class="stock-thesis-catalyst">
    <span class="stock-thesis-catalyst-dot ${escapeHtml(item.tone || "neutral")}"></span>
    <span>${escapeHtml(item.text)}</span>
  </div>`).join("");
}

function listHtml(items = []) {
  if (!items.length) return "Unavailable";
  return `<ul>${items.slice(0, 4).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderCard(card) {
  const score = card.marketBrain?.setupScore;
  const marketRating = card.marketBrain?.rating || card.rating || STOCK_DEEP_DIVE_RATINGS.WATCH;
  const change = card.quote?.changePercent ?? card.quote?.changePct;
  const liveLabel = card.livePriceAvailable ? "Live / Provider" : "Manual / Unavailable";
  const priceValue = card.livePriceAvailable ? money(card.quote.price) : (finite(card.manualPrice) ? `${money(card.manualPrice)} Manual` : "Unavailable");
  const selected = card.symbol === state.selectedSymbol ? " is-active" : "";
  return `<article class="stock-thesis-card${selected}" data-stock-thesis-symbol="${escapeHtml(card.symbol)}">
    <div class="stock-thesis-card-header">
      <div class="stock-thesis-card-left">
        <div class="stock-thesis-ticker-row">
          <span class="stock-thesis-ticker">${escapeHtml(card.symbol)}</span>
          <span class="stock-thesis-exchange">${escapeHtml(card.exchange)}</span>
          <span class="stock-thesis-status">${escapeHtml(card.thesisStatus === "manual" ? "Manual Thesis" : card.thesisStatus)}</span>
        </div>
        <div class="stock-thesis-name">${escapeHtml(card.name)}</div>
        <div class="stock-thesis-signal-row">
          <span class="stock-thesis-signal ${ratingClass(marketRating)}">${escapeHtml(marketRating)}</span>
          <span class="stock-thesis-confidence">${Number.isFinite(Number(score)) ? `${score}/100 Market Brain` : "Score unavailable"}</span>
        </div>
      </div>
      <div class="stock-thesis-price-block">
        <div class="stock-thesis-price">${escapeHtml(priceValue)}</div>
        <div class="stock-thesis-change ${Number(change) >= 0 ? "up" : "dn"}">${escapeHtml(pct(change))}</div>
        <div class="stock-thesis-target">
          <span>Target</span><strong>${card.manualTarget == null ? "Unavailable" : `${money(card.manualTarget)} Manual`}</strong>
        </div>
      </div>
    </div>
    <div class="stock-thesis-body">
      <div class="stock-thesis-headline">${escapeHtml(card.manualThesisHeadline)}</div>
      <p class="stock-thesis-text">${escapeHtml(card.manualThesisText)}</p>
      <div class="stock-thesis-meta-grid">
        <div><span>Confirmation</span><strong class="${confirmationClass(card.confirmationStatus)}">${escapeHtml(card.confirmationStatus)}</strong></div>
        <div><span>Source</span><strong>${escapeHtml(card.provider)}</strong></div>
        <div><span>Fallback Used</span><strong>${card.fallbackUsed ? "Yes" : "No"}</strong></div>
        <div><span>Data Quality</span><strong>${escapeHtml(card.dataQuality || "UNAVAILABLE")}</strong></div>
      </div>
      <div class="stock-thesis-section-label">Manual Catalysts · Needs Live Validation</div>
      <div class="stock-thesis-catalysts">${catalystHtml(card.catalysts)}</div>
      <div class="stock-thesis-section-label">Market Brain Factors</div>
      <div class="stock-thesis-analyst-row">
        <div><span>Strongest</span>${listHtml(card.marketBrain?.strongestFactors)}</div>
        <div><span>Weakest / Missing</span>${listHtml([...(card.marketBrain?.weakestFactors || []), ...(card.marketBrain?.missingData || [])].slice(0, 4))}</div>
      </div>
      <div class="stock-thesis-risk-box">
        <div class="stock-thesis-risk-title">Key Risks</div>
        <div class="stock-thesis-risk-text">${listHtml(card.keyRisks)}</div>
      </div>
    </div>
    <div class="stock-thesis-footer">
      <span class="stock-thesis-badge">Uploaded Label: ${escapeHtml(card.uploadedLabel)}</span>
      <span class="stock-thesis-badge">Price: ${escapeHtml(liveLabel)}</span>
      <span class="stock-thesis-badge">Reviewed: ${escapeHtml(formatTime(card.lastReviewedAt))}</span>
      <span class="stock-thesis-badge">Updated: ${escapeHtml(formatTime(card.timestamp))}</span>
    </div>
  </article>`;
}

function sectorOptions() {
  const sectors = Array.from(new Set(state.cards.map((card) => card.sector).filter(Boolean))).sort();
  return [`<option value="all">All Sectors</option>`, ...sectors.map((sector) => `<option value="${escapeHtml(sector)}"${state.filters.sector === sector ? " selected" : ""}>${escapeHtml(sector)}</option>`)].join("");
}

function renderControls() {
  const host = document.getElementById("stock-deep-dive-controls");
  if (!host) return;
  host.innerHTML = `<div class="stock-deep-dive-control">
      <label for="stock-thesis-filter-rating">Rating</label>
      <select id="stock-thesis-filter-rating">
        <option value="all">All Ratings</option>
        <option value="STRONG CANDIDATE">Strong Candidate</option>
        <option value="CANDIDATE">Candidate</option>
        <option value="WATCH">Watch</option>
        <option value="SHORT WATCH">Short Watch</option>
        <option value="AVOID">Avoid</option>
      </select>
    </div>
    <div class="stock-deep-dive-control">
      <label for="stock-thesis-filter-sector">Sector</label>
      <select id="stock-thesis-filter-sector">${sectorOptions()}</select>
    </div>
    <div class="stock-deep-dive-control">
      <label for="stock-thesis-sort">Sort</label>
      <select id="stock-thesis-sort">
        <option value="marketBrain">Market Brain Score</option>
        <option value="manualConfidence">Manual Confidence</option>
        <option value="ticker">Ticker</option>
        <option value="lastUpdated">Last Updated</option>
      </select>
    </div>
    <label class="stock-deep-dive-toggle"><input id="stock-thesis-confirmed-only" type="checkbox"> YucaTana-confirmed only</label>
    <button id="stock-thesis-refresh" class="stock-deep-dive-btn" type="button">${state.refreshing ? "Refreshing..." : "Refresh Live Data"}</button>`;

  document.getElementById("stock-thesis-filter-rating").value = state.filters.rating || "all";
  document.getElementById("stock-thesis-filter-sector").value = state.filters.sector || "all";
  document.getElementById("stock-thesis-sort").value = state.filters.sort || "marketBrain";
  document.getElementById("stock-thesis-confirmed-only").checked = Boolean(state.filters.confirmedOnly);
}

function bindControls() {
  const host = document.getElementById("stock-deep-dive-section");
  if (!host || host.dataset.stockDeepDiveBound === "true") return;
  host.dataset.stockDeepDiveBound = "true";
  host.addEventListener("change", (event) => {
    const target = event.target;
    if (target.id === "stock-thesis-filter-rating") state.filters.rating = target.value;
    if (target.id === "stock-thesis-filter-sector") state.filters.sector = target.value;
    if (target.id === "stock-thesis-sort") state.filters.sort = target.value;
    if (target.id === "stock-thesis-confirmed-only") state.filters.confirmedOnly = target.checked;
    saveStockThesisFilters(state.filters);
    render();
  });
  host.addEventListener("click", (event) => {
    const refresh = event.target.closest("#stock-thesis-refresh");
    if (refresh) {
      hydrate({ force: true });
      return;
    }
    const card = event.target.closest("[data-stock-thesis-symbol]");
    if (!card) return;
    selectSymbol(card.dataset.stockThesisSymbol);
  });
}

function render() {
  renderControls();
  const grid = document.getElementById("stock-thesis-grid");
  if (!grid) return;
  const cards = visibleCards();
  if (!cards.length) {
    grid.innerHTML = `<div class="stock-thesis-empty">No thesis cards match the selected filters. Manual thesis data remains available but needs live validation.</div>`;
    return;
  }
  grid.innerHTML = cards.map(renderCard).join("");
}

function selectSymbol(symbol = "") {
  const clean = String(symbol || "").trim().toUpperCase();
  state.selectedSymbol = clean;
  setSelectedStockThesisSymbol(clean);
  document.querySelectorAll("#stocks-body tr").forEach((row) => row.classList.toggle("is-selected", row.dataset.symbol === clean));
  const safeSelectorSymbol = globalThis.CSS?.escape ? CSS.escape(clean) : clean.replace(/"/g, '\\"');
  const tile = document.querySelector(`#stocks-production-heatmap [data-heatmap-symbol="${safeSelectorSymbol}"]`);
  if (tile) tile.click();
  render();
}

async function hydrate({ force = false } = {}) {
  if (state.refreshing && !force) return;
  const section = document.getElementById("stock-deep-dive-section");
  if (!section) return;
  state.refreshing = true;
  section.dataset.loading = "true";
  render();
  const theses = loadStockTheses();
  const cards = await Promise.all(theses.map(async (thesis) => {
    try {
      const quote = await resolveQuote(thesis);
      return buildCard(thesis, quote);
    } catch (error) {
      return buildCard(thesis, {
        symbol: thesis.symbol,
        assetType: "stock",
        provider: "Unavailable",
        dataQuality: "UNAVAILABLE",
        error: error?.message || "Quote unavailable.",
        timestamp: new Date().toISOString(),
      });
    }
  }));
  state.cards = cards;
  state.selectedSymbol = getSelectedStockThesisSymbol() || state.selectedSymbol || cards[0]?.symbol || "";
  state.refreshing = false;
  section.dataset.loading = "false";
  render();
  window.dispatchEvent(new CustomEvent("ytt:stock-deep-dive-updated", { detail: getContext() }));
}

function getContext() {
  return {
    selectedDeepDiveSymbol: state.selectedSymbol,
    stockDeepDiveCards: state.cards.map((card) => ({
      symbol: card.symbol,
      name: card.name,
      exchange: card.exchange,
      sector: card.sector,
      thesisStatus: card.thesisStatus,
      manualThesisHeadline: card.manualThesisHeadline,
      manualThesisText: card.manualThesisText,
      catalysts: card.catalysts,
      keyRisks: card.keyRisks,
      currentQuote: card.quote,
      marketBrain: card.marketBrain,
      confirmationStatus: card.confirmationStatus,
      dataQuality: card.dataQuality,
      provider: card.provider,
      fallbackUsed: card.fallbackUsed,
      timestamp: card.timestamp,
    })),
    stockDeepDiveSource: "Manual legacy v8 thesis overlay validated against current YucaTana market data when available.",
    stockDeepDiveDataQuality: state.cards.some((card) => card.livePriceAvailable) ? "MIXED" : "MANUAL",
  };
}

function mount() {
  if (!document.getElementById("stock-deep-dive-section")) return;
  bindControls();
  state.cards = loadStockTheses().map((thesis) => buildCard(thesis, {
    symbol: thesis.symbol,
    assetType: "stock",
    provider: "Awaiting provider",
    dataQuality: "UNAVAILABLE",
    timestamp: new Date().toISOString(),
  }));
  state.selectedSymbol = getSelectedStockThesisSymbol() || state.cards[0]?.symbol || "";
  render();
  hydrate();
}

window.YTTStockDeepDive = {
  mount,
  refresh: hydrate,
  getContext,
  getCards: () => state.cards,
  selectSymbol,
};

document.addEventListener("DOMContentLoaded", mount);
window.addEventListener("ytt:source-health-refresh", () => hydrate({ force: false }));
