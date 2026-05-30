import assert from "node:assert/strict";
import { runAIHeatmapScan } from "../services/marketData/aiHeatmapScanEngine.js";
import { tradingViewSymbolFor } from "../services/marketData/aiHeatmapDataService.js";

const cryptoUniverse = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin", category: "Bitcoin", binancePair: "BTCUSDT" },
  { symbol: "XLM", name: "Stellar", id: "stellar", category: "Payments", binancePair: "XLMUSDT" },
];

const stockUniverse = [
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", sector: "Semiconductors" },
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const sparkline = Array.from({ length: 48 }, (_, index) => 0.10 + index * 0.001 + (index % 5) * 0.0005);

async function mockFetch(url) {
  const value = String(url);
  if (value.includes("coins/markets") || value.includes("coingecko/markets")) {
    return jsonResponse([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        current_price: 68000,
        price_change_24h: 150,
        price_change_percentage_24h_in_currency: 1.2,
        high_24h: 69000,
        low_24h: 66000,
        total_volume: 22000000000,
        market_cap: 1330000000000,
        circulating_supply: 19700000,
        market_cap_rank: 1,
        sparkline_in_7d: { prices: sparkline.map((price) => price * 680000) },
      },
      {
        id: "stellar",
        symbol: "xlm",
        name: "Stellar",
        current_price: 0.12,
        price_change_24h: 0.003,
        price_change_percentage_24h_in_currency: 2.5,
        high_24h: 0.13,
        low_24h: 0.115,
        total_volume: 185000000,
        market_cap: 3600000000,
        circulating_supply: 30000000000,
        market_cap_rank: 42,
        sparkline_in_7d: { prices: sparkline },
      },
    ]);
  }
  if (value.includes("ticker/24hr")) {
    return jsonResponse([
      { symbol: "BTCUSDT", lastPrice: "68100", priceChange: "200", priceChangePercent: "1.32", highPrice: "69200", lowPrice: "66100", quoteVolume: "23000000000" },
      { symbol: "XLMUSDT", lastPrice: "0.1234", priceChange: "0.004", priceChangePercent: "3.41", highPrice: "0.131", lowPrice: "0.114", quoteVolume: "190000000" },
    ]);
  }
  if (value.includes("finnhub.io") || value.includes("/finnhub/quote")) {
    return jsonResponse({ c: 200.5, d: 2.5, dp: 1.26, h: 205, l: 196, pc: 198, v: 55000000 });
  }
  throw new Error(`Unexpected URL ${value}`);
}

const cryptoScan = await runAIHeatmapScan({
  mode: "crypto",
  cryptoUniverse,
  fetchImpl: mockFetch,
  stageDelayMs: 0,
});

const xlm = cryptoScan.rows.find((row) => row.symbol === "XLM");
assert.equal(cryptoScan.mode, "crypto");
assert.equal(xlm.assetType, "crypto");
assert.equal(xlm.provider, "CoinGecko/Binance");
assert.equal(xlm.price, 0.1234);
assert.notEqual(xlm.provider, "FINNHUB");
assert.equal(xlm.supportResistanceSource, "PROVISIONAL_DAY_RANGE");
assert.equal(xlm.support, 0.114);
assert.equal(xlm.resistance, 0.131);
assert.ok(Number.isFinite(xlm.rsi), "RSI should calculate from supplied sparkline data");
assert.notEqual(xlm.macdSignal, "Unavailable", "MACD should calculate from supplied sparkline data");
assert.equal(tradingViewSymbolFor(xlm), "BINANCE:XLMUSDT");

const stockScan = await runAIHeatmapScan({
  mode: "stocks",
  stockUniverse,
  fetchImpl: mockFetch,
  settings: { finnhubKey: "test-key", moomoo: { enabled: false } },
  stageDelayMs: 0,
});

const nvda = stockScan.rows.find((row) => row.symbol === "NVDA");
assert.equal(stockScan.mode, "stocks");
assert.equal(nvda.assetType, "stock");
assert.equal(nvda.provider, "FINNHUB");
assert.equal(nvda.price, 200.5);
assert.equal(nvda.dayHigh, 205);
assert.equal(nvda.dayLow, 196);
assert.equal(nvda.supportResistanceSource, "PROVISIONAL_DAY_RANGE");
assert.equal(tradingViewSymbolFor(nvda), "NASDAQ:NVDA");

console.log("aiHeatmap tests passed");
