#!/usr/bin/env python3
"""Scrape a capped sample of the Malaysian NPRA Quest3+ pharmaceutical registry.

Strategy: search by a curated list of common active ingredients (broad
therapeutic coverage), de-dupe by registration number, cap the unique
product count, then fetch each product's detail page for its active
ingredients and "Proposed Package Insert" (D3) PDF links, downloading
those PDFs to disk.
"""
import json
import os
import re
import sys
import time
import threading
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

import html as html_lib

sys.path.insert(0, os.path.dirname(__file__))
from ingredients import ACTIVE_INGREDIENTS
from bigrams import BIGRAMS

BASE = "https://quest3plus.bpfk.gov.my/pmo2/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
CAP = int(os.environ.get("SCRAPE_CAP", "1800"))
OUT_DIR = os.path.dirname(__file__)
PDF_DIR = os.path.join(OUT_DIR, "pdfs")
LOG_PATH = os.path.join(OUT_DIR, "scrape.log")
DATA_PATH = os.path.join(OUT_DIR, "products.json")
PROGRESS_PATH = os.path.join(OUT_DIR, "progress.json")

os.makedirs(PDF_DIR, exist_ok=True)

session = requests.Session()
session.headers.update({"User-Agent": UA})

log_lock = threading.Lock()


def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    with log_lock:
        print(line, flush=True)
        with open(LOG_PATH, "a") as f:
            f.write(line + "\n")


def post_search(search_by, term, cat=1, retries=3):
    for attempt in range(retries):
        try:
            r = session.post(
                BASE + "content.php",
                data={"func": "search", "searchBy": search_by, "searchTxt": term, "cat": cat},
                timeout=30,
            )
            r.raise_for_status()
            return r.text
        except requests.RequestException as e:
            log(f"  search retry {attempt+1} for {term!r}: {e}")
            time.sleep(1.5 * (attempt + 1))
    return ""


