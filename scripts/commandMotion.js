const PROTECTED_TABS = new Set(["dashboard", "meridian"]);
const MOTION_TABS = {
  news: "news",
  options: "options",
  stocks: "stocks",
  crypto: "crypto",
  aiheatmap: "aiheatmap",
  "crypto-hunter": "crypto-hunter",
  portfolio: "portfolio",
  charts: "charts",
  settings: "settings"
};
const REVEAL_SELECTOR = [
  ".panel",
  ".detail-card",
  ".kpi-card",
  ".vault-provider-section",
  ".market-mini-card",
  ".stock-thesis-card",
  ".feed-card"
].join(",");

function activeTabElement(tabId) {
  return document.getElementById(`tab-${tabId}`);
}

function createMotionLayer(tabId) {
  const layer = document.createElement("div");
  layer.className = `ytt-motion-bg ytt-motion-bg--${MOTION_TABS[tabId]}`;
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = [
    '<div class="ytt-motion-bg__glow"></div>',
    '<div class="ytt-motion-bg__grid"></div>',
    '<div class="ytt-motion-bg__tickerstream"></div>',
    '<div class="ytt-motion-bg__particles"></div>',
    '<div class="ytt-motion-bg__scanline"></div>'
  ].join("");
  return layer;
}

function ensureCommandHeader(tab) {
  if (!tab?.dataset?.commandTitle || tab.querySelector(":scope > .ytt-command-header")) return;
  const header = document.createElement("div");
  header.className = "ytt-command-header";
  header.innerHTML = `
    <div class="ytt-command-header__prompt">&gt; ${tab.dataset.commandTitle}</div>
    <div class="ytt-command-header__meta">${tab.dataset.commandMeta || "MODE: READ ONLY"}</div>
  `;
  tab.prepend(header);
}

function ensureMotionBackgrounds() {
  Object.keys(MOTION_TABS).forEach((tabId) => {
    const tab = activeTabElement(tabId);
    if (!tab || PROTECTED_TABS.has(tabId)) return;
    if (!tab.querySelector(":scope > .ytt-motion-bg")) {
      tab.prepend(createMotionLayer(tabId));
    }
    ensureCommandHeader(tab);
  });
}

function markReveals(root = document) {
  if (!document.body?.classList.contains("ytt-signed-in")) return;
  root.querySelectorAll?.(REVEAL_SELECTOR).forEach((element) => {
    if (element.closest("#tab-dashboard, #tab-meridian, .signin-shell")) return;
    element.classList.add("ytt-reveal");
    revealObserver?.observe(element);
  });
}

function markActiveTab(tabId) {
  const tab = activeTabElement(tabId);
  if (!tab || PROTECTED_TABS.has(tabId)) return;
  ensureMotionBackgrounds();
  document.querySelectorAll(".tab-content.is-active, .tab-content.is-entering, .tab-content.is-leaving").forEach((element) => {
    if (element !== tab) {
      element.classList.remove("is-active", "is-entering");
      if (!element.matches("#tab-dashboard, #tab-meridian")) {
        element.classList.add("is-leaving");
        window.setTimeout(() => element.classList.remove("is-leaving"), 180);
      }
    }
  });
  tab.classList.add("is-active", "is-entering");
  tab.querySelector(":scope > .ytt-command-header")?.classList.remove("is-booted");
  window.requestAnimationFrame(() => {
    tab.querySelector(":scope > .ytt-command-header")?.classList.add("is-booted");
  });
  window.setTimeout(() => tab.classList.remove("is-entering"), 320);
  markReveals(tab);
}

function syncAiHeatmapMode(event) {
  const mode = event?.detail?.selectedAIHeatmapMode || event?.detail?.mode;
  const tab = document.getElementById("tab-aiheatmap");
  if (tab && (mode === "crypto" || mode === "stocks")) {
    tab.dataset.aiheatmapMode = mode;
  }
}

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { root: document.querySelector(".content") || null, threshold: 0.12 })
  : null;

document.addEventListener("DOMContentLoaded", () => {
  document.body?.setAttribute("data-command-theme", "active");
  document.body?.setAttribute("data-motion-system", "active");
  ensureMotionBackgrounds();
  markReveals();
  const initialTab = document.body?.dataset?.activeTab || localStorage.getItem("activeTab") || "dashboard";
  markActiveTab(initialTab);
});

window.addEventListener("ytt:tab-change", (event) => {
  markActiveTab(event.detail?.tabId);
});

window.addEventListener("ytt:aiheatmap-select", syncAiHeatmapMode);
