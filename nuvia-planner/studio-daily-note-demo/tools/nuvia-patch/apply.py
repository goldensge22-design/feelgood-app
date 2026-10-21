#!/usr/bin/env python3
"""Apply or restore a NUVIA source-only patch without overwriting integrations."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

PACKAGE = Path(__file__).resolve().parent
MANIFEST = json.loads((PACKAGE / "manifest.json").read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def safe_target(source, name):
    if not name.startswith("src/") or ".." in Path(name).parts:
        raise ValueError(f"Invalid path in manifest: {name}")
    target = source / name
    if target.is_symlink() or any(p.is_symlink() for p in target.parents if p != source.parent):
        raise ValueError(f"Symlink target is not allowed: {name}")
    return target


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path, help="Existing nuvia-planner/source directory")
    parser.add_argument("--check", action="store_true", help="Read-only compatibility check")
    parser.add_argument("--rollback", type=Path, help="Backup directory created by this installer")
    args = parser.parse_args()
    source = args.source.resolve()
    if not (source / "src/adaptive/AdaptivePlanner.tsx").is_file():
        parser.error("--source must point to the existing nuvia-planner/source directory")
    files = MANIFEST["files"]
    if args.rollback:
        backup = args.rollback.resolve()
        state_file = backup / "rollback.json"
        if not state_file.is_file():
            parser.error("Backup does not contain rollback.json")
        state = json.loads(state_file.read_text(encoding="utf-8"))
        if state.get("packageId") != MANIFEST["packageId"]:
            parser.error("Backup belongs to another patch")
        problems = [name for name in state["changed"]
                    if digest(safe_target(source, name)) != files[name]["after"]]
        if problems:
            parser.error("Rollback stopped: patched files have since changed:\n" + "\n".join(problems))
        for name in state["changed"]:
            dest = safe_target(source, name)
            saved = backup / name
            if saved.exists():
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(saved, dest)
            else:
                dest.unlink()
        print("Restored backed-up source files. Browser records and storage were not touched.")
        return

    changed = []
    conflicts = []
    already = []
    for name, hashes in files.items():
        current = digest(safe_target(source, name))
        if current == hashes["after"]:
            already.append(name)
        elif current == hashes["before"]:
            changed.append(name)
        else:
            conflicts.append((name, current or "missing"))
    print(f"Base: {MANIFEST['baseCommit']} | pending: {len(changed)} | already applied: {len(already)} | conflicts: {len(conflicts)}")
    for name, actual in conflicts:
        print(f"CONFLICT {name}: current SHA256 {actual}; expected {files[name]['before']}", file=sys.stderr)
    if conflicts:
        raise SystemExit(2)
    if args.check or not changed:
        print("No files written. Compatible." if not conflicts else "No files written.")
        return
    for name in changed:
        packaged = safe_target(PACKAGE / "files", name)
        if digest(packaged) != files[name]["after"]:
            parser.error(f"Patch archive failed checksum verification: {name}")

    # All targets are checked BEFORE writing any file. The backup is outside source.
    backup = source.parent / ("nuvia-ui-backup-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    if backup.exists():
        parser.error(f"Backup path already exists: {backup}")
    backup.mkdir()
    for name in changed:
        original = safe_target(source, name)
        if original.exists():
            saved = backup / name
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(original, saved)
    (backup / "rollback.json").write_text(json.dumps({
        "packageId": MANIFEST["packageId"], "changed": changed
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        for name in changed:
            target = safe_target(source, name)
            target.parent.mkdir(parents=True, exist_ok=True)
            staged = target.with_name(target.name + ".nuvia-ui.tmp")
            shutil.copy2(PACKAGE / "files" / name, staged)
            os.replace(staged, target)
    except Exception:
        print(f"Partial write error. Restore using: python3 apply.py --source {source} --rollback {backup}", file=sys.stderr)
        raise
    print(f"Applied {len(changed)} UI files. Backup: {backup}")
    print(f"Rollback: python3 apply.py --source {source} --rollback {backup}")


if __name__ == "__main__":
    main()