# FileTrack — Sensitive Document Repository: Project Plan

Single-admin, LAN-hosted web app for organizing, uploading, and scanning
sensitive personal documents. Runs on the Windows 10 machine already
connected to the Canon MF642C/643C/644C over the network.

Status: eSCL scan trigger is proven working (`scantest.py`) — flatbed and
ADF, multi-page, auto-combined into PDF. Everything below builds the web
app around that.

---

## 1. Tech stack

- **Backend:** Python (Flask or FastAPI — pick one; Flask is simpler for a
  single-user app with server-rendered bits, FastAPI if you want the
  frontend to be a separate JS app talking to a JSON API)
- **Database:** MySQL
- **Frontend:** HTML/CSS/JS (vanilla, or a lightweight setup — no framework
  is required for a single-user internal tool)
- **Scanner integration:** eSCL over plain HTTP (confirmed working against
  the printer at its current LAN IP, port 80, `Use TLS: Off` under Network
  Link Scan Settings)

---

## 2. Architecture

```
Browser (single admin user)
    |
    v
Backend server (Windows 10 host)
    |-- MySQL: folders + file metadata
    |-- Disk storage: actual files (UUID filenames)
    |-- Scan module: calls printer's eSCL service directly (HTTP)
    |
    v
Printer/scanner (same LAN, eSCL over HTTP)
```

The backend is the only thing that talks to MySQL, disk, and the printer.
The browser only ever talks to the backend's own API.

---

## 3. Authentication

- Single admin account. No self-registration, no multi-user roles.
- Password stored as a bcrypt (or argon2) hash — never plaintext.
- Session-based login (server-side session or signed cookie). No need for
  full OAuth/JWT machinery for one user, but do:
  - Rate-limit login attempts (basic lockout after N failures)
  - Set `Secure`, `HttpOnly`, `SameSite=Strict` on the session cookie
  - Require re-login after some idle timeout (e.g. 30–60 min)
- All routes except `/login` require a valid session.

`users` table:

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Only one row will ever exist here, but keeping it as a table (rather than
a hardcoded credential) makes changing the password later trivial.

---

## 4. Database schema

```sql
CREATE TABLE folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parent_id INT NULL REFERENCES folders(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    folder_id INT NULL REFERENCES folders(id),
    display_name VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,  -- UUID-based, on disk
    mime_type VARCHAR(100),
    file_format VARCHAR(10),   -- 'png' or 'pdf'
    size_bytes BIGINT,
    source VARCHAR(20),        -- 'upload' or 'scan'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Design decision carried over from earlier discussion: the *virtual* folder
structure lives entirely in MySQL. Actual files on disk use UUID names
(e.g. `storage/3f2a9e1c.pdf`) so renames/moves are just UPDATE queries and
filesystem-illegal characters are never a problem.

Optional, add later: an `access_log` table (file_id, action, timestamp) if
you want an audit trail of views/downloads.

---

## 5. Backend API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/login` | Authenticate, start session |
| POST | `/api/logout` | End session |
| GET | `/api/folders?parent_id=` | List folders/files in a folder |
| POST | `/api/folders` | Create folder `{name, parent_id}` |
| PATCH | `/api/folders/:id` | Rename/move folder |
| DELETE | `/api/folders/:id` | Delete folder (decide: block if non-empty, or cascade) |
| POST | `/api/upload` | Upload file(s) directly (not via scanner) |
| GET | `/api/files/:id` | Download/view a stored file |
| PATCH | `/api/files/:id` | Rename / move to another folder |
| DELETE | `/api/files/:id` | Delete a file |
| GET | `/api/scan/capabilities` | Proxy printer's eSCL capabilities (confirms Feeder/Duplex support) |
| POST | `/api/scan/trigger` | Start a scan job `{source: "Platen"\|"Feeder", duplex: bool}` |
| GET | `/api/scan/:job_id/status` | Poll scan progress |
| GET | `/api/scan/:job_id/preview` | Return the scanned page(s) for on-screen preview, *not yet saved* |
| POST | `/api/scan/:job_id/save` | Commit the previewed scan: `{display_name, folder_id, format: "png"\|"pdf"}` |
| POST | `/api/scan/:job_id/discard` | Throw away a previewed scan without saving |

The scan flow is intentionally two-phase (`trigger` → `preview` → `save`
or `discard`) so nothing lands in permanent storage until the admin
confirms it in the UI.

---

## 6. Scanner integration details

Reuse the logic already proven in `scantest.py`, moved into a backend
module (e.g. `scan_service.py`):

- `check_capabilities()` — called once at startup or on demand to confirm
  the printer is reachable and to read what it supports
- `trigger_scan(input_source, duplex)` — POSTs to `/eSCL/ScanJobs`,
  returns a job URL
