import os
from jose import jwt, JWTError
from datetime import datetime, timedelta


SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "MICROFINANCE_SECRET_KEY_CHANGE_IN_PROD")

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_HOURS = 24


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        hours=ACCESS_TOKEN_EXPIRE_HOURS
    )

    to_encode.update({
        "exp": expire
    })

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


def decode_access_token(token: str):
    """
    Decodes a JWT token and returns the payload dict.
    Raises JWTError if the token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None