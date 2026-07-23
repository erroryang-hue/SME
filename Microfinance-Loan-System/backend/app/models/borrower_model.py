from pydantic import BaseModel


class BorrowerModel(BaseModel):

    business_name: str

    business_type: str

    years_in_operation: int

    location: str

    gst_number: str

    loan_amount: float

    loan_tenure: int

    max_emi: float

    emergency_request: bool

    previous_loans: bool

    defaults_history: bool

    registered_msme: bool

class LenderRequestModel(BaseModel):
    lender_id: str
    borrower_name: str