#!/usr/bin/env python3
"""Create a reproducible, source-only delivery from official commit and reviewed copy."""
import difflib
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[2]
BASE = next(
    iter(Path("/tmp/nuvia-official").glob("*defa19d*/nuvia-planner/source/src")),
    Path("/tmp/nuvia-official/nuvia-planner/source/src"),
)
EDITED = ROOT / "artifacts/nuvia-ui-review/src/official"
OUT = ROOT / "deliverables/NUVIA_PLANNER_UI_candidate_v2_defa19d"
COMMIT = "defa19d7c7601157b47ddb10cf4d62fdf9bebf82"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def build():
    if not BASE.is_dir() or not EDITED.is_dir():
        raise RuntimeError("Official checkout and reviewed source are both required")
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    files = {}
    patch = []
    names = {p.relative_to(BASE) for p in BASE.rglob("*") if p.is_file()}
    names |= {p.relative_to(EDITED) for p in EDITED.rglob("*") if p.is_file()}
    for name in sorted(names):
        old, new = BASE / name, EDITED / name
        if sha(old) == sha(new):
            continue
        if not new.is_file():
            raise RuntimeError(f"Deletion is not allowed: {name}")
        rel = "src/" + name.as_posix()
        files[rel] = {"before": sha(old), "after": sha(new)}
        dest = OUT / "files" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(new, dest)
        before = old.read_text(encoding="utf-8").splitlines(keepends=True) if old.is_file() else []
        after = new.read_text(encoding="utf-8").splitlines(keepends=True)
        patch.extend(difflib.unified_diff(before, after, fromfile="a/" + rel, tofile="b/" + rel))
    if not files:
        raise RuntimeError("No changes to deliver")
    manifest = {"packageId": "NUVIA-UI-candidate-v2-defa19d-20260930", "baseCommit": COMMIT, "files": files}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (OUT / "ui-changes.patch").write_text("".join(patch), encoding="utf-8")
    shutil.copy2(ROOT / "tools/nuvia-patch/apply.py", OUT / "apply.py")
    shutil.copy2(ROOT / "tools/nuvia-patch/README.md", OUT / "README.md")
    shutil.copy2(ROOT / "tools/nuvia-patch/QA_REPORT_v2.md", OUT / "QA_REPORT.md")
    archive = OUT.with_suffix(".zip")
    if archive.exists():
        archive.unlink()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(OUT.parent))
    print(f"{archive}: {len(files)} changed source files")
    for name in files:
        print(name)


if __name__ == "__main__":
    build()