- `fetch_all_pages(job_url)` — loops `NextDocument` calls; treats `200` as
  a page, `410` as "job finished" (confirmed behavior on this printer —
  don't assume `404` means done on other models, check both)
- New: instead of writing straight to a permanent PDF, the backend should
  hold the scanned page bytes in a **staging area** (temp folder or an
  in-memory cache keyed by job id) until `/api/scan/:job_id/save` is
  called. Only then does it get a UUID filename and a `files` row.

Printer connection details (confirmed working):
- Protocol: eSCL over plain HTTP, port 80
- Printer's IP can change on DHCP renewal — **set a static IP or DHCP
  reservation for it** before going further, so the backend's config
  doesn't silently break after a reboot
- `Use TLS` under Network Link Scan Settings: Off (intentional — do not
  re-enable unless you're prepared to redo the TLS/cert work from
  earlier)

---

## 7. Scan-to-save workflow (what the UI needs to support)

1. Admin clicks **Scan** in the web UI
2. UI shows a source selector: **Flatbed** / **Feeder** (+ duplex toggle,
   only enabled when Feeder is selected)
3. Backend triggers the scan job, UI shows a "scanning…" state
4. Once page(s) are ready, backend returns them for preview — UI displays
   each scanned page as a thumbnail/image, in order
5. Admin enters a **file name** (text input, required before Save is
   enabled)
6. Admin picks a **destination folder** (folder picker, defaults to
   current folder they were browsing)
7. Admin picks **format**: PNG (page images, one file per page or a zip)
   or PDF (all pages combined — reuse the `img2pdf` logic already
   working)
8. Admin clicks **Save** → backend moves staged bytes to permanent
   storage, writes the `files` row, returns success → UI refreshes the
   file list
   - Or admin clicks **Discard** / **Rescan** → staged bytes are dropped,
     nothing is written

---

## 8. Frontend screens/components needed

- **Login page** — username + password form
- **File browser (main view)** — breadcrumb/folder tree navigation, grid
  or list of folders + files, "New folder" button, drag-and-drop upload
  zone
- **Upload progress** — for direct file uploads (non-scan), progress bar,
  supports multiple files at once
- **Scan modal/panel**
  - Source toggle: Flatbed / Feeder
  - Duplex checkbox (Feeder only)
  - "Start scan" button
  - Scanning/progress indicator
  - Preview area showing returned page(s)
  - Filename input
  - Folder destination picker
  - Format choice: PNG / PDF
  - Save / Discard / Rescan buttons
- **File preview modal** — for opening existing stored files (image
  viewer for PNGs, embedded viewer for PDFs)
- **Rename/move dialogs** — for both files and folders
- **Delete confirmation** — simple are-you-sure prompt

---

## 9. Security checklist

- [x] HTTPS / LAN-bound cookie configuration (HttpOnly, SameSite=Lax/Strict)
- [x] PBKDF2-HMAC-SHA256 (260k iterations) / bcrypt password hashing, never plaintext
- [x] Session cookie and Bearer token support with idle timeout lockout protection
- [x] Firewall/LAN-bound single admin configuration
- [x] File type & size validation on direct uploads (configurable up to 100MB)
- [x] Sanitized UUID disk storage preventing path traversal attacks
- [x] Database queries strictly parameterized and prepared across all endpoints
- [x] Audit trail access log table tracking all logins, views, uploads, scans, and deletions

---

## 10. Development phases

1. [x] **Backend skeleton** — FastAPI app, single-file `config.py`, MySQL connection via `database.py`, `users` table + login/logout, session token middleware, brute-force lockout
2. [x] **Folder & file CRUD** — `/api/folders`, `/api/folders/{id}`, `/api/files/{id}`, recursive breadcrumb resolution, search and stats endpoints
3. [x] **Direct upload** — Drag-and-drop and file-picker upload working end-to-end, UUID disk storage in `storage/`, database metadata tracking
4. [x] **Scan integration** — Ported `scantest.py` into robust `scan_service.py`, supporting flatbed (Platen) & ADF (Feeder), duplex, resolutions, background worker thread, two-phase staging and commit to PDF/PNG
5. [x] **Frontend application** — Modern separated single-page application in `frontend/`:
   - Authentication view & session management
   - Breadcrumb navigation & grid/list folder & file explorer
   - Drag & drop upload zone with progress indicator
   - Two-phase Scan Studio modal (settings -> live progress -> preview carousel -> save)
   - PDF embedded viewer & high-res image modal
   - Folder creation, rename, move, and deletion dialogs
6. [x] **Visual design pass** — Implemented Uiverse.io cyan-to-purple gradient theme (`linear-gradient(to right, #0ed2da, #5f29c7)`) with vertical line pattern overlay mask and airy, generous white space layout.

---

## 11. Configuration & Deployment

- **Single configuration file:** `config.py` (Database credentials, Printer LAN IP, secrets, paths)
- **Database schema:** `schema.sql` (Creates `filetrack` DB, tables, and default admin user)
- **Launch server:** `python main.py` (or `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`)
