# Broker Execution Safety

This phase does not add broker execution.

Hard boundaries:
- Live trading disabled.
- No order placement.
- No account trading actions.
- No active broker credential fields for MooMoo in the frontend.
- MooMoo OpenD is read-only market data architecture.
- Broker integrations remain future server-side systems.

The frontend may store non-secret local preferences such as:
- MooMoo bridge URL.
- Enable/disable MooMoo data.
- Use MooMoo as primary stock data.
- Enable MooMoo options data.

The frontend must not store:
- MooMoo account password.
- Trading password.
- Broker session tokens.
- Order-routing credentials.

Perplexity remains cited/latest research through `API_PROXY_BASE`. Ollama remains local reasoning over supplied YucaTanaTrades context only.
