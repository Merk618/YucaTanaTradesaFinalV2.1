const RSI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;

function finite(value) {
  return Number.isFinite(Number(value));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(digits));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function compactMissing(fields = []) {
  return [...new Set(fields.filter(Boolean))];
}

function cleanSeries(series = []) {
  return Array.isArray(series)
    ? series.map(numberOrNull).filter((value) => value != null && value > 0)
    : [];
}

function average(values = []) {
  const clean = values.filter((value) => Number.isFinite(Number(value)));
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + Number(value), 0) / clean.length;
}

function ema(values = [], period = 12) {
  const clean = cleanSeries(values);
  if (clean.length < period) return [];
  const multiplier = 2 / (period + 1);
  const output = [];
  let previous = average(clean.slice(0, period));
  for (let index = 0; index < clean.length; index += 1) {
    if (index < period - 1) {
      output.push(null);
      continue;
    }
    if (index === period - 1) {
      output.push(previous);
      continue;
    }
    previous = (clean[index] - previous) * multiplier + previous;
    output.push(previous);
  }
  return output;
}

export function calculateRSI(series = [], period = RSI_PERIOD) {
  const clean = cleanSeries(series);
  if (clean.length <= period) return null;
  let gains = 0;
  let losses = 0;
  for (let index = clean.length - period; index < clean.length; index += 1) {
    const delta = clean[index] - clean[index - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0 && averageGain === 0) return 50;
  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return round(100 - (100 / (1 + relativeStrength)), 1);
}

export function classifyRSI(rsi) {
  if (!finite(rsi)) return "Unavailable";
  const value = Number(rsi);
  if (value >= 75) return "overextended";
  if (value >= 55) return "constructive";
  if (value >= 45) return "balanced";
  if (value >= 30) return "weak";
  return "oversold";
}

export function calculateMACD(series = []) {
  const clean = cleanSeries(series);
  if (clean.length < MACD_SLOW + MACD_SIGNAL) {
    return { macd: null, signal: null, histogram: null, bias: "Unavailable", state: "Unavailable" };
  }
  const fast = ema(clean, MACD_FAST);
  const slow = ema(clean, MACD_SLOW);
  const macdLine = fast.map((value, index) => (
    value == null || slow[index] == null ? null : value - slow[index]
  ));
  const validMacd = macdLine.filter((value) => value != null);
  const signalLine = ema(validMacd, MACD_SIGNAL);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  if (!finite(macd) || !finite(signal)) {
    return { macd: null, signal: null, histogram: null, bias: "Unavailable", state: "Unavailable" };
  }
  const histogram = macd - signal;
  const bias = histogram >= 0 ? "bullish" : "bearish";
  const priorMacd = macdLine[macdLine.length - 2];
  const priorSignal = signalLine[signalLine.length - 2];
  const crossedUp = finite(priorMacd) && finite(priorSignal) && priorMacd <= priorSignal && macd > signal;
  const crossedDown = finite(priorMacd) && finite(priorSignal) && priorMacd >= priorSignal && macd < signal;
  const state = crossedUp ? "bullish crossover" : crossedDown ? "bearish crossover" : `${bias} bias`;
  return {
    macd: round(macd, 4),
    signal: round(signal, 4),
    histogram: round(histogram, 4),
    bias,
    state,
  };
}

function calculateRangeLevels(row = {}) {
  const dayLow = numberOrNull(row.dayLow ?? row.low_24h);
  const dayHigh = numberOrNull(row.dayHigh ?? row.high_24h);
  if (dayLow != null && dayHigh != null && dayHigh > dayLow) {
    return {
      support: dayLow,
      resistance: dayHigh,
      levelSource: "PROVISIONAL_DAY_RANGE",
      levelLabel: "Provisional day-range support/resistance",
    };
  }
  return {
    support: numberOrNull(row.support),
    resistance: numberOrNull(row.resistance),
    levelSource: row.support || row.resistance ? "SUPPLIED" : "UNAVAILABLE",
    levelLabel: row.support || row.resistance ? "Supplied technical levels" : "Support/resistance unavailable",
  };
}

function deriveScores(row = {}, rsi, macd) {
  const change = numberOrNull(row.changePct ?? row.changePercent ?? row.price_change_percentage_24h);
  const volume = numberOrNull(row.volume ?? row.total_volume);
  const marketCap = numberOrNull(row.marketCap ?? row.market_cap);
  const price = numberOrNull(row.price ?? row.current_price);
  const high = numberOrNull(row.dayHigh);
  const low = numberOrNull(row.dayLow);
  const rangePct = price && high && low && high > low ? ((high - low) / price) * 100 : null;

  const momentum = finite(rsi)
    ? clamp(Math.round((Number(rsi) - 35) * 1.45), 0, 100)
    : finite(change)
      ? clamp(Math.round(50 + Number(change) * 8), 0, 100)
      : null;
  const macdLift = macd?.bias === "bullish" ? 8 : macd?.bias === "bearish" ? -8 : 0;
  const strength = momentum == null ? null : clamp(momentum + macdLift, 0, 100);
  const volatility = rangePct == null
    ? finite(change) ? clamp(Math.round(Math.abs(Number(change)) * 12), 0, 100) : null
    : clamp(Math.round(rangePct * 8), 0, 100);
  const volumeSpike = volume && marketCap ? round((volume / marketCap) * 100, 2) : null;

  return { momentum, strength, volatility, volumeSpike };
}

function distancePct(price, level, direction = "reward") {
  if (!finite(price) || !finite(level) || Number(price) <= 0) return null;
  const value = direction === "risk"
    ? ((Number(price) - Number(level)) / Number(price)) * 100
    : ((Number(level) - Number(price)) / Number(price)) * 100;
  return round(value, 2);
}

function decisionFrom(row = {}) {
  const score = numberOrNull(row.marketBrain?.setupScore ?? row.setupScore);
  const quality = String(row.dataQuality || "").toUpperCase();
  const missingCount = Array.isArray(row.missingFields) ? row.missingFields.length : 0;
  if (quality === "UNAVAILABLE") return "WATCH / DATA UNAVAILABLE";
  if (score != null) {
    if (score >= 85) return "STRONG CANDIDATE / CONFIRMATION REQUIRED";
    if (score >= 70) return "CANDIDATE / MOMENTUM CONFIRMING";
    if (score >= 55) return "WATCH / WAIT FOR CONFIRMATION";
    if (score >= 40) return "WEAK / LOW QUALITY";
    return "AVOID / WEAK SETUP";
  }
  if (missingCount >= 5) return "WATCH / DATA PARTIAL";
  const change = numberOrNull(row.changePct ?? row.changePercent);
  const strength = numberOrNull(row.strength);
  if (change != null && strength != null && change > 0 && strength >= 60) return "CANDIDATE / MOMENTUM CONFIRMING";
  if (change != null && change < -3) return "AVOID / WEAK SETUP";
  return "NEUTRAL / WAIT FOR CONFIRMATION";
}

export function enrichAIHeatmapTechnicals(row = {}) {
  const price = numberOrNull(row.price ?? row.current_price);
  const series = cleanSeries(row.series || row.sparkline || row.sparklinePrices || []);
  const rsi = numberOrNull(row.rsi) ?? calculateRSI(series);
  const macd = row.macdBias || row.macdState
    ? { bias: row.macdBias || "Unavailable", state: row.macdState || row.macdSignal || "Unavailable" }
    : calculateMACD(series);
  const levels = calculateRangeLevels(row);
  const supportDistancePct = distancePct(price, levels.support, "risk");
  const resistanceDistancePct = distancePct(price, levels.resistance, "reward");
  const rewardToResistancePct = resistanceDistancePct;
  const riskToSupportPct = supportDistancePct;
  const riskRewardRatio = finite(rewardToResistancePct) && finite(riskToSupportPct) && Number(riskToSupportPct) > 0
    ? round(Number(rewardToResistancePct) / Number(riskToSupportPct), 2)
    : null;
  const derived = deriveScores(row, rsi, macd);
  const missingFields = compactMissing([
    price == null ? "price" : "",
    row.changePct == null && row.changePercent == null ? "changePct" : "",
    row.volume == null ? "volume" : "",
    rsi == null ? "rsi" : "",
    macd?.state === "Unavailable" ? "macd" : "",
    levels.levelSource === "UNAVAILABLE" ? "supportResistance" : "",
    row.vwap == null ? "vwap" : "",
    series.length < MACD_SLOW + MACD_SIGNAL ? "historicalCandles" : "",
  ]);
  const enriched = {
    ...row,
    price,
    rsi,
    rsiState: classifyRSI(rsi),
    macdBias: macd?.bias || "Unavailable",
    macdSignal: macd?.state || "Unavailable",
    support: levels.support,
    resistance: levels.resistance,
    supportDistancePct,
    resistanceDistancePct,
    rewardToResistancePct,
    riskToSupportPct,
    riskRewardRatio,
    supportResistanceSource: levels.levelSource,
    supportResistanceLabel: levels.levelLabel,
    vwap: numberOrNull(row.vwap),
    momentum: numberOrNull(row.momentum) ?? derived.momentum,
    strength: numberOrNull(row.strength) ?? derived.strength,
    relativeStrength: numberOrNull(row.relativeStrength) ?? derived.strength,
    volumeSpike: numberOrNull(row.volumeSpike) ?? derived.volumeSpike,
    volatility: numberOrNull(row.volatility) ?? derived.volatility,
    missingFields,
  };
  enriched.decision = row.decision || decisionFrom(enriched);
  enriched.deskRead = buildDeskRead(enriched);
  enriched.thesis = buildThesis(enriched);
  return enriched;
}

export function buildDeskRead(row = {}) {
  const parts = [];
  if (finite(row.changePct)) {
    parts.push(`${row.symbol} is ${Number(row.changePct) >= 0 ? "green" : "red"} by ${Number(row.changePct).toFixed(2)}% on the connected provider snapshot.`);
  } else {
    parts.push(`${row.symbol || "This asset"} has no connected change percentage yet.`);
  }
  if (row.supportResistanceSource === "PROVISIONAL_DAY_RANGE") {
    parts.push("Support and resistance are provisional day-range levels, not a full technical model.");
  } else if (row.supportResistanceSource === "UNAVAILABLE") {
    parts.push("Support/resistance is unavailable until candle or range data is connected.");
  }
  if (finite(row.rsi)) parts.push(`RSI reads ${Number(row.rsi).toFixed(1)} (${row.rsiState}).`);
  else parts.push("RSI is unavailable without enough historical price series.");
  if (row.macdSignal && row.macdSignal !== "Unavailable") parts.push(`MACD shows ${row.macdSignal}.`);
  else parts.push("MACD is unavailable without enough historical price series.");
  return parts.join(" ");
}

export function buildThesis(row = {}) {
  const potential = [];
  const fail = [];
  const confirm = [];

  if (finite(row.changePct) && Number(row.changePct) > 0) potential.push("Connected price change is positive on the current scan.");
  if (finite(row.strength) && Number(row.strength) >= 60) potential.push("Derived strength score is above the neutral zone.");
  if (row.macdBias === "bullish") potential.push("MACD bias is constructive from supplied series data.");
  if (finite(row.volume) && Number(row.volume) > 0) potential.push("Volume/liquidity field is present from the provider.");

  if (finite(row.changePct) && Number(row.changePct) < 0) fail.push("Current scan change is negative.");
  if (finite(row.rsi) && Number(row.rsi) >= 75) fail.push("RSI is overextended, raising chase risk.");
  if (finite(row.volatility) && Number(row.volatility) >= 70) fail.push("Derived volatility is elevated.");
  if ((row.missingFields || []).length) fail.push(`Missing data: ${(row.missingFields || []).slice(0, 4).join(", ")}.`);

  if (row.supportResistanceSource === "PROVISIONAL_DAY_RANGE") confirm.push("Confirm provisional day-range levels with fuller candle history.");
  if (!finite(row.riskRewardRatio)) confirm.push("Connect support/resistance data to validate risk/reward.");
  if (!finite(row.rsi) || row.macdSignal === "Unavailable") confirm.push("Connect enough historical candles for RSI/MACD.");
  if (finite(row.volumeSpike)) confirm.push("Watch whether volume participation remains above baseline.");

  return {
    potential: potential.length ? potential : ["Potential case is unavailable from supplied data."],
    fail: fail.length ? fail : ["Bear/risk case is unavailable from supplied data."],
    confirm: confirm.length ? confirm : ["Wait for price, volume, and risk/reward confirmation."],
  };
}
