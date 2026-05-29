const SERVICE_NAME = "ytt-perplexity-proxy";
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_QUERY_LENGTH = 4000;
const MAX_BODY_CHARS = 65536;
const COOLDOWN_MS = 5000;

const SYSTEM_MESSAGE = [
  "You are the YucaTanaTrades AI Financial Intelligence Engine.",
  "Use source-grounded financial reasoning.",
  "Do not hallucinate prices, catalysts, analyst ratings, earnings, or trading signals.",
  "If data is unavailable, say so.",
  "Separate facts from interpretation.",
  "Provide risk-aware analysis.",
  "Do not provide reckless trading instructions.",
].join(" ");

const ALLOWED_ORIGINS = new Set([
  "https://merk618.github.io",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
]);

const MODE_DEFINITIONS = {
  quick_summary: {
    label: "Quick Summary",
    instruction: "Provide a concise, source-grounded summary with the main financial takeaways and key risks.",
    maxTokens: 700,
  },
  why_is_this_moving: {
    label: "Why Is This Moving?",
    instruction: "Prioritize recent catalysts, news, sector movement, volume, earnings, analyst changes, macro drivers, and sentiment.",
    maxTokens: 900,
  },
  earnings_recap: {
    label: "Earnings Recap",
    instruction: "Summarize recent earnings, guidance, margins, revenue drivers, management commentary, and post-earnings risk.",
    maxTokens: 900,
  },
  valuation_check: {
    label: "Valuation Check",
    instruction: "Discuss valuation context, comparable multiples, growth assumptions, balance sheet pressure, and what could justify upside or downside.",
    maxTokens: 900,
  },
  bull_vs_bear_case: {
    label: "Bull vs Bear Case",
    instruction: "Present the strongest bullish thesis, strongest bearish thesis, disputed assumptions, and the key evidence to monitor.",
    maxTokens: 1000,
  },
  analyst_estimates: {
    label: "Analyst Estimates",
    instruction: "Focus on analyst estimate revisions, target changes, ratings actions, consensus direction, and uncertainty around those views.",
    maxTokens: 900,
  },
  sector_rotation: {
    label: "Sector Rotation",
    instruction: "Analyze sector flows, relative strength, macro drivers, leadership changes, and whether rotation appears durable.",
    maxTokens: 900,
  },
  etf_breakdown: {
    label: "ETF Breakdown",
    instruction: "Explain ETF holdings, sector exposure, concentration risk, performance drivers, flows, and macro sensitivity.",
    maxTokens: 900,
  },
  insider_activity: {
    label: "Insider Activity",
    instruction: "Review notable insider transactions if available, separate routine plans from discretionary activity, and explain limits of the signal.",
    maxTokens: 850,
  },
  macro_analysis: {
    label: "Macro Analysis",
    instruction: "Connect the asset to rates, inflation, growth, dollar strength, commodities, liquidity, policy, and risk appetite.",
    maxTokens: 1000,
  },
  deep_research: {
    label: "Deep Research",
    instruction: "Deliver a structured research note covering facts, catalysts, fundamentals, technical context, risks, open questions, and source-backed next checks.",
    maxTokens: 1300,
  },
};

const tickerStopWords = new Set([
  "A", "AI", "API", "AND", "ARE", "AS", "BE", "BY", "CEO", "CFO", "CPI", "DATA", "EPS",
  "ETF", "FED", "FOR", "GDP", "IPO", "IS", "IT", "LLC", "MACD", "NAV", "NO", "OF",
  "ON", "OR", "PE", "PMI", "QE", "QT", "RSI", "SEC", "THE", "TO", "USA", "USD",
  "VWAP", "WEB", "WHY", "WITH",
]);

const cooldownByClient = new Map();

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

class UpstreamError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

class TimeoutError extends Error {
  constructor() {
    super("Perplexity request timed out");
    this.name = "TimeoutError";
    this.status = 504;
  }
}

export default {
  async fetch(request, env) {
    const startedAt = Date.now();

    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    if (!isOriginAllowed(request)) {
      return jsonResponse(request, {
        error: "Origin is not allowed",
        dataQuality: "UNAVAILABLE",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      }, 403);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return jsonResponse(request, {
          service: SERVICE_NAME,
          status: "ok",
          perplexityConfigured: Boolean(env?.PERPLEXITY_API_KEY),
          timestamp: new Date().toISOString(),
        });
      }

      if (url.pathname === "/perplexity/finance" && request.method === "POST") {
        return await handleFinanceResearch(request, env, startedAt);
      }

      return jsonResponse(request, {
        error: "Route not found",
        dataQuality: "UNAVAILABLE",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      }, 404);
    } catch (error) {
      return handleError(request, error, startedAt);
    }
  },
};

