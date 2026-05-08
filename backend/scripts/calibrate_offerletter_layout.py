import base64
import json
import random
import re
import string
from datetime import datetime, timedelta
from pathlib import Path

import fitz  # PyMuPDF
import requests
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "backend" / "calibration_output"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
REPORT_PATH = OUTPUT_DIR / "calibration_report.json"
API_URL = "http://localhost:5000/api/offerletter/compile"

PAGE_HEIGHT_MM = 297
TOP_PADDING_MM = 30
BOTTOM_SAFE_MM = 28
CONTENT_MAX_HEIGHT_MM = PAGE_HEIGHT_MM - TOP_PADDING_MM - BOTTOM_SAFE_MM


def mm_from_pt(pt):
    return pt * 25.4 / 72.0


def strip_html(text):
    return re.sub(r"<[^>]*>", "", text or "")


def random_word(min_len=3, max_len=12):
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for _ in range(random.randint(min_len, max_len)))


def random_sentence(word_count):
    words = [random_word() for _ in range(word_count)]
    sentence = " ".join(words)
    return sentence[:1].upper() + sentence[1:] + "."


def random_paragraph(min_sent=2, max_sent=8):
    sentence_count = random.randint(min_sent, max_sent)
    return " ".join(random_sentence(random.randint(8, 22)) for _ in range(sentence_count))


def generate_test_image_data_url():
    image = Image.new("RGB", (900, 260), color=(245, 245, 245))
    draw = ImageDraw.Draw(image)
    draw.rectangle([8, 8, 892, 252], outline=(60, 60, 60), width=4)
    draw.text((30, 95), f"CALIBRATION IMAGE {random.randint(1000, 9999)}", fill=(20, 20, 20))

    out = OUTPUT_DIR / "tmp_image.png"
    image.save(out, format="PNG")
    encoded = base64.b64encode(out.read_bytes()).decode("ascii")
    out.unlink(missing_ok=True)
    return f"data:image/png;base64,{encoded}"


