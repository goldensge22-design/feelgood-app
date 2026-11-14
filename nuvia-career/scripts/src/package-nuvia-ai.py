"""Create a secret-free, allowlisted NUVIA developer handoff (no git writes).

Run from any directory: python scripts/src/package-nuvia-ai.py
Only source/configuration and named synthetic QA artifacts are included.
"""
from pathlib import Path
import hashlib
import io
import json
import re
import subprocess
import tarfile
import tempfile
import zipfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "generated-artifacts" / "nuvia-managed-ai"
SOURCE_DIRS = [
    "artifacts/nuvia-career", "artifacts/api-server",
    "lib/api-client-react", "lib/api-spec", "lib/api-zod", "lib/db",
]
SOURCE_FILES = [
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
    "tsconfig.json", "tsconfig.base.json", ".gitignore", ".replitignore", "replit.md",
    "scripts/package.json", "scripts/tsconfig.json",
    "scripts/src/nuvia-managed-ai-smoke.ts", "scripts/src/nuvia-ai-contract-check.ts",
    "scripts/src/package-nuvia-ai.py",
    "scripts/src/nuvia-korean-ai-qa.ts",
    "scripts/src/verify-nuvia-github-patch.py",
    "docs/nuvia-managed-ai-handoff.md", "docs/nuvia-managed-ai-qa.md",
    "docs/nuvia-korean-final-qa.md",
    "docs/nuvia-managed-ai-spec.md",
    "docs/nuvia-job-connection-rules.md", "docs/nuvia-star-story-patch.md",
]
EXCLUDE_PARTS = {".git", "node_modules", "dist", "build", ".cache", ".vite", ".vite-temp", "generated-artifacts", "coverage"}
EXCLUDE_SUFFIXES = {".tsbuildinfo", ".log", ".sqlite", ".db", ".dump", ".har"}

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def allowed(path):
    rel = path.relative_to(ROOT)
    if rel.parts[:1] == ("artifacts",):
        artifact_rel = Path(*rel.parts[2:]).as_posix()
        if not (artifact_rel.startswith(("src/", "public/")) or artifact_rel in {
            ".replit-artifact/artifact.toml", "package.json", "tsconfig.json", "build.mjs",
            "vite.config.ts", "components.json", "index.html", "public-guide.ts",
        }):
            return False
    return (path.is_file() and not path.is_symlink()
            and not any(part in EXCLUDE_PARTS for part in rel.parts)
            and path.suffix not in EXCLUDE_SUFFIXES
            and not path.name.endswith(".tsbuildinfo")
            and not path.name.startswith(".env")
            and not re.search(r"(?:storage[-_]?state|cookies|session[-_]?data|credentials|id_rsa)", path.name, re.I))

paths = set()
for directory in SOURCE_DIRS:
    for path in (ROOT / directory).rglob("*"):
        if allowed(path):
            paths.add(path.relative_to(ROOT).as_posix())
for name in SOURCE_FILES:
    path = ROOT / name
    if allowed(path):
        paths.add(name)
