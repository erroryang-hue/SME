from app.services.matching_service import (
    match_lenders
)
from app.services.trust_score_service import (
    calculate_trust_score
)
from app.services.risk_assessment_service import (
    predict_risk
)
from app.services.revenue_forecast_service import (
    predict_revenue
)
from app.services.ocr_service import (
    extract_expenses_from_pdf
)
from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from pydantic import BaseModel
class RevenuePredictionInput(
    BaseModel
):

    revenue_data: list

import shutil
import os

router = APIRouter()


UPLOAD_FOLDER = "uploads"


# CREATE UPLOADS FOLDER IF NOT EXISTS

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# PDF BANK STATEMENT UPLOAD

@router.post(
    "/upload-bank-statement"
)

def upload_bank_statement(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {

        "message":
        "Bank Statement Uploaded",

        "filename":
        file.filename
    }


# CSV EXPENSE FILE UPLOAD

@router.post(
    "/upload-expense-csv"
)

def upload_expense_csv(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {

        "message":
        "Expense CSV Uploaded",

        "filename":
        file.filename
    }
# OCR EXPENSE EXTRACTION

@router.get(
    "/extract-expenses/{filename}"
)

def extract_expenses(
    filename: str
):

    result = extract_expenses_from_pdf(
        filename
    )

    return result
@router.post(
    "/predict-revenue"
)

def predict_future_revenue(
    data: RevenuePredictionInput
):

    prediction = predict_revenue(
        data.revenue_data
    )

    return {

        "predicted_revenue":
        prediction
    }

class RiskPredictionInput(
    BaseModel
):

    predicted_revenue: float

    monthly_expense: float

    loan_amount: float

    max_emi: float

    previous_defaults: int

    msme_registered: int

@router.post(
    "/predict-risk"
)

def predict_loan_risk(
    data: RiskPredictionInput
):

    features = [

        data.predicted_revenue,

        data.monthly_expense,

        data.loan_amount,

        data.max_emi,

        data.previous_defaults,

        data.msme_registered
    ]

    risk = predict_risk(
        features
    )

    return {

        "risk_level":
        risk
    }

class TrustScoreInput(
    BaseModel
):

    risk_level: str

    previous_defaults: int

    msme_registered: int

    predicted_revenue: float

    monthly_expense: float

@router.post(
    "/calculate-trust-score"
)

def generate_trust_score(
    data: TrustScoreInput
):

    result = calculate_trust_score(

        data.risk_level,

        data.previous_defaults,

        data.msme_registered,

        data.predicted_revenue,

        data.monthly_expense
    )

    return result
class LenderMatchInput(
    BaseModel
):

    loan_needed: float

    borrower_risk: str

@router.post(
    "/match-lenders"
)

def borrower_lender_matching(
    data: LenderMatchInput
):

    result = match_lenders(

        data.loan_needed,

        data.borrower_risk
    )

    return result

from app.database.mongodb import borrowers_collection
from bson import ObjectId

@router.post("/analyze-borrower/{borrower_id}")
def analyze_borrower_by_id(borrower_id: str):
    borrower = borrowers_collection.find_one({"_id": ObjectId(borrower_id)})
    if not borrower:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Borrower not found")
        
    from app.services.gst_service import get_gst_revenue
    gst_res = get_gst_revenue(borrower.get("gst_number"))
    if "error" in gst_res:
        rev_list = [50000] * 12
    else:
        rev_list = [v for k,v in gst_res.items() if k not in ["Company_Name", "GST_Number"]]
        if len(rev_list) != 12: rev_list = [50000] * 12
        
    predicted_rev = predict_revenue(rev_list)
    
    risk_features = [
        predicted_rev,
        50000,
        borrower.get("loan_amount", 100000),
        borrower.get("max_emi", 10000),
        1 if borrower.get("defaults_history") else 0,
        1 if borrower.get("registered_msme") else 0
    ]
    risk_level = predict_risk(risk_features)
    
    trust = calculate_trust_score(
        risk_level, 
        1 if borrower.get("defaults_history") else 0,
        1 if borrower.get("registered_msme") else 0,
        predicted_rev,
        50000
    )
    
    match_res = match_lenders(borrower.get("loan_amount", 100000), risk_level)
    
    return {
        "borrower_id": str(borrower["_id"]),
        "business_name": borrower.get("business_name"),
        "predicted_revenue": predicted_rev,
        "risk_level": risk_level,
        "trust_score": trust["trust_score"],
        "trust_level": trust["trust_level"],
        "matched_lenders": match_res.get("matched_lenders", []),
        "remaining_unallocated": match_res.get("remaining_unallocated", 0)
    }

class FullPipelineInput(
    BaseModel
):

    revenue_data: list

    monthly_expense: float

    loan_amount: float

    max_emi: float

    previous_defaults: int

    msme_registered: int
@router.post(
    "/complete-borrower-analysis"
)

def complete_borrower_analysis(
    data: FullPipelineInput
):

    # STEP 1
    # REVENUE PREDICTION

    predicted_revenue = predict_revenue(
        data.revenue_data
    )


    # STEP 2
    # RISK PREDICTION

    risk_features = [

        predicted_revenue,

        data.monthly_expense,

        data.loan_amount,

        data.max_emi,

        data.previous_defaults,

        data.msme_registered
    ]

    risk_level = predict_risk(
        risk_features
    )


    # STEP 3
    # TRUST SCORE

    trust_result = calculate_trust_score(

        risk_level,

        data.previous_defaults,

        data.msme_registered,

        predicted_revenue,

        data.monthly_expense
    )


    # STEP 4
    # LENDER MATCHING

    lender_result = match_lenders(

        data.loan_amount,

        risk_level
    )


    # FINAL RESPONSE

    return {

        "predicted_revenue":
        predicted_revenue,

        "risk_level":
        risk_level,

        "trust_score":
        trust_result[
            "trust_score"
        ],

        "trust_level":
        trust_result[
            "trust_level"
        ],

        "matched_lenders":
        lender_result[
            "matched_lenders"
        ],

        "remaining_unallocated":
        lender_result[
            "remaining_unallocated"
        ]
    }
        
@router.post("/forecast-revenue")
def forecast_revenue(data: dict):

    monthly_values = [
        data["Jan"],
        data["Feb"],
        data["Mar"],
        data["Apr"],
        data["May"],
        data["Jun"],
        data["Jul"],
        data["Aug"],
        data["Sep"],
        data["Oct"],
        data["Nov"],
        data["Dec"],
    ]

    avg_growth = (
        monthly_values[-1] - monthly_values[0]
    ) / 12

    next_month_prediction = int(
        monthly_values[-1] + avg_growth
    )

    return {
        "company": data["Company_Name"],
        "predicted_next_month_revenue":
        next_month_prediction,
        "status": "Forecast Successful"
    }

    