def estimate_block_height_mm(block):
    t = block.get("type")
    plain = strip_html(block.get("content", "")).strip()

    if t == "date":
        return 8
    if t == "to":
        return 12
    if t == "subject":
        return 10
    if t == "signature":
        return 28
    if t == "company":
        return 7
    if t == "separator":
        return 7
    if t == "footer":
        return 6
    if t == "image":
        return 55

    approx_chars_per_line = 95
    lines = max(1, (len(plain) + approx_chars_per_line - 1) // approx_chars_per_line)
    list_item_buffer = 3 if re.match(r"^\s*\d+\)", plain) else 2
    return (lines * 5) + list_item_buffer


def make_case(case_id):
    start = datetime.today() + timedelta(days=random.randint(1, 50))
    end = start + timedelta(days=random.randint(30, 200))
    md = {
        "name": f"Candidate {case_id}",
        "upperName": f"CANDIDATE {case_id}",
        "gender": random.choice(["male", "female"]),
        "internType": random.choice(["internship", "part time", "full time"]),
        "durationType": random.choice(["month", "year"]),
        "duration": random.randint(1, 12),
        "role": random.choice(["Developer", "Analyst", "Designer", "QA Engineer"]),
        "startDate": start.strftime("%Y-%m-%d"),
        "endDate": end.strftime("%Y-%m-%d"),
        "salaryType": random.choice(["paid", "unpaid"]),
        "salaryAmount": f"INR {random.randint(10000, 90000)}",
        "date": datetime.today().strftime("Date: %d %B %Y"),
    }

    very_long = random_paragraph(9, 16)
    bullets = "\n".join(
        f"{i}) {random_paragraph(1, 2)}" for i in range(1, random.randint(4, 7))
    )

    blocks = [
        {"id": "date", "type": "date", "content": md["date"]},
        {"id": "to", "type": "to", "content": f"To,<br>{'Mr.' if md['gender'] == 'male' else 'Ms.'} {md['upperName']}"},
        {"id": "subject", "type": "subject", "content": f"Subject: Offer Letter for {md['role']}"},
        {"id": "p1", "type": "paragraph", "content": random_paragraph(2, 4)},
        {"id": "p2", "type": "paragraph", "content": random_paragraph(4, 7)},
        {"id": "p3", "type": "paragraph", "content": very_long},
        {"id": "p4", "type": "paragraph", "content": bullets},
        {"id": "img", "type": "image", "content": generate_test_image_data_url()},
        {"id": "p5", "type": "paragraph", "content": random_paragraph(1, 2)},
        {"id": "signature", "type": "signature", "content": "Sincerely,<br>HARDIKKUMAR VINZAVA<br>DIRECTOR"},
        {"id": "company", "type": "company", "content": "SAECULUM SOLUTIONS PVT LTD"},
        {"id": "separator", "type": "separator", "content": "--------------------------------X----------------------------X-----------------------"},
        {"id": "footer1", "type": "footer", "content": f"I, {md['upperName']}, accept the terms above."},
        {"id": "footer2", "type": "footer", "content": "Signature _____________________"},
        {"id": "footer3", "type": "footer", "content": f"Name of Trainee: {md['upperName']}"},
        {"id": "footer4", "type": "footer", "content": "Place of sole & exclusive Jurisdiction: Ahmedabad, Gujarat, India"},
    ]

    random.shuffle(blocks[3:10])
    return {"metadata": md, "pages": [{"pageNumber": 1, "paragraphs": blocks}]}


def pixmap_to_pil(pix):
    # alpha=False so we expect RGB.
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def get_used_height_mm_isolated_dark(
    page,
    baseline_luma_small,
    luma_th=80,
    downsample=4,
):
    """
    Used-height estimate from "isolated dark ink":
    darkest pixels that appear in the current page but were NOT dark in the baseline template.

    This avoids counting template/footer lines as content while still detecting
    signatures/images (which are dark).
    """
    matrix = fitz.Matrix(2.2, 2.2)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    current = pixmap_to_pil(pix).convert("L")

    w, h = current.size
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    current_s = current.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    cdata = current_s.load()
    bdata = baseline_luma_small

    last_y = -1
    for y in range(h2 - 1, -1, -1):
        for x in range(0, w2, 2):
            # Isolated means "dark in current, NOT dark in baseline".
            if cdata[x, y] < luma_th and not (bdata[x, y] < luma_th):
                last_y = y
                break
        if last_y >= 0:
            break

    if last_y < 0:
        return 0.0

    used_mm = (last_y / (h2 - 1)) * PAGE_HEIGHT_MM
    return used_mm


def save_page_screenshot(page, output_path):
    matrix = fitz.Matrix(2.2, 2.2)
    pix = page.get_pixmap(matrix=matrix, alpha=False)
    pix.save(str(output_path))


def run():
    random.seed(42)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "cases": [],
        "summary": {},
    }

    # Baseline raster: template-only page (no content blocks).
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
    baseline_resp = requests.post(API_URL, json=baseline_payload, timeout=120)
    baseline_resp.raise_for_status()
    baseline_pdf_url = baseline_resp.json()["path"]
    baseline_pdf_name = baseline_pdf_url.split("/")[-1]
    baseline_pdf_file = ROOT / "backend" / "GeneratedOfferLetter" / baseline_pdf_name
    if not baseline_pdf_file.exists():
        raise FileNotFoundError(f"Baseline PDF not found: {baseline_pdf_file}")
    baseline_doc = fitz.open(baseline_pdf_file)
    baseline_page = baseline_doc.load_page(0)

    baseline_matrix = fitz.Matrix(2.2, 2.2)
    baseline_pix = baseline_page.get_pixmap(matrix=baseline_matrix, alpha=False)
    baseline_pil = pixmap_to_pil(baseline_pix).convert("L")
    baseline_doc.close()

    # Precompute baseline luminance grid at the scan resolution.
    downsample = 4
    w, h = baseline_pil.size
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    baseline_luma_small_img = baseline_pil.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    baseline_luma_small = baseline_luma_small_img.load()

    for case_idx in range(1, 13):
        payload = make_case(case_idx)
        expected_mm = sum(estimate_block_height_mm(p) for p in payload["pages"][0]["paragraphs"])
        expected_pct = (expected_mm / CONTENT_MAX_HEIGHT_MM) * 100

        response = requests.post(API_URL, json=payload, timeout=120)
        response.raise_for_status()
        data = response.json()
        pdf_url = data["path"]
        pdf_name = pdf_url.split("/")[-1]
        pdf_file = ROOT / "backend" / "GeneratedOfferLetter" / pdf_name

        if not pdf_file.exists():
            raise FileNotFoundError(f"Expected PDF not found: {pdf_file}")

        doc = fitz.open(pdf_file)
        page_rows = []
        for i in range(doc.page_count):
            page = doc.load_page(i)
            used_mm = get_used_height_mm_isolated_dark(
                page,
                baseline_luma_small=baseline_luma_small,
                luma_th=84,
                downsample=downsample,
            )
            used_pct = (used_mm / PAGE_HEIGHT_MM) * 100
            overflow_footer_zone = used_mm > (PAGE_HEIGHT_MM - BOTTOM_SAFE_MM)

            image_name = f"case_{case_idx:02d}_page_{i+1:02d}.png"
            save_page_screenshot(page, SCREENSHOT_DIR / image_name)

            page_rows.append(
                {
                    "page_number": i + 1,
                    "used_mm_on_page": round(used_mm, 2),
                    "used_percent_of_page": round(used_pct, 2),
                    "footer_collision": overflow_footer_zone,
                    "screenshot": f"screenshots/{image_name}",
                }
            )
        doc.close()

        report["cases"].append(
            {
                "case_id": case_idx,
                "pdf_file": str(pdf_file.relative_to(ROOT)).replace("\\", "/"),
                "estimated_mm_old_algorithm": round(expected_mm, 2),
                "estimated_percent_of_usable_content_old": round(expected_pct, 2),
                "page_measurements": page_rows,
                "input_block_types": [p["type"] for p in payload["pages"][0]["paragraphs"]],
            }
        )

    all_pages = [p for c in report["cases"] for p in c["page_measurements"]]
    collision_count = sum(1 for p in all_pages if p["footer_collision"])
    report["summary"] = {
        "total_cases": len(report["cases"]),
        "total_pages": len(all_pages),
        "pages_with_footer_collision": collision_count,
        "collision_rate_percent": round((collision_count / max(1, len(all_pages))) * 100, 2),
    }

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Calibration report written to {REPORT_PATH}")
    print(f"Screenshots stored in {SCREENSHOT_DIR}")


if __name__ == "__main__":
    run()
