import json
from pathlib import Path
from datetime import datetime

import requests
import fitz
from PIL import Image, ImageChops

API_URL = "http://localhost:5000/api/offerletter/compile"
ROOT = Path("d:/pro/hr")

report = json.load(open(ROOT / "backend" / "calibration_output" / "calibration_report.json", "r", encoding="utf-8"))
case_pdf_rel = report["cases"][0]["pdf_file"]
case_pdf = (ROOT / case_pdf_rel).resolve()
print("case_pdf:", case_pdf)

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

base_resp = requests.post(API_URL, json=baseline_payload, timeout=120)
base_resp.raise_for_status()
base_url = base_resp.json()["path"]
base_name = base_url.split("/")[-1]
base_file = (ROOT / "backend" / "GeneratedOfferLetter" / base_name).resolve()
print("baseline_pdf:", base_file)

doc_base = fitz.open(str(base_file))
base_page = doc_base.load_page(0)
mat = fitz.Matrix(2.2, 2.2)
base_pix = base_page.get_pixmap(matrix=mat, alpha=False)
base_img = Image.frombytes("RGB", (base_pix.width, base_pix.height), base_pix.samples)
doc_base.close()

doc = fitz.open(str(case_pdf))
page = doc.load_page(0)
pix = page.get_pixmap(matrix=mat, alpha=False)
cur = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
page2_used = None
if doc.page_count > 1:
    page1 = doc.load_page(1)
    pix2 = page1.get_pixmap(matrix=mat, alpha=False)
    cur2 = Image.frombytes("RGB", (pix2.width, pix2.height), pix2.samples)
else:
    cur2 = None
doc.close()

w, h = cur.size
PAGE_HEIGHT_MM = 297


def used_for(th, downsample=4):
    diff = ImageChops.difference(cur, base_img).convert("L")
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    diff_s = diff.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    data = diff_s.load()

    last = -1
    for y in range(h2 - 1, -1, -1):
        for x in range(0, w2, 2):
            if data[x, y] > th:
                last = y
                break
        if last >= 0:
            break

    if last < 0:
        return 0.0
    return (last / (h2 - 1)) * PAGE_HEIGHT_MM


for th in [8, 10, 12, 15, 18, 20, 22, 24, 26]:
    print("threshold", th, "used_mm", round(used_for(th), 2))

# Dark-ink based measurement (no baseline subtraction).
def dark_used_for(luma_th, downsample=4):
    diff = cur.convert("L")
    w, h = diff.size
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    d_s = diff.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    data = d_s.load()
    last = -1
    for y in range(h2 - 1, -1, -1):
        for x in range(0, w2, 2):
            if data[x, y] < luma_th:
                last = y
                break
        if last >= 0:
            break
    if last < 0:
        return 0.0
    return (last / (h2 - 1)) * PAGE_HEIGHT_MM

base_luma = base_img.convert("L")
def dark_used_for_img(img, luma_th, downsample=4):
    w, h = img.size
    img2 = img.convert("L")
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    d_s = img2.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    data = d_s.load()
    last = -1
    for y in range(h2 - 1, -1, -1):
        for x in range(0, w2, 2):
            if data[x, y] < luma_th:
                last = y
                break
        if last >= 0:
            break
    if last < 0:
        return 0.0
    return (last / (h2 - 1)) * PAGE_HEIGHT_MM

print("dark-ink measurements (baseline vs case page0):")
for lth in [40,50,60,65,70,72,74,76,78,80,82,84,86,88,90]:
    db = dark_used_for_img(base_img, lth)
    dc = dark_used_for(lth)
    print("luma",lth,"baseline",round(db,2),"case",round(dc,2))


def isolated_dark_used_for(luma_th, downsample=4):
    img_base = base_img
    # case is `cur`
    g_base = img_base.convert("L")
    g_case = cur.convert("L")
    w, h = g_case.size
    w2, h2 = max(1, w // downsample), max(1, h // downsample)
    b_s = g_base.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    c_s = g_case.resize((w2, h2), resample=Image.Resampling.BILINEAR)
    bdata = b_s.load()
    cdata = c_s.load()
    last = -1
    for y in range(h2 - 1, -1, -1):
        for x in range(0, w2, 2):
            if cdata[x, y] < luma_th and not (bdata[x, y] < luma_th):
                last = y
                break
        if last >= 0:
            break
    if last < 0:
        return 0.0
    return (last / (h2 - 1)) * PAGE_HEIGHT_MM


print("isolated content dark-ink (case page0 only):")
for lth in [70,72,74,76,78,80,82,84]:
    print("luma",lth,"isolated used_mm",round(isolated_dark_used_for(lth),2))

if cur2 is not None:
    print("page2 dark-ink used @ thresholds:")
    for lth in [60,65,70,72,74,76,78,80,82,84,86,88,90]:
        print("luma",lth,"used_mm",round(dark_used_for_img(cur2,lth),2))

