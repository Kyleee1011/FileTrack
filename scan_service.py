"""
FileTrack Scan Service
Interfaces with network scanner (eSCL over HTTP) and manages two-phase scan jobs (trigger -> preview -> commit/discard).
"""

import os
import time
import uuid
import shutil
import logging
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional
import requests
from PIL import Image, ImageDraw, ImageFont

import config

logger = logging.getLogger("filetrack.scanner")

# Active scan jobs: job_id -> Job State Dict
_active_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = threading.Lock()


def build_scan_settings_xml(
    input_source: str = "Platen",
    duplex: bool = False,
    resolution: int = config.DEFAULT_SCAN_RESOLUTION,
    color_mode: str = config.DEFAULT_COLOR_MODE
) -> str:
    """
    Constructs the PWG/eSCL XML payload for the scan job.
    Region: 2550x3300 = US Letter at 300dpi (roughly 2480x3508 for A4).
    """
    actual_source = "ADF" if duplex and input_source.lower() == "feeder" else input_source
    duplex_element = (
        f"<scan:Duplex>{'true' if duplex else 'false'}</scan:Duplex>"
        if input_source.lower() == "feeder" else ""
    )
    
    # Calculate region in 1/300" units
    width = 2550
    height = 3300

    return f"""<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings
    xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.0</pwg:Version>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:Height>{height}</pwg:Height>
      <pwg:Width>{width}</pwg:Width>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>{actual_source}</pwg:InputSource>
  {duplex_element}
  <pwg:DocumentFormatExt>image/jpeg</pwg:DocumentFormatExt>
  <scan:ColorMode>{color_mode}</scan:ColorMode>
  <scan:XResolution>{resolution}</scan:XResolution>
  <scan:YResolution>{resolution}</scan:YResolution>
</scan:ScanSettings>
"""


def check_capabilities() -> Dict[str, Any]:
    """
    Queries /eSCL/ScannerCapabilities to check if printer is reachable and inspect features.
    """
    cap_url = f"{config.PRINTER_BASE_URL}/ScannerCapabilities"
    try:
        resp = requests.get(cap_url, timeout=config.PRINTER_TIMEOUT)
        resp.raise_for_status()
        xml_text = resp.text

        # Parse basic capabilities
        supports_feeder = "Feeder" in xml_text or "<pwg:InputSource>Feeder" in xml_text
        supports_duplex = "Duplex" in xml_text

        # Try to parse XML model name
        model_name = "Canon Network Scanner"
        try:
            root = ET.fromstring(xml_text)
            # Find make/model tags
            for elem in root.iter():
                if "MakeAndModel" in elem.tag and elem.text:
                    model_name = elem.text.strip()
                    break
        except Exception:
            pass

        return {
            "online": True,
            "printer_ip": config.PRINTER_IP,
            "model": model_name,
            "supports_feeder": supports_feeder,
            "supports_duplex": supports_duplex,
            "resolutions": [150, 300, 600],
            "color_modes": ["RGB24", "Grayscale8"],
            "message": "Scanner is online and ready."
        }
    except requests.RequestException as e:
        logger.warning(f"Scanner not reachable at {cap_url}: {e}")
        return {
            "online": False,
            "printer_ip": config.PRINTER_IP,
            "model": "Canon MF642C/643C/644C (Offline)",
            "supports_feeder": True,
            "supports_duplex": True,
            "resolutions": [150, 300, 600],
            "color_modes": ["RGB24", "Grayscale8"],
            "message": f"Cannot connect to printer at {config.PRINTER_IP}:{config.PRINTER_PORT}. Ensure it is powered on and connected to the LAN.",
            "error": str(e)
        }


def _generate_demo_scan(stage_dir: Path, page_count: int = 1) -> List[Dict[str, Any]]:
    """
    Generates realistic sample scanned page(s) when testing in environments
    where physical scanner is unreachable.
    """
    pages_info = []
    for i in range(1, page_count + 1):
        # Create a document-like image
        img = Image.new("RGB", (1240, 1754), color=(252, 252, 254))
        draw = ImageDraw.Draw(img)
        
        # Draw mock document header and lines
        draw.rectangle([50, 50, 1190, 1704], outline=(200, 210, 225), width=2)
        draw.rectangle([80, 80, 450, 120], fill=(14, 210, 218))
        draw.text((90, 92), f"FILETRACK SCANNED DOCUMENT - PAGE {i}", fill=(255, 255, 255))
        
        # Header separator
        draw.line([80, 140, 1160, 140], fill=(95, 41, 199), width=3)
        
        # Scanned text simulation lines
        y = 180
        for line_idx in range(25):
            line_w = 400 + ((line_idx * 73) % 650)
            draw.rectangle([80, y, 80 + line_w, y + 14], fill=(225, 230, 240))
            y += 32
            if y > 1600:
                break
                
        # Timestamp stamp
        draw.text((80, 1640), f"Digital Capture Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')} (LAN eSCL)", fill=(120, 130, 145))

        page_file = stage_dir / f"page_{i}.jpg"
        img.save(page_file, "JPEG", quality=92)

        # Generate thumbnail
        thumb = img.copy()
        thumb.thumbnail((320, 440))
        thumb_file = stage_dir / f"thumb_{i}.jpg"
        thumb.save(thumb_file, "JPEG", quality=85)

        pages_info.append({
            "page_num": i,
            "filename": f"page_{i}.jpg",
            "thumb_filename": f"thumb_{i}.jpg",
            "file_path": str(page_file),
            "thumb_path": str(thumb_file),
            "content_type": "image/jpeg",
            "size_bytes": page_file.stat().st_size
        })
    return pages_info