def parse_search_results(html):
    """Return list of (reg_no, product_name) from a search results table."""
    soup = BeautifulSoup(html, "html.parser")
    out = []
    for row in soup.select("table#searchTable tbody tr"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        link = cells[1].find("a")
        if not link:
            continue
        m = re.search(r"showDetail\('([^']+)'\)", link.get("onclick", ""))
        if not m:
            continue
        reg_no = m.group(1).strip()
        product_name = cells[2].get_text(strip=True)
        out.append((reg_no, product_name))
    return out


ROW_RE = re.compile(
    r"showDetail\('([^']+)'\)\">[^<]*</a></td>\s*(?:<!--[^>]*-->\s*)?<td align=\"left\">(.*?)</td>\s*<td align=\"left\">",
    re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]*>")


def parse_search_results_fast(html):
    """Regex-based extraction for large result sets (much faster than BeautifulSoup).

    Tolerant of nested tags (e.g. <p>) and stray unescaped '<' inside the
    product-name cell, both of which occur in the source HTML.
    """
    out = []
    for m in ROW_RE.finditer(html):
        reg_no = html_lib.unescape(m.group(1)).strip()
        raw_name = TAG_RE.sub("", m.group(2))
        product_name = html_lib.unescape(raw_name).strip()
        out.append((reg_no, product_name))
    return out


def fetch_detail(reg_no, retries=3):
    for attempt in range(retries):
        try:
            r = session.get(
                BASE + "detail.php",
                params={"type": "product", "id": reg_no},
                timeout=30,
            )
            r.raise_for_status()
            return r.text
        except requests.RequestException as e:
            log(f"  detail retry {attempt+1} for {reg_no}: {e}")
            time.sleep(1.5 * (attempt + 1))
    return ""


def parse_detail(html, reg_no):
    soup = BeautifulSoup(html, "html.parser")

    def field_after(label):
        el = soup.find(string=re.compile(re.escape(label)))
        if not el:
            return None
        parent = el.find_parent("td")
        if not parent:
            return None
        b = parent.find("b")
        return b.get_text(strip=True) if b else None

    product_name = field_after("Product Name") or ""
    holder = field_after("Holder :") or field_after("Holder :")
    manufacturer = field_after("Manufacturer :")

    active_ingredients = []
    ai_table = soup.find("table", id="tab1")
    if ai_table:
        for row in ai_table.select("tbody tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                name = cells[1].get_text(strip=True)
                if name:
                    active_ingredients.append(name)

    package_inserts = []
    d3 = soup.find("div", id="d3div")
    if d3:
        for a in d3.find_all("a", href=True):
            href = a["href"]
            filename = a.get_text(strip=True) or os.path.basename(urllib.parse.urlparse(href).path)
            package_inserts.append({"url": href, "filename": filename})

    return {
        "id": reg_no,
        "registrationNumber": reg_no,
        "productName": product_name,
        "holder": holder,
        "manufacturer": manufacturer,
        "activeIngredients": active_ingredients,
        "packageInserts": package_inserts,
    }


def safe_filename(name):
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip()
    return name[:150] if name else "file.pdf"


def download_pdf(reg_no, insert, idx):
    url = insert["url"]
    filename = safe_filename(insert["filename"])
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    reg_dir = os.path.join(PDF_DIR, reg_no)
    os.makedirs(reg_dir, exist_ok=True)
    local_path = os.path.join(reg_dir, f"{idx}_{filename}")
    rel_path = os.path.relpath(local_path, OUT_DIR)

    if os.path.exists(local_path) and os.path.getsize(local_path) > 0:
        return rel_path

    for attempt in range(3):
        try:
            r = session.get(url, timeout=60)
            r.raise_for_status()
            ctype = r.headers.get("Content-Type", "")
            if "pdf" not in ctype.lower() and not r.content[:4] == b"%PDF":
                log(f"  WARN non-pdf content-type for {url}: {ctype}")
            with open(local_path, "wb") as f:
                f.write(r.content)
            return rel_path
        except requests.RequestException as e:
            log(f"  pdf retry {attempt+1} for {reg_no}: {e}")
            time.sleep(1.5 * (attempt + 1))
    return None


def load_progress():
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH) as f:
            data = json.load(f)
            data.setdefault("bigrams_done", [])
            return data
    return {"products": {}, "ingredients_done": [], "bigrams_done": []}


def save_progress(progress):
    tmp = PROGRESS_PATH + ".tmp"
    with open(tmp, "w") as f:
        json.dump(progress, f)
    os.replace(tmp, PROGRESS_PATH)


def main():
    progress = load_progress()
    products = progress["products"]  # reg_no -> {registrationNumber, productName} (search-phase stub)
    ingredients_done = set(progress["ingredients_done"])

    log(f"MILESTONE: starting. Already have {len(products)} unique products from {len(ingredients_done)} ingredients. Cap={CAP}")

    # Phase 1: enumerate via active-ingredient search
    ing_i = 0
    for term in ACTIVE_INGREDIENTS:
        ing_i += 1
        if term in ingredients_done:
            continue
        if len(products) >= CAP:
            log(f"MILESTONE: reached cap ({CAP}) before ingredient {term!r}; stopping enumeration.")
            break
        html = post_search(6, term, cat=1)
        results = parse_search_results(html)
        new_count = 0
        for reg_no, name in results:
            if reg_no not in products:
                products[reg_no] = {"registrationNumber": reg_no, "productName": name}
                new_count += 1
        ingredients_done.add(term)
        progress["ingredients_done"] = list(ingredients_done)
        save_progress(progress)
        log(f"ingredient={term!r} -> {len(results)} results, {new_count} new, total unique={len(products)}")
        if ing_i % 10 == 0:
            log(f"MILESTONE: enumeration {ing_i}/{len(ACTIVE_INGREDIENTS)} ingredients searched, {len(products)} unique products so far")
        time.sleep(0.4)

    # Phase 1b: exhaustive enumeration via 2-letter product-name substrings.
    # The server doesn't enforce the client's 5-char minimum, and this
    # covers virtually every product regardless of what it's named.
    bigrams_done = set(progress["bigrams_done"])
    bg_i = 0
    for bg in BIGRAMS:
        bg_i += 1
        if bg in bigrams_done:
            continue
        html = post_search(1, bg, cat=1)
        results = parse_search_results_fast(html)
        new_count = 0
        for reg_no, name in results:
            if reg_no not in products:
                products[reg_no] = {"registrationNumber": reg_no, "productName": name}
                new_count += 1
        bigrams_done.add(bg)
        progress["bigrams_done"] = list(bigrams_done)
        progress["products"] = products
        save_progress(progress)
        log(f"bigram={bg!r} -> {len(results)} results, {new_count} new, total unique={len(products)}")
        if bg_i % 25 == 0:
            log(f"MILESTONE: bigram enumeration {bg_i}/{len(BIGRAMS)} searched, {len(products)} unique products so far")
        time.sleep(0.4)

    all_reg_nos = list(products.keys())

    # Load already-completed full records so we don't re-hit the server for them
    final = {}
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH) as f:
                existing = json.load(f)
            for rec in existing.get("products", []):
                if rec.get("activeIngredients") is not None:
                    final[rec["id"]] = rec
        except (json.JSONDecodeError, OSError):
            pass

    reg_nos = [r for r in all_reg_nos if r not in final]
    log(f"MILESTONE: enumeration complete: {len(all_reg_nos)} unique products total, "
        f"{len(final)} already have full detail, {len(reg_nos)} queued for detail fetch.")

    # Phase 2: fetch details + download package inserts, with modest concurrency
    final_lock = threading.Lock()
    done_count = [0]

    def worker(reg_no):
        html = fetch_detail(reg_no)
        if not html:
            return
        record = parse_detail(html, reg_no)
        local_inserts = []
        for i, insert in enumerate(record["packageInserts"], start=1):
            rel = download_pdf(reg_no, insert, i)
            if rel:
                local_inserts.append({"filename": insert["filename"], "path": rel, "sourceUrl": insert["url"]})
        record["packageInserts"] = local_inserts
        with final_lock:
            final[reg_no] = record
            done_count[0] += 1
            if done_count[0] % 25 == 0:
                tag = "MILESTONE: " if done_count[0] % 100 == 0 else ""
                log(f"{tag}progress: {done_count[0]}/{len(reg_nos)} details fetched")
                with open(DATA_PATH, "w") as f:
                    json.dump({"metadata": {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                             "source": "NPRA Quest3+",
                                             "totalProducts": len(final)},
                               "products": list(final.values())}, f)

    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = [ex.submit(worker, reg_no) for reg_no in reg_nos]
        for fut in as_completed(futures):
            fut.result()

    with open(DATA_PATH, "w") as f:
        json.dump({"metadata": {"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                                 "source": "NPRA Quest3+",
                                 "totalProducts": len(final)},
                   "products": list(final.values())}, f, indent=1)

    with_pdfs = sum(1 for p in final.values() if p["packageInserts"])
    log(f"MILESTONE: DONE. {len(final)} products scraped, {with_pdfs} with package insert PDFs.")


if __name__ == "__main__":
    main()
