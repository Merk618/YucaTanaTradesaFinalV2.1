"""Central configuration for the YucaTanaTrades platform.

Secrets are loaded from environment files and process environment variables.
Frontend code must not import or embed secrets directly.
"""

from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
ENV_LOCAL_PATH = BASE_DIR / ".env.local"
ENV_STAGING_PATH = BASE_DIR / ".env.staging"
ENV_PRODUCTION_PATH = BASE_DIR / ".env.production"
ENV_PATH = ENV_LOCAL_PATH

for candidate in (ENV_PRODUCTION_PATH, ENV_STAGING_PATH, ENV_LOCAL_PATH):
    if candidate.exists():
        load_dotenv(candidate, override=False)

ENABLE_PAPER_TRADING = True
ENABLE_LIVE_TRADING = False
ENABLE_OPTIONS_ENGINE = True
ENABLE_CRYPTO_SCANNER = True
ENABLE_STOCK_SCANNER = True
ENABLE_AI_LAB = True
ENABLE_DEEP_DIVE_DRAWER = True
ENABLE_MOCK_DATA = False

DATA_UNAVAILABLE_MESSAGE = "Data unavailable — retrying"

TRADING_PAIRS = {
    "BTC": {"binance": "BTCUSDT", "coinbase": "BTC-USD"},
    "ETH": {"binance": "ETHUSDT", "coinbase": "ETH-USD"},
    "SOL": {"binance": "SOLUSDT", "coinbase": "SOL-USD"},
}

RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70
EMA_FAST = 9
EMA_SLOW = 21
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9
ATR_PERIOD = 14

MAX_TRADE_SIZE_USD = 10.0
MAX_PORTFOLIO_RISK_PCT = 0.02
DAILY_LOSS_LIMIT_USD = 200.0
STOP_LOSS_PCT = 0.025
TAKE_PROFIT_PCT = 0.05
MAX_OPEN_POSITIONS = 3
COINBASE_TAKER_FEE_PCT = 0.006
SLIPPAGE_BUFFER_PCT = 0.001

MODEL_PATH = str(BASE_DIR / "signals" / "xgb_model.pkl")
RETRAIN_EVERY_N_HOURS = 24

CANDLE_INTERVAL = "5m"
BOT_LOOP_SECONDS = 60
TRADE_START_HOUR = 8
TRADE_END_HOUR = 22

LOG_DIR = BASE_DIR / "logs"
TRADE_LOG_PATH = LOG_DIR / "trade_log.csv"
BOT_LOG_PATH = LOG_DIR / "bot.log"
POSITIONS_FILE = LOG_DIR / "open_positions.json"
DAILY_STATS_FILE = LOG_DIR / "daily_stats.json"
CACHE_DIR = BASE_DIR / "data" / "cache"

BINANCE_REQUEST_SLEEP_SECONDS = 0.06
API_RETRY_ATTEMPTS = 3
API_RETRY_DELAY_SECONDS = 5
