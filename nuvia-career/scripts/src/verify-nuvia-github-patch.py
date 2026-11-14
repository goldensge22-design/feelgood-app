"""Build/read-only-verify a source-only patch against the actually read GitHub base."""
import hashlib
import json
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "generated-artifacts/nuvia-korean-final"
manifest = json.loads((ROOT / "generated-artifacts/nuvia-managed-ai/source-manifest.json").read_text())
remote = json.loads((OUT / "github-write-blocked.json").read_text())
assert remote["remoteCommit"] == "f051942eef7487157c5ad1bfea6125f068bc0ae2"
tree = {entry["path"]: entry for entry in remote["baseTree"]}
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda b: hashlib.sha1(f"blob {len(b)}\0".encode() + b).hexdigest()
protected = ["AGENTS.md", "docs/AI_PERSONALIZED_STAR_SPEC.md", "docs/COMPANY_SHARING_EVIDENCE_RULES.md"]
expected = {}
with tempfile.TemporaryDirectory(prefix="nuvia-github-base-") as temp:
    temp = Path(temp)
    before, after, trial = (temp / x for x in ("before", "after", "trial"))
    before.mkdir()
    after.mkdir()
    for item in manifest["sourceFiles"]:
        relative = "nuvia-career/" + item["path"]
        data = (ROOT / item["path"]).read_bytes()
        assert sha(data) == item["sha256"], relative
        expected[relative] = sha(data)
        dest = after / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        if relative in tree:
            cached = (OUT / "github-base-f051" / relative).read_bytes()
            assert blob(cached) == tree[relative]["sha"], relative
            dest = before / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(cached)
    for relative in protected:
        key = "nuvia-career/" + relative
        data = (OUT / "preserved-rules" / key).read_bytes()
        assert blob(data) == tree[key]["sha"], key
        expected[key] = sha(data)
        for directory in (before, after):
            dest = directory / key
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
    diff = subprocess.run(["git", "diff", "--no-index", "--binary", "before", "after"], cwd=temp, capture_output=True)
    assert diff.returncode in (0, 1), diff.stderr.decode()
    lines = diff.stdout.splitlines(keepends=True)
    for i, line in enumerate(lines):
        if line.startswith((b"diff --git ", b"--- ", b"+++ ")):
            for prefix in (b"a/before/", b"a/after/"):
                line = line.replace(prefix, b"a/")
            for prefix in (b"b/before/", b"b/after/"):
                line = line.replace(prefix, b"b/")
            lines[i] = line
    patch = b"".join(lines)
    patch_file = OUT / "github-f051942-korean-ai.patch"
    patch_file.write_bytes(patch)
    shutil.copytree(before, trial)
    for args in (["--check"], []):
        subprocess.run(["git", "apply", *args, str(patch_file)], cwd=trial, check=True, capture_output=True)
    for relative, digest in expected.items():
        assert sha((trial / relative).read_bytes()) == digest, relative
    result = {
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "githubBase": remote["remoteCommit"],
        "sourceCommit": manifest["sourceCommit"],
        "runtimeSourceFingerprintSha256": manifest["runtimeSourceFingerprintSha256"],
        "patchFile": patch_file.name, "patchSha256": sha(patch),
        "applyAt": "goldensge22-design/feelgood-app repository root",
        "programPrefix": "nuvia-career/", "sourceFilesCompared": len(manifest["sourceFiles"]),
        "protectedRuleFilesCompared": len(protected),
        "gitApplyCheck": "pass", "freshCopyApply": "pass", "allExpectedHashesMatch": True,
        "scope": "Synthetic offline copy of the read GitHub source subset, not a remote push or full repository checkout",
        "instructions": [
            "Use a new local work branch from the verified handoff branch; do not overwrite main.",
            "If remote base is no longer f051942, inspect differences first; never force apply.",
            "At repository root: git apply --check github-f051942-korean-ai.patch",
            "Then: git apply github-f051942-korean-ai.patch; inspect diff and commit/push with your existing authorized account.",
            "Do not also apply the alternative bd181075 or 7802fa3 patches.",
            "No database migration, production access or public deployment is part of this patch.",
        ],
    }
    (OUT / "github-base-patch.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result, ensure_ascii=False))
