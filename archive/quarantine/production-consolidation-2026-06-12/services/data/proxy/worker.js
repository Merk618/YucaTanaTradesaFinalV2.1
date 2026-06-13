const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json"
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

function requireEnv(env, key) {
  const value = env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

async function upstreamJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    return json({ error: `Upstream HTTP ${res.status}`, detail: text.slice(0, 500) }, res.status);
  }
  return new Response(text, { headers: CORS_HEADERS });
}

function sanitizeSymbol(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9.:-]/g, "").slice(0, 18);
}

function localAssistant(question, context) {
  const q = String(question || "").toUpperCase();
  const stocks = context?.stockQuotes || {};
  const cryptos = context?.cryptoMarkets || {};
  const stock = Object.keys(stocks).find(symbol => q.includes(symbol));
  const crypto = Object.keys(cryptos).find(symbol => q.includes(symbol));
  if (stock) {
    const item = stocks[stock];
    return `${stock}: last loaded quote is ${item.price ?? "unavailable"} from ${item.source || "unknown source"}. Change percent is ${item.changePct ?? "unavailable"}. RSI, MACD, ATR, options flow, and targets remain unavailable unless connected source data exists.`;
  }
  if (crypto) {
    const item = cryptos[crypto];
    return `${crypto}: CoinGecko price is ${item.current_price ?? "unavailable"}, 24h change is ${item.price_change_percentage_24h ?? "unavailable"}, and market cap is ${item.market_cap ?? "unavailable"}. Binance-only RSI/stream signals remain unavailable until mounted.`;
  }
  return "Ask about a loaded ticker, crypto symbol, source health, or a specific tab. I will only use connected data and will not fabricate market values.";
}

async function aiAssistant(request, env) {
  const { question, context } = await request.json();
  if (!env.OPENAI_API_KEY) {
    return json({ answer: localAssistant(question, context), mode: "local-proxy-fallback" });
  }

  const body = {
    model: env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: "You are YucaTana AI, a concise stock-market assistant inside YucaTanaTrades. Use only the provided context. Do not invent prices, indicators, targets, news, financial data, or broker/account values. If data is missing, say it is unavailable and name the source needed. This is informational, not financial advice."
      },
      {
        role: "user",
        content: JSON.stringify({ question, context }, null, 2)
      }
    ]
  };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) return json({ error: "AI request failed", detail: data }, res.status);
  const answer = data.output_text
    || data.output?.flatMap(item => item.content || []).map(part => part.text || "").join("\n").trim()
    || "AI response returned no text.";
  return json({ answer, mode: "openai" });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

    const url = new URL(request.url);
    try {
      if (url.pathname === "/health") {
        return json({
          service: "YucaTanaTrades API Proxy",
          ok: true,
          providers: {
            finnhub: Boolean(env.FINNHUB_API_KEY),
            tradier: Boolean(env.TRADIER_API_KEY),
            alpaca: Boolean(env.ALPACA_API_KEY && env.ALPACA_SECRET_KEY),
            openai: Boolean(env.OPENAI_API_KEY),
            coingecko: true
          }
        });
      }

      if (url.pathname === "/finnhub/quote") {
        const symbol = sanitizeSymbol(url.searchParams.get("symbol"));
        if (!symbol) return json({ error: "Missing symbol" }, 400);
        const token = requireEnv(env, "FINNHUB_API_KEY");
        return upstreamJson(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`);
      }

      if (url.pathname === "/coingecko/ping") {
        return upstreamJson("https://api.coingecko.com/api/v3/ping");
      }

      if (url.pathname === "/coingecko/markets") {
        const upstream = new URL("https://api.coingecko.com/api/v3/coins/markets");
        url.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
        return upstreamJson(upstream.toString());
      }

      if (url.pathname === "/tradier/quotes") {
        const symbols = String(url.searchParams.get("symbols") || "").replace(/[^A-Z0-9,.-]/gi, "");
        if (!symbols) return json({ error: "Missing symbols" }, 400);
        const token = requireEnv(env, "TRADIER_API_KEY");
        const base = env.TRADIER_BASE_URL || "https://sandbox.tradier.com/v1";
        return upstreamJson(`${base.replace(/\/+$/, "")}/markets/quotes?symbols=${symbols}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        });
      }

      if (url.pathname === "/alpaca/account") {
        const key = requireEnv(env, "ALPACA_API_KEY");
        const secret = requireEnv(env, "ALPACA_SECRET_KEY");
        const base = env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";
        return upstreamJson(`${base.replace(/\/+$/, "")}/v2/account`, {
          headers: { "APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret }
        });
      }

      if (url.pathname === "/ai/stock-assistant" && request.method === "POST") {
        return aiAssistant(request, env);
      }

      return json({ error: "Route not found" }, 404);
    } catch (error) {
      return json({ error: error.message || "Proxy error" }, 500);
    }
  }
};
