# Local AI / Ollama

YucaTanaTrades supports Ollama as a local, free reasoning provider. Ollama is not a market data source and must not be exposed publicly.

## Install

1. Install Ollama from the official Ollama installer.
2. Pull the default local model:

```bash
ollama pull qwen2.5:7b
```

3. Confirm Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

## YucaTanaTrades Settings

Open:

```text
Settings/Admin -> Local AI / Ollama
```

Defaults:

- Endpoint: `http://localhost:11434`
- Model: `qwen2.5:7b`
- Provider mode: `auto`

Use **Test Ollama** to call:

```text
GET http://localhost:11434/api/tags
```

If the request succeeds, Source Health shows `Local Ollama = RUNNING`.

## Security

Ollama has no API key field in YucaTanaTrades. It should remain local to your machine.

Do not expose `http://localhost:11434` through a public tunnel, public reverse proxy, GitHub Pages config, or Cloudflare route. The hosted frontend may call your own localhost only from your browser.

## Role

Ollama is for:

- scanner summaries
- watchlist ranking explanations
- setup explanations
- RSI/MACD explanations
- risk/reward frameworks from supplied data
- context-only analysis of loaded YucaTanaTrades data

Ollama is not for:

- live quotes
- latest news
- cited web research
- SEC filing retrieval
- analyst estimate retrieval
- broker execution
- trade placement

If Ollama is unavailable, the UI shows:

```text
Local AI unavailable. Start Ollama and confirm http://localhost:11434 is running.
```
