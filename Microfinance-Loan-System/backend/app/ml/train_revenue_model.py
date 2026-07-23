import pandas as pd

from sklearn.linear_model import LinearRegression

import joblib

import os


# LOAD DATASET

dataset_path = "datasets/gst_revenue_dataset.csv"

df = pd.read_csv(dataset_path)


# MONTH COLUMNS

months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov"
]

# INPUT FEATURES

X = df[months]

# TARGET

y = df["Dec"]


# TRAIN MODEL

model = LinearRegression()

model.fit(X, y)


# CREATE FOLDER

os.makedirs(
    "trained_models",
    exist_ok=True
)

# SAVE MODEL

joblib.dump(
    model,
    "trained_models/revenue_model.pkl"
)

print(
    "Revenue Forecast Model Trained Successfully"
)
