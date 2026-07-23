from app.models.revenue_model import (
    RevenueModel
)
from app.services.gst_service import (
    get_gst_revenue
)
from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.auth_dependency import get_current_user
from bson import ObjectId

from app.models.borrower_model import (
    BorrowerModel,
    LenderRequestModel
)

from app.database.mongodb import (
    borrowers_collection,
    revenues_collection,
    borrower_lender_map_collection,
    repayments_collection
)

router = APIRouter()


# GET CURRENT BORROWER PROFILE
@router.get("/borrower/me")
def get_borrower_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can access this profile."
        )
    profile = borrowers_collection.find_one({"user_email": current_user["email"]})
    if profile:
        profile["_id"] = str(profile["_id"])
        return profile
    return None


# ADD BORROWER
@router.post("/add-borrower")
def add_borrower(
    borrower: BorrowerModel,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can create a borrower profile."
        )

    existing_profile = borrowers_collection.find_one({"user_email": current_user["email"]})
    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already registered a borrower profile."
        )

    borrower_data = {
        "user_email": current_user["email"],
        "business_name": borrower.business_name,
        "business_type": borrower.business_type,
        "years_in_operation": borrower.years_in_operation,
        "location": borrower.location,
        "gst_number": borrower.gst_number,
        "loan_amount": borrower.loan_amount,
        "loan_tenure": borrower.loan_tenure,
        "max_emi": borrower.max_emi,
        "emergency_request": borrower.emergency_request,
        "previous_loans": borrower.previous_loans,
        "defaults_history": borrower.defaults_history,
        "registered_msme": borrower.registered_msme
    }

    borrowers_collection.insert_one(borrower_data)

    return {
        "message": "Borrower Added Successfully"
    }


# UPDATE BORROWER
@router.put("/update-borrower")
def update_borrower(
    borrower: BorrowerModel,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can update a borrower profile."
        )

    existing_profile = borrowers_collection.find_one({"user_email": current_user["email"]})
    if not existing_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No borrower profile found. Please create one first."
        )

    update_data = {
        "business_name": borrower.business_name,
        "business_type": borrower.business_type,
        "years_in_operation": borrower.years_in_operation,
        "location": borrower.location,
        "gst_number": borrower.gst_number,
        "loan_amount": borrower.loan_amount,
        "loan_tenure": borrower.loan_tenure,
        "max_emi": borrower.max_emi,
        "emergency_request": borrower.emergency_request,
        "previous_loans": borrower.previous_loans,
        "defaults_history": borrower.defaults_history,
        "registered_msme": borrower.registered_msme
    }

    borrowers_collection.update_one(
        {"user_email": current_user["email"]},
        {"$set": update_data}
    )

    return {
        "message": "Borrower Profile Updated Successfully"
    }



# GET ALL BORROWERS

@router.get("/get-borrowers")

def get_borrowers():

    borrowers = []

    for borrower in borrowers_collection.find():

        borrower["_id"] = str(
            borrower["_id"]
        )

        borrowers.append(borrower)

    return borrowers

# FETCH GST REVENUE

@router.get(
    "/get-gst-revenue/{gst_number}"
)

def fetch_gst_revenue(
    gst_number: str
):

    revenue_data = get_gst_revenue(
        gst_number
    )

    if revenue_data is None:

        return {
            "message":
            "GST Number Not Found"
        }

    return revenue_data


# ADD MANUAL REVENUE

@router.post(
    "/add-manual-revenue"
)

def add_manual_revenue(
    revenue: RevenueModel
):

    revenue_data = {

        "business_name":
        revenue.business_name,

        "monthly_revenue":
        revenue.monthly_revenue
    }

    revenues_collection.insert_one(
        revenue_data
    )

    return {

        "message":
        "Manual Revenue Added Successfully"
    }


@router.delete("/delete-borrower/{borrower_id}")
def delete_borrower(borrower_id: str, current_user: dict = Depends(get_current_user)):
    profile = borrowers_collection.find_one({"_id": ObjectId(borrower_id)})
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrower profile not found"
        )
    if profile.get("user_email") != current_user["email"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this profile"
        )
    borrowers_collection.delete_one({"_id": ObjectId(borrower_id)})
    borrower_lender_map_collection.delete_many({"borrower_email": current_user["email"]})
    return {
        "message": "Borrower Deleted Successfully"
    }

@router.post("/request-lender")
def request_lender(
    request: LenderRequestModel,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can request funding"
        )
    
    borrower_doc = borrowers_collection.find_one({"user_email": current_user["email"]})
    if not borrower_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must register a borrower profile first before requesting funding."
        )

    existing_request = borrower_lender_map_collection.find_one({
        "borrower_email": current_user["email"],
        "lender_id": request.lender_id
    })
    if existing_request:
        if existing_request.get("status") == "rejected":
            borrower_lender_map_collection.update_one(
                {"_id": existing_request["_id"]},
                {"$set": {"status": "pending"}}
            )
            return {"message": "Lender Requested Successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You already have a {existing_request.get('status')} request with this lender."
            )

    request_data = {
        "borrower_email": current_user["email"],
        "borrower_id": str(borrower_doc["_id"]),
        "borrower_name": borrower_doc["business_name"],
        "loan_amount": borrower_doc["loan_amount"],
        "business_type": borrower_doc["business_type"],
        "gst_number": borrower_doc["gst_number"],
        "lender_id": request.lender_id,
        "status": "pending"
    }
    borrower_lender_map_collection.insert_one(request_data)
    return {
        "message": "Lender Requested Successfully"
    }

@router.get("/borrower/requests")
def get_borrower_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can view their requests"
        )
    requests = list(borrower_lender_map_collection.find({"borrower_email": current_user["email"]}))
    for r in requests:
        r["_id"] = str(r["_id"])
    return requests



# GET MY REPAYMENT SCHEDULE
@router.get("/borrower/repayments")
def get_borrower_repayments(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can view repayments"
        )
    repayments = list(repayments_collection.find({"borrower_email": current_user["email"]}))
    for r in repayments:
        r["_id"] = str(r["_id"])
    return repayments


# MARK AN EMI AS PAID
@router.post("/borrower/repayments/{repayment_id}/pay/{emi_number}")
def pay_emi(
    repayment_id: str,
    emi_number: int,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "borrower":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only borrowers can mark payments"
        )

    from datetime import datetime
    repayment = repayments_collection.find_one({"_id": ObjectId(repayment_id)})
    if not repayment:
        raise HTTPException(status_code=404, detail="Repayment record not found")
    if repayment.get("borrower_email") != current_user["email"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    schedule = repayment.get("schedule", [])
    updated = False
    for item in schedule:
        if item["emi_number"] == emi_number and not item["paid"]:
            item["paid"] = True
            item["paid_date"] = datetime.utcnow().strftime("%Y-%m-%d")
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=400, detail="EMI already paid or not found")

    repayments_collection.update_one(
        {"_id": ObjectId(repayment_id)},
        {"$set": {"schedule": schedule}}
    )
    return {"message": f"EMI {emi_number} marked as paid"}
