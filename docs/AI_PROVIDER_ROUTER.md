# AI Provider Router

YucaTanaTrades now routes AI requests between Perplexity and Local Ollama without replacing either provider.

## Providers

### Perplexity Research

Use Perplexity through `API_PROXY_BASE/perplexity/finance` for:

- latest news
- citations
- recent catalysts
- earnings recaps
- analyst changes
- SEC/news context
- "why is this moving today?"
- macro and sector research that needs web grounding

Perplexity remains proxy-only. No Perplexity key is stored in frontend code.

### Local Ollama

Use Ollama through `http://localhost:11434/api/chat` for:

- scanner summaries
- watchlist ranking explanations
- setup explanations
- RSI/MACD explanations
- support/resistance explanations when supplied
- risk/reward frameworks from supplied YucaTanaTrades data

Ollama responses use:

```json
{
  "provider": "OLLAMA",
  "dataQuality": "LOCAL_CONTEXT"
}
```

## Provider Selector

The AI panel supports:

- `Auto`
- `Perplexity Research`
- `Local Ollama`

Manual selection wins over auto routing.

## Auto Routing

Auto mode routes web-grounded requests to Perplexity when the proxy is configured. It routes internal-data reasoning requests to Ollama when Local AI is enabled.

If Perplexity is missing and Ollama is enabled, YucaTanaTrades may use Ollama only for internal-data-only answers. The local prompt explicitly forbids making up external market facts.

## Failure Behavior

- Missing Perplexity proxy: show proxy configuration guidance.
- Ollama unavailable: tell the user to start Ollama and confirm `http://localhost:11434`.
- Invalid provider response: show an invalid response error.
- Missing data: answer must label the field `Unavailable`.

The router never enables live trading and never calls broker execution.
