from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.utils.jwt_handler import decode_access_token
from app.database.mongodb import users_collection


# FastAPI security scheme — reads "Authorization: Bearer <token>" header
bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """
    FastAPI dependency that:
    1. Extracts the Bearer token from the Authorization header.
    2. Decodes and validates the JWT.
    3. Fetches the user from MongoDB.
    4. Returns the user dict (without the hashed password).

    Raises HTTP 401 if the token is missing, invalid, expired,
    or the user no longer exists.
    """
    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("email")

    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing email",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = users_collection.find_one({"email": email})

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Return safe user dict (exclude password)
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
    }
