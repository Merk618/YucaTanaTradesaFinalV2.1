import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runCryptoScannerProScan } from "../services/crypto/cryptoScannerProService.js";
import { binancePairForSymbol, computeCryptoCategoryHeat } from "../services/crypto/cryptoScannerSignals.js";

const indexHtml = await readFile(new URL("../apps/web/index.html", import.meta.url), "utf8");
const tabStart = indexHtml.indexOf('<section id="tab-crypto"');
const tabEnd = indexHtml.indexOf('<section id="tab-aiheatmap"', tabStart);
const cryptoTabHtml = indexHtml.slice(tabStart, tabEnd);
const cryptoScript = await readFile(new URL("../apps/web/scripts/cryptoScannerProTab.js", import.meta.url), "utf8");
const cryptoStyle = await readFile(new URL("../apps/web/styles/cryptoScannerProTab.css", import.meta.url), "utf8");

assert.ok(tabStart > -1, "Crypto tab should exist");
assert.ok(indexHtml.includes("styles/cryptoScannerProTab.css"), "Crypto Scanner Pro stylesheet should be linked");
assert.ok(indexHtml.includes("scripts/cryptoScannerProTab.js"), "Crypto Scanner Pro script should be linked");
assert.ok(indexHtml.includes("<script async src=\"https://s3.tradingview.com/tv.js\"></script>"), "TradingView script should be async");
assert.ok(cryptoTabHtml.includes("ytt-crypto-scanner-pro"), "Crypto Scanner Pro root should render in Crypto tab");
assert.ok(!cryptoTabHtml.includes("crypto-grid"), "Old crypto dashboard grid should not remain visible");
assert.ok(!cryptoTabHtml.includes("crypto-production-heatmap"), "Old crypto heatmap should not remain visible");
assert.ok(!cryptoTabHtml.includes("crypto-production-tv"), "Old crypto chart block should not remain visible");
assert.ok(!/document\.addEventListener\(['"]DOMContentLoaded/.test(cryptoScript), "Crypto scanner module must not auto-run on DOMContentLoaded");
assert.ok(!/ensureReady\(\{?\s*autoScan/.test(cryptoScript), "Crypto scanner must not auto scan");
assert.ok(!/initBinanceStream\(\);/.test(indexHtml), "Binance stream should not start on page load");
assert.ok(!/loadCoinGeckoMarkets\(\);/.test(indexHtml), "CoinGecko should not load from seedSkeletonTables on page load");
assert.ok(indexHtml.includes('id="tab-aiheatmap"'), "AIheatmap tab should still exist");
assert.ok(indexHtml.includes("stock-deep-dive-section"), "Stock Deep-Dive should still exist");

for (const needle of ["YUCATANATRADES", "crypto-scan-now", "crypto-pro-tv-widget", "crypto-results-table", "crypto-body", "crypto-category-heat", "crypto-top-movers", "crypto-signal-alerts", "PRICES: BINANCE LIVE", "cryptoScannerProRows"]) {
  assert.ok(cryptoScript.includes(needle), `${needle} should be implemented`);
}

assert.ok(cryptoStyle.includes(".ytt-crypto-scanner-pro .results-table"), "Crypto scanner CSS should be scoped");
for (const cssNeedle of ["--bg-primary: #000", "--gold-bright: #f5c842", "--gold-border: rgba(245,200,66,.55)", "Orbitron"]) {
  assert.ok(cryptoStyle.includes(cssNeedle), `${cssNeedle} should be present in scoped Crypto Scanner Pro styling`);
}
assert.ok(!/CG_API_KEY\s*=/.test(cryptoScript), "Hardcoded CoinGecko key constant must not exist");
assert.ok(!/x-cg-demo-api-key["']?\s*[:=]\s*["'][A-Za-z0-9_-]{10,}/.test(cryptoScript), "No hardcoded CoinGecko header value");
assert.equal(binancePairForSymbol("XLM"), "XLMUSDT");

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const sparkline = Array.from({ length: 32 }, (_, index) => 0.10 + index * 0.001);
async function mockFetch(url) {
  assert.ok(String(url).includes("coins/markets"), `Unexpected scanner URL: ${url}`);
  return jsonResponse([
    {
      id: "stellar",
      symbol: "xlm",
      name: "Stellar",
      current_price: 0.123,
      price_change_percentage_1h_in_currency: 1.1,
      price_change_percentage_24h_in_currency: 8.5,
      price_change_percentage_7d_in_currency: 3.2,
      total_volume: 180000000,
      market_cap: 3600000000,
      market_cap_rank: 42,
      sparkline_in_7d: { prices: sparkline },
      last_updated: "2026-05-31T18:00:00.000Z",
    },
    {
      id: "bitcoin",
      symbol: "btc",
      name: "Bitcoin",
      current_price: 68000,
      price_change_percentage_1h_in_currency: 0.2,
      price_change_percentage_24h_in_currency: 1.4,
      price_change_percentage_7d_in_currency: 2.1,
      total_volume: 22000000000,
      market_cap: 1330000000000,
      market_cap_rank: 1,
      sparkline_in_7d: { prices: sparkline.map((price) => price * 680000) },
      last_updated: "2026-05-31T18:00:00.000Z",
    },
  ]);
}

const scan = await runCryptoScannerProScan({
  pages: [1],
  fetchImpl: mockFetch,
  filters: { symbolFilter: "XLM BTC", minChange: 0, minVolume: "any", signalTypes: [] },
});

assert.equal(scan.rows.length, 2);
const xlm = scan.rows.find((row) => row.symbol === "XLM");
assert.equal(xlm.assetType, "crypto");
assert.equal(xlm.provider, "CoinGecko");
assert.notEqual(xlm.provider, "FINNHUB");
assert.equal(xlm.binancePair, "XLMUSDT");
assert.ok(["BREAKOUT", "MOMENTUM", "SURGE", "HYPER"].includes(xlm.signal));
assert.equal(scan.categoryHeat.find((item) => item.category === "Layer 1").dataQuality, "RECENT");

const unavailableHeat = computeCryptoCategoryHeat([]);
assert.equal(unavailableHeat.find((item) => item.category === "DeFi").label, "Unavailable");

console.log("crypto scanner pro tab checks passed");
