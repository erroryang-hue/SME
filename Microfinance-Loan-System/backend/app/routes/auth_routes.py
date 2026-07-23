from fastapi import APIRouter, HTTPException, status, Depends

from app.models.user_model import (
    UserRegister,
    UserLogin
)

from app.database.mongodb import users_collection

from app.utils.hash_password import (
    hash_password,
    verify_password
)

from app.utils.jwt_handler import create_access_token
from app.utils.auth_dependency import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])


# ────────────────────────────────────────────────────────────
# REGISTER USER
# ────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(user: UserRegister):

    existing_user = users_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # Enforce single lender account system-wide
    if user.role == "lender":
        existing_lender_account = users_collection.find_one({"role": "lender"})
        if existing_lender_account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A lender account already exists. Only one lender can be registered in the system."
            )

    hashed_pw = hash_password(user.password)

    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hashed_pw,
        "role": user.role
    }

    users_collection.insert_one(user_data)

    token = create_access_token({
        "email": user.email,
        "role": user.role
    })

    return {
        "message": "Account created successfully",
        "token": token,
        "name": user.name,
        "role": user.role
    }


# ────────────────────────────────────────────────────────────
# LOGIN USER
# ────────────────────────────────────────────────────────────
@router.post("/login")
def login_user(user: UserLogin):

    existing_user = users_collection.find_one({"email": user.email})

    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email."
        )

    valid_password = verify_password(
        user.password,
        existing_user["password"]
    )

    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )

    token = create_access_token({
        "email": existing_user["email"],
        "role": existing_user["role"]
    })

    return {
        "message": "Login successful",
        "token": token,
        "name": existing_user["name"],
        "role": existing_user["role"]
    }


# ────────────────────────────────────────────────────────────
# GET CURRENT USER (validate session)
# ────────────────────────────────────────────────────────────
@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user