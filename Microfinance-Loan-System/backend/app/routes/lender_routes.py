from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.auth_dependency import get_current_user
from bson import ObjectId
from pydantic import BaseModel
from app.models.lender_model import LenderModel
from app.database.mongodb import (
    lenders_collection,
    borrowers_collection,
    borrower_lender_map_collection,
    repayments_collection
)
from app.services.revenue_forecast_service import predict_revenue
from app.services.risk_assessment_service import predict_risk
from app.services.trust_score_service import calculate_trust_score
from app.services.gst_service import get_gst_revenue
from app.services.matching_service import match_lenders
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import math

router = APIRouter()


class UpdateRequestStatus(BaseModel):
    status: str


# GET CURRENT LENDER PROFILE
@router.get("/lender/me")
def get_lender_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can access this profile."
        )
    profile = lenders_collection.find_one({"user_email": current_user["email"]})
    if profile:
        profile["_id"] = str(profile["_id"])
        return profile
    return None


@router.post("/add-lender")
async def add_lender(data: LenderModel, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can create a lender profile."
        )

    existing_profile = lenders_collection.find_one({"user_email": current_user["email"]})
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already registered a lender profile."
        )

    lender_data = data.model_dump()
    lender_data["user_email"] = current_user["email"]

    lenders_collection.insert_one(lender_data)

    return {"message": "Lender Added Successfully"}


@router.get("/get-lenders")
async def get_lenders():
    lenders = list(lenders_collection.find())
    for lender in lenders:
        lender["_id"] = str(lender["_id"])
    return lenders


@router.delete("/delete-lender/{lender_id}")
async def delete_lender(lender_id: str, current_user: dict = Depends(get_current_user)):
    profile = lenders_collection.find_one({"_id": ObjectId(lender_id)})
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lender profile not found"
        )
    if profile.get("user_email") != current_user["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this profile"
        )
    lenders_collection.delete_one({"_id": ObjectId(lender_id)})
    borrower_lender_map_collection.delete_many({"lender_id": lender_id})
    return {"message": "Lender Deleted Successfully"}


@router.get("/lender/requests")
def get_lender_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can view requests"
        )
    lender_profile = lenders_collection.find_one({"user_email": current_user["email"]})
    if not lender_profile:
        return []

    requests = list(borrower_lender_map_collection.find({"lender_id": str(lender_profile["_id"])}))
    for r in requests:
        r["_id"] = str(r["_id"])
    return requests


@router.post("/lender/requests/{request_id}/status")
def update_request_status(
    request_id: str,
    payload: UpdateRequestStatus,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can action requests"
        )

    lender_profile = lenders_collection.find_one({"user_email": current_user["email"]})
    if not lender_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must register a lender profile first."
        )

    request_doc = borrower_lender_map_collection.find_one({"_id": ObjectId(request_id)})
    if not request_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Request not found."
        )

    if request_doc.get("lender_id") != str(lender_profile["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to action this request."
        )

    status_value = payload.status.lower()
    if status_value not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be 'approved' or 'rejected'."
        )

    borrower_lender_map_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status_value}}
    )

    if status_value == "approved":
        loan_amount = float(request_doc.get("loan_amount", 100000))
        # Fetch borrower doc to get tenure
        borrower_doc = borrowers_collection.find_one({"user_email": request_doc["borrower_email"]})
        tenure = int(borrower_doc.get("loan_tenure", 12)) if borrower_doc else 12
        interest_rate = float(lender_profile.get("interest_rate", 12))

        # Calculate EMI using standard formula
        monthly_rate = interest_rate / (12 * 100)
        if monthly_rate > 0:
            emi = loan_amount * monthly_rate * math.pow(1 + monthly_rate, tenure) / (math.pow(1 + monthly_rate, tenure) - 1)
        else:
            emi = loan_amount / tenure

        emi = round(emi, 2)
        start_date = datetime.utcnow()

        # Create repayment schedule
        schedule = []
        for i in range(1, tenure + 1):
            due_date = start_date + timedelta(days=30 * i)
            schedule.append({
                "emi_number": i,
                "amount": emi,
                "due_date": due_date.strftime("%Y-%m-%d"),
                "paid": False,
                "paid_date": None
            })

        repayment_doc = {
            "request_id": request_id,
            "borrower_email": request_doc["borrower_email"],
            "borrower_name": request_doc.get("borrower_name", ""),
            "lender_id": str(lender_profile["_id"]),
            "lender_email": current_user["email"],
            "loan_amount": loan_amount,
            "tenure": tenure,
            "interest_rate": interest_rate,
            "emi": emi,
            "schedule": schedule,
            "created_at": datetime.utcnow().strftime("%Y-%m-%d")
        }
        repayments_collection.insert_one(repayment_doc)

    return {"message": f"Request {status_value} successfully."}