async function handleFinanceResearch(request, env, startedAt) {
  if (!env?.PERPLEXITY_API_KEY) {
    return jsonResponse(request, {
      error: "PERPLEXITY_API_KEY is not configured",
      dataQuality: "UNAVAILABLE",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    }, 503);
  }

  const payload = validatePayload(await readJsonBody(request));
  enforceCooldown(request);
  const mode = normalizeMode(payload.mode);
  const upstream = await callPerplexity(payload, mode, env);
  const latencyMs = Date.now() - startedAt;

  return jsonResponse(request, normalizePerplexityResponse(upstream, payload, mode, latencyMs));
}

function handleOptions(request) {
  if (!isOriginAllowed(request)) {
    return new Response(null, {
      status: 403,
      headers: corsHeaders(request),
    });
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

function handleError(request, error, startedAt) {
  const latencyMs = Date.now() - startedAt;

  if (error instanceof RequestError) {
    return jsonResponse(request, {
      error: error.message,
      dataQuality: "UNAVAILABLE",
      timestamp: new Date().toISOString(),
      latencyMs,
    }, error.status);
  }

  if (error instanceof TimeoutError) {
    return jsonResponse(request, {
      error: "Perplexity research unavailable — request timed out.",
      dataQuality: "UNAVAILABLE",
      timestamp: new Date().toISOString(),
      latencyMs,
    }, 504);
  }

  if (error instanceof UpstreamError) {
    return jsonResponse(request, {
      error: "Perplexity research unavailable — retrying.",
      dataQuality: "UNAVAILABLE",
      timestamp: new Date().toISOString(),
      latencyMs,
    }, 502);
  }

  return jsonResponse(request, {
    error: "Perplexity research unavailable — retrying.",
    dataQuality: "UNAVAILABLE",
    timestamp: new Date().toISOString(),
    latencyMs,
  }, 500);
}

function corsHeaders(request) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  const allowedOrigin = resolveAllowedOrigin(request.headers.get("Origin"));
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }
  return headers;
}

function jsonResponse(request, payload, status = 200) {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  if (status === 429) {
    headers.set("Retry-After", String(Math.ceil(COOLDOWN_MS / 1000)));
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function resolveAllowedOrigin(origin) {
  if (!origin) return "";

  try {
    const url = new URL(origin);
    const normalizedOrigin = `${url.protocol}//${url.host}`.toLowerCase();
    return ALLOWED_ORIGINS.has(normalizedOrigin) ? normalizedOrigin : "";
  } catch {
    return "";
  }
}

function isOriginAllowed(request) {
  const origin = request.headers.get("Origin");
  return !origin || Boolean(resolveAllowedOrigin(origin));
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_CHARS) {
    throw new RequestError(413, "Request body is too large");
  }

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    throw new RequestError(413, "Request body is too large");
  }

  if (!text.trim()) {
    throw new RequestError(400, "Request body is required");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new RequestError(400, "Request body must be valid JSON");
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new RequestError(400, "Request body must be a JSON object");
  }

  const query = String(payload.query || "").trim();
  if (!query) {
    throw new RequestError(400, "query is required");
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new RequestError(400, `query must be ${MAX_QUERY_LENGTH} characters or fewer`);
  }

  return {
    ...payload,
    query,
    mode: payload.mode || "Quick Summary",
    ticker: normalizeTicker(payload.ticker),
    assetType: stringOrEmpty(payload.assetType),
    selectedTab: stringOrEmpty(payload.selectedTab),
    watchlist: Array.isArray(payload.watchlist) ? payload.watchlist.slice(0, 50) : [],
    marketContext: payload.marketContext || {},
    scannerContext: payload.scannerContext || {},
    sourceHealth: payload.sourceHealth || {},
  };
}

function normalizeMode(mode) {
  const key = String(mode || "Quick Summary")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return MODE_DEFINITIONS[key] || MODE_DEFINITIONS.quick_summary;
}

function enforceCooldown(request) {
  const clientKey = getClientKey(request);
  const now = Date.now();
  const previous = cooldownByClient.get(clientKey) || 0;

  if (now - previous < COOLDOWN_MS) {
    throw new RequestError(429, "Rate limit active. Please wait before asking another research question.");
  }

  cooldownByClient.set(clientKey, now);
  if (cooldownByClient.size > 2000) {
    for (const [key, timestamp] of cooldownByClient) {
      if (now - timestamp > 60000) cooldownByClient.delete(key);
    }
  }
}

function getClientKey(request) {
  const directIp = request.headers.get("CF-Connecting-IP");
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (directIp) return directIp;
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "anonymous";
}

