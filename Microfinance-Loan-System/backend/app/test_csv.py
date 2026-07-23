import pandas as pd
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

csv_path = os.path.join(
    BASE_DIR,
    "datasets",
    "gst_revenue_dataset.csv"
)

df = pd.read_csv(csv_path)

print(df.columns.tolist())

