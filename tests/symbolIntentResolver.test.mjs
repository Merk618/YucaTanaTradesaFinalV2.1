import assert from "node:assert/strict";
import { resolveSymbolIntent } from "../services/ai/symbolIntentResolver.js";

const selectedNvdaState = {
  activeTab: "stocks",
  selectedSymbol: "NVDA",
  selectedAssetType: "stock",
  stockQuotes: {
    NVDA: { symbol: "NVDA", price: 199.57, changePct: -4.93, source: "Finnhub" },
  },
  cryptoMarkets: {
    XLM: { symbol: "XLM", name: "Stellar", current_price: 0.1234, price_change_percentage_24h: 2.5, market_cap: 1000 },
    BTC: { symbol: "BTC", name: "Bitcoin", current_price: 65000, price_change_percentage_24h: 1.1 },
    SUI: { symbol: "SUI", name: "Sui", current_price: 3.25, price_change_percentage_24h: -0.4 },
  },
};

const settings = {
  apiProxyBase: "",
  finnhubKey: "",
  moomoo: {
    enabled: false,
    bridgeUrl: "http://127.0.0.1:8765",
    primaryStocks: true,
    optionsEnabled: false,
  },
};

const failingFetch = async () => {
  throw new Error("network disabled in test");
};

async function main() {
  const xlm = await resolveSymbolIntent({ query: "XLM Price", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(xlm.assetType, "crypto");
  assert.equal(xlm.selectedAsset.symbol, "XLM");
  assert.equal(xlm.metadata.requestedSymbol, "XLM");
  assert.equal(xlm.metadata.resolvedSymbol, "XLM");
  assert.equal(xlm.metadata.primaryDataSource, "CoinGecko/Binance");
  assert.equal(xlm.metadata.fallbackUsed, false);
  assert.ok(!xlm.directAnswer.answer.includes("NVDA"));

  const btc = await resolveSymbolIntent({ query: "BTC price", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(btc.assetType, "crypto");
  assert.equal(btc.selectedAsset.symbol, "BTC");

  const sui = await resolveSymbolIntent({ query: "SUI price", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(sui.assetType, "crypto");
  assert.equal(sui.selectedAsset.symbol, "SUI");

  const pepe = await resolveSymbolIntent({ query: "PEPE price", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(pepe.assetType, "crypto");
  assert.equal(pepe.selectedAsset.symbol, "PEPE");
  assert.ok(pepe.directAnswer.answer.includes("PEPE price is unavailable"));

  const nvda = await resolveSymbolIntent({ query: "NVDA price", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(nvda.assetType, "stock");
  assert.equal(nvda.selectedAsset.symbol, "NVDA");
  assert.equal(nvda.metadata.fallbackUsed, true);
  assert.equal(nvda.selectedAsset.quote.provider, "FINNHUB");

  const sofi = await resolveSymbolIntent({ query: "SOFI options", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(sofi.assetType, "option_chain");
  assert.equal(sofi.selectedAsset.symbol, "SOFI");
  assert.equal(sofi.directAnswer.dataQuality, "UNAVAILABLE");
  assert.ok(sofi.directAnswer.answer.includes("no fake options"));

  const selected = await resolveSymbolIntent({ query: "Analyze this setup", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(selected.explicit, false);
  assert.equal(selected.selectedAsset.symbol, "NVDA");

  const xlmSetup = await resolveSymbolIntent({ query: "XLM setup", state: selectedNvdaState, settings, fetchImpl: failingFetch });
  assert.equal(xlmSetup.explicit, true);
  assert.equal(xlmSetup.assetType, "crypto");
  assert.equal(xlmSetup.selectedAsset.symbol, "XLM");
}

main().then(() => {
  console.log("symbolIntentResolver tests passed");
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
