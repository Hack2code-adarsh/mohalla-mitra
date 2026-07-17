"""
Mohalla Mitra — Vendor Ranking Model Trainer
Run with: python train_ranking_model.py

This generates synthetic training data and trains a GradientBoostingRegressor
to predict a vendor "quality score" (0-100) from rating, distance, price,
and response time.
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
from pathlib import Path

MODEL_PATH = Path(__file__).with_name("vendor_ranking_model.pkl")

np.random.seed(42)
N = 4000

rating = np.clip(np.random.normal(4.3, 0.5, N), 2.5, 5.0)
distance_km = np.clip(np.random.exponential(2.5, N), 0.2, 15.0)
price = np.clip(np.random.normal(350, 180, N), 50, 1200)
response_minutes = np.clip(np.random.exponential(25, N), 5, 120)

rating_component = 100 * (1 - np.exp(-(rating - 2.5) * 1.3)) / (1 - np.exp(-2.5 * 1.3))
distance_component = 100 * np.exp(-distance_km / 4.5)
price_component = np.clip(100 - (price / 12), 0, 100)
response_component = 100 * np.exp(-response_minutes / 30)

quality_score = (
    0.40 * rating_component +
    0.22 * distance_component +
    0.14 * price_component +
    0.24 * response_component
)
quality_score += np.random.normal(0, 4, N)
quality_score = np.clip(quality_score, 0, 100)

X = np.column_stack([rating, distance_km, price, response_minutes])
y = quality_score

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = GradientBoostingRegressor(
    n_estimators=200,
    max_depth=3,
    learning_rate=0.05,
    random_state=42,
)
model.fit(X_train, y_train)

preds = model.predict(X_test)
mae = mean_absolute_error(y_test, preds)
print(f"Model trained. Test MAE: {mae:.2f} (out of 100)")

joblib.dump(model, MODEL_PATH)
print(f"Saved model to: {MODEL_PATH}")