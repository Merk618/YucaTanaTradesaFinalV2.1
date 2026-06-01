const PROTECTED_TABS = new Set(["dashboard", "meridian"]);
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
  window.setTimeout(() => tab.classList.remove("is-entering"), 260);
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
  markReveals();
  const initialTab = document.body?.dataset?.activeTab || localStorage.getItem("activeTab") || "dashboard";
  markActiveTab(initialTab);
});

window.addEventListener("ytt:tab-change", (event) => {
  markActiveTab(event.detail?.tabId);
});

window.addEventListener("ytt:aiheatmap-select", syncAiHeatmapMode);