def _run_scan_job(job_id: str, input_source: str, duplex: bool, resolution: int, color_mode: str):
    """
    Background worker that posts to /eSCL/ScanJobs and fetches pages.
    """
    with _jobs_lock:
        job = _active_jobs.get(job_id)
        if not job:
            return
        job["status"] = "scanning"

    stage_dir = Path(job["stage_dir"])
    stage_dir.mkdir(parents=True, exist_ok=True)

    headers = {"Content-Type": "text/xml"}
    xml_body = build_scan_settings_xml(input_source, duplex, resolution, color_mode)

    try:
        # 1. Trigger scan on printer
        scan_jobs_url = f"{config.PRINTER_BASE_URL}/ScanJobs"
        resp = requests.post(scan_jobs_url, data=xml_body, headers=headers, timeout=config.PRINTER_TIMEOUT)
        resp.raise_for_status()

        job_location = resp.headers.get("Location")
        if not job_location:
            # Check for relative location header
            raise RuntimeError("Scanner did not return a Job Location header.")

        # Ensure full URL if relative
        if not job_location.startswith("http"):
            job_location = f"{config.PRINTER_SCHEME}://{config.PRINTER_IP}:{config.PRINTER_PORT}{job_location}"

        doc_url = f"{job_location}/NextDocument"
        pages_info = []
        page_num = 1
        max_wait_per_page = 35

        while True:
            waited = 0
            got_page = False
            while waited < max_wait_per_page:
                try:
                    page_resp = requests.get(doc_url, timeout=120)
                except requests.RequestException as e:
                    time.sleep(1)
                    waited += 1
                    continue

                if page_resp.status_code == 200:
                    content_type = page_resp.headers.get("Content-Type", "").lower()
                    ext = "pdf" if "pdf" in content_type else "jpg"
                    page_filename = f"page_{page_num}.{ext}"
                    page_path = stage_dir / page_filename

                    with open(page_path, "wb") as f:
                        f.write(page_resp.content)

                    # Create thumbnail
                    thumb_filename = f"thumb_{page_num}.jpg"
                    thumb_path = stage_dir / thumb_filename
                    try:
                        if ext == "pdf":
                            import pypdfium2
                            pdf = pypdfium2.PdfDocument(str(page_path))
                            image = pdf[0].render(scale=1).to_pil()
                            image.thumbnail((320, 440))
                            image.save(thumb_path, "JPEG", quality=85)
                        else:
                            with Image.open(page_path) as im:
                                im_rgb = im.convert("RGB")
                                im_rgb.thumbnail((320, 440))
                                im_rgb.save(thumb_path, "JPEG", quality=85)
                    except Exception as err:
                        logger.warning(f"Could not generate thumbnail for page {page_num}: {err}")
                        # Fallback: copy page if it was image
                        if ext != "pdf":
                            shutil.copy(page_path, thumb_path)

                    pages_info.append({
                        "page_num": page_num,
                        "filename": page_filename,
                        "thumb_filename": thumb_filename,
                        "file_path": str(page_path),
                        "thumb_path": str(thumb_path),
                        "content_type": content_type or ("application/pdf" if ext == "pdf" else "image/jpeg"),
                        "size_bytes": page_path.stat().st_size
                    })

                    with _jobs_lock:
                        job["pages"] = list(pages_info)
                        job["page_count"] = len(pages_info)

                    got_page = True
                    break

                elif page_resp.status_code == 410:
                    # 410 Gone = eSCL job complete, no more pages — break immediately
                    break
                elif page_resp.status_code == 404:
                    # 404 = feeder empty or job already finished — treat as end-of-job
                    break
                elif page_resp.status_code == 503:
                    # 503 Service Unavailable = scanner still warming up/busy — retry with back-off
                    time.sleep(2)
                    waited += 2
                else:
                    raise RuntimeError(f"Unexpected status code {page_resp.status_code} from printer: {page_resp.text[:200]}")

            if not got_page:
                break
            page_num += 1

        if not pages_info:
            raise RuntimeError("No pages were received from the scanner.")

        with _jobs_lock:
            job["status"] = "ready"
            job["pages"] = pages_info
            job["page_count"] = len(pages_info)

    except requests.exceptions.HTTPError as e:
        err_msg = str(e)
        if e.response is not None and e.response.status_code == 500 and input_source == "Feeder":
            err_msg = "ADF feeder is empty or scanner is busy (500 Error)."
        
        logger.error(f"Scan job {job_id} failed: {err_msg}")
        with _jobs_lock:
            job["status"] = "error"
            job["error"] = f"Scan failed: {err_msg}"
    except Exception as e:
        logger.error(f"Scan job {job_id} failed: {e}")
        with _jobs_lock:
            job["status"] = "error"
            job["error"] = f"Scan failed: {e}"


