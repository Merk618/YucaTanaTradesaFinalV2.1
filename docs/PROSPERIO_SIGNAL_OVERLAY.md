# Prosperio Signal Overlay

Prosperio.AI is modeled as an external signal overlay, not as a market-data provider.

## Supported In This Phase

- Manual signal entry
- Local persistence
- YucaTana Market Brain comparison
- AI Command Center review prompts

## Not Supported

- Scraping Prosperio.AI
- Login automation
- Browser automation against Prosperio
- Frontend API keys
- Broker execution
- Order placement

## Manual Signal Fields

Each manual signal is normalized to:

```json
{
  "provider": "PROSPERIO_AI",
  "symbol": "XLM",
  "assetType": "crypto",
  "horizon": "short-term",
  "direction": "bullish",
  "providerConfidence": "Medium",
  "entryZone": "optional",
  "target": "optional",
  "riskNote": "optional",
  "sourceUrl": "optional",
  "notes": "optional",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "ingestionMode": "manual"
}
```

Targets and entry zones are treated as provider/user-supplied notes. They do not become YucaTana price targets unless YucaTana data supplies matching validated levels.
