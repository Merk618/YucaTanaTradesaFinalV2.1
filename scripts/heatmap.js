(() => {
  const DATA_UNAVAILABLE = "Data unavailable — retrying";
  const state = {
    stocks: { selected: "", expanded: "", rows: [] },
    crypto: { selected: "", expanded: "", rows: [] },
    chartKeys: {},
  };

  const fmtMoney = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: Number(value) >= 100 ? 2 : 6 })}` : DATA_UNAVAILABLE;
  const fmtPct = (value) => Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%` : DATA_UNAVAILABLE;
  const fmtCompact = (value) => Number.isFinite(Number(value)) ? Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(Number(value)) : DATA_UNAVAILABLE;
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  function qualityChip(row) {
    return `<small class="data-quality-chip" data-quality="${escapeHtml(row.dataQuality)}">${escapeHtml(row.dataQuality)}</small>`;
  }

  function stockRows(quotes = {}) {
    return Object.values(quotes).map((quote) => ({
      symbol: quote.symbol,
      name: quote.symbol,
      type: "stock",
      group: "Equity",
      price: Number(quote.price),
      changePercent: Number(quote.changePct),
      source: quote.source || "Finnhub",
      lastUpdated: quote.updatedAt || "",
      dataQuality: Number.isFinite(Number(quote.price)) ? "LIVE" : "UNAVAILABLE",
    })).filter((row) => row.symbol);
  }

  function cryptoRows(markets = {}) {
    return Object.values(markets).map((coin) => ({
      symbol: String(coin.symbol || "").toUpperCase(),
      name: coin.name || String(coin.symbol || "").toUpperCase(),
      type: "crypto",
      group: coin.asset_platform_id || "Crypto",
      price: Number(coin.current_price),
      changePercent: Number(coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h),
      volume: Number(coin.total_volume),
      marketCap: Number(coin.market_cap),
      source: "CoinGecko",
      lastUpdated: coin.last_updated || "",
      dataQuality: Number.isFinite(Number(coin.current_price)) ? "LIVE" : "UNAVAILABLE",
      marketCapRank: coin.market_cap_rank,
      series: coin.sparkline_in_7d?.price || [],
    })).filter((row) => row.symbol);
  }

  function metric(label, value) {
    return `<div><small>${escapeHtml(label)}</small><strong>${value}</strong></div>`;
  }

  function renderExpanded(type, row) {
    const unavailable = row.dataQuality === "UNAVAILABLE";
    return `<article class="ytt-heatmap-expanded-panel" data-expanded-symbol="${escapeHtml(row.symbol)}">
      <div class="ytt-expanded-head">
        <div>
          <small>${escapeHtml(type)} inline research panel</small>
          <h3>${escapeHtml(row.symbol)} / ${escapeHtml(row.name || row.symbol)}</h3>
          ${qualityChip(row)}
        </div>
        <button class="small-btn" type="button" data-deep-dive="${escapeHtml(row.symbol)}">Deep Dive</button>
      </div>
      <div class="ytt-expanded-metrics">
        ${metric("Price", fmtMoney(row.price))}
        ${metric("Change", fmtPct(row.changePercent))}
        ${metric("Volume", row.volume == null ? DATA_UNAVAILABLE : fmtCompact(row.volume))}
        ${metric("Market Cap", row.marketCap == null ? DATA_UNAVAILABLE : fmtCompact(row.marketCap))}
        ${metric("RSI", DATA_UNAVAILABLE)}
        ${metric("MACD", DATA_UNAVAILABLE)}
      </div>
      <div class="ytt-thesis-box" style="margin-top:10px">
        <small>Research status</small>
        <p>${unavailable ? DATA_UNAVAILABLE : "Quote and market data loaded. Strategy fields such as RSI, MACD, VWAP, support, resistance, momentum, and setup stay unavailable until the strategy layer supplies calculated values."}</p>
      </div>
    </article>`;
  }

  function renderGrid(type) {
    const target = document.getElementById(`${type}-production-heatmap`);
    if (!target) return;
    const rows = state[type].rows;
    if (!rows.length) {
      target.innerHTML = `<div class="ytt-detail-empty">${DATA_UNAVAILABLE}</div>`;
      renderDetail(type, null);
      return;
    }
    if (!state[type].selected || !rows.some((row) => row.symbol === state[type].selected)) state[type].selected = rows[0].symbol;
    target.innerHTML = rows.map((row) => {
      const selected = row.symbol === state[type].selected ? " is-selected" : "";
      const expanded = row.symbol === state[type].expanded ? renderExpanded(type, row) : "";
      const tone = row.dataQuality === "UNAVAILABLE" ? "rgba(255,80,0,0.08)" : Number(row.changePercent) >= 0 ? "rgba(0,200,5,0.12)" : "rgba(255,80,0,0.12)";
      return `<button class="ytt-heatmap-cell${selected}" type="button" data-heatmap-symbol="${escapeHtml(row.symbol)}" style="background:linear-gradient(145deg, ${tone}, rgba(255,255,255,0.018));">
        <b>${escapeHtml(row.symbol)}</b>
        <span>${fmtPct(row.changePercent)}</span>
        <small>${escapeHtml(row.source || "source pending")}</small>
        ${qualityChip(row)}
      </button>${expanded}`;
    }).join("");
    renderDetail(type, rows.find((row) => row.symbol === state[type].selected));
    highlightTable(type, state[type].selected);
  }

  function renderDetail(type, row) {
    const target = document.getElementById(`${type}-asset-detail-panel`);
    if (!target) return;
    if (!row) {
      target.innerHTML = `<div class="panel"><div class="panel-header">Selected ${type} Detail</div><p class="ytt-detail-empty">${DATA_UNAVAILABLE}</p></div>`;
      return;
    }
    target.innerHTML = `<div class="panel">
      <div class="panel-header">Selected ${type} Detail <span class="source-tag">${escapeHtml(row.source || "UNAVAILABLE")}</span></div>
      <h3>${escapeHtml(row.symbol)} ${qualityChip(row)}</h3>
      <div class="ytt-detail-metrics">
        ${metric("Price", fmtMoney(row.price))}
        ${metric("Change", fmtPct(row.changePercent))}
        ${metric("Volume", row.volume == null ? DATA_UNAVAILABLE : fmtCompact(row.volume))}
        ${metric("Market Cap", row.marketCap == null ? DATA_UNAVAILABLE : fmtCompact(row.marketCap))}
        ${metric("Momentum", DATA_UNAVAILABLE)}
        ${metric("Support / Resist", DATA_UNAVAILABLE)}
      </div>
      <div class="ytt-thesis-box" style="margin-top:10px"><small>Data boundary</small><p>No thesis, conviction, RSI, MACD, support, resistance, or catalyst values are shown until calculated by repo strategy/data services.</p></div>
      <button class="small-btn" type="button" data-deep-dive="${escapeHtml(row.symbol)}" style="margin-top:12px">Deep Dive</button>
    </div>`;
  }

  function updateChart(type, row) {
    const hostId = `${type}-production-tv`;
    const host = document.getElementById(hostId);
    if (!host || !row) return;
    const symbol = type === "stocks" ? `NASDAQ:${row.symbol.replace(".", "-")}` : `BINANCE:${row.symbol}USDT`;
    const key = `${hostId}:${symbol}`;
    if (state.chartKeys[hostId] === key) return;
    state.chartKeys[hostId] = key;
    host.innerHTML = "";
    if (!window.TradingView?.widget) {
      host.innerHTML = `<p class="ytt-detail-empty">TradingView widget unavailable — retrying</p>`;
      return;
    }
    new window.TradingView.widget({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "America/Chicago",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#141414",
      enable_publishing: false,
      allow_symbol_change: true,
      hide_side_toolbar: false,
      withdateranges: true,
      studies: ["RSI@tv-studilib", "MACD@tv-studilib"],
      container_id: hostId,
    });
  }

  function highlightTable(type, symbol) {
    const body = document.getElementById(type === "stocks" ? "stocks-body" : "crypto-body");
    if (!body) return;
    body.querySelectorAll("tr").forEach((row) => row.classList.toggle("is-selected", row.dataset.symbol === symbol));
  }

  function select(type, symbol, expand = false) {
    const row = state[type].rows.find((item) => item.symbol === symbol);
    if (!row) return;
    state[type].selected = symbol;
    if (expand) state[type].expanded = state[type].expanded === symbol ? "" : symbol;
    updateChart(type, row);
    renderGrid(type);
  }

  function openDrawer(type, symbol) {
    const row = state[type].rows.find((item) => item.symbol === symbol);
    const drawer = document.getElementById("ytt-deep-dive-drawer");
    if (!drawer || !row) return;
    drawer.innerHTML = `<div class="drawer-scan-line"></div><button class="small-btn" type="button" data-close-ytt-drawer>Close</button><h2>${escapeHtml(row.symbol)} Deep Dive</h2>${qualityChip(row)}<div class="ytt-detail-metrics">${metric("Price", fmtMoney(row.price))}${metric("Change", fmtPct(row.changePercent))}${metric("Source", escapeHtml(row.source || "UNAVAILABLE"))}${metric("Strategy Fields", DATA_UNAVAILABLE)}</div><p class="ytt-detail-empty">Deep dive opens only from this button. It does not fabricate research fields; unavailable strategy metrics remain labeled until supplied by services.</p>`;
    drawer.classList.add("is-open");
  }

  function bindGrid(type) {
    const grid = document.getElementById(`${type}-production-heatmap`);
    const detail = document.getElementById(`${type}-asset-detail-panel`);
    [grid, detail].forEach((node) => {
      if (!node || node.dataset.heatmapBound) return;
      node.dataset.heatmapBound = "true";
      node.addEventListener("click", (event) => {
        const close = event.target.closest("[data-close-ytt-drawer]");
        if (close) {
          document.getElementById("ytt-deep-dive-drawer")?.classList.remove("is-open");
          return;
        }
        const deep = event.target.closest("[data-deep-dive]");
        if (deep) {
          openDrawer(type, deep.dataset.deepDive);
          return;
        }
        const tile = event.target.closest("[data-heatmap-symbol]");
        if (!tile) return;
        const rect = tile.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "ripple-burst";
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        tile.appendChild(ripple);
        tile.classList.add("selected-pulse");
        window.setTimeout(() => {
          ripple.remove();
          tile.classList.remove("selected-pulse");
        }, 520);
        select(type, tile.dataset.heatmapSymbol, false);
      });
      node.addEventListener("dblclick", (event) => {
        const tile = event.target.closest("[data-heatmap-symbol]");
        if (tile) select(type, tile.dataset.heatmapSymbol, true);
      });
    });
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-ytt-drawer]")) {
      document.getElementById("ytt-deep-dive-drawer")?.classList.remove("is-open");
    }
  });

  function renderStocks(quotes) {
    state.stocks.rows = stockRows(quotes);
    bindGrid("stocks");
    renderGrid("stocks");
    updateChart("stocks", state.stocks.rows.find((row) => row.symbol === state.stocks.selected) || state.stocks.rows[0]);
  }

  function renderCrypto(markets) {
    state.crypto.rows = cryptoRows(markets);
    bindGrid("crypto");
    renderGrid("crypto");
    updateChart("crypto", state.crypto.rows.find((row) => row.symbol === state.crypto.selected) || state.crypto.rows[0]);
  }

  window.YTTHeatmap = { renderStocks, renderCrypto };
})();
