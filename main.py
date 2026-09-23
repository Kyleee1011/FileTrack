import os
import uuid
import shutil
import logging
import time
from pathlib import Path
from typing import Optional, List, Dict, Any

from PIL import Image

from fastapi import (
    FastAPI, Request, Response, HTTPException, Depends, 
    UploadFile, File, Form, Query, status
)
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import config
import database
import auth
import scan_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("filetrack.main")

app = FastAPI(
    title="FileTrack API",
    description="Sensitive Document Repository & LAN Scanner Management",
    version="1.0.0"
)

# Enable CORS for local network access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1)


class CreateAccountRequest(BaseModel):
    admin_username: Optional[str] = Field(None, max_length=64)
    admin_password: Optional[str] = None
    new_username: str = Field(..., min_length=3, max_length=64)
    new_password: str = Field(..., min_length=6)
    display_name: Optional[str] = Field(None, max_length=100)
    storage_quota_mb: Optional[int] = Field(None, gt=0)


class ChangePasswordRequest(BaseModel):
    admin_username: str = Field(..., min_length=1, max_length=64)
    admin_password: str = Field(..., min_length=1)
    target_username: str = Field(..., min_length=1, max_length=64)
    new_password: str = Field(..., min_length=6)


class FolderCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    parent_id: Optional[int] = None


class FolderUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[int] = None


class FileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    folder_id: Optional[int] = None


class ScanTriggerRequest(BaseModel):
    source: str = Field("Platen", description="'Platen' (Flatbed) or 'Feeder' (ADF)")
    duplex: bool = Field(False, description="Scan both sides if Feeder is selected")
    resolution: int = Field(300, description="DPI resolution (e.g. 150, 300, 600)")
    color_mode: str = Field("RGB24", description="'RGB24' or 'Grayscale8'")


class ScanSaveRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255)
    folder_id: Optional[int] = None
    format: str = Field("pdf", description="'pdf' or 'png'")


# ==============================================================================
# AUDIT LOGGING HELPER
# ==============================================================================

def log_audit(action: str, file_id: Optional[int] = None, details: Optional[str] = None, ip_address: Optional[str] = None):
    try:
        database.execute(
            "INSERT INTO access_logs (file_id, action, details, ip_address) VALUES (%s, %s, %s, %s)",
            (file_id, action, details, ip_address)
        )
    except Exception as e:
        logger.warning(f"Could not record access log: {e}")


# ==============================================================================
# SYSTEM & HEALTH ROUTES
# ==============================================================================

@app.get("/api/health")
def get_health():
    """Returns database connection status and scanner connectivity."""
    db_health = database.check_database_health()
    scanner_health = scan_service.check_capabilities()
    return {
        "status": "healthy" if db_health.get("ready") else "degraded",
        "database": db_health,
        "scanner": scanner_health,
        "storage_dir": str(config.STORAGE_DIR),
        "staging_dir": str(config.STAGING_DIR)
    }


# ==============================================================================
# AUTHENTICATION ROUTES
# ==============================================================================

@app.post("/api/login")
def login(payload: LoginRequest, request: Request, response: Response):
    client_ip = request.client.host if request.client else "127.0.0.1"
    rate_key = f"{client_ip}_{payload.username}"
    
    # 1. Rate limiting / lockout check
    auth.check_rate_limit(rate_key)

    # 2. Parameterized user lookup
    try:
        user = database.query_one(
            "SELECT id, username, display_name, storage_quota_mb, password_hash FROM users WHERE username = %s",
            (payload.username,)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error. Please ensure MySQL is running and schema.sql has been executed. Error: {e}"
        )

    if not user or not auth.verify_password(payload.password, user["password_hash"]):
        auth.record_login_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )

    # Clear lockout on success
    auth.record_login_success(rate_key)

    # Generate session token
    token = auth.create_session(user["id"], user["username"])

    # Set secure HTTP-only cookie
    response.set_cookie(
        key=config.SESSION_COOKIE_NAME,
        value=token,
        max_age=config.SESSION_LIFETIME_MINUTES * 60,
        httponly=config.SESSION_COOKIE_HTTPONLY,
        secure=config.SESSION_COOKIE_SECURE,
        samesite=config.SESSION_COOKIE_SAMESITE
    )

    log_audit("login", details=f"User {user['username']} logged in", ip_address=client_ip)

    effective_display_name = user.get("display_name") or user["username"]
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": effective_display_name,
            "storage_quota_mb": user.get("storage_quota_mb")
        }
    }