# GET TOP 5 BORROWERS using full ML pipeline (Greedy ranking)
@router.get("/lender/top-borrowers")
def get_top_borrowers(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can access top borrowers."
        )

    lender_profile = lenders_collection.find_one({"user_email": current_user["email"]})
    lender_risk = lender_profile.get("maximum_risk", "HIGH").upper() if lender_profile else "HIGH"
    lender_fund = float(lender_profile.get("available_fund", 0)) if lender_profile else 0

    RISK_HIERARCHY = {
        "LOW":    ["LOW"],
        "MEDIUM": ["LOW", "MEDIUM"],
        "HIGH":   ["LOW", "MEDIUM", "HIGH"],
    }
    acceptable_risks = RISK_HIERARCHY.get(lender_risk, ["LOW", "MEDIUM", "HIGH"])

    borrowers = list(borrowers_collection.find())
    scored = []

    for b in borrowers:
        try:
            b_id = str(b["_id"])
            gst = b.get("gst_number", "")
            loan_amount = float(b.get("loan_amount", 100000))
            max_emi = float(b.get("max_emi", 5000))
            previous_defaults = 1 if b.get("defaults_history") else 0
            msme = 1 if b.get("registered_msme") else 0

            # Try GST revenue
            revenue_data = get_gst_revenue(gst) if gst else None
            if revenue_data and not revenue_data.get("error"):
                monthly_vals = [v for k, v in revenue_data.items()
                                if k not in ("GSTIN", "Company_Name", "error") and isinstance(v, (int, float))]
            else:
                monthly_vals = [50000] * 12

            predicted_revenue = predict_revenue(monthly_vals[:11])
            monthly_expense = predicted_revenue * 0.4  # estimate 40% expense ratio

            risk_features = [
                predicted_revenue, monthly_expense, loan_amount,
                max_emi, previous_defaults, msme
            ]
            risk_level = predict_risk(risk_features)

            # Only include borrowers matching lender's risk appetite
            if risk_level not in acceptable_risks:
                continue

            trust = calculate_trust_score(
                risk_level, previous_defaults, msme, predicted_revenue, monthly_expense
            )
            trust_score = trust.get("score", 0)

            # Greedy score: higher trust, lower risk tier better
            risk_weight = {"LOW": 1.0, "MEDIUM": 0.6, "HIGH": 0.3}.get(risk_level, 0.3)
            greedy_score = round(0.7 * (trust_score / 100) + 0.3 * risk_weight, 4)

            scored.append({
                "_id": b_id,
                "business_name": b.get("business_name", ""),
                "business_type": b.get("business_type", ""),
                "location": b.get("location", ""),
                "loan_amount": loan_amount,
                "gst_number": gst,
                "predicted_revenue": int(predicted_revenue),
                "risk_level": risk_level,
                "trust_score": trust_score,
                "trust_level": trust.get("trust_level", ""),
                "greedy_score": greedy_score,
            })
        except Exception:
            continue

    # Sort by greedy score desc, take top 5
    scored.sort(key=lambda x: x["greedy_score"], reverse=True)
    return scored[:5]


# ANALYZE A SINGLE BORROWER (Lender runs analysis on a borrower card)
@router.post("/lender/analyze-borrower/{borrower_id}")
def analyze_borrower(borrower_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only lenders can analyze borrowers."
        )

    b = borrowers_collection.find_one({"_id": ObjectId(borrower_id)})
    if not b:
        raise HTTPException(status_code=404, detail="Borrower not found")

    gst = b.get("gst_number", "")
    loan_amount = float(b.get("loan_amount", 100000))
    max_emi = float(b.get("max_emi", 5000))
    previous_defaults = 1 if b.get("defaults_history") else 0
    msme = 1 if b.get("registered_msme") else 0

    revenue_data = get_gst_revenue(gst) if gst else None
    if revenue_data and not revenue_data.get("error"):
        monthly_vals = [v for k, v in revenue_data.items()
                        if k not in ("GSTIN", "Company_Name", "error") and isinstance(v, (int, float))]
    else:
        monthly_vals = [50000] * 12

    predicted_revenue = predict_revenue(monthly_vals[:11])
    monthly_expense = predicted_revenue * 0.4

    risk_features = [predicted_revenue, monthly_expense, loan_amount, max_emi, previous_defaults, msme]
    risk_level = predict_risk(risk_features)

    trust = calculate_trust_score(risk_level, previous_defaults, msme, predicted_revenue, monthly_expense)

    return {
        "predicted_revenue": int(predicted_revenue),
        "monthly_expense": int(monthly_expense),
        "risk_level": risk_level,
        "trust_score": trust.get("score", 0),
        "trust_level": trust.get("trust_level", ""),
    }

@router.get("/lender/repayments/{borrower_email}")
def get_lender_borrower_repayments(borrower_email: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "lender":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only lenders")
    
    repayments = list(repayments_collection.find({"borrower_email": borrower_email}).sort("emi_number", 1))
    for r in repayments:
        r["_id"] = str(r["_id"])
    return repayments
