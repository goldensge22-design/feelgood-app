"""Package the current career workspace without credentials, runtime data or Git writes.

Run after QA: python scripts/src/package-story-dashboard.py
The full ZIP is an independent-source handoff, NOT a central NUVIA deployment.
"""
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile
import argparse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "generated-artifacts/dashboard-current-qa-20261118"
BASE = "d07095f7f7da7beba347f78b2bc0c408043ac815"
OLD = ROOT / "generated-artifacts/dashboard-recovery-qa/nuvia-strength-dashboard-recovery-20261118.zip"
OLD_SHA = "37943330e609b4834902c9598d490b47be94dcd80df788889ffaa0c3542a48f9"
sha = lambda data: hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def allowed(name):
    p = Path(name)
    if any(s in {".git", "node_modules", "generated-artifacts", "dist", "build",
                 ".cache", ".vite", "coverage", "__pycache__"} for s in p.parts):
        return False
    if p.name.startswith(".env") or p.suffix in {".db", ".sqlite", ".dump", ".har", ".log", ".tsbuildinfo", ".pyc"}:
        return False
    if re.search(r"(storage[-_]?state|cookies|session[-_]?data|credentials|id_rsa)", p.name, re.I):
        return False
    return name.startswith(("artifacts/nuvia-career/", "artifacts/api-server/", "lib/", "scripts/", "docs/")) or name in {
        "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json",
        "tsconfig.base.json", ".npmrc", ".gitignore", ".replitignore", "replit.md",
    }


def ensure_no_credentials(name, data):
    # No values are printed, including on failure. Public Clerk key literals are
    # excluded too: the receiver must configure their own supported environment.
    if re.search(rb"(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|pk_(?:test|live)_[A-Za-z0-9_-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)", data):
        raise RuntimeError("Credential-pattern check failed; omit/review file: " + name)