def verify_admin_auth(admin_username: str, admin_password: str, request: Optional[Request] = None) -> Dict[str, Any]:
    """
    Verifies that the provided admin credentials belong to an authentic admin account.
    Validates rate-limiting lockout and password verification.
    """
    clean_admin = admin_username.strip()
    if not clean_admin or not admin_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin username and password are required for authorization."
        )

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    rate_key = f"{client_ip}_{clean_admin}"
    auth.check_rate_limit(rate_key)

    try:
        admin_user = database.query_one(
            "SELECT * FROM users WHERE username = %s",
            (clean_admin,)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {e}"
        )

    if not admin_user or not auth.verify_password(admin_password, admin_user["password_hash"]):
        auth.record_login_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials. Authorization denied."
        )

    auth.record_login_success(rate_key)

    # Check admin privileges
    is_admin = (
        clean_admin.lower() == "admin"
        or admin_user.get("id") == 1
        or bool(admin_user.get("is_admin"))
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authorizing account does not have administrator privileges."
        )

    return admin_user


@app.post("/api/auth/create-account")
def create_account(payload: CreateAccountRequest, request: Request):
    """
    Creates a new user account. Requires valid admin authorization:
    either an active admin session or valid admin credentials in the request body.
    """
    auth_header = request.headers.get("Authorization") or ""
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "filetrack_session" in request.cookies:
        token = request.cookies.get("filetrack_session")

    is_session_admin = False
    admin_name = "admin"
    if token and token in auth._sessions:
        sess = auth._sessions[token]
        if sess.get("expires_at", 0) > time.time():
            admin_chk = database.query_one("SELECT id, username FROM users WHERE id = %s", (sess.get("user_id"),))
            if admin_chk and (admin_chk.get("username") == "admin" or admin_chk.get("id") == 1):
                is_session_admin = True
                admin_name = admin_chk.get("username", "admin")

    if not is_session_admin:
        if not payload.admin_username or not payload.admin_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin credentials are required to authorize account creation."
            )
        admin_user = verify_admin_auth(payload.admin_username, payload.admin_password, request)
        admin_name = admin_user.get("username", "admin")



    clean_new_user = payload.new_username.strip()
    import re
    if not re.match(r"^[a-zA-Z0-9_\-\.]{3,64}$", clean_new_user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be 3-64 characters and contain only letters, numbers, hyphens, or underscores."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    existing = database.query_one(
        "SELECT id FROM users WHERE LOWER(username) = LOWER(%s)",
        (clean_new_user,)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{clean_new_user}' is already registered."
        )

    # Validate and clean optional display name
    clean_display_name = (payload.display_name or "").strip() or None
    storage_quota_mb = payload.storage_quota_mb if payload.storage_quota_mb and payload.storage_quota_mb > 0 else None

    password_hash = auth.hash_password(payload.new_password)
    user_id = database.execute(
        "INSERT INTO users (username, display_name, storage_quota_mb, password_hash) VALUES (%s, %s, %s, %s)",
        (clean_new_user, clean_display_name, storage_quota_mb, password_hash)
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        "user_create",
        details=f"User '{clean_new_user}' (id={user_id}) created by admin '{admin_name}'",
        ip_address=client_ip
    )

    effective_name = clean_display_name or clean_new_user
    return {
        "success": True,
        "message": f"Account '{effective_name}' created successfully. They may now sign in.",
        "user": {
            "id": user_id,
            "username": clean_new_user,
            "display_name": effective_name,
            "storage_quota_mb": storage_quota_mb
        }
    }


