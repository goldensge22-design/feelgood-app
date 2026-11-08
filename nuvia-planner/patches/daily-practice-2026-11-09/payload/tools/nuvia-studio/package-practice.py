"""Additive daily-practice source candidate; no Git index or browser records touched."""
import ast
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
BASE = "e1209da854493369e664d8922509390d55a7f34f"
OUT = ROOT / "generated-artifacts/studio-practice"


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    gate = json.loads((OUT / "QA_STATUS.json").read_text())
    ready = gate.get("complete") is True
    old = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
    candidates = set(git("diff", "--name-only", BASE).decode().splitlines())
    candidates |= set(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
    names = sorted(n for n in candidates if n.startswith((
        "artifacts/nuvia-ui-review/", "docs/STUDIO_DAILY_PRACTICE_",
        "tools/nuvia-studio/practice-", "tools/nuvia-studio/run-practice-",
        "tools/nuvia-studio/package-practice.",
    )) and (ROOT / n).is_file())
    blobs, rows, patch = {}, [], []
    for name in names:
        if any(p in {"node_modules", "dist", ".git", ".cache"} or p.startswith(".env") for p in Path(name).parts):
            raise SystemExit("Excluded path " + name)
        data = (ROOT / name).read_bytes()
        before = git("show", BASE + ":" + name) if name in old else None
        if data == before:
            continue
        rows.append({"path": name, "before": sha(before) if before is not None else None, "after": sha(data)})
        blobs["payload/" + name] = data
        patch += list(difflib.unified_diff(
            before.decode().splitlines(True) if before is not None else [],
            data.decode().splitlines(True),
            fromfile="a/" + name if before is not None else "/dev/null",
            tofile="b/" + name))
    source_hash = sha(json.dumps(rows, sort_keys=True, separators=(",", ":")).encode())
    blobs["SOURCE_MANIFEST.json"] = json.dumps({
        "baseCommit": BASE, "headAtPackaging": git("rev-parse", "HEAD").decode().strip(),
        "sourceFingerprintSha256": source_hash, "files": rows,
        "scope": "additive source only; not a full checkout; no deployment",
        "qaComplete": ready,
    }, ensure_ascii=False, indent=2).encode()
    blobs["changes.patch"] = "".join(patch).encode()
    # Reuse the existing all-file preflight / external backup helper verbatim.
    tree = ast.parse((ROOT / "tools/nuvia-studio/package-library-public.py").read_text())
    template = next(n.value for n in tree.body if isinstance(n, ast.Assign)
                    and any(isinstance(t, ast.Name) and t.id == "APPLY" for t in n.targets))
    blobs["apply.py"] = ast.literal_eval(template).encode()
    blobs["README.txt"] = (
        "NUVIA daily-practice additive source REVIEW CANDIDATE — NOT PUBLISHED\n"
        f"QA complete: {ready}; inspect QA_STATUS.json and handoff/QA documents, not filename alone.\n"
        f"Base: {BASE}\nSource fingerprint SHA256: {source_hash}\n"
        "This is NOT a full repository. Apply to a matching checkout on a work branch only.\n"
        "Do NOT overwrite a newer developer integration. Any hash/new-path conflict must stop.\n"
        "Preflight covers changed files only; unchanged result/server dependencies still need developer review.\n"
        "Dry-run: python apply.py --root /path/to/checkout\n"
        "Apply: python apply.py --root /path/to/checkout --apply --backup /outside/checkout/backup\n"
        "Rollback: restore modified originals from that backup; remove only newly added listed paths.\n"
        "No browser storage clear/migration. Old backup import stays supported by the new patch;\n"
        "new practice-bearing backups may not import into an older app. Preserve them, never strip records.\n"
        "Build prerequisites are the original workspace pnpm lock/config; no new package added.\n"
        "QA/dev comparison: /practice-compare.html (not a production entry).\n"
        "Ordinary preview: /library-demo.html?demo=university -> Plan -> Recommended practice.\n"
        "Excluded: personal/browser/backups, secrets/.env, node_modules, builds/caches/.git,\n"
        "other apps, unchanged official result/legacy sources, old artifacts and private records.\n"
        "AI draft translations/content are NOT native/professionally reviewed or efficacy validated.\n"
        "All dependencies and unchanged source must come from your baseline checkout.\n"
    ).encode()
    for p in OUT.glob("*.log"):
        blobs["qa/" + p.name] = p.read_bytes()
    for name in ("QA_STATUS.json", "automatic-summary.json"):
        blobs["qa/" + name] = (OUT / name).read_bytes()
    blobs["qa/LEGACY_ISSUE_TRIAGE.md"] = (ROOT / "docs/STUDIO_CAREER_REVIEW_ISSUE_TRIAGE.md").read_bytes()
    for p in (OUT / "qa").rglob("*"):
        if p.is_file() and p.suffix in {".md", ".json", ".mjs", ".js", ".jpg", ".png"}:
            if p.name.startswith(("NUVIA_", "studio-practice-personal-backup")) or ".backup." in p.name:
                continue
            if p.suffix == ".json" and not p.name.startswith((
                "row-", "matrix-", "incremental-", "compare-", "summary-", "coverage-",
                "keyboard-", "boundary-", "targeted-", "final-", "extra-",
                "age-", "public-", "qa-public-record-",
                "helper-",
            )):
                continue  # No raw browser-storage/download/backup payloads.
            if p.stat().st_size < 2_000_000:
                blobs["qa/browser/" + str(p.relative_to(OUT / "qa"))] = p.read_bytes()
    for p in (OUT / "screenshots").glob("*.jpg"):
        blobs["screenshots/" + p.name] = p.read_bytes()
    blobs["FILES.txt"] = ("\n".join(sorted([*blobs, "FILES.txt", "SHA256SUMS.txt"])) + "\n").encode()
    blobs["SHA256SUMS.txt"] = "".join(f"{sha(data)}  {name}\n" for name, data in sorted(blobs.items())).encode()
    target = OUT / ("NUVIA_STUDIO_DAILY_PRACTICE_REVIEW_PATCH.zip" if ready
                    else "NUVIA_STUDIO_DAILY_PRACTICE_QA_INCOMPLETE.zip")
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(blobs.items()):
            z.writestr(name, data)
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        for name, data in blobs.items():
            assert z.read(name) == data
    result = {"path": str(target.relative_to(ROOT)), "bytes": target.stat().st_size,
              "sha256": sha(target.read_bytes()), "sourceFiles": len(rows),
              "sourceFingerprintSha256": source_hash, "qaComplete": ready}
    (OUT / "package.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
