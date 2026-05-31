export const SUPPORTED_BINANCE_PAIRS = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  XLM: "XLMUSDT",
  SUI: "SUIUSDT",
  BNB: "BNBUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  DOGE: "DOGEUSDT",
  DOT: "DOTUSDT",
  LINK: "LINKUSDT",
  MATIC: "MATICUSDT",
  UNI: "UNIUSDT",
  SHIB: "SHIBUSDT",
  PEPE: "PEPEUSDT",
  LTC: "LTCUSDT",
  BCH: "BCHUSDT",
  ATOM: "ATOMUSDT",
  FIL: "FILUSDT",
  APT: "APTUSDT",
  ARB: "ARBUSDT",
  OP: "OPUSDT",
  AAVE: "AAVEUSDT",
  CRV: "CRVUSDT",
  MKR: "MKRUSDT",
  INJ: "INJUSDT",
  SEI: "SEIUSDT",
  TON: "TONUSDT",
  NEAR: "NEARUSDT",
  FLOKI: "FLOKIUSDT",
  BONK: "BONKUSDT",
  WIF: "WIFUSDT",
};

export const CRYPTO_CATEGORY_MAP = {
  "Layer 1": ["BTC", "ETH", "SOL", "ADA", "AVAX", "SUI", "XRP", "BNB", "NEAR", "ATOM", "DOT"],
  "Layer 2": ["ARB", "OP", "MATIC", "STRK", "IMX"],
  DeFi: ["UNI", "AAVE", "LINK", "CRV", "MKR", "LDO", "RUNE", "INJ"],
  Meme: ["DOGE", "SHIB", "PEPE", "WIF", "BONK", "FLOKI"],
  "NFT/Gaming": ["IMX", "SAND", "MANA", "GALA", "AXS", "RON"],
  "RWA/Utility": ["ONDO", "HBAR", "GRT", "FET", "RNDR", "FIL", "TAO"],
};

const SIGNAL_ORDER = ["HYPER", "SURGE", "BREAKOUT", "MOMENTUM", "REVERSAL", "SUPPORT", "OVERBOUGHT", "NEUTRAL"];

