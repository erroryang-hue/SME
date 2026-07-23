from pydantic import BaseModel
from typing import Dict


class RevenueModel(BaseModel):

    business_name: str

    monthly_revenue: Dict[str, float]

    