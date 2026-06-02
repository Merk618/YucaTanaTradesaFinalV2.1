const loadedWidgets = new Map();

function tradingViewReady() {
  return typeof window !== "undefined" && typeof window.TradingView !== "undefined";
}

function ensureContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`TradingView container not found: ${containerId}`);
  return container;
}

function renderPlaceholder(container, label = "TradingView module") {
  if (container.dataset.tvLoaded === "true") return;
  container.innerHTML = `
    <div class="ytt-tv-lazy-placeholder" role="status">
      <strong>${label}</strong>
      <span>Lazy market widget ready. Open this module to load live TradingView visuals.</span>
    </div>
  `;
}

function loadTradingViewWidget(containerId, config = {}) {
  const container = ensureContainer(containerId);
  if (loadedWidgets.has(containerId)) return loadedWidgets.get(containerId);
  if (!tradingViewReady()) {
    renderPlaceholder(container, config.placeholder || "TradingView module");
    return null;
  }

  const widgetConfig = {
    autosize: true,
    container_id: containerId,
    interval: config.interval || "D",
    locale: "en",
    symbol: config.symbol || "NASDAQ:QQQ",
    theme: "dark",
    ...config,
  };
  delete widgetConfig.placeholder;

  container.dataset.tvLoaded = "true";
  container.innerHTML = "";
  const widget = new window.TradingView.widget(widgetConfig);
  loadedWidgets.set(containerId, widget);
  return widget;
}

function prepareTradingViewPlaceholder(containerId, label) {
  const container = document.getElementById(containerId);
  if (container) renderPlaceholder(container, label);
}

window.YTTTradingViewWidgets = {
  load: loadTradingViewWidget,
  prepare: prepareTradingViewPlaceholder,
  isReady: tradingViewReady,
};