@app.get("/api/auth/users")
def list_users(current_user: Dict[str, Any] = Depends(auth.get_current_user)):
    """
    Returns all user accounts. Requires admin (username == 'admin').
    """
    if current_user.get("username") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view user accounts."
        )
    users = database.query_all(
        "SELECT id, username, display_name, storage_quota_mb, created_at FROM users ORDER BY created_at ASC"
    )
    for u in users:
        u["display_name"] = u.get("display_name") or u["username"]
        u["storage_label"] = f"{u['storage_quota_mb']} MB" if u.get("storage_quota_mb") else "System Default"
    return {"success": True, "users": users}


@app.delete("/api/auth/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Deletes a user account. Admin only. Cannot delete yourself.
    """
    if current_user.get("username") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only.")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")
    target = database.query_one("SELECT id, username FROM users WHERE id = %s", (user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    database.execute("DELETE FROM users WHERE id = %s", (user_id,))
    log_audit("user_delete", details=f"User '{target['username']}' (id={user_id}) deleted by admin '{current_user['username']}'")
    return {"success": True, "message": f"User '{target['username']}' deleted."}


@app.post("/api/auth/change-password")

def change_password(payload: ChangePasswordRequest, request: Request):
    """
    Updates a user's password. Requires valid admin credentials to authorize the change.
    """
    admin_user = verify_admin_auth(payload.admin_username, payload.admin_password, request)

    clean_target = payload.target_username.strip()
    if not clean_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target account username is required."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    target_user = database.query_one(
        "SELECT id, username FROM users WHERE LOWER(username) = LOWER(%s)",
        (clean_target,)
    )
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{clean_target}' not found in repository."
        )

    new_hash = auth.hash_password(payload.new_password)
    database.execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (new_hash, target_user["id"])
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_audit(
        "password_change",
        details=f"Password for '{target_user['username']}' updated by admin '{admin_user['username']}'",
        ip_address=client_ip
    )

    return {
        "success": True,
        "message": f"Password for '{target_user['username']}' has been updated successfully."
    }


@app.post("/api/logout")
def logout(response: Response, current_user: Dict[str, Any] = Depends(auth.get_current_user), token: Optional[str] = Depends(auth.get_token_from_request)):
    if token:
        auth.invalidate_session(token)
    response.delete_cookie(config.SESSION_COOKIE_NAME)
    return {"success": True, "message": "Logged out successfully."}


@app.get("/api/me")
def get_current_user_info(current_user: Dict[str, Any] = Depends(auth.get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "display_name": current_user.get("display_name") or current_user["username"],
        "storage_quota_mb": current_user.get("storage_quota_mb"),
        "created_at": str(current_user["created_at"])
    }



# ==============================================================================
# FOLDER EXPLORATION & MANAGEMENT
# ==============================================================================

def get_folder_breadcrumbs(folder_id: Optional[int]) -> List[Dict[str, Any]]:
    """Recursively resolves breadcrumbs hierarchy from root to current folder."""
    crumbs = [{"id": None, "name": "Repository Root"}]
    if not folder_id:
        return crumbs

    current_id = folder_id
    path = []
    visited = set()
    while current_id and current_id not in visited:
        visited.add(current_id)
        row = database.query_one("SELECT id, parent_id, name FROM folders WHERE id = %s", (current_id,))
        if not row:
            break
        path.append({"id": row["id"], "name": row["name"]})
        current_id = row["parent_id"]

    path.reverse()
    return crumbs + path


@app.get("/api/folders")
def list_folder_contents(
    parent_id: Optional[int] = Query(None),
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Lists subfolders and files in a given folder (or root if parent_id is omitted/null),
    along with the full breadcrumb trail.
    """
    # 1. Parameterized subfolder lookup
    if parent_id is None:
        folders = database.query_all(
            "SELECT id, parent_id, name, created_at, "
            "(SELECT COUNT(*) FROM files WHERE folder_id = folders.id) AS file_count, "
            "(SELECT COUNT(*) FROM folders AS f2 WHERE f2.parent_id = folders.id) AS subfolder_count "
            "FROM folders WHERE parent_id IS NULL ORDER BY name ASC"
        )
        files = database.query_all(
            "SELECT id, folder_id, display_name, stored_filename, mime_type, file_format, size_bytes, source, created_at "
            "FROM files WHERE folder_id IS NULL ORDER BY created_at DESC"
        )
    else:
        # Check that parent folder actually exists
        parent_check = database.query_one("SELECT id, name FROM folders WHERE id = %s", (parent_id,))
        if not parent_check:
            raise HTTPException(status_code=404, detail="Folder not found.")

        folders = database.query_all(
            "SELECT id, parent_id, name, created_at, "
            "(SELECT COUNT(*) FROM files WHERE folder_id = folders.id) AS file_count, "
            "(SELECT COUNT(*) FROM folders AS f2 WHERE f2.parent_id = folders.id) AS subfolder_count "
            "FROM folders WHERE parent_id = %s ORDER BY name ASC",
            (parent_id,)
        )
        files = database.query_all(
            "SELECT id, folder_id, display_name, stored_filename, mime_type, file_format, size_bytes, source, created_at "
            "FROM files WHERE folder_id = %s ORDER BY created_at DESC",
            (parent_id,)
        )

    breadcrumbs = get_folder_breadcrumbs(parent_id)

    return {
        "current_folder_id": parent_id,
        "breadcrumbs": breadcrumbs,
        "folders": folders,
        "files": files
    }


@app.get("/api/folders/all")
def get_all_folders_tree(current_user: Dict[str, Any] = Depends(auth.get_current_user)):
    """Returns flat list of all folders for use in folder destination pickers."""
    rows = database.query_all("SELECT id, parent_id, name FROM folders ORDER BY name ASC")
    return rows


@app.post("/api/folders", status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreateRequest,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """Creates a new folder under parent_id (or root if None)."""
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty.")

    if payload.parent_id is not None:
        parent = database.query_one("SELECT id FROM folders WHERE id = %s", (payload.parent_id,))
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder does not exist.")

    # Duplicate name check within same parent
    dup_sql = (
        "SELECT id FROM folders WHERE name = %s AND parent_id IS NULL"
        if payload.parent_id is None else
        "SELECT id FROM folders WHERE name = %s AND parent_id = %s"
    )
    dup_params = (clean_name,) if payload.parent_id is None else (clean_name, payload.parent_id)
    if database.query_one(dup_sql, dup_params):
        raise HTTPException(status_code=409, detail=f"A folder named '{clean_name}' already exists here.")

    folder_id = database.execute(
        "INSERT INTO folders (name, parent_id) VALUES (%s, %s)",
        (clean_name, payload.parent_id)
    )

    log_audit("folder_create", details=f"Created folder '{clean_name}' (id={folder_id})")

    return {
        "success": True,
        "folder": {
            "id": folder_id,
            "name": clean_name,
            "parent_id": payload.parent_id
        }
    }


@app.patch("/api/folders/{folder_id}")
def update_folder(
    folder_id: int,
    payload: FolderUpdateRequest,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """Renames or moves an existing folder."""
    existing = database.query_one("SELECT id, name, parent_id FROM folders WHERE id = %s", (folder_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Folder not found.")

    new_name = payload.name.strip() if payload.name is not None else existing["name"]
    new_parent_id = payload.parent_id if payload.parent_id is not None else existing["parent_id"]

    if new_parent_id == folder_id:
        raise HTTPException(status_code=400, detail="A folder cannot be its own parent.")

    database.execute(
        "UPDATE folders SET name = %s, parent_id = %s WHERE id = %s",
        (new_name, new_parent_id, folder_id)
    )

    log_audit("folder_update", details=f"Updated folder {folder_id} -> '{new_name}'")

    return {"success": True, "folder": {"id": folder_id, "name": new_name, "parent_id": new_parent_id}}


@app.delete("/api/folders/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Deletes a folder. Associated files have folder_id set to NULL or are cleaned up.
    """
    existing = database.query_one("SELECT id, name FROM folders WHERE id = %s", (folder_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Folder not found.")

    # Remove files under this folder from disk
    files = database.query_all("SELECT id, stored_filename FROM files WHERE folder_id = %s", (folder_id,))
    for f in files:
        file_path = config.STORAGE_DIR / f["stored_filename"]
        if file_path.exists():
            try:
                os.remove(file_path)
            except Exception as e:
                logger.warning(f"Error removing file {file_path}: {e}")
        database.execute("DELETE FROM files WHERE id = %s", (f["id"],))

    database.execute("DELETE FROM folders WHERE id = %s", (folder_id,))
    log_audit("folder_delete", details=f"Deleted folder '{existing['name']}' (id={folder_id})")

    return {"success": True, "message": f"Folder '{existing['name']}' deleted."}


# ==============================================================================
# FILE UPLOAD & MANAGEMENT
# ==============================================================================

@app.post("/api/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    folder_id: Optional[int] = Form(None),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Handles direct file uploads (drag-and-drop or file picker).
    Saves with UUID filename into storage/ and logs row in database.
    """
    if folder_id is not None:
        folder = database.query_one("SELECT id FROM folders WHERE id = %s", (folder_id,))
        if not folder:
            raise HTTPException(status_code=404, detail="Destination folder does not exist.")

    saved_files = []
    max_bytes = config.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    for upload in files:
        original_name = upload.filename or "uploaded_document"
        ext = Path(original_name).suffix.lstrip(".").lower()
        if not ext:
            ext = "bin"

        # Unique stored filename on disk
        stored_uuid = f"{uuid.uuid4().hex}.{ext}"
        target_path = config.STORAGE_DIR / stored_uuid

        size = 0
        with open(target_path, "wb") as buffer:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    buffer.close()
                    if target_path.exists():
                        os.remove(target_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File '{original_name}' exceeds maximum size of {config.MAX_UPLOAD_SIZE_MB}MB."
                    )
                buffer.write(chunk)

        content_type = upload.content_type or "application/octet-stream"

        file_id = database.execute(
            "INSERT INTO files (folder_id, display_name, stored_filename, mime_type, file_format, size_bytes, source) "
            "VALUES (%s, %s, %s, %s, %s, %s, 'upload')",
            (folder_id, original_name, stored_uuid, content_type, ext, size)
        )

        client_ip = request.client.host if request and request.client else "127.0.0.1"
        log_audit("file_upload", file_id=file_id, details=f"Uploaded '{original_name}' ({size} bytes)", ip_address=client_ip)

        saved_files.append({
            "id": file_id,
            "display_name": original_name,
            "stored_filename": stored_uuid,
            "size_bytes": size,
            "format": ext,
            "folder_id": folder_id
        })

    return {"success": True, "files": saved_files}


@app.get("/api/files/{file_id}")
def get_file(
    file_id: int,
    download: bool = Query(False),
    token: Optional[str] = Query(None),
    request: Request = None,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Downloads or streams an existing stored file.
    Supports inline preview for PDFs and images without forcing automatic browser download.
    """
    file_record = database.query_one("SELECT * FROM files WHERE id = %s", (file_id,))
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in database.")

    file_path = config.STORAGE_DIR / file_record["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File binary not found on disk.")

    client_ip = request.client.host if request and request.client else "127.0.0.1"
    log_audit("file_view" if not download else "file_download", file_id=file_id, details=file_record["display_name"], ip_address=client_ip)

    disposition = "attachment" if download else "inline"
    safe_filename = file_record["display_name"].replace('"', '')

    fmt = (file_record.get("file_format") or "").lower()
    mime_type = file_record.get("mime_type")

    # Explicitly ensure correct MIME type for in-browser PDF and image rendering
    if fmt == "pdf" or safe_filename.lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif fmt in ("png", "jpg", "jpeg", "webp", "gif"):
        mime_type = f"image/{fmt if fmt != 'jpg' else 'jpeg'}"

    return FileResponse(
        path=str(file_path),
        media_type=mime_type or "application/octet-stream",
        filename=safe_filename,
        content_disposition_type=disposition,
        headers={
            "X-Content-Type-Options": "nosniff"
        }
    )


@app.get("/api/files/{file_id}/preview-data")
def get_file_preview_data(
    file_id: int,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Returns file bytes as a base64-encoded JSON payload.
    This bypasses download managers (like IDM) that intercept file MIME-type responses,
    because JSON responses are never intercepted by download managers.
    Used exclusively by the in-browser PDF/image canvas viewer.
    """
    import base64
    file_record = database.query_one("SELECT * FROM files WHERE id = %s", (file_id,))
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")

    file_path = config.STORAGE_DIR / file_record["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File binary not found on disk.")

    fmt = (file_record.get("file_format") or "").lower()
    mime_type = file_record.get("mime_type") or "application/octet-stream"
    if fmt == "pdf" or file_record["display_name"].lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif fmt in ("png", "jpg", "jpeg", "webp", "gif"):
        mime_type = f"image/{fmt if fmt != 'jpg' else 'jpeg'}"

    raw_bytes = file_path.read_bytes()
    encoded = base64.b64encode(raw_bytes).decode("ascii")

    return {
        "data": encoded,
        "mime": mime_type,
        "size": len(raw_bytes),
        "name": file_record["display_name"]
    }


@app.get("/api/files/{file_id}/thumbnail")
def get_file_thumbnail(
    file_id: int,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Generates or returns a quick thumbnail for image and PDF files.
    """
    file_record = database.query_one("SELECT * FROM files WHERE id = %s", (file_id,))
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")

    file_path = config.STORAGE_DIR / file_record["stored_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Binary not found.")

    thumb_cache = config.STORAGE_DIR / f"thumb_{file_record['stored_filename']}.jpg"
    if thumb_cache.exists():
        return FileResponse(path=str(thumb_cache), media_type="image/jpeg")

    fmt = file_record.get("file_format", "").lower()
    try:
        if fmt in ("jpg", "jpeg", "png", "webp", "bmp"):
            with Image.open(file_path) as img:
                im_rgb = img.convert("RGB")
                im_rgb.thumbnail((260, 320))
                im_rgb.save(thumb_cache, "JPEG", quality=80)
            return FileResponse(path=str(thumb_cache), media_type="image/jpeg")

        elif fmt == "pdf":
            import pypdfium2
            pdf = pypdfium2.PdfDocument(str(file_path))
            if len(pdf) > 0:
                pil_img = pdf[0].render(scale=0.5).to_pil()
                pil_img.thumbnail((260, 320))
                pil_img.save(thumb_cache, "JPEG", quality=80)
                return FileResponse(path=str(thumb_cache), media_type="image/jpeg")
    except Exception as e:
        logger.warning(f"Could not generate thumbnail for {file_id}: {e}")

    # Fallback to full file if image, or return 404
    if fmt in ("jpg", "jpeg", "png", "webp"):
        return FileResponse(path=str(file_path), media_type=file_record["mime_type"])
    raise HTTPException(status_code=404, detail="Thumbnail not available for this format.")


@app.patch("/api/files/{file_id}")
def update_file(
    file_id: int,
    payload: FileUpdateRequest,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """Renames or moves a file."""
    existing = database.query_one("SELECT id, display_name, folder_id FROM files WHERE id = %s", (file_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="File not found.")

    new_name = payload.display_name.strip() if payload.display_name is not None else existing["display_name"]
    new_folder_id = payload.folder_id if payload.folder_id is not None else existing["folder_id"]

    if new_folder_id is not None:
        folder = database.query_one("SELECT id FROM folders WHERE id = %s", (new_folder_id,))
        if not folder:
            raise HTTPException(status_code=404, detail="Target folder does not exist.")

    database.execute(
        "UPDATE files SET display_name = %s, folder_id = %s WHERE id = %s",
        (new_name, new_folder_id, file_id)
    )

    log_audit("file_rename", file_id=file_id, details=f"Renamed file to '{new_name}'")

    return {"success": True, "file": {"id": file_id, "display_name": new_name, "folder_id": new_folder_id}}


@app.delete("/api/files/{file_id}")
def delete_file(
    file_id: int,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """Deletes a file from database and disk storage."""
    existing = database.query_one("SELECT id, display_name, stored_filename FROM files WHERE id = %s", (file_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="File not found.")

    file_path = config.STORAGE_DIR / existing["stored_filename"]
    thumb_path = config.STORAGE_DIR / f"thumb_{existing['stored_filename']}.jpg"

    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to remove {file_path}: {e}")

    if thumb_path.exists():
        try:
            os.remove(thumb_path)
        except Exception:
            pass

    database.execute("DELETE FROM files WHERE id = %s", (file_id,))
    log_audit("file_delete", file_id=file_id, details=f"Deleted file '{existing['display_name']}'")

    return {"success": True, "message": f"File '{existing['display_name']}' deleted."}


# ==============================================================================
# SCANNER INTEGRATION ROUTES (Two-Phase: Trigger -> Preview -> Save/Discard)
# ==============================================================================

@app.get("/api/scan/capabilities")
def get_scan_capabilities(current_user: Dict[str, Any] = Depends(auth.get_current_user)):
    """Proxies the printer's eSCL capabilities (Flatbed, Feeder, Duplex, Resolutions)."""
    return scan_service.check_capabilities()


@app.post("/api/scan/trigger")
def trigger_scan_job(
    payload: ScanTriggerRequest,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Triggers an asynchronous scan job.
    Returns job_id to poll status and previews.
    """
    job_id = scan_service.start_scan(
        input_source=payload.source,
        duplex=payload.duplex,
        resolution=payload.resolution,
        color_mode=payload.color_mode
    )
    return {
        "success": True,
        "job_id": job_id,
        "status": "queued",
        "message": "Scan job initiated. Monitoring printer..."
    }


@app.get("/api/scan/{job_id}/status")
def get_scan_job_status(
    job_id: str,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Polls the scan job progress, returning current state and scanned pages list.
    """
    job = scan_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Scan job not found or expired.")

    # Format page list for frontend preview
    pages = []
    for p in job.get("pages", []):
        p_num = p["page_num"]
        pages.append({
            "page_num": p_num,
            "preview_url": f"/api/scan/{job_id}/preview/{p_num}",
            "thumbnail_url": f"/api/scan/{job_id}/preview/{p_num}?thumb=1",
            "size_bytes": p["size_bytes"],
            "content_type": p["content_type"]
        })

    return {
        "job_id": job_id,
        "status": job["status"],
        "input_source": job.get("input_source"),
        "page_count": job.get("page_count", 0),
        "pages": pages,
        "notice": job.get("notice"),
        "error": job.get("error")
    }


@app.get("/api/scan/{job_id}/preview/{page_num}")
def get_scan_preview_page(
    job_id: str,
    page_num: int,
    thumb: bool = Query(False),
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Returns image bytes for a specific scanned page or its thumbnail.
    """
    path = scan_service.get_page_path(job_id, page_num, thumbnail=thumb)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="Preview page not ready or not found.")

    return FileResponse(path=str(path), media_type="image/jpeg")


@app.post("/api/scan/{job_id}/save")
def commit_scan_job(
    job_id: str,
    payload: ScanSaveRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Commits a scanned document:
    Combines pages into PDF or PNG, moves from staging to storage, and writes DB row.
    """
    clean_name = payload.display_name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Document name is required.")

    # Ensure appropriate file extension in display name
    target_format = payload.format.lower()
    if target_format == "pdf" and not clean_name.lower().endswith(".pdf"):
        clean_name = f"{clean_name}.pdf"
    elif target_format == "png" and not clean_name.lower().endswith(".png"):
        clean_name = f"{clean_name}.png"

    if payload.folder_id is not None:
        folder = database.query_one("SELECT id FROM folders WHERE id = %s", (payload.folder_id,))
        if not folder:
            raise HTTPException(status_code=404, detail="Target folder not found.")

    try:
        meta = scan_service.commit_scan(job_id, format_choice=target_format)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Failed to commit scan {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save scanned document: {e}")

    file_id = database.execute(
        "INSERT INTO files (folder_id, display_name, stored_filename, mime_type, file_format, size_bytes, source) "
        "VALUES (%s, %s, %s, %s, %s, %s, 'scan')",
        (payload.folder_id, clean_name, meta["stored_filename"], meta["mime_type"], meta["file_format"], meta["size_bytes"])
    )

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_audit("scan_save", file_id=file_id, details=f"Scanned '{clean_name}' committed ({meta['size_bytes']} bytes)", ip_address=client_ip)

    return {
        "success": True,
        "file": {
            "id": file_id,
            "display_name": clean_name,
            "size_bytes": meta["size_bytes"],
            "format": meta["file_format"],
            "folder_id": payload.folder_id
        }
    }


@app.post("/api/scan/{job_id}/discard")
def discard_scan_job(
    job_id: str,
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """
    Discards a previewed scan and drops all staged page bytes.
    """
    discarded = scan_service.discard_scan(job_id)
    return {"success": True, "discarded": discarded, "message": "Scan job discarded."}


# ==============================================================================
# SEARCH & STATS ROUTES
# ==============================================================================

@app.get("/api/search")
def search_repository(
    q: str = Query(..., min_length=1),
    current_user: Dict[str, Any] = Depends(auth.get_current_user)
):
    """Searches files and folders by name across the entire repository."""
    search_term = f"%{q.strip()}%"
    files = database.query_all(
        "SELECT id, folder_id, display_name, mime_type, file_format, size_bytes, source, created_at "
        "FROM files WHERE display_name LIKE %s ORDER BY created_at DESC LIMIT 50",
        (search_term,)
    )
    folders = database.query_all(
        "SELECT id, parent_id, name, created_at FROM folders WHERE name LIKE %s ORDER BY name ASC LIMIT 20",
        (search_term,)
    )
    return {"query": q, "files": files, "folders": folders}


@app.get("/api/stats")
def get_repository_stats(current_user: Dict[str, Any] = Depends(auth.get_current_user)):
    """Returns total storage volume, file count, and scan vs upload counts."""
    file_stats = database.query_one(
        "SELECT COUNT(*) as total_files, COALESCE(SUM(size_bytes), 0) as total_bytes, "
        "SUM(CASE WHEN source = 'scan' THEN 1 ELSE 0 END) as scanned_count, "
        "SUM(CASE WHEN source = 'upload' THEN 1 ELSE 0 END) as uploaded_count "
        "FROM files"
    )
    folder_count = database.query_one("SELECT COUNT(*) as total_folders FROM folders")
    return {
        "total_files": file_stats["total_files"] if file_stats else 0,
        "total_bytes": file_stats["total_bytes"] if file_stats else 0,
        "scanned_count": file_stats["scanned_count"] if file_stats else 0,
        "uploaded_count": file_stats["uploaded_count"] if file_stats else 0,
        "total_folders": folder_count["total_folders"] if folder_count else 0
    }


# ==============================================================================
# FRONTEND STATIC FILES SERVING
# ==============================================================================

frontend_dir = config.BASE_DIR / "frontend"
frontend_dir.mkdir(parents=True, exist_ok=True)

app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")
if (frontend_dir / "asset").exists():
    app.mount("/asset", StaticFiles(directory=str(frontend_dir / "asset")), name="asset")
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "asset")), name="assets")


@app.get("/")
def serve_index():
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(path=str(index_path))
    return {"message": "FileTrack Backend Running. Frontend index.html not found in frontend/ directory."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.SERVER_HOST, port=config.SERVER_PORT, reload=True)
