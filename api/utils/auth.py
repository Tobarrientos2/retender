"""JWT authentication utilities for FastAPI endpoints.

- Uses python-jose to decode and validate JWT tokens.
- Token is expected in the standard **Authorization: Bearer <token>** header.
- If the environment variable `DEBUG_AUTH` is set to "true", validation is skipped. This is handy for local development.
"""
from __future__ import annotations

import os
from typing import Optional

from fastapi import Header, HTTPException, status
from jose import jwt, JWTError
from loguru import logger

# Environment variables
JWT_SECRET = os.getenv("JWT_SECRET", "secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
DEBUG_AUTH = os.getenv("DEBUG_AUTH", "false").lower() == "true"


async def verify_bearer_token(authorization: Optional[str] = Header(None)) -> None:
    """FastAPI dependency that validates the JWT bearer token.

    This dependency does _not_ return a value on success – it simply raises an
    HTTPException on failure. Endpoints can include it via `Depends` to protect
    them.
    """
    # Skip auth entirely when DEBUG_AUTH is enabled.
    if DEBUG_AUTH:
        if authorization is None:
            logger.warning("🔓 DEBUG_AUTH enabled – bypassing JWT validation")
        return

    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        logger.warning(f"⚠️ Invalid JWT: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Token is valid – nothing to return