paths = sorted(paths)
base = "bd181075f5a301d4f19bc340e571d2494bfdc819"
incremental_base = "7802fa308256dc8320d2d2cadf5bc369a7b29e21"
untracked = set(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
def make_and_verify_patch(ref):
    # Generated contract files may be ignored by Git but are still required source.
    base_blobs = {}
    for entry in git("ls-tree", "-r", "-z", ref).split(b"\0"):
        if entry:
            metadata, name = entry.split(b"\t", 1)
            base_blobs[name.decode()] = metadata.split()[2].decode()
    def blob_hash(name):
        data = (ROOT / name).read_bytes()
        return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
    selected = [name for name in paths if base_blobs.get(name) != blob_hash(name)]
    additions = [name for name in selected if name not in base_blobs]
    modifications = [name for name in selected if name in base_blobs]
    patch = bytearray(git("diff", "--binary", ref, "--", *modifications)) if modifications else bytearray()
    for name in additions:
        process = subprocess.run(["git", "diff", "--no-index", "--binary", "--", "/dev/null", name],
                                 cwd=ROOT, capture_output=True)
        if process.returncode not in (0, 1):
            raise RuntimeError("Cannot generate addition patch: " + name)
        patch.extend(process.stdout)
    with tempfile.TemporaryDirectory(prefix="nuvia-ai-patch-") as temp:
        temp_path = Path(temp)
        with tarfile.open(fileobj=io.BytesIO(git("archive", ref)), mode="r:") as archive:
            archive.extractall(temp_path, filter="data")
        patch_file = temp_path / "handoff.patch"
        patch_file.write_bytes(patch)
        subprocess.run(["git", "apply", "--check", str(patch_file)], cwd=temp_path, check=True)
        subprocess.run(["git", "apply", str(patch_file)], cwd=temp_path, check=True)
        mismatches = [name for name in paths if not (temp_path / name).exists()
                      or sha((temp_path / name).read_bytes()) != sha((ROOT / name).read_bytes())]
        if mismatches:
            raise RuntimeError("Applied copy does not match: " + ", ".join(mismatches))
    return patch, selected
patch, patch_paths = make_and_verify_patch(base)
incremental_patch, incremental_paths = make_and_verify_patch(incremental_base)

entries, changes = [], []
for name in paths:
    content = (ROOT / name).read_bytes()
    # Do not print matching contents; fail closed on common embedded secret forms.
    if re.search(rb"\b(?:sk_live_|sk_test_|sk-proj-)[A-Za-z0-9_-]{20,}", content):
        raise RuntimeError("Possible embedded secret; excluded from handoff: " + name)
    entries.append({"path": name, "bytes": len(content), "sha256": sha(content)})
    if name in patch_paths:
        previous = subprocess.run(["git", "show", f"{base}:{name}"], cwd=ROOT, capture_output=True)
        changes.append({"path": name, "beforeSha256": sha(previous.stdout) if previous.returncode == 0 else None,
                        "afterSha256": sha(content), "change": "modified" if previous.returncode == 0 else "added"})
runtime = [e for e in entries if any(e["path"].startswith(d + "/") for d in SOURCE_DIRS)
           or e["path"] in ("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json", "tsconfig.base.json")]
fingerprint = sha("\n".join(f'{e["sha256"]}  {e["path"]}' for e in runtime).encode())
remote_file = ROOT / "generated-artifacts/nuvia-korean-final/remote-verification.json"
remote_evidence = json.loads(remote_file.read_text()) if remote_file.exists() else None
remote_verified = bool(remote_evidence and remote_evidence.get("runtimeSourceFingerprintSha256") == fingerprint
                       and remote_evidence.get("allSourceFilesMatch") and remote_evidence.get("remoteCommit"))
manifest = {
    "createdAt": datetime.now(timezone.utc).isoformat(), "baseCommit": base,
    "sourceCommit": git("rev-parse", "HEAD").decode().strip(),
    "worktreeModified": bool(git("status", "--porcelain").strip()), "runtimeSourceFingerprintSha256": fingerprint,
    "sourceFiles": entries, "changedFiles": changes, "patchSha256": sha(patch),
    "patchCopyCheck": {"status": "pass", "appliedAgainst": base, "changedFiles": len(patch_paths), "filesMatched": len(paths)},
    "incrementalPatchCopyCheck": {"status": "pass", "appliedAgainst": incremental_base,
                                  "changedFiles": len(incremental_paths), "filesMatched": len(paths), "sha256": sha(incremental_patch)},
    "excluded": ["secret values/.env", "real user records/DB dumps", "browser sessions/cookies/HAR",
                 "node_modules/cache/.git", "old generated-artifacts", "other LAB/planner projects"],
    "publication": "not performed", "githubPush": "verified work-branch REST commit and remote readback" if remote_verified else "not performed",
    "remoteVerification": remote_evidence if remote_verified else None,
    "deliveryGate": "Korean implementation, new real-model QA, GitHub work-branch save and remote/file comparison, then Korean delivery. See final QA results; archive creation alone never completes the gate.",
    "remoteRuleReference": {
        "repository": "goldensge22-design/feelgood-app",
        "branch": "codex/nuvia-career-handoff-20261027",
        "commit": "f051942eef7487157c5ad1bfea6125f068bc0ae2",
        "evidence": "independently read through authorized GitHub connection as the pre-update rules/spec base; not itself evidence of new AI source upload",
    },
}
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
(OUT / "changes.patch").write_bytes(patch)
(OUT / "since-7802fa3.patch").write_bytes(incremental_patch)
zip_path = OUT / "nuvia-managed-ai-korean-qa-20261115.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
    for name in paths:
        archive.write(ROOT / name, "source/" + name)
    archive.writestr("patch/changes.patch", patch)
    archive.writestr("patch/since-7802fa3.patch", incremental_patch)
    archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
    archive.writestr("APPLY.md",
        "# Applying this review patch\n\n"
        f"Base: `{base}`. Runtime fingerprint: `{fingerprint}`.\n\n"
        "Preserve your working tree first. On an exact copy of the stated base, run "
        "`git apply --check patch/changes.patch`, then `git apply patch/changes.patch`. "
        "Do not overwrite a newer project with an older ZIP. For a different base, review and resolve differences manually.\n\n"
        "A fresh copy of the stated base was patched and every changed file hash matched. "
        "This is not evidence of a GitHub push, deployment, or external product integration.\n\n"
        f"The alternative incremental patch since {incremental_base} was also copy-applied and hash-verified. "
        "Choose ONE patch for its exact base; do not apply both in sequence. The GitHub repository stores this workspace under nuvia-career/; never patch the repository root or overwrite its preserved AGENTS/spec/company-sharing rules.\n\n"
        "Read source/docs/nuvia-managed-ai-handoff.md and source/docs/nuvia-managed-ai-qa.md. "
        "Provide auth/database/managed-AI configuration through secure environment settings, not committed files.\n")
    for name in ["real-model-smoke.json", "client-boundary-check.json", "frontend-build.log", "api-build.log", "browser-final.json",
                 "synthetic-authenticated-export.docx", "synthetic-authenticated-export.hwpx", "synthetic-export-readback.json",
                 "rules-update-check.json"]:
        path = OUT / name
        if path.exists():
            archive.write(path, "qa/" + name)
    final_qa = ROOT / "generated-artifacts/nuvia-korean-final"
    for path in sorted(final_qa.glob("*")):
        if path.is_file() and path.suffix in {".json", ".docx", ".hwpx", ".txt", ".log", ".jpg", ".png"}:
            if any(x in path.name.lower() for x in ("cookie", "session", "storage", "token")):
                continue
            archive.write(path, "qa/korean-final/" + path.name)
    for name in ("AGENTS.md", "docs/AI_PERSONALIZED_STAR_SPEC.md", "docs/COMPANY_SHARING_EVIDENCE_RULES.md"):
        path = final_qa / "preserved-rules/nuvia-career" / name
        if path.exists():
            archive.write(path, "preserved-remote-rules/nuvia-career/" + name)
    for path in sorted((final_qa / "evidence").rglob("*")):
        if path.is_file() and path.suffix.lower() in {".docx", ".hwpx", ".txt", ".png", ".jpg"}:
            archive.write(path, "qa/korean-final/evidence/" + path.relative_to(final_qa / "evidence").as_posix())
    github_patch = final_qa / "github-f051942-korean-ai.patch"
    if github_patch.exists():
        archive.write(github_patch, "patch/github-f051942-korean-ai.patch")
        archive.writestr("GITHUB_APPLY.md",
            "# 기존 GitHub 인계 브랜치 적용\n\n"
            "원격 쓰기는 403으로 거절되어 이 ZIP이 신규 GitHub 저장 완료를 뜻하지 않습니다.\n"
            "대상: goldensge22-design/feelgood-app / codex/nuvia-career-handoff-20261027.\n"
            "확인한 원격 기준: f051942eef7487157c5ad1bfea6125f068bc0ae2 (기존 규칙 문서).\n"
            "기존 작업을 보존한 새 로컬 작업 브랜치에서 진행하고 원격 기준이 달라졌으면 먼저 비교하세요.\n\n"
            "저장소 루트에서:\n"
            "git apply --check /ZIP을푼경로/patch/github-f051942-korean-ai.patch\n"
            "git apply /ZIP을푼경로/patch/github-f051942-korean-ai.patch\n\n"
            "변경 내용을 검토한 뒤 본인의 기존 승인된 GitHub 연결로 커밋/푸시하고 원격을 확인하세요.\n"
            "소스 위치는 nuvia-career/ 입니다. main·다른 앱·보호 규칙 세 문서를 덮어쓰지 않습니다.\n"
            "이 패치는 실제 읽은 원격 자료 사본에 적용 후 전체 소스 해시를 검증했습니다.\n"
            "qa/korean-final/github-base-patch.json을 확인하세요.\n"
            "bd181075/7802fa3용 대안 패치를 중복 적용하지 마세요. DB·공개 배포는 범위 밖입니다.\n")
with zipfile.ZipFile(zip_path, "a", compression=zipfile.ZIP_DEFLATED) as archive:
    sums = [f"{sha(archive.read(name))}  {name}" for name in archive.namelist()]
    archive.writestr("ALL_FILES_SHA256.txt", "\n".join(sums) + "\n")
(OUT / (zip_path.name + ".sha256")).write_text(f"{sha(zip_path.read_bytes())}  {zip_path.name}\n")
print(json.dumps({"zip": str(zip_path.relative_to(ROOT)), "bytes": zip_path.stat().st_size,
                  "sha256": sha(zip_path.read_bytes()), "baseCommit": base,
                  "runtimeSourceFingerprintSha256": fingerprint, "sourceFiles": len(entries),
                  "patchFiles": len(changes), "patchCopyCheck": "pass"}, ensure_ascii=False))
