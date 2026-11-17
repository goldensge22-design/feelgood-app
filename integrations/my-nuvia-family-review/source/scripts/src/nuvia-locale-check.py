"""Read-only structural translation QA. Not native-speaker quality review."""
import collections
import json
import pathlib
import re

root = pathlib.Path(__file__).resolve().parents[2]
folder = root / "artifacts/my-nuvia/src/i18n"
codes = ["ko", "en", "ja", "zh-CN", "zh-TW", "mn", "th", "vi", "ar", "ru", "km", "es", "fr", "it", "az"]
original_pairs = re.findall(r"^  '([^']+)':\s*'((?:\\.|[^'])*)',?", (folder / "ko.ts").read_text(), re.M)
original = dict(original_pairs)
assert len(original_pairs) == len(original), "duplicate Korean keys"
errors = []
for code in codes:
    if code == "ko":
        pairs = original_pairs
    else:
        pairs = [(json.loads(k), json.loads(v)) for k, v in re.findall(
            r'^  ("(?:\\.|[^"\\])*"): ("(?:\\.|[^"\\])*"),?$',
            (folder / f"{code}.ts").read_text(), re.M)]
    entries = dict(pairs)
    if len(entries) != len(pairs):
        errors.append(f"{code}: duplicate keys")
    if entries.keys() != original.keys():
        errors.append(f"{code}: missing/extra keys")
    for key, value in entries.items():
        if not value.strip():
            errors.append(f"{code}/{key}: empty")
        placeholders = lambda text: collections.Counter(re.findall(r"\{\w+\}", text))
        if placeholders(value) != placeholders(original.get(key, "")):
            errors.append(f"{code}/{key}: placeholder mismatch")
        if re.search(r"<\s*script|javascript:|onerror\s*=", value, re.I):
            errors.append(f"{code}/{key}: unsafe text")
    print(f"{code}: {len(entries)} keys")

extra = (folder / "first-week.ts").read_text()
extra_codes = re.findall(r"^  (?:'([^']+)'|(\w+)): \{", extra, re.M)
assert {a or b for a, b in extra_codes} == set(codes), "first-week locales mismatch"
extra_values = re.findall(r"(title|start|history): '([^']*)'", extra)
assert len(extra_values) == 45 and all(v.strip() for _, v in extra_values), "first-week empty/missing keys"
assert not errors, "\n".join(errors)
print("PASS: 15 locales × 265 dictionary keys + 45 first-week strings; native review pending.")
