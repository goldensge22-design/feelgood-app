"""Stage an allowlisted, credential-free ebook workspace, without editing the app."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated-artifacts/dcas-handoff"
STAGE = OUT / "staging/dcas-guide"
ROOT_FILES = {
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
    "tsconfig.json", "tsconfig.base.json", ".npmrc", ".gitignore", ".replitignore",
}
PREFIXES = ("artifacts/dcas-quick-guide/", "lib/", "scripts/", "qa/dcas-guide/")
FORBIDDEN_PARTS = {
    "node_modules", ".git", ".cache", ".local", ".config", ".agents",
    "dist", "coverage", "test-results", "playwright-report", "__pycache__",
}

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def allowed(name):
    p = Path(name)
    return (
        not any(part in FORBIDDEN_PARTS for part in p.parts)
        and not p.name.startswith(".env")
        and not name.endswith((".tsbuildinfo", ".log", ".pem", ".key", ".p12", ".sqlite", ".db"))
        and not p.is_absolute()
    )

def stage():
    if STAGE.exists():
        raise SystemExit("Refusing to overwrite an existing staging directory.")
    STAGE.mkdir(parents=True)
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode().split("\0")
    paths = sorted(p for p in tracked if p and (p in ROOT_FILES or p.startswith(PREFIXES)) and allowed(p))
    # Reports and handoff tools may be new, and must not depend on checkpoint timing.
    for directory in ("qa/dcas-guide", "handoff"):
        paths.extend(
            str(p.relative_to(ROOT)) for p in (ROOT / directory).rglob("*")
            if p.is_file() and allowed(str(p.relative_to(ROOT)))
        )
    paths = sorted(set(paths))
    records = []
    for name in paths:
        source = ROOT / name
        if source.is_symlink():
            raise RuntimeError("Symlinks are not permitted: " + name)
        target = STAGE / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        records.append({"path": name, "sha256": digest(source), "bytes": source.stat().st_size})
    identity = hashlib.sha256(json.dumps(records, sort_keys=True).encode()).hexdigest()
    package_id = "dcas-guide-" + identity[:16]
    provenance = {
        "packageId": package_id,
        "sourceIdentitySha256": identity,
        "originalSourceFiles": records,
        "sourcePolicy": "Original ebook and workspace files copied byte-for-byte; other apps and populated data excluded.",
        "includedSharedPackages": ["api-client-react", "api-spec", "api-zod", "db"],
        "sharedPackageNote": "api-client-react is the ebook dependency; remaining schema/tooling sources preserve original root TypeScript references. No database contents or operational credentials.",
        "excluded": ["Git history/remotes", "user profiles", "secrets/env files", "installed dependencies", "caches", "other dashboard/apps", "actual user data"],
    }
    (STAGE / "handoff/SOURCE_PROVENANCE.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2))
    shutil.copy2(ROOT / "handoff/README_KO.md", STAGE / "README_KO.md")
    print(json.dumps({"stage": str(STAGE), "packageId": package_id, "sourceFiles": len(records)}, ensure_ascii=False))

if __name__ == "__main__":
    stage()
