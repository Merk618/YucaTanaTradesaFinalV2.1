# Signal Confirmation Engine

The signal confirmation engine compares external trade ideas against YucaTana Market Brain.

## Source Of Truth

YucaTana data remains authoritative:

- CoinGecko/Binance for crypto
- MooMoo OpenD architecture or Finnhub fallback for stocks
- YucaTana Market Brain for setup score and rating

External signals are context only.

## Confirmation Status

- `CONFIRMED`: External direction aligns with YucaTana score.
- `PARTIALLY_CONFIRMED`: Some alignment exists, but score or data is not strong.
- `NOT_CONFIRMED`: YucaTana data does not support the external idea enough.
- `CONFLICTING`: YucaTana score conflicts with the external direction.
- `DATA_INSUFFICIENT`: Current YucaTana data cannot verify the signal.

## Rating Safety

The engine never emits `BUY` or `SELL`.

Allowed language:

- `AVOID`
- `WEAK / LOW QUALITY`
- `WATCH`
- `CANDIDATE`
- `STRONG CANDIDATE`

`STRONG CANDIDATE` is only allowed when YucaTana Market Brain independently scores the setup at the strong-candidate threshold and the external signal is confirmed.

## AI Assistant Behavior

When a user asks to review Prosperio plays, the AI Command Center shows:

1. External Signal Summary
2. YucaTana Market Brain Score
3. Confirmation Status
4. Bull Case
5. Bear Case
6. Risk Framework
7. What Would Confirm It
8. Data Quality Warning

This remains read-only decision support.