def start_scan(
    input_source: str = "Platen",
    duplex: bool = False,
    resolution: int = config.DEFAULT_SCAN_RESOLUTION,
    color_mode: str = config.DEFAULT_COLOR_MODE
) -> str:
    """
    Initializes a new scan job and kicks off the background fetch worker.
    Returns the unique job_id.
    """
    job_id = uuid.uuid4().hex
    stage_dir = config.STAGING_DIR / job_id
    stage_dir.mkdir(parents=True, exist_ok=True)

    with _jobs_lock:
        _active_jobs[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "input_source": input_source,
            "duplex": duplex,
            "resolution": resolution,
            "color_mode": color_mode,
            "stage_dir": str(stage_dir),
            "pages": [],
            "page_count": 0,
            "error": None,
            "created_at": time.time()
        }

    # Start scanning thread
    thread = threading.Thread(
        target=_run_scan_job,
        args=(job_id, input_source, duplex, resolution, color_mode),
        daemon=True
    )
    thread.start()

    return job_id


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Returns the current status and metadata of a scan job.
    """
    with _jobs_lock:
        job = _active_jobs.get(job_id)
        if not job:
            return None
        return dict(job)


def get_page_path(job_id: str, page_num: int, thumbnail: bool = False) -> Optional[Path]:
    """
    Returns the file path for a scanned page or thumbnail in staging.
    """
    with _jobs_lock:
        job = _active_jobs.get(job_id)
        if not job:
            return None
        for p in job.get("pages", []):
            if p["page_num"] == page_num:
                path_str = p["thumb_path"] if thumbnail else p["file_path"]
                path = Path(path_str)
                if path.exists():
                    return path
    return None


def commit_scan(
    job_id: str,
    format_choice: str = "pdf"
) -> Dict[str, Any]:
    """
    Converts staged pages into the final permanent file in storage/.
    Returns file metadata (stored_filename, size_bytes, mime_type, file_format).
    """
    with _jobs_lock:
        job = _active_jobs.get(job_id)
        if not job:
            raise ValueError("Scan job not found or has expired.")
        if job["status"] != "ready":
            raise ValueError(f"Scan job is not ready (current status: {job['status']}).")
        pages = job.get("pages", [])
        if not pages:
            raise ValueError("No scanned pages found in this job.")

    final_uuid = uuid.uuid4().hex
    format_choice = format_choice.lower().strip()

    if format_choice == "png":
        # If single page, save as PNG. If multiple, save as PDF or first page.
        stored_filename = f"{final_uuid}.png"
        target_path = config.STORAGE_DIR / stored_filename

        first_page_path = Path(pages[0]["file_path"])
        with Image.open(first_page_path) as im:
            im.save(target_path, "PNG")

        mime_type = "image/png"
        file_format = "png"
        size_bytes = target_path.stat().st_size

    else:
        # Default: PDF combining all scanned pages
        stored_filename = f"{final_uuid}.pdf"
        target_path = config.STORAGE_DIR / stored_filename

        # Combine pages into PDF using PIL
        pil_images = []
        for p in pages:
            p_path = Path(p["file_path"])
            # If the page was already a PDF, or an image
            if p_path.suffix.lower() == ".pdf":
                pass
            else:
                img = Image.open(p_path).convert("RGB")
                pil_images.append(img)

        if pil_images:
            first_img = pil_images[0]
            rest = pil_images[1:]
            first_img.save(target_path, "PDF", resolution=config.DEFAULT_SCAN_RESOLUTION, save_all=True, append_images=rest)
            for im in pil_images:
                im.close()
        else:
            # Fallback if pages were already PDFs: merge using pypdf
            import pypdf
            merger = pypdf.PdfWriter()
            for p in pages:
                merger.append(str(p["file_path"]))
            with open(target_path, "wb") as f:
                merger.write(f)
            merger.close()

        mime_type = "application/pdf"
        file_format = "pdf"
        size_bytes = target_path.stat().st_size

    # Clean up staging files
    discard_scan(job_id)

    return {
        "stored_filename": stored_filename,
        "size_bytes": size_bytes,
        "mime_type": mime_type,
        "file_format": file_format
    }


def discard_scan(job_id: str) -> bool:
    """
    Cleans up staged files for a scan job and removes it from active tracking.
    """
    with _jobs_lock:
        job = _active_jobs.pop(job_id, None)

    if job:
        stage_dir = Path(job.get("stage_dir", ""))
        if stage_dir.exists() and stage_dir.is_dir():
            shutil.rmtree(stage_dir, ignore_errors=True)
        return True
    return False
