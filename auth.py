"""
FileTrack Authentication & Session Management
Handles secure password hashing, session tokens, and rate-limiting lockout.
"""

import hashlib
import secrets
import time
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException, Depends, status
from fastapi.security import APIKeyHeader, APIKeyCookie
import config
import database

# In-memory session store: token -> {"user_id": int, "username": str, "expires_at": float}
_sessions: Dict[str, Dict[str, Any]] = {}

# In-memory failed login tracking: key (ip_username) -> {"attempts": int, "lockout_until": float}
_failed_attempts: Dict[str, Dict[str, Any]] = {}

cookie_scheme = APIKeyCookie(name=config.SESSION_COOKIE_NAME, auto_error=False)
header_scheme = APIKeyHeader(name="Authorization", auto_error=False)


def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2-HMAC-SHA256 with 260,000 iterations.
    Format: pbkdf2_sha256$<iterations>$<salt>$<hex_digest>
    """
    salt = secrets.token_hex(16)
    iterations = 260_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${derived.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against the stored hash in constant time.
    Supports PBKDF2-SHA256 and gracefully supports bcrypt if the module is installed.
    """
    if not hashed_password:
        return False

    try:
        # Check if PBKDF2
        if hashed_password.startswith("pbkdf2_sha256$"):
            parts = hashed_password.split("$")
            if len(parts) != 4:
                return False
            _, iterations_str, salt, target_hash = parts
            iterations = int(iterations_str)
            derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), iterations)
            return secrets.compare_digest(derived.hex(), target_hash)

        # Optional bcrypt fallback
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            try:
                import bcrypt
                return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
            except ImportError:
                return False

        # Simple SHA256 fallback if user migrated plain sha256
        if len(hashed_password) == 64 and all(c in "0123456789abcdefABCDEF" for c in hashed_password):
            return secrets.compare_digest(hashlib.sha256(plain_password.encode()).hexdigest(), hashed_password.lower())

        return False
    except Exception:
        return False


def check_rate_limit(key: str) -> None:
    """
    Raises HTTP 429 if the user/IP is currently locked out.
    """
    now = time.time()
    record = _failed_attempts.get(key)
    if record:
        lockout = record.get("lockout_until", 0)
        if now < lockout:
            remaining = int(lockout - now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed login attempts. Please try again in {remaining} seconds."
            )


def record_login_failure(key: str) -> None:
    """
    Tracks failed attempt and triggers lockout when threshold is reached.
    """
    now = time.time()
    record = _failed_attempts.get(key, {"attempts": 0, "lockout_until": 0})
    # Reset if previous lockout expired
    if now > record.get("lockout_until", 0):
        record["attempts"] = 0

    record["attempts"] += 1
    if record["attempts"] >= config.MAX_LOGIN_ATTEMPTS:
        record["lockout_until"] = now + config.LOCKOUT_DURATION_SECONDS

    _failed_attempts[key] = record


def record_login_success(key: str) -> None:
    """
    Clears failed attempt tracking upon successful authentication.
    """
    _failed_attempts.pop(key, None)


def create_session(user_id: int, username: str) -> str:
    """
    Generates a cryptographically random session token and stores it.
    """
    # Clean up expired sessions periodically
    now = time.time()
    expired_keys = [k for k, v in _sessions.items() if v["expires_at"] < now]
    for k in expired_keys:
        _sessions.pop(k, None)

    token = secrets.token_urlsafe(32)
    expires_at = now + (config.SESSION_LIFETIME_MINUTES * 60)
    _sessions[token] = {
        "user_id": user_id,
        "username": username,
        "expires_at": expires_at
    }
    return token


def invalidate_session(token: str) -> None:
    """
    Removes a session token (logs out).
    """
    _sessions.pop(token, None)


def get_token_from_request(
    request: Request,
    cookie_token: Optional[str] = Depends(cookie_scheme),
    auth_header: Optional[str] = Depends(header_scheme)
) -> Optional[str]:
    """
    Resolves session token from either HTTP-only cookie, Authorization: Bearer <token>,
    or ?token= query parameter (for direct iframe / media viewing).
    """
    if cookie_token:
        return cookie_token
    if auth_header:
        parts = auth_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        return auth_header
    query_token = request.query_params.get("token")
    if query_token:
        return query_token
    return None


def get_current_user(token: Optional[str] = Depends(get_token_from_request)) -> Dict[str, Any]:
    """
    FastAPI dependency that enforces authentication.
    Returns user data dictionary or raises HTTP 401 Unauthorized.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session = _sessions.get(token)
    if not session or time.time() > session["expires_at"]:
        _sessions.pop(token, None)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Refresh sliding expiration
    session["expires_at"] = time.time() + (config.SESSION_LIFETIME_MINUTES * 60)

    # Fetch user from database to ensure user still exists and get latest details
    try:
        user = database.query_one(
            "SELECT id, username, created_at FROM users WHERE id = %s",
            (session["user_id"],)
        )
        if not user:
            _sessions.pop(token, None)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account no longer exists."
            )
        return user
    except HTTPException:
        raise
    except Exception as e:
        # If DB connection failed while token was valid, raise 503
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {e}"
        )
