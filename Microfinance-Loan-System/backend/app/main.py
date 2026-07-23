from fastapi.middleware.cors import CORSMiddleware
from app.routes.ml_routes import (
    router as ml_router
)
from fastapi import FastAPI

from app.routes.auth_routes import (
    router as auth_router
)

from app.routes.borrower_routes import (
    router as borrower_router
)
from app.routes.lender_routes import (
    router as lender_router
)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)

app.include_router(borrower_router)

app.include_router(ml_router)

app.include_router(lender_router)
@app.get("/")

def home():

    return {
        "message":
        "Microfinance Backend Running"
    }

