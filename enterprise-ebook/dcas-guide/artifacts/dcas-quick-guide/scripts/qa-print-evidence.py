"""Inspect every generated A4 PDF page and build labelled visual evidence sheets.

This is geometry/text/glyph QA, not linguistic or native-speaker certification.
Run qa-full.mjs first. Images/PDFs are deliberately kept out of Git.
"""
import glob
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "generated-artifacts/dcas-qa"
RECORD = ROOT / "qa/dcas-guide"
locales = json.loads((ROOT / "artifacts/dcas-quick-guide/src/i18n/locales.json").read_text())
if "--completed-only" in sys.argv:
    completed = {p["locale"] for p in json.loads((RECORD / "execution.json").read_text())["prints"]}
    locales = [locale for locale in locales if locale["code"] in completed]
results = []
manifest = []
NS = {"p": "http://www.w3.org/1999/xhtml"}
def current(target, inputs):
    return target.exists() and target.stat().st_mtime >= max(p.stat().st_mtime for p in inputs)

for locale in locales:
    code = locale["code"]
    folder = OUTPUT / code
    bbox = folder / "print-bbox.html"
    if not bbox.exists():
        results.append({"locale": code, "status": "not_run", "reason": "No completed PDF export"})
        continue
    tree = ET.parse(bbox)
    pages = tree.findall(".//p:page", NS)
    checks = []
    for n, page in enumerate(pages, 1):
        words = page.findall(".//p:word", NS)
        bad = []
        replacement = []
        for word in words:
            a = {k: float(word.attrib[k]) for k in ["xMin", "xMax", "yMin", "yMax"]}
            if a["xMin"] < 20 or a["xMax"] > float(page.attrib["width"]) - 20 or a["yMin"] < 20 or a["yMax"] > float(page.attrib["height"]) - 20:
                bad.append({"text": word.text, "bbox": a})
            if any(c in (word.text or "") for c in ["\ufffd", "\u25a1", "\x00"]):
                replacement.append(word.text)
        image = sorted(folder.glob("print-page-*.png"))[n - 1]
        checks.append({
            "page": n, "wordCount": len(words),
            "textCharacters": sum(len(w.text or "") for w in words),
            "empty": not words,
            "outsideSafeArea": bad, "replacementGlyphs": replacement,
            "renderedImage": str(image.relative_to(OUTPUT)),
            "status": "pass" if words and not bad and not replacement else "needs_visual_review",
        })
    fonts = subprocess.check_output(["pdffonts", str(folder / "guide.pdf")], text=True)
    (folder / "fonts.txt").write_text(fonts)
    # Print pages are all rendered at 1000px. The sheet is for pagination, clipping,
    # contrast and blank-page review; original page PNGs retain readable text.
    images = sorted(folder.glob("print-page-*.png"))
    target = folder / "print-contact.png"
    if not current(target, images):
        subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "12",
                        "-label", "%t", *map(str, images), "-thumbnail", "300x425",
                        "-tile", "4x", "-geometry", "+8+12", "-background", "#d9dde3",
                        str(target)], check=True)
    for width in [1440, 1024, 768, 360, 740]:
        images = [folder / f"{width}-{id}.png" for id in ["cover", "ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "checklist"]]
        if not all(i.exists() for i in images):
            continue
        target = folder / f"screen-contact-{width}.png"
        if not current(target, images):
            subprocess.run(["magick", "montage", "-font", "DejaVu-Sans", "-pointsize", "14",
                            "-label", "%t", *map(str, images), "-thumbnail", "330x1300",
                            "-tile", "4x", "-geometry", "+8+12", "-background", "#d9dde3",
                            str(target)], check=True)
    results.append({"locale": code, "pages": checks, "pageCount": len(pages),
                    "fontEmbeddingReport": f"{code}/fonts.txt",
                    "status": "pass" if all(c["status"] == "pass" for c in checks) else "needs_visual_review"})
for path in sorted(OUTPUT.rglob("*")):
    if path.is_file():
        manifest.append({"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size,
                         "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
(RECORD / "print-pages.json").write_text(json.dumps(results, ensure_ascii=False, indent=2))
(RECORD / "evidence-manifest.json").write_text(json.dumps(manifest, indent=2))
print(json.dumps([{"locale": r["locale"], "pages": r.get("pageCount"), "status": r["status"]} for r in results], indent=2))
