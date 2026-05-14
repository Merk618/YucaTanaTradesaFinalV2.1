"""XGBoost directional model for Crypto Hunter."""

from __future__ import annotations

import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from shared.config.settings import MODEL_PATH
from services.strategies.signals.indicators import add_all_indicators

FEATURE_COLUMNS = [
    "rsi",
    "ema_fast",
    "ema_slow",
    "ema_cross",
    "macd",
    "macd_signal",
    "macd_hist",
    "atr",
    "vol_delta",
    "cvd",
    "price_vs_vwap",
    "body_size",
    "prev_close",
    "volume",
]

LABEL_TO_CLASS = {-1: 0, 1: 1}
CLASS_TO_SIGNAL = {0: "SELL", 1: "BUY"}


def create_labels(df: pd.DataFrame, forward_periods: int = 3) -> pd.DataFrame:
    """Create BUY/SELL/HOLD labels from forward returns."""
    if df is None or df.empty:
        raise ValueError("Cannot label an empty DataFrame")
    out = df.copy()
    forward_close = out["close"].shift(-forward_periods)
    forward_return = (forward_close / out["close"]) - 1
    out["target"] = np.select(
        [forward_return > 0.005, forward_return < -0.005],
        [1, -1],
        default=0,
    )
    return out.iloc[:-forward_periods].dropna()


def train_model(df: pd.DataFrame) -> xgb.XGBClassifier:
    """Train, evaluate, persist, and return an XGBoost classifier."""
    enriched = add_all_indicators(df)
    labeled = create_labels(enriched)
    training = labeled[labeled["target"] != 0].copy()
    if training.empty:
        raise ValueError("No clear BUY/SELL labels available for training")

    x = training[FEATURE_COLUMNS]
    y = training["target"].map(LABEL_TO_CLASS)
    if y.nunique() < 2:
        raise ValueError("Training data must contain both BUY and SELL examples")

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="mlogloss",
        random_state=42,
    )
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    print(classification_report(y_test, predictions, target_names=["SELL", "BUY"]))
    print("Accuracy:", accuracy_score(y_test, predictions))

    model.last_trained_at = datetime.now(timezone.utc).isoformat()
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    return model


def load_model() -> xgb.XGBClassifier:
    """Load saved model from MODEL_PATH. Raise error if not found."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


def predict_signal(model, df: pd.DataFrame) -> tuple[str, float]:
    """Predict latest candle signal and confidence, returning HOLD below 0.60 confidence."""
    if df is None or df.empty:
        return "HOLD", 0.0
    enriched = add_all_indicators(df)
    latest = enriched[FEATURE_COLUMNS].tail(1)
    probabilities = model.predict_proba(latest)[0]
    best_idx = int(np.argmax(probabilities))
    confidence = float(probabilities[best_idx])
    if confidence <= 0.60:
        return "HOLD", confidence
    return CLASS_TO_SIGNAL.get(best_idx, "HOLD"), confidence
