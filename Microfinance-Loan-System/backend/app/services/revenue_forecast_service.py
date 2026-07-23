import joblib
import numpy as np
import pandas as pd

# LOAD MODEL
model = joblib.load(
    "trained_models/revenue_model.pkl"
)

MONTH_COLS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']


def predict_revenue(revenue_data):
    """Predict next month revenue. revenue_data must be a list of 11 monthly values."""
    vals = list(revenue_data)
    # Ensure we always have exactly 11 values
    if len(vals) < 11:
        vals = vals + [vals[-1] if vals else 50000] * (11 - len(vals))
    vals = vals[:11]
    # Pass as DataFrame with the column names the model was trained on
    df = pd.DataFrame([vals], columns=MONTH_COLS)
    prediction = model.predict(df)
    return float(prediction[0])