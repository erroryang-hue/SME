from pydantic import BaseModel
from typing import Optional


class LenderModel(BaseModel):

    lender_name: str

    available_fund: float

    maximum_risk: str

    interest_rate: float

    preferred_sectors: Optional[str] = None