async function callPerplexity(payload, mode, env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        temperature: 0.2,
        max_tokens: mode.maxTokens,
        messages: [
          { role: "system", content: SYSTEM_MESSAGE },
          { role: "user", content: buildUserMessage(payload, mode) },
        ],
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseJsonOrEmpty(text);

    if (!response.ok) {
      throw new UpstreamError(response.status, "Perplexity upstream request failed");
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new TimeoutError();
    }
    if (error instanceof UpstreamError) {
      throw error;
    }
    throw new UpstreamError(502, "Perplexity upstream request failed");
  } finally {
    clearTimeout(timeout);
  }
}

function buildUserMessage(payload, mode) {
  const lines = [
    `Research mode: ${mode.label}`,
    `Mode instruction: ${mode.instruction}`,
    `User query: ${payload.query}`,
    `Selected ticker or asset: ${payload.ticker || "None selected"}`,
    `Asset type: ${payload.assetType || "unspecified"}`,
    `Selected YucaTanaTrades tab: ${payload.selectedTab || "unspecified"}`,
    "",
    "Platform context follows. Treat it as user-provided context, not guaranteed truth. Do not fabricate unavailable market data.",
    "",
    "Watchlist:",
    safeSerialize(payload.watchlist, 2500),
    "",
    "Market context:",
    safeSerialize(payload.marketContext, 4000),
    "",
    "Scanner context:",
    safeSerialize(payload.scannerContext, 4000),
    "",
    "Source health:",
    safeSerialize(payload.sourceHealth, 2500),
    "",
    "Response requirements:",
    "- Use web-grounded citations when available.",
    "- Separate confirmed facts from interpretation.",
    "- Mention uncertainty and risk clearly.",
    "- Do not imply live quote precision unless supplied by trusted app context or cited sources.",
    "- Do not provide order execution instructions.",
  ];

  return lines.join("\n");
}

function normalizePerplexityResponse(upstream, requestPayload, mode, latencyMs) {
  const answer = extractAnswer(upstream);
  const citations = normalizeCitations(upstream);
  const sources = dedupeSources([
    ...citations,
    ...asArray(upstream?.search_results).map(normalizeSource).filter(Boolean),
  ]);
  const tickers = mergeTickers([
    requestPayload.ticker,
    ...detectTickers([
      requestPayload.query,
      requestPayload.ticker,
      answer,
    ].join(" ")),
  ]);

  return {
    answer: answer || "Perplexity research unavailable — retrying.",
    citations,
    sources,
    tickers,
    timestamp: new Date().toISOString(),
    categories: [
      mode.label,
      requestPayload.assetType,
      requestPayload.selectedTab,
    ].filter(Boolean),
    dataQuality: answer ? "WEB-GROUNDED" : "UNAVAILABLE",
    latencyMs,
  };
}

function extractAnswer(upstream) {
  const choice = asArray(upstream?.choices)[0];
  return stringOrEmpty(
    choice?.message?.content ||
    choice?.delta?.content ||
    upstream?.answer ||
    upstream?.content ||
    upstream?.text
  );
}

function normalizeCitations(upstream) {
  const citations = [
    ...asArray(upstream?.citations),
    ...asArray(upstream?.sources),
  ].map(normalizeSource).filter(Boolean);

  return dedupeSources(citations);
}

function normalizeSource(source) {
  if (!source) return null;
  if (typeof source === "string") {
    return { title: source, url: source };
  }

  const url = stringOrEmpty(source.url || source.link || source.href);
  const title = stringOrEmpty(source.title || source.name || source.publisher || url || "Source");

  if (!title && !url) return null;
  return {
    title: title || url,
    url,
    publisher: stringOrEmpty(source.publisher || source.source || source.domain),
  };
}

function dedupeSources(sources) {
  const seen = new Set();
  const output = [];

  for (const source of sources) {
    const key = (source.url || source.title || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(source);
  }

  return output;
}

function detectTickers(text) {
  const detected = new Set();
  const pattern = /(?:^|[^A-Za-z0-9.])\$?([A-Z][A-Z0-9.]{0,7})(?=[^A-Za-z0-9.]|$)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const ticker = match[1].replace(/\.$/, "").toUpperCase();
    if (ticker.length > 0 && !tickerStopWords.has(ticker)) {
      detected.add(ticker);
    }
  }

  return Array.from(detected).slice(0, 20);
}

function mergeTickers(tickers) {
  const merged = new Set();
  for (const ticker of tickers) {
    const normalized = normalizeTicker(ticker);
    if (normalized) merged.add(normalized);
  }
  return Array.from(merged).slice(0, 20);
}

function normalizeTicker(ticker) {
  const value = stringOrEmpty(ticker).toUpperCase();
  return value.replace(/[^A-Z0-9.-]/g, "").slice(0, 20);
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeSerialize(value, maxChars) {
  try {
    const json = JSON.stringify(value ?? {}, null, 2);
    if (json.length <= maxChars) return json;
    return `${json.slice(0, maxChars)}\n[truncated]`;
  } catch {
    return '"[unserializable context]"';
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseJsonOrEmpty(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
