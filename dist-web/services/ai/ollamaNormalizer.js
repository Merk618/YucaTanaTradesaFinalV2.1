export function normalizeOllamaResponse(payload = {}, { model = "qwen2.5:7b", error = "" } = {}) {
  const data = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const answer = data.message?.content || data.response || data.answer || "";
  const hasError = Boolean(error || data.error);

  return {
    answer: answer || (hasError ? String(error || data.error) : "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running."),
    provider: "OLLAMA",
    model: data.model || model,
    timestamp: data.created_at || new Date().toISOString(),
    dataQuality: hasError ? "UNAVAILABLE" : "LOCAL_CONTEXT",
    sources: [],
    citations: [],
    error: hasError ? String(error || data.error) : "",
  };
}

export function unavailableOllamaResponse(message = "Local Ollama unavailable. Start Ollama and confirm http://127.0.0.1:11434 is running.", model = "qwen2.5:7b") {
  return normalizeOllamaResponse({}, { model, error: message });
}
