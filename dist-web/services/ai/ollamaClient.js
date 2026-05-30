import { normalizeOllamaResponse, unavailableOllamaResponse } from "./ollamaNormalizer.js";
import { STOCK_REASONING_SYSTEM_PROMPT, buildStockReasoningPrompt } from "./stockReasoningPrompt.js";

export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";
export const DEFAULT_OLLAMA_MODEL = "qwen2.5:7b";

export class OllamaClientError extends Error {
  constructor(message, code = "OLLAMA_ERROR", status = null) {
    super(message);
    this.name = "OllamaClientError";
    this.code = code;
    this.status = status;
  }
}

function cleanEndpoint(endpoint = DEFAULT_OLLAMA_ENDPOINT) {
  return String(endpoint || DEFAULT_OLLAMA_ENDPOINT).trim().replace(/\/+$/, "");
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new OllamaClientError("Local AI request timed out. Confirm Ollama is running.", "OLLAMA_TIMEOUT");
    }
    throw new OllamaClientError("Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running.", "OLLAMA_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonSafely(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new OllamaClientError("Invalid response from local Ollama.", "OLLAMA_INVALID_RESPONSE", response.status);
  }
}

function classifyOllamaStatus(status, payload = {}) {
  const message = payload.error || "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running.";
  if (status === 404) return new OllamaClientError("Ollama model unavailable. Pull qwen2.5:7b or update the model setting.", "OLLAMA_MODEL_UNAVAILABLE", status);
  return new OllamaClientError(message, "OLLAMA_UNAVAILABLE", status);
}

export function createOllamaClient({ endpoint = DEFAULT_OLLAMA_ENDPOINT, model = DEFAULT_OLLAMA_MODEL, fetchImpl = globalThis.fetch, timeoutMs = 30000 } = {}) {
  const base = cleanEndpoint(endpoint);
  const selectedModel = String(model || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL;
  if (!fetchImpl) throw new OllamaClientError("Fetch implementation unavailable.", "FETCH_UNAVAILABLE");

  async function askStockReasoning(request = {}) {
    const prompt = buildStockReasoningPrompt(request);
    const response = await fetchWithTimeout(fetchImpl, `${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        stream: false,
        messages: [
          { role: "system", content: STOCK_REASONING_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    }, timeoutMs);
    const payload = await readJsonSafely(response);
    if (!response.ok) throw classifyOllamaStatus(response.status, payload);
    return normalizeOllamaResponse(payload, { model: selectedModel });
  }

  async function healthCheck() {
    const started = Date.now();
    try {
      const response = await fetchWithTimeout(fetchImpl, `${base}/api/tags`, {
        method: "GET",
        headers: { "Accept": "application/json" },
      }, Math.min(timeoutMs, 12000));
      const payload = await readJsonSafely(response);
      if (!response.ok) throw classifyOllamaStatus(response.status, payload);
      const models = Array.isArray(payload.models) ? payload.models.map((item) => item.name || item.model || "").filter(Boolean) : [];
      return {
        status: "RUNNING",
        endpoint: base,
        model: selectedModel,
        modelInstalled: models.includes(selectedModel),
        models,
        latencyMs: Date.now() - started,
        lastSuccessAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: error?.code === "OLLAMA_INVALID_RESPONSE" ? "ERROR" : "UNAVAILABLE",
        endpoint: base,
        model: selectedModel,
        latencyMs: Date.now() - started,
        lastSuccessAt: null,
        error: error?.message || "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running.",
      };
    }
  }

  return {
    askStockReasoning,
    healthCheck,
    unavailable: (message) => unavailableOllamaResponse(message, selectedModel),
  };
}
