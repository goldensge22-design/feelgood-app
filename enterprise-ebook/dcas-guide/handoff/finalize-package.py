"""Create bounded ZIP deliveries with inventories, cross-package mapping and hashes."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated-artifacts/dcas-handoff"
STAGE = OUT / "staging/dcas-guide"
DEST = OUT / "downloads"
MAX_RAW = 90 * 1024 * 1024
BAD_PARTS = {"node_modules", ".git", ".cache", ".local", ".config", ".agents",
             "__pycache__", ".pnpm-store", "playwright-report"}
BAD_SUFFIXES = (".tsbuildinfo", ".pem", ".key", ".p12", ".sqlite", ".db")
SECRETS = [
    rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    rb"\bgh[pousr]_[A-Za-z0-9]{25,}\b",
    rb"\bgithub_pat_[A-Za-z0-9_]{30,}\b",
    rb"\bAKIA[A-Z0-9]{16}\b",
    rb"\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b",
    rb"\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\b",
]

def sha(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def validate_name(name):
    p = Path(name)
    if p.is_absolute() or ".." in p.parts or any(x in BAD_PARTS for x in p.parts):
        raise RuntimeError("Excluded path: " + name)
    if p.name.startswith(".env") or name.endswith(BAD_SUFFIXES):
        raise RuntimeError("Excluded file: " + name)

def item(path, name):
    return {"path": name, "sha256": sha(path), "bytes": path.stat().st_size}

def scan_text(path):
    if path.suffix.lower() not in {".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".mjs", ".css", ".md", ".html", ".txt", ".py", ".sh", ".toml"} and path.name != ".npmrc":
        return
    data = path.read_bytes()
    if any(re.search(pattern, data) for pattern in SECRETS):
        raise RuntimeError("Potential credential requires manual review; not archived: " + str(path.relative_to(ROOT)))

def write_zip(filename, files, manifest, package_id):
    with zipfile.ZipFile(DEST / filename, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for source, name in files:
            archive.write(source, "dcas-guide/" + name)
        archive.writestr("dcas-guide/handoff/PART_MANIFEST-" + manifest["part"] + ".json",
                        json.dumps(manifest | {"packageId": package_id}, ensure_ascii=False, indent=2))
    with zipfile.ZipFile(DEST / filename) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("ZIP CRC failure: " + filename)

def main():
    checks = json.loads((OUT / "verification/clean-build.json").read_text())
    if checks.get("outcome") != "pass":
        raise SystemExit("Refusing delivery without passing clean build.")
    DEST.mkdir(exist_ok=True)
    if list(DEST.iterdir()):
        raise SystemExit("Refusing to overwrite existing delivery files.")
    # Refresh authored handoff tooling/docs only, never app files.
    for p in (ROOT / "handoff").rglob("*"):
        if p.is_file():
            target = STAGE / p.relative_to(ROOT)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, target)
    shutil.copy2(ROOT / "handoff/README_KO.md", STAGE / "README_KO.md")
    shutil.copytree(OUT / "verification", STAGE / "handoff/verification", dirs_exist_ok=True)
    provenance_path = STAGE / "handoff/SOURCE_PROVENANCE.json"
    provenance = json.loads(provenance_path.read_text())
    # Verify every original ebook/workspace/report file still matches the baseline.
    for record in provenance["originalSourceFiles"]:
        if record["path"].startswith("handoff/"):
            continue
        if sha(ROOT / record["path"]) != record["sha256"] or sha(STAGE / record["path"]) != record["sha256"]:
            raise RuntimeError("Unexpected original file change: " + record["path"])
    originals = [record for record in provenance["originalSourceFiles"] if not record["path"].startswith("handoff/")]
    originals.extend(item(p, str(p.relative_to(ROOT))) for p in sorted((ROOT / "handoff").rglob("*")) if p.is_file())
    provenance["originalSourceFiles"] = sorted(originals, key=lambda x: x["path"])
    identity = hashlib.sha256(json.dumps(provenance["originalSourceFiles"], sort_keys=True).encode()).hexdigest()
    package_id = "dcas-guide-" + identity[:16]
    provenance["packageId"] = package_id
    provenance["sourceIdentitySha256"] = identity
    provenance_path.write_text(json.dumps(provenance, ensure_ascii=False, indent=2))

    evidence = []
    for directory in ("generated-artifacts/dcas-qa", "generated-artifacts/dcas-qa-before"):
        for path in sorted((ROOT / directory).rglob("*")):
            if path.is_file():
                name = str(path.relative_to(ROOT))
                validate_name(name)
                if path.is_symlink():
                    raise RuntimeError("Symlink in evidence")
                scan_text(path)
                evidence.append((path, name))
    # Preserve every existing evidence file, including original reports/diagnostic text.
    groups, group, size = [], [], 0
    for file in evidence:
        n = file[0].stat().st_size
        if group and size + n > MAX_RAW:
            groups.append(group)
            group, size = [], 0
        group.append(file)
        size += n
    if group:
        groups.append(group)
    evidence_index = {"packageId": package_id, "files": [], "parts": []}
    archives = []
    for i, group in enumerate(groups, 1):
        part = f"evidence-{i:02d}"
        filename = f"{package_id}-{part}-of-{len(groups):02d}.zip"
        records = [item(p, name) for p, name in group]
        evidence_index["files"].extend(record | {"archive": filename} for record in records)
        evidence_index["parts"].append({"archive": filename, "files": len(group)})
        manifest = {"part": part, "files": records, "selfExcluded": True}
        write_zip(filename, group, manifest, package_id)
        archives.append(item(DEST / filename, filename) | {"kind": "evidence", "files": len(group)})
        print(filename, len(group), flush=True)
    (STAGE / "handoff/EVIDENCE_INDEX.json").write_text(json.dumps(evidence_index, ensure_ascii=False, indent=2))
    privacy = {
        "policy": "Allowlisted ebook/shared source, reports, fictitious ebook QA, static bundles only. No Git, real user records, browser profiles/cookies/storage-state, .env, credentials, installed dependencies or caches.",
        "automatedCredentialPatterns": len(SECRETS),
        "binaryEvidenceOrigin": "Original anonymous guide QA against fictitious product examples; not operational user data.",
        "limitations": "Pattern scan is not a security audit or a formal guarantee against every possible secret encoding.",
        "originalAppAndWorkspaceHashVerification": "pass",
    }
    (STAGE / "handoff/PRIVACY_CHECK.json").write_text(json.dumps(privacy, ensure_ascii=False, indent=2))
    files = []
    for path in sorted(STAGE.rglob("*")):
        if path.is_file():
            name = str(path.relative_to(STAGE))
            validate_name(name)
            if path.is_symlink():
                raise RuntimeError("Symlink in source")
            scan_text(path)
            files.append((path, name))
    source_records = [item(p, name) for p, name in files]
    (STAGE / "SHA256SUMS").write_text("".join(record["sha256"] + "  " + record["path"] + "\n" for record in source_records))
    files.append((STAGE / "SHA256SUMS", "SHA256SUMS"))
    filename = package_id + "-source.zip"
    write_zip(filename, files, {"part": "source", "files": source_records,
                               "selfExcluded": True, "SHA256SUMS_selfExcluded": True}, package_id)
    archives.insert(0, item(DEST / filename, filename) | {"kind": "source", "files": len(files)})
    delivery = {
        "packageId": package_id, "archives": archives, "evidenceFileCount": len(evidence),
        "sourceFileCount": len(files), "cleanBuild": checks["outcome"],
        "productionAccess": json.loads((OUT / "verification/production-access.json").read_text()),
        "excluded": privacy["policy"],
    }
    (DEST / "DELIVERY_INDEX.json").write_text(json.dumps(delivery, ensure_ascii=False, indent=2))
    (DEST / "DELIVERY_SHA256SUMS.txt").write_text("".join(a["sha256"] + "  " + a["path"] + "\n" for a in archives))
    print(json.dumps({"packageId": package_id, "sourceFiles": len(files), "evidenceFiles": len(evidence),
                      "archives": len(archives), "originalSourceUnchanged": True}, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