export function normalizeCryptoScannerSymbol(symbol = "") {
  return String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function binancePairForSymbol(symbol = "") {
  return SUPPORTED_BINANCE_PAIRS[normalizeCryptoScannerSymbol(symbol)] || "";
}

export function cryptoCategoryForSymbol(symbol = "") {
  const normalized = normalizeCryptoScannerSymbol(symbol);
  for (const [category, symbols] of Object.entries(CRYPTO_CATEGORY_MAP)) {
    if (symbols.includes(normalized)) return category;
  }
  return "Unmapped";
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function numeric(value, fallback = 0) {
  return finite(value) ? Number(value) : fallback;
}

export function classifyCryptoSignal(row = {}) {
  const change1h = numeric(row.change1h, 0);
  const change24h = numeric(row.change24h ?? row.changePct, 0);
  const change7d = numeric(row.change7d, 0);
  const volume = numeric(row.volume, 0);
  const marketCap = numeric(row.marketCap, 0);
  const rsi = Number(row.rsi);

  if (Number.isFinite(rsi) && rsi >= 75) {
    return {
      signal: "OVERBOUGHT",
      source: "RSI model",
      reason: "RSI is elevated from supplied technical data.",
    };
  }
  if ((change24h >= 16 || change1h >= 5) && volume >= 100_000_000) {
    return {
      signal: "HYPER",
      source: "price-change model",
      reason: "Large short-term move with meaningful reported volume.",
    };
  }
  if (change24h >= 10 || (change1h >= 3 && volume >= 50_000_000)) {
    return {
      signal: "SURGE",
      source: "price-change model",
      reason: "Strong recent upside pressure from provider snapshot.",
    };
  }
  if (change24h >= 6 && change7d >= 0) {
    return {
      signal: "BREAKOUT",
      source: "price-change model",
      reason: "24h strength is aligned with a non-negative 7d backdrop.",
    };
  }
  if (change24h >= 2.5 && change7d >= 1) {
    return {
      signal: "MOMENTUM",
      source: "price-change model",
      reason: "Short-term and weekly price change are both constructive.",
    };
  }
  if (change24h > 0.75 && change7d <= -7) {
    return {
      signal: "REVERSAL",
      source: "price-change model",
      reason: "Positive 24h move is emerging after a weak 7d stretch.",
    };
  }
  if (Math.abs(change24h) <= 1.25 && (marketCap >= 1_000_000_000 || row.rank <= 80)) {
    return {
      signal: "SUPPORT",
      source: "price-change model",
      reason: "Large-cap token is consolidating near flat daily change.",
    };
  }
  return {
    signal: "NEUTRAL",
    source: "price-change model",
    reason: "No strong scanner signal was detected from supplied fields.",
  };
}

export function volumeThresholdValue(volumeFilter = "any") {
  switch (String(volumeFilter || "any").toLowerCase()) {
    case "medium":
      return 50_000_000;
    case "high":
      return 250_000_000;
    case "very_high":
      return 1_000_000_000;
    default:
      return 0;
  }
}

export function parseSymbolFilter(value = "") {
  return String(value || "")
    .split(/[\s,]+/)
    .map(normalizeCryptoScannerSymbol)
    .filter(Boolean);
}

export function filterCryptoScannerRows(rows = [], filters = {}) {
  const symbols = parseSymbolFilter(filters.symbolFilter);
  const allowedSignals = new Set((filters.signalTypes || []).map((item) => String(item).toUpperCase()));
  const minChange = numeric(filters.minChange, 0);
  const minVolume = volumeThresholdValue(filters.minVolume);
  return rows.filter((row) => {
    const symbol = normalizeCryptoScannerSymbol(row.symbol);
    if (symbols.length && !symbols.includes(symbol)) return false;
    if (Math.abs(numeric(row.change24h ?? row.changePct, 0)) < minChange) return false;
    if (numeric(row.volume, 0) < minVolume) return false;
    if (allowedSignals.size && !allowedSignals.has(String(row.signal || "").toUpperCase())) return false;
    return true;
  });
}

export function computeCryptoCategoryHeat(rows = []) {
  return Object.entries(CRYPTO_CATEGORY_MAP).map(([category, symbols]) => {
    const matching = rows.filter((row) => symbols.includes(normalizeCryptoScannerSymbol(row.symbol)) && finite(row.change24h ?? row.changePct));
    if (!matching.length) {
      return {
        category,
        value: null,
        label: "Unavailable",
        count: 0,
        dataQuality: "UNAVAILABLE",
      };
    }
    const avg = matching.reduce((sum, row) => sum + Number(row.change24h ?? row.changePct), 0) / matching.length;
    return {
      category,
      value: avg,
      label: `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}%`,
      count: matching.length,
      dataQuality: "RECENT",
    };
  });
}

export function buildCryptoTopMovers(rows = [], limit = 5) {
  return rows
    .filter((row) => finite(row.change24h ?? row.changePct))
    .slice()
    .sort((a, b) => Number(b.change24h ?? b.changePct) - Number(a.change24h ?? a.changePct))
    .slice(0, limit);
}

export function buildCryptoSignalAlerts(rows = [], timestamp = new Date().toISOString()) {
  const alerts = [];
  const sorted = rows.slice().sort((a, b) => Math.abs(Number((b.change24h ?? b.changePct) || 0)) - Math.abs(Number((a.change24h ?? a.changePct) || 0)));
  for (const row of sorted) {
    if (alerts.length >= 6) break;
    const signal = String(row.signal || "NEUTRAL").toUpperCase();
    const change = numeric(row.change24h ?? row.changePct, 0);
    const volume = numeric(row.volume, 0);
    if (["HYPER", "SURGE", "BREAKOUT", "MOMENTUM", "REVERSAL", "OVERBOUGHT"].includes(signal)) {
      alerts.push({
        symbol: row.symbol,
        label: signal,
        detail: `${row.symbol} ${signal.toLowerCase()} from ${row.signalSource || "price-change model"}.`,
        timestamp,
      });
    } else if (volume >= 1_000_000_000 && Math.abs(change) >= 2) {
      alerts.push({
        symbol: row.symbol,
        label: "VOLUME SURGE",
        detail: `${row.symbol} reported heavy 24h volume with ${change >= 0 ? "+" : ""}${change.toFixed(2)}% move.`,
        timestamp,
      });
    }
  }
  return alerts;
}

export function signalRank(signal = "NEUTRAL") {
  const index = SIGNAL_ORDER.indexOf(String(signal).toUpperCase());
  return index === -1 ? SIGNAL_ORDER.length : index;
}
