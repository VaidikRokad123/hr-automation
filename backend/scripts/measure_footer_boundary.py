import requests
from datetime import datetime
from pathlib import Path

import fitz
from PIL import Image

API_URL = "http://localhost:5000/api/offerletter/compile"
ROOT = Path("d:/pro/hr")

PAGE_HEIGHT_MM = 297
TOP_PADDING_MM = 30


def rasterize_first_page(pdf_path, matrix_scale=2.2):
    doc = fitz.open(str(pdf_path))
    page = doc.load_page(0)
    mat = fitz.Matrix(matrix_scale, matrix_scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    doc.close()

    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def detect_blue_strip_top(img, sample_step=10):
    """
    Detect the top-most y (from top) of the footer blue strip by scanning from bottom.
    We consider a pixel "blue" if:
      B > 140 and (B - max(R,G)) > 30
    """
    g = img.convert("RGB")
    w, h = g.size
    px = g.load()

    def is_blue(x, y):
        r, gg, b = px[x, y]
        return (b > 140) and ((b - max(r, gg)) > 30)

    in_region = False
    top_candidate = h - 1
    false_streak = 0
    # Scan bottom-up, find the highest row that still looks blue.
    for y in range(h - 1, -1, -1):
        blue_hits = 0
        total = 0
        for x in range(0, w, sample_step):
            total += 1
            if is_blue(x, y):
                blue_hits += 1

        # Footer blue strip spans much of the width; small icons should not satisfy this.
        row_is_blue = blue_hits >= (total * 0.18)

        if row_is_blue:
            in_region = True
            top_candidate = y
            false_streak = 0
        elif in_region:
            # Allow brief anti-alias gaps.
            false_streak += 1
            if false_streak >= 6:
                break

    return top_candidate


def run():
    # Template-only baseline: empty content blocks.
    baseline_payload = {
        "metadata": {
            "name": "BLANK",
            "upperName": "BLANK",
            "gender": "male",
            "internType": "internship",
            "durationType": "month",
            "duration": 1,
            "role": "Developer",
            "startDate": datetime.today().strftime("%Y-%m-%d"),
            "endDate": datetime.today().strftime("%Y-%m-%d"),
            "salaryType": "paid",
            "salaryAmount": "INR 10000",
            "date": "Date: 1 January 2020",
        },
        "pages": [{"pageNumber": 1, "paragraphs": [{"id": "empty", "type": "paragraph", "content": ""}]}],
    }

    resp = requests.post(API_URL, json=baseline_payload, timeout=120)
    resp.raise_for_status()
    pdf_url = resp.json()["path"]
    pdf_name = pdf_url.split("/")[-1]
    pdf_path = (ROOT / "backend" / "GeneratedOfferLetter" / pdf_name).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    img = rasterize_first_page(pdf_path, matrix_scale=2.2)
    y_top_blue = detect_blue_strip_top(img)
    w, h = img.size

    y_top_blue_mm = (y_top_blue / (h - 1)) * PAGE_HEIGHT_MM
    # We want the start of the reserved footer padding area to align with the top of blue strip.
    # Current CSS model uses: page-content height = PAGE_HEIGHT - TOP_PADDING - BOTTOM_SAFE
    # and page-content padding-bottom = BOTTOM_SAFE, so the padding starts at:
    #   y_pad_start = (PAGE_HEIGHT - TOP_PADDING - BOTTOM_SAFE) - BOTTOM_SAFE = PAGE_HEIGHT - TOP_PADDING - 2*BOTTOM_SAFE
    # Solve for BOTTOM_SAFE:
    #   y_pad_start = y_top_blue_mm
    # => BOTTOM_SAFE = (PAGE_HEIGHT - TOP_PADDING - y_top_blue_mm)/2
    bottom_safe_mm = (PAGE_HEIGHT_MM - TOP_PADDING_MM - y_top_blue_mm) / 2

    print("blue_strip_top_px:", y_top_blue)
    print("blue_strip_top_mm:", round(y_top_blue_mm, 2))
    print("recommended_BOTTOM_SAFE_MM:", round(bottom_safe_mm, 2))


if __name__ == "__main__":
    run()

