"""
FileTrack Configuration
Edit your database credentials, scanner IP, and repository paths here.
"""

import os
from pathlib import Path

# Base Directory of the Project
BASE_DIR = Path(__file__).resolve().parent

# ==============================================================================
# DATABASE CONFIGURATION (MySQL / MariaDB)
# ==============================================================================
# Input your database credentials below:
DB_HOST = os.getenv("FILETRACK_DB_HOST", "")
DB_PORT = int(os.getenv("FILETRACK_DB_PORT", ))
DB_USER = os.getenv("FILETRACK_DB_USER", "")
DB_PASSWORD = os.getenv("FILETRACK_DB_PASSWORD", "")
DB_NAME = os.getenv("FILETRACK_DB_NAME", "")

# ==============================================================================
# PRINTER / SCANNER CONFIGURATION (Canon eSCL over HTTP)
# ==============================================================================
# Target Canon MF642C/643C/644C or any eSCL-compatible network scanner.
# Note: Use TLS should be OFF in printer Network Link Scan Settings.
PRINTER_IP = os.getenv("FILETRACK_PRINTER_IP", "192.168.23.82")
PRINTER_PORT = int(os.getenv("FILETRACK_PRINTER_PORT", 80))
PRINTER_USE_TLS = os.getenv("FILETRACK_PRINTER_USE_TLS", "false").lower() in ("true", "1", "yes")
PRINTER_TIMEOUT = int(os.getenv("FILETRACK_PRINTER_TIMEOUT", 15))  # seconds

# Constructed eSCL base URL
PRINTER_SCHEME = "https" if PRINTER_USE_TLS else "http"
PRINTER_BASE_URL = f"{PRINTER_SCHEME}://{PRINTER_IP}:{PRINTER_PORT}/eSCL"

# Default scanning presets
DEFAULT_SCAN_RESOLUTION = 300  # 300 DPI for sharp crisp documents
DEFAULT_COLOR_MODE = "RGB24"   # "RGB24" or "Grayscale8"

# ==============================================================================
# STORAGE & DIRECTORIES
# ==============================================================================
# Directory for permanently stored UUID files (PDFs, images)
STORAGE_DIR = Path(os.getenv("FILETRACK_STORAGE_DIR", BASE_DIR / "storage"))

# Directory for staging scans before user commits/saves or discards
STAGING_DIR = Path(os.getenv("FILETRACK_STAGING_DIR", BASE_DIR / "staging"))

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
STAGING_DIR.mkdir(parents=True, exist_ok=True)

# Maximum file upload size in megabytes (e.g. 100 MB)
MAX_UPLOAD_SIZE_MB = 100

# ==============================================================================
# AUTHENTICATION & SECURITY
# ==============================================================================
# Secret key used for signing session tokens
SECRET_KEY = os.getenv("FILETRACK_SECRET_KEY", "filetrack-lan-secure-session-key-2026")

# Session cookie settings
SESSION_COOKIE_NAME = "filetrack_session"
SESSION_LIFETIME_MINUTES = 120  # 2 hours idle expiration
SESSION_COOKIE_SECURE = False   # Set True if serving strictly over HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "lax"

# Brute-force protection: Max failed login attempts before lockout
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5 minutes lockout

# ==============================================================================
# SERVER HOST & PORT
# ==============================================================================
SERVER_HOST = os.getenv("FILETRACK_HOST", "0.0.0.0")
SERVER_PORT = int(os.getenv("FILETRACK_PORT", 8000))
