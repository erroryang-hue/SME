import pandas as pd
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(__file__)
    )
)

file_path = os.path.join(
    BASE_DIR,
    "datasets",
    "gst_revenue_dataset_200_companies.xlsx"
)

gst_df = pd.read_excel(file_path, engine="openpyxl")

# CLEAN COLUMN NAMES
gst_df.columns = gst_df.columns.str.strip()

# CLEAN GST COLUMN
gst_df["GST_Number"] = (
    gst_df["GST_Number"]
    .astype(str)
    .str.strip()
    .str.upper()
)

print("\nGST DATASET LOADED SUCCESSFULLY")
print(gst_df["GST_Number"].head())


def get_gst_revenue(gst_number):

    # CLEAN INPUT GST
    gst_number = (
        str(gst_number)
        .strip()
        .upper()
    )

    print("\nSEARCHING GST:", gst_number)

    company_data = gst_df[
        gst_df["GST_Number"] == gst_number
    ]

    print("\nMATCH FOUND:")
    print(company_data)

    if company_data.empty:

        return {
            "error": "GST Number Not Found"
        }

    revenue_data = company_data.iloc[0].to_dict()

    return revenue_data
    