import pandas as pd

from xgboost import XGBClassifier

from sklearn.preprocessing import LabelEncoder

import joblib

import os


# LOAD DATASET

df = pd.read_csv(
    "datasets/risk_dataset.csv"
)


# FEATURES

X = df[
    [
        "predicted_revenue",
        "monthly_expense",
        "loan_amount",
        "max_emi",
        "previous_defaults",
        "msme_registered"
    ]
]


# TARGET

y = df["risk"]


# ENCODE LABELS

encoder = LabelEncoder()

y_encoded = encoder.fit_transform(y)


# TRAIN MODEL

model = XGBClassifier()

model.fit(X, y_encoded)


# CREATE FOLDER

os.makedirs(
    "trained_models",
    exist_ok=True
)


# SAVE MODEL

joblib.dump(
    model,
    "trained_models/risk_model.pkl"
)

joblib.dump(
    encoder,
    "trained_models/risk_encoder.pkl"
)

print(
    "Risk Model Trained Successfully"
)
