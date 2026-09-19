"""
Quick test script: trigger a scan on the Canon MF642C/643C/644C over the
network via eSCL, and save the result(s) to disk. Supports both the
flatbed (Platen) and the document feeder (Feeder/ADF), including
multi-page duplex scans.

Usage:
    pip install requests
    python scantest.py
"""

import time
import requests

# --- Edit these to match your setup ---
PRINTER_IP = "192.168.23.82"
BASE_URL = f"http://{PRINTER_IP}/eSCL"

# "Platen" = flatbed glass, one page only
# "Feeder" = ADF, can pull multiple pages in one job
INPUT_SOURCE = "Feeder"

# Only meaningful when INPUT_SOURCE is "Feeder". Set True if your ADF
# supports scanning both sides of the page automatically.
DUPLEX = False


def build_scan_settings_xml(input_source=INPUT_SOURCE, duplex=DUPLEX):
    duplex_line = f"<scan:Duplex>{'true' if duplex else 'false'}</scan:Duplex>" \
        if input_source == "Feeder" else ""
    # Region is in 1/300" units; 2550x3300 = US Letter at 300dpi.
    # Use roughly 2480x3508 instead for A4.
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings
    xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03"
    xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.0</pwg:Version>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:Height>3300</pwg:Height>
      <pwg:Width>2550</pwg:Width>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>{input_source}</pwg:InputSource>
  {duplex_line}
  <scan:ColorMode>RGB24</scan:ColorMode>
  <scan:XResolution>300</scan:XResolution>
  <scan:YResolution>300</scan:YResolution>
</scan:ScanSettings>
"""


def check_capabilities():
    """Sanity check, and worth reading the XML to confirm 'Feeder' and
    'Duplex' are actually listed as supported on your device."""
    resp = requests.get(f"{BASE_URL}/ScannerCapabilities", timeout=10)
    resp.raise_for_status()
    print("Scanner responded. First 500 chars of capabilities XML:")
    print(resp.text[:500])
    print("...\n")


def trigger_scan():
    headers = {"Content-Type": "text/xml"}
    resp = requests.post(f"{BASE_URL}/ScanJobs", data=build_scan_settings_xml(),
                          headers=headers, timeout=10)
    resp.raise_for_status()
    job_url = resp.headers.get("Location")
    if not job_url:
        raise RuntimeError("Printer didn't return a job location.")
    print(f"Scan job created: {job_url}")
    return job_url


def fetch_all_pages(job_url, prefix="scan_page", max_wait_per_page=30):
    """
    Keeps calling NextDocument until the printer has no more pages to give
    (404). Works for both a single Platen scan (one page, then stop) and a
    multi-page Feeder job.
    """
    doc_url = f"{job_url}/NextDocument"
    saved_files = []
    page_num = 1

    while True:
        waited = 0
        got_page = False
        while waited < max_wait_per_page:
            resp = requests.get(doc_url, timeout=10)
            if resp.status_code == 200:
                content_type = resp.headers.get("Content-Type", "")
                ext = "pdf" if "pdf" in content_type else "jpg"
                out_path = f"{prefix}_{page_num}.{ext}"
                with open(out_path, "wb") as f:
                    f.write(resp.content)
                print(f"Saved page {page_num} to {out_path} ({content_type})")
                saved_files.append(out_path)
                got_page = True
                break
            elif resp.status_code == 404:
                # Either the next page isn't ready yet, or there are no
                # more pages at all -- we can't fully tell them apart from
                # the status code alone, so we retry briefly before giving
                # up on this page and treating the job as finished.
                time.sleep(1)
                waited += 1
            else:
                raise RuntimeError(f"Unexpected status {resp.status_code} "
                                    f"while fetching page {page_num}: "
                                    f"{resp.text[:200]}")

        if not got_page:
            break  # no more pages -- job is done
        page_num += 1

    if not saved_files:
        raise TimeoutError("No pages were returned by the scanner.")
    print(f"\nDone. {len(saved_files)} page(s) saved.")
    return saved_files


if __name__ == "__main__":
    check_capabilities()
    job_url = trigger_scan()
    fetch_all_pages(job_url)