def archive(path, entries):
    checksums = "".join(f"{sha(data)}  {name}\n" for name, data in sorted(entries.items()))
    entries = {**entries, "SHA256SUMS.txt": checksums.encode()}
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(entries.items()):
            z.writestr(name, data)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        for line in z.read("SHA256SUMS.txt").decode().splitlines():
            digest, name = line.split("  ", 1)
            assert sha(z.read(name)) == digest
    digest = sha(path.read_bytes())
    path.with_suffix(path.suffix + ".sha256").write_text(f"{digest}  {path.name}\n")
    return digest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tag", default="20261118")
    parser.add_argument("--review", action="store_true", help="Include scoped review-demo QA and keep previous bundles intact")
    parser.add_argument("--planner", action="store_true", help="Include only current planner evidence and produce a separate QA ZIP")
    parser.add_argument("--adult", action="store_true", help="Package adult thought note QA separately from earlier demo evidence")
    parser.add_argument("--adult-evidence-dir", help="Use a fresh directory under generated-artifacts for adult QA")
    args = parser.parse_args()
    if args.adult_evidence_dir:
        assert args.adult and re.fullmatch(r"[a-zA-Z0-9-]+", args.adult_evidence_dir), "Invalid adult evidence directory"
    if args.adult:
        args.planner = True
    assert re.fullmatch(r"[a-zA-Z0-9-]+", args.tag), "Invalid archive tag"
    assert sha(OLD.read_bytes()) == OLD_SHA, "Previous handoff bytes do not match"
    OUT.mkdir(parents=True, exist_ok=True)
    assert (OUT / "RESULTS.md").exists(), "Fresh QA results must exist before packaging"
    tracked = set(git("ls-files").decode().splitlines())
    names = tracked | set(git("ls-files", "--others", "--exclude-standard").decode().splitlines())
    names = sorted(n for n in names if allowed(n) and (ROOT / n).is_file() and not (ROOT / n).is_symlink())
    current = {}
    for n in names:
        data = (ROOT / n).read_bytes()
        ensure_no_credentials(n, data)
        current[n] = data
    before = {}
    base_names = set(git("ls-tree", "-r", "--name-only", BASE).decode().splitlines())
    with zipfile.ZipFile(OLD) as z:
        old_names = set(z.namelist())
        for n in sorted(set(names) | {p for p in base_names if allowed(p)}):
            original = git("show", f"{BASE}:{n}") if n in base_names else None
            if "source/" + n in old_names:
                assert original == z.read("source/" + n), "Old ZIP / baseline mismatch: " + n
            before[n] = original
    changes = [n for n in before if before[n] != current.get(n)]
    patch = bytearray()
    for n in changes:
        with tempfile.TemporaryDirectory() as td:
            # Git's no-index paths are rewritten to the original relative path.
            a, b = Path(td) / "before", Path(td) / "after"
            a.write_bytes(before[n] or b"")
            b.write_bytes(current.get(n, b""))
            a_name = str(a) if before[n] is not None else "/dev/null"
            b_name = str(b) if n in current else "/dev/null"
            result = subprocess.run(["git", "diff", "--no-index", "--binary", "--", a_name, b_name], capture_output=True)
            assert result.returncode in (0, 1)
            data = result.stdout.replace(("a" + str(a)).encode(), ("a/" + n).encode())
            data = data.replace(("b" + str(b)).encode(), ("b/" + n).encode())
            # Added/deleted diff headers also include the unused opposite path.
            data = data.replace(("a" + str(b)).encode(), ("a/" + n).encode())
            data = data.replace(("b" + str(a)).encode(), ("b/" + n).encode())
            patch.extend(data)
    with tempfile.TemporaryDirectory() as td:
        temp = Path(td)
        for n in changes:
            if before[n] is not None:
                p = temp / n
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_bytes(before[n])
        patch_file = temp / "apply.patch"
        patch_file.write_bytes(patch)
        subprocess.run(["git", "apply", "--check", str(patch_file)], cwd=temp, check=True, capture_output=True)
        subprocess.run(["git", "apply", str(patch_file)], cwd=temp, check=True, capture_output=True)
        for n in changes:
            assert (temp / n).read_bytes() == current[n] if n in current else not (temp / n).exists()
    records = [{"path": n, "sha256": sha(data)} for n, data in sorted(current.items())]
    runtime = [r for r in records if r["path"].startswith(("artifacts/nuvia-career/src/", "artifacts/nuvia-career/public/", "artifacts/nuvia-career/vendor/", "artifacts/nuvia-career/demo/", "artifacts/api-server/src/", "lib/"))
               and not r["path"].endswith(".test.ts")]
    fingerprint = sha("".join(f'{r["path"]}\0{r["sha256"]}\n' for r in runtime).encode())
    manifest = {
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "headCommit": git("rev-parse", "HEAD").decode().strip(),
        "worktreeChanged": bool(git("status", "--porcelain")),
        "patchBaseline": BASE, "previousHandoffSha256": OLD_SHA,
        "runtimeFingerprintSha256": fingerprint,
        "fingerprintMethod": "SHA256 of sorted runtime path + NUL + file SHA256 + LF, UTF-8",
        "sourceFiles": records,
        "changes": [{"path": n, "beforeSha256": sha(before[n]) if before[n] is not None else None,
                     "afterSha256": sha(current[n]) if n in current else None} for n in changes],
        "patchCheckPassed": True, "copyApplyAndAllHashesPassed": True,
        "githubPushPerformed": False, "productionDeploymentPerformed": False,
        "excluded": [".env and credentials", ".replit (environment-bearing workspace config)",
                     "Git history", "browser sessions", "runtime/DB data", "node_modules",
                     "old generated-artifacts", "other artifact applications", "agent private memory"],
    }
    readme = f"""NUVIA 강점 스토리 대시보드 최신 소스 인계

이 전체 소스는 기존 독립 Career 앱/API/공유 패키지와 실행 설정입니다.
중앙 NUVIA·다른 LAB/플래너를 대체하는 통합본이 아닙니다.
기준 커밋 {BASE} 및 이전 ZIP SHA256 {OLD_SHA} 이후 변경을 별도 패치로 제공합니다.

실행: Node.js와 pnpm 준비 후 source/에서 pnpm install --frozen-lockfile.
승인된 기존 Clerk/서버 환경 변수는 안전한 설정 경로로 별도 구성해야 합니다.
값이 있는 .replit/.env/세션/DB는 포함하지 않습니다.
Replit에서는 포함된 각 artifact.toml의 기존 관리형 서비스를 사용합니다.
로컬 개발: API는 PORT=8080 pnpm --filter @workspace/api-server dev,
웹은 PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career dev.
중앙 운영 endpoint나 비밀 설정은 추정해서 넣지 마세요.

검증: pnpm --filter @workspace/nuvia-career typecheck
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career build
QA 실제 명령/시각/PASS/FAIL/BLOCKED는 qa/RESULTS.md 및 docs의 최신 인계서 참조.
UI 합성 시험은 실제 결과지·LAB·플래너·SSO·운영 서버 검증이 아닙니다.

패치 적용: 기존 작업을 백업하고 manifest의 변경 파일 beforeSha256을 모두 대조합니다.
기준이 다르면 적용 중지. git apply --check career-dashboard.patch 후 git apply.
afterSha256도 대조합니다. 중앙본에 강제 적용/최신본을 이전 ZIP으로 덮어쓰기 금지.
실제 기준 파일 사본에 적용하고 모든 변경 파일 해시 일치를 확인한 패치입니다.
원격 푸시·운영 게시·운영 데이터 접근은 하지 않았습니다.
"""
    common = {"README.txt": readme.encode(),
              "MANIFEST.json": (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()}
    for p in ([] if args.planner else sorted(OUT.rglob("*"))):
        if p.is_file() and p.suffix.lower() in {".md", ".json", ".txt", ".log", ".pdf", ".docx", ".hwpx", ".png", ".jpg"} and p.name not in {"MANIFEST.json", "delivery.json"}:
            data = p.read_bytes()
            ensure_no_credentials(p.name, data)
            common["qa/" + str(p.relative_to(OUT))] = data
    additional = ROOT / "generated-artifacts/experience-unsaved-qa-20261118"
    if additional.exists() and not args.planner:
        for p in sorted(additional.rglob("*")):
            if p.is_file() and p.suffix.lower() in {".md", ".json", ".txt", ".log", ".png", ".jpg"}:
                data = p.read_bytes()
                ensure_no_credentials(p.name, data)
                common["qa/experience-unsaved/" + str(p.relative_to(additional))] = data
    output = OUT
    if args.review or args.planner:
        output = ROOT / (f"generated-artifacts/{args.adult_evidence_dir or 'nuvia-review-adult-qa'}" if args.adult else
                         "generated-artifacts/nuvia-review-planner-qa" if args.planner else "generated-artifacts/nuvia-review-demo-qa")
        assert (output / "RESULTS.md").exists(), "Review demo QA results must exist"
        for p in sorted(output.rglob("*")):
            if p.is_file() and p.suffix.lower() in {".md", ".json", ".txt", ".log", ".pdf", ".docx", ".hwpx", ".png", ".jpg"} \
                    and p.name not in {"MANIFEST.json", "delivery.json"}:
                data = p.read_bytes()
                ensure_no_credentials(p.name, data)
                common["qa/" + ("review-adult/" if args.adult else "review-planner/" if args.planner else "review-demo/") + str(p.relative_to(output))] = data
    full = {**common, **{"source/" + n: data for n, data in current.items()}}
    delta = {**common, "career-dashboard.patch": bytes(patch),
             **{"source/" + n: current[n] for n in changes if n in current}}
    result = {"runtimeFingerprintSha256": fingerprint, "files": len(records), "changedFiles": len(changes)}
    bundles = [("full-source", full), ("delta-patch", delta)]
    if args.planner:
        bundles.append(("qa-evidence", common))
    for kind, entries in bundles:
        name = f"nuvia-career-{kind}-{args.tag}.zip"
        result[kind] = {"file": str((output / name).relative_to(ROOT)), "sha256": archive(output / name, entries), "bytes": (output / name).stat().st_size}
    (output / "MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (output / "delivery.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
