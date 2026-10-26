"""Verify the copied source with an empty HOME/store install, never touching the live app."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "generated-artifacts/dcas-handoff"
LOCATION = json.loads((OUT / "clean-location.json").read_text())
CLEAN = Path(LOCATION["workspace"])
STAGE = OUT / "staging/dcas-guide"
RECORD = OUT / "verification"
RECORD.mkdir(exist_ok=True)
ENV = {"PATH": os.environ["PATH"], "HOME": LOCATION["home"], "CI": "1"}
report = {
    "isolation": "New /tmp source copy, initially empty HOME and pnpm store; no workspace node_modules, cookies, credentials, Git or cache copied. Same Linux x64 host and system tool executables, not an independent OS/container.",
    "install": {
        "command": "pnpm install --frozen-lockfile --store-dir <fresh-empty-store>",
        "exitCode": 0,
        "log": "install.log",
        "note": "Executed before this runner under env -i; successful completion recorded by background shell.",
    },
    "commands": [],
}
shutil.copy2(Path(LOCATION["work"]) / "install.log", RECORD / "install.log")
# Refresh test tooling only. Application files remain the original staged copy.
for name in ("verify-browser.mjs", "verify-clean.py"):
    shutil.copy2(ROOT / "handoff" / name, CLEAN / "handoff" / name)

def run(label, args, extra=None):
    start = time.monotonic()
    result = subprocess.run(args, cwd=CLEAN, env=ENV | (extra or {}), capture_output=True, text=True)
    (RECORD / (label + ".log")).write_text(result.stdout + result.stderr)
    record = {"label": label, "command": args, "environment": extra or {},
              "exitCode": result.returncode, "seconds": round(time.monotonic() - start, 2),
              "log": label + ".log"}
    report["commands"].append(record)
    (RECORD / "clean-build.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(label, result.returncode, flush=True)
    if result.returncode:
        print(result.stdout[-3000:] + result.stderr[-3000:])
        raise SystemExit(result.returncode)

def hashes(folder):
    return {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in folder.rglob("*") if p.is_file()}

run("node-version", ["node", "--version"])
run("pnpm-version", ["pnpm", "--version"])
run("shared-types", ["pnpm", "exec", "tsc", "-b", "lib/api-client-react"])
run("i18n", ["pnpm", "--filter", "@workspace/dcas-quick-guide", "validate:i18n"])
run("typecheck", ["pnpm", "--filter", "@workspace/dcas-quick-guide", "typecheck"])
run("root-build", ["pnpm", "--filter", "@workspace/dcas-quick-guide", "run", "build"],
    {"PORT": "21888", "BASE_PATH": "/", "NODE_ENV": "production"})
build = CLEAN / "artifacts/dcas-quick-guide/dist/public"
original = ROOT / "artifacts/dcas-quick-guide/dist/public"
before, rebuilt = hashes(original), hashes(build)
comparison = {
    "originalFiles": before, "freshBuildFiles": rebuilt,
    "allFilesByteIdentical": before == rebuilt,
    "note": "This compares current workspace build files, not files fetched from the authenticated production deployment.",
}
(RECORD / "build-comparison.json").write_text(json.dumps(comparison, indent=2))
release = STAGE / "release"
release.mkdir(exist_ok=True)
shutil.copytree(build, release / "static-root", dirs_exist_ok=True)
run("root-browser", ["node", "handoff/verify-browser.mjs", "static", str(build), "/", "21991",
                     str(RECORD / "root-browser.json")])
run("subpath-build", ["pnpm", "--filter", "@workspace/dcas-quick-guide", "run", "build"],
    {"PORT": "21888", "BASE_PATH": "/dcas-guide/", "NODE_ENV": "production"})
shutil.copytree(build, release / "static-subpath-dcas-guide", dirs_exist_ok=True)
run("subpath-browser", ["node", "handoff/verify-browser.mjs", "static", str(build), "/dcas-guide/",
                        "21992", str(RECORD / "subpath-browser.json")])
report["lockfileUnchanged"] = (CLEAN / "pnpm-lock.yaml").read_bytes() == (ROOT / "pnpm-lock.yaml").read_bytes()
report["outcome"] = "pass" if report["lockfileUnchanged"] else "fail"
(RECORD / "clean-build.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
if report["outcome"] != "pass":
    raise SystemExit("Lockfile changed")
print("PASS: fresh install, shared types, i18n, typecheck, root/subpath builds and browser smoke", flush=True)
