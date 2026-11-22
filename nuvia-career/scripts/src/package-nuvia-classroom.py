"""Fresh classroom AI source + exact-base patch, synthetic evidence only.

Run: python scripts/src/package-nuvia-classroom.py
No network, credentials, database, deployment or Git index writes.
"""
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASYNC = "--async" in sys.argv
SHARED = "--shared" in sys.argv or ASYNC
HISTORY = ROOT / "generated-artifacts/nuvia-classroom"
OUT = ROOT / ("generated-artifacts/nuvia-async-ai" if ASYNC else "generated-artifacts/nuvia-shared-ai" if SHARED else "generated-artifacts/nuvia-classroom")
BASE = "b82c46342cf9e03b24b94ff7e66f109b0ec39201"
sha = lambda data: hashlib.sha256(data).hexdigest()
def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)

excluded = {".git", "node_modules", "dist", "build", ".cache", ".vite", ".vite-temp", "generated-artifacts", "coverage"}
def allowed(path):
    if not path.is_file() or path.is_symlink():
        return False
    rel = path.relative_to(ROOT)
    if any(part in excluded for part in rel.parts) or path.name.startswith(".env"):
        return False
    if path.suffix in {".log", ".sqlite", ".db", ".dump", ".har", ".tsbuildinfo"}:
        return False
    if re.search(r"(?:storage[-_]?state|cookies|session[-_]?data|credentials|id_rsa)", path.name, re.I):
        return False
    if rel.parts[0] == "artifacts":
        sub = Path(*rel.parts[2:]).as_posix()
        return sub.startswith(("src/", "public/")) or sub in {
            ".replit-artifact/artifact.toml", "package.json", "tsconfig.json", "build.mjs",
            "vite.config.ts", "components.json", "index.html", "public-guide.ts",
        }
    return True

old = json.loads((ROOT / "generated-artifacts/nuvia-managed-ai/source-manifest.json").read_text())
names = {item["path"] for item in old["sourceFiles"]}
for directory in ("artifacts/nuvia-career", "artifacts/api-server", "lib/api-spec", "lib/api-client-react", "lib/api-zod", "lib/db"):
    names.update(p.relative_to(ROOT).as_posix() for p in (ROOT / directory).rglob("*") if allowed(p))
names.update(("docs/nuvia-classroom-ai-handoff.md", "docs/nuvia-classroom-ai-qa.md", "scripts/src/package-nuvia-classroom.py"))
if ASYNC: names.update(("docs/nuvia-async-ai-handoff.md", "docs/nuvia-async-ai-qa.md"))
names = sorted(name for name in names if allowed(ROOT / name))
entries = [{"path": name, "sha256": sha((ROOT / name).read_bytes())} for name in names]
runtime = [e for e in entries if e["path"].startswith(("artifacts/api-server/src/", "artifacts/nuvia-career/src/", "lib/api-", "lib/db/")) and not e["path"].endswith((".test.ts", "-live-check.ts", "-qa.ts", "-load.ts"))]
fingerprint = sha("".join(f'{e["path"]} {e["sha256"]}\n' for e in runtime).encode())
base_tree = {}
for item in git("ls-tree", "-r", "-z", BASE).split(b"\0"):
    if item:
        meta, name = item.split(b"\t", 1)
        base_tree[name.decode()] = meta.split()[2].decode()
blob = lambda data: hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
changed = [name for name in names if base_tree.get(name) != blob((ROOT / name).read_bytes())]
patch = bytearray()
mods = [name for name in changed if name in base_tree]
if mods:
    patch.extend(git("diff", "--binary", BASE, "--", *mods))
for name in changed:
    if name not in base_tree:
        process = subprocess.run(["git", "diff", "--no-index", "--binary", "--", "/dev/null", name], cwd=ROOT, capture_output=True)
        assert process.returncode in (0, 1), name
        patch.extend(process.stdout)
OUT.mkdir(parents=True, exist_ok=True)
# Report measured tokens separately from classroom planning assumptions. No prices
# or operational billing data are inferred from an unrelated account balance.
coach = json.loads((HISTORY / "live-model-coach-final.json").read_text())
draft = json.loads((HISTORY / "live-model-retest.json").read_text())
initial = json.loads((HISTORY / "live-model.json").read_text())
unit_tokens = {
    "coach": {k: coach["totals"][k] for k in ("inputTokens", "outputTokens", "cachedInputTokens")},
    "draft": {k: draft["totals"][k] for k in ("inputTokens", "outputTokens", "cachedInputTokens")},
}
plans = []
for jobs in (1, 2):
    for each in (1, 2):
        inp = 55 * jobs * each * sum(v["inputTokens"] for v in unit_tokens.values())
        output = 55 * jobs * each * sum(v["outputTokens"] for v in unit_tokens.values())
        plans.append({"students": 55, "jobsPerStudent": jobs, "coachCallsPerJob": each, "draftCallsPerJob": each,
                      "assumedUniqueSuccessfulCalls": 55 * jobs * each * 2, "estimatedInputTokens": inp,
                      "estimatedOutputTokens": output, "estimatedTotalTokens": inp + output})
budget = {
    "generatedAt": datetime.now(timezone.utc).isoformat(), "measuredModel": "gpt-5.6-luna",
    "measuredConnection": "Replit managed development; NOT production BYOK",
    "measuredPerRequest": unit_tokens, "measuredSampleSize": "one final successful coach, one final successful draft; not a statistical token distribution",
    "allActualPaidAttemptCountThisTask": sum(v["totals"]["providerCalls"] for v in (initial, coach, draft)),
    "allReportedTokensIncludingInitialInvalidResponse": sum(v["totals"]["inputTokens"] + v["totals"]["outputTokens"] for v in (initial, coach, draft)),
    "finalSuccessfulSameAccountCacheHits": coach["totals"]["cacheHits"] + draft["totals"]["cacheHits"],
    "assumptions": plans,
    "notIncluded": ["optional analyze/voice calls (not newly live-tested)", "changed content needing new generations", "failures/retries without supplier usage", "actual production model/provider token distribution"],
    "contingency": "For two jobs with two coach + two draft calls/job, allow 20% additional unique attempts: 528 calls, about 939840 tokens at this sample mix. This is an assumption, not billing.",
    "appCeiling": "Shared PostgreSQL scope: fixed five-hour window 1100 supplier attempts including retries across ALL replicas/restarts; per owner 30 unique requests/5h and 8/min. Concurrency 4, 2-second starts. Not a per-process allowance and not a dollar cap. Polling/recovery do not consume supplier calls.",
    "dollarCost": None, "priceVerified": False,
    "costFormula": "(uncached input tokens * input $/1M + cached input tokens * cached-input $/1M + output tokens * output $/1M) / 1,000,000",
    "warning": "Production operator must use the actual BYOK project, selected model, prices, usage and spend limits. User confirmed Personal organization and successful question/draft/V2 after approved $5 top-up. Earlier $0/unknown-organization observation is historical, not the present diagnosis. No billing changes made by Agent.",
}
(OUT / "budget.json").write_text(json.dumps(budget, ensure_ascii=False, indent=2))
load = json.loads((HISTORY / "realistic-load.json").read_text())
browser = json.loads((HISTORY / "browser/targeted-retest-ko.json").read_text())
tap = (HISTORY / "mock-load-byok-final.tap").read_text()
summary = {
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "sourceCommit": git("rev-parse", "HEAD").decode().strip(), "runtimeFingerprintSha256": fingerprint,
    "status": "WORKSPACE_PATCH_VERIFIED_OPERATIONAL_SHARED_BOUNDARY_BLOCKED",
    "mockServiceTests": {"pass": int(re.search(r"pass (\d+)", tap)[1]), "fail": int(re.search(r"fail (\d+)", tap)[1]), "file": "mock-load-byok-final.tap"},
    "localeChecks": {"locales": 15, "newMessagesPerLocale": 8, "pass": 1, "fail": 0, "kind": "key/content presence, not native review"},
    "realisticMockLoad": [{"scenario": r["scenario"], "pass": r["pass"], "fail": r["fail"], "providerCalls": r["providerCalls"],
                           "wait": r["wait"], "endToEnd": r["endToEnd"], "inFlightJoins": r["inFlightJoins"], "cacheHits": r["cacheHits"]} for r in load["scenarios"]],
    "realisticLoadTime": {"begunAt": load["begunAt"], "finishedAt": load["finishedAt"]},
    "multiProcess": load["processBoundary"],
    "browserTargetedRetest": {"pass": sum(r["pass"] == "pass" for r in browser["cases"]),
                             "fail": sum(r["pass"] != "pass" for r in browser["cases"]), "at": browser["generatedAt"],
                             "scopedUnrun": browser["unrun"], "realAiCalls": 0},
    "liveModel": {"actualAttempts": budget["allActualPaidAttemptCountThisTask"], "initialPass": 1, "initialFail": 1,
                  "finalQuestionPass": 1, "finalDraftPass": 1, "sameContentReusePass": 2,
                  "reportedTokensIncludingFailedResponse": budget["allReportedTokensIncludingInitialInvalidResponse"],
                  "lastAt": coach["checkedAt"], "connection": "managed development, not production BYOK"},
    "finalDelta": "After live model checks: explicit managed/BYOK settings branch and model-error classification were added and mocked/unit checked, unchanged managed prompt/schema/caps; no further paid calls. After browser retest: REQUEST_TOO_LARGE/413 aliases to existing tested input-limit branch and spec error description only; final typecheck/build performed, no broad browser rerun.",
    "coreUnresolvedBugs": [],
    "operationalBlockers": ["Unverified nuvia.feel-good.io/career origin and actual BYOK model/quota/billing identity",
                            "Process-local idempotency and budgets do not survive restart/multi-process operation",
                            "Production HTTP/proxy timeout and actual 55-user SSO/session/database load not tested"],
    "separateUnrun": ["Production direct OpenAI call/model compatibility", "55 real authenticated browsers", "Word/Hancom native opening",
                      "DOCX/HWPX new browser regression in this task (existing exporter source unchanged)", "native-speaker review",
                      "Arabic error-state screen matrix; only RTL switch checked", "all 45 language-size journeys"],
    "prohibitedActionsNotPerformed": ["public deployment", "billing/auto-recharge changes", "production secret modification", "GitHub push"],
}
(OUT / "qa-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
shared_patch = None
if SHARED:
    # The previous ZIP remains immutable. Build an exact delta from its source
    # bytes, not an uncommitted HEAD or an assumed historical source revision.
    previous_zip = HISTORY / "nuvia-classroom-ai-55-handoff-20261115.zip"
    assert sha(previous_zip.read_bytes()) == "54ad6fe89ef83813012bd81a92f6ab3fddf8c3bbccf5b9d8b621d6fcdeac393d"
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir); before = temp / "before"; after = temp / "after"
        before.mkdir(); after.mkdir()
        with zipfile.ZipFile(previous_zip) as z:
            for file in z.namelist():
                if file.startswith("source/") and not file.endswith("/"):
                    rel = file[len("source/"):]
                    dest = before / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(z.read(file))
        for name in names:
            dest = after / name; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes((ROOT / name).read_bytes())
        diff = subprocess.run(["git", "diff", "--no-index", "--binary", "before", "after"], cwd=temp, capture_output=True)
        assert diff.returncode in (0, 1)
        lines = diff.stdout.splitlines(keepends=True)
        for n, line in enumerate(lines):
            if line.startswith((b"diff --git ", b"--- ", b"+++ ")):
                for prefix in (b"a/before/", b"a/after/"): line = line.replace(prefix, b"a/")
                for prefix in (b"b/before/", b"b/after/"): line = line.replace(prefix, b"b/")
                lines[n] = line
        shared_patch = b"".join(lines)
        shared_patch_path = OUT / "since-classroom-54ad6fe-shared.patch"
        shared_patch_path.write_bytes(shared_patch)
        trial = temp / "trial"; shutil.copytree(before, trial)
        subprocess.run(["git", "apply", "--check", str(shared_patch_path)], cwd=trial, check=True, capture_output=True)
        subprocess.run(["git", "apply", str(shared_patch_path)], cwd=trial, check=True, capture_output=True)
        for entry in entries: assert sha((trial / entry["path"]).read_bytes()) == entry["sha256"], entry["path"]
    shared_history = ROOT / "generated-artifacts/nuvia-shared-ai" if ASYNC else OUT
    latest = json.loads((shared_history / "shared-qa.json").read_text())
    targeted = json.loads((shared_history / "shared-targeted-retest.json").read_text())
    ui = json.loads((shared_history / "shared-browser.json").read_text())
    final_checks = {r["name"]: r for r in latest["checks"]}
    final_checks.update({r["name"]: r for r in targeted["checks"]})
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(), "sourceCommit": git("rev-parse", "HEAD").decode().strip(),
        "runtimeFingerprintSha256": fingerprint, "workingTree": "uncommitted cumulative feature source; see manifest",
        "status": "SHARED_COORDINATION_WORKSPACE_VERIFIED_NOT_DEPLOYED",
        "latestSharedServiceChecks": list(final_checks.values()),
        "counts": {"pass": sum(r["status"] == "pass" for r in final_checks.values()),
                   "fail": sum(r["status"] == "fail" for r in final_checks.values())},
        "initialFailureAndRetest": "Queued recovery observation window was shorter than worker startup; test synchronization widened, targeted retest passed. Runtime coordinator unchanged.",
        "multiProcess": latest["reports"], "targeted": targeted["reports"], "browser": ui,
        "additionalRealAiCalls": 0, "previousStage": {
            "liveTokens": budget["allReportedTokensIncludingInitialInvalidResponse"],
            "actualAttempts": budget["allActualPaidAttemptCountThisTask"],
            "label": "Historical development managed calls ONLY, no new actual calls in shared-coordination stage",
        },
        "separateUnverified": ["production deployment/origin", "production gateway/55 real authenticated browsers", "Word/Hancom opening", "native-speaker review"],
        "userReportedOperation": "Personal organization; approved $5 top-up; one question + one draft + reviewed V2 save successful. Not independently called/verified by Agent.",
        "noChanges": ["production deployment", "keys/billing/autorecharge", "GitHub push", "original student tables/data"],
    }
    assert summary["counts"]["fail"] == 0
    (OUT / "qa-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    budget["additionalActualCallsSharedStage"] = 0
    budget["previousStageActualAttempts"] = budget.pop("allActualPaidAttemptCountThisTask")
    budget["previousStageReportedTokensIncludingInvalidResponse"] = budget.pop("allReportedTokensIncludingInitialInvalidResponse")
    (OUT / "budget.json").write_text(json.dumps(budget, ensure_ascii=False, indent=2))
async_patch = None
if ASYNC:
    previous_shared = ROOT / "generated-artifacts/nuvia-shared-ai/nuvia-classroom-shared-ai-55-handoff-20261115.zip"
    assert sha(previous_shared.read_bytes()) == "88a0761a35fa0fca6c5963badf904ae049c3b6cdf83802d18d9e74e3a672582c"
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir); before = temp / "before"; after = temp / "after"
        before.mkdir(); after.mkdir()
        with zipfile.ZipFile(previous_shared) as z:
            for file in z.namelist():
                if file.startswith("source/") and not file.endswith("/"):
                    rel = file[len("source/"):]
                    dest = before / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(z.read(file))
        for name in names:
            dest = after / name; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes((ROOT / name).read_bytes())
        diff = subprocess.run(["git", "diff", "--no-index", "--binary", "before", "after"], cwd=temp, capture_output=True)
        assert diff.returncode in (0, 1)
        lines = diff.stdout.splitlines(keepends=True)
        for n, line in enumerate(lines):
            if line.startswith((b"diff --git ", b"--- ", b"+++ ")):
                for prefix in (b"a/before/", b"a/after/"): line = line.replace(prefix, b"a/")
                for prefix in (b"b/before/", b"b/after/"): line = line.replace(prefix, b"b/")
                lines[n] = line
        async_patch = b"".join(lines); async_path = OUT / "since-shared-88a0761-async.patch"
        async_path.write_bytes(async_patch)
        trial = temp / "trial"; shutil.copytree(before, trial)
        subprocess.run(["git", "apply", "--check", str(async_path)], cwd=trial, check=True, capture_output=True)
        subprocess.run(["git", "apply", str(async_path)], cwd=trial, check=True, capture_output=True)
        for entry in entries: assert sha((trial / entry["path"]).read_bytes()) == entry["sha256"], entry["path"]
    async_report = json.loads((OUT / "async30-final.json").read_text())
    async_ui = json.loads((OUT / "async-browser.json").read_text())
    async_tap = (OUT / "async-fast.tap").read_text()
    assert async_report["counts"]["fail"] == 0
    assert async_ui["summary"]["afterFixTargeted"]["switchRuns"] == "3/3 pass"
    assert async_ui["summary"]["afterFixTargeted"]["queuedReload360"] == "pass"
    assert async_ui["realAiCalls"] == 0 and async_ui["mockOnly"] is True
    assert async_report["serviceSha256"] == sha((ROOT / "artifacts/api-server/src/lib/career-ai-shared.ts").read_bytes())
    summary = {
        "generatedAt": datetime.now(timezone.utc).isoformat(), "sourceCommit": git("rev-parse", "HEAD").decode().strip(),
        "runtimeFingerprintSha256": fingerprint, "workingTree": "uncommitted cumulative source, exact files/hashes in manifest",
        "status": "ASYNC_QUEUE_MOCK_QA_VERIFIED_NOT_PRODUCTION_DEPLOYED",
        "async30": async_report, "fastMockChecks": {"pass": int(re.search(r"pass (\d+)", async_tap)[1]),
                                                  "fail": int(re.search(r"fail (\d+)", async_tap)[1])},
        "browser": async_ui, "additionalActualAiCalls": 0,
        "previousEvidence": "Prior 12.5-second shared-coordination and managed-model results are historical, not this 30-second QA.",
        "initialFailure": "Initial load harness closed a worker DB pool when its own client subset completed while it still owned other clients' supplier work. Corrected to retain workers until whole shared cohort is terminal; actual crash uncertainty guard was not bypassed.",
        "unverified": ["production origin/proxy/OpenAI throughput/55 real logins", "Word/Hancom native opening", "native-speaker review"],
    }
    (OUT / "qa-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    budget["additionalActualCallsAsyncStage"] = 0
    budget["waitingPolicy"] = "Accepted queued/running work is automatically polled across refresh/reconnect. No 180s/200s total failure for normal async queues; per supplier call timeout remains 45s."
    (OUT / "budget.json").write_text(json.dumps(budget, ensure_ascii=False, indent=2))
patch_file = OUT / "since-b82c463-classroom.patch"
patch_file.write_bytes(patch)
with tempfile.TemporaryDirectory(prefix="nuvia-classroom-apply-") as temp:
    temp = Path(temp)
    with tarfile.open(fileobj=io.BytesIO(git("archive", BASE))) as archive:
        archive.extractall(temp, filter="data")
    subprocess.run(["git", "apply", "--check", str(patch_file)], cwd=temp, check=True, capture_output=True)
    subprocess.run(["git", "apply", str(patch_file)], cwd=temp, check=True, capture_output=True)
    for e in entries:
        assert sha((temp / e["path"]).read_bytes()) == e["sha256"], e["path"]
changes = [{"path": name, "beforeSha256": sha(git("show", f"{BASE}:{name}")) if name in base_tree else None,
            "afterSha256": sha((ROOT / name).read_bytes())} for name in changed]
# Rebuild a standalone latest patch from the previously read actual GitHub base.
# No network or remote mutation. Protected remote rules remain byte-identical.
prior = ROOT / "generated-artifacts/nuvia-korean-final"
remote = json.loads((prior / "github-write-blocked.json").read_text())
remote_tree = {e["path"]: e for e in remote["baseTree"]}
assert remote["remoteCommit"] == "f051942eef7487157c5ad1bfea6125f068bc0ae2"
protected = ["AGENTS.md", "docs/AI_PERSONALIZED_STAR_SPEC.md", "docs/COMPANY_SHARING_EVIDENCE_RULES.md"]
with tempfile.TemporaryDirectory(prefix="nuvia-classroom-github-copy-") as temp:
    temp = Path(temp)
    before, after = temp / "before", temp / "after"
    before.mkdir(); after.mkdir()
    expected = {}
    for name in names:
        rel = "nuvia-career/" + name
        data = (ROOT / name).read_bytes()
        dest = after / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(data)
        expected[rel] = sha(data)
        if rel in remote_tree:
            cached = (prior / "github-base-f051" / rel).read_bytes()
            assert blob(cached) == remote_tree[rel]["sha"], rel
            dest = before / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(cached)
    for name in protected:
        rel = "nuvia-career/" + name
        data = (prior / "preserved-rules" / rel).read_bytes()
        assert blob(data) == remote_tree[rel]["sha"]
        expected[rel] = sha(data)
        for folder in (before, after):
            dest = folder / rel; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(data)
    diff = subprocess.run(["git", "diff", "--no-index", "--binary", "before", "after"], cwd=temp, capture_output=True)
    assert diff.returncode in (0, 1)
    lines = diff.stdout.splitlines(keepends=True)
    for n, line in enumerate(lines):
        if line.startswith((b"diff --git ", b"--- ", b"+++ ")):
            for prefix in (b"a/before/", b"a/after/"):
                line = line.replace(prefix, b"a/")
            for prefix in (b"b/before/", b"b/after/"):
                line = line.replace(prefix, b"b/")
            lines[n] = line
    github_patch = b"".join(lines)
    github_patch_file = OUT / "github-f051942-classroom-latest.patch"
    github_patch_file.write_bytes(github_patch)
    trial = temp / "trial"; shutil.copytree(before, trial)
    subprocess.run(["git", "apply", "--check", str(github_patch_file)], cwd=trial, check=True, capture_output=True)
    subprocess.run(["git", "apply", str(github_patch_file)], cwd=trial, check=True, capture_output=True)
    for name, digest in expected.items():
        assert sha((trial / name).read_bytes()) == digest, name
manifest = {
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "sourceCommit": git("rev-parse", "HEAD").decode().strip(), "baseCommit": BASE,
    "workingTreeStatus": git("status", "--short").decode(),
    "runtimeFingerprintSha256": fingerprint, "fingerprintAlgorithm": "SHA256 of sorted '<path> <sha256>\\n' runtime source entries",
    "sourceFiles": entries, "changes": changes, "patchSha256": sha(patch),
    "copyApply": {"check": "pass", "apply": "pass", "sourceHashesCompared": len(entries), "allMatch": True},
    "githubBaseCopyApply": {"base": remote["remoteCommit"], "freshRemoteRead": False, "sourceAndProtectedHashesCompared": len(expected),
                           "allMatch": True, "patchSha256": sha(github_patch)},
    "github": "Not pushed; last authorized integration write was denied. No new remote check/push in this task.",
    "deployment": "Not performed; nuvia.feel-good.io/career origin and production multi-instance behaviour unverified.",
}
if SHARED:
    manifest["previousClassroomZipCopyApply"] = {"baseZipSha256": sha(previous_zip.read_bytes()), "patchSha256": sha(shared_patch),
                                               "sourceHashesCompared": len(entries), "allMatch": True}
if ASYNC:
    manifest["previousSharedZipCopyApply"] = {"baseZipSha256": sha(previous_shared.read_bytes()), "patchSha256": sha(async_patch),
                                            "sourceHashesCompared": len(entries), "allMatch": True}
(OUT / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
zip_path = OUT / ("nuvia-classroom-async-ai-55-handoff-20261115.zip" if ASYNC else "nuvia-classroom-shared-ai-55-handoff-20261115.zip" if SHARED else "nuvia-classroom-ai-55-handoff-20261115.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for name in names:
        z.write(ROOT / name, "source/" + name)
    z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
    z.writestr("patch/since-b82c463-classroom.patch", patch)
    z.writestr("patch/github-f051942-classroom-latest.patch", github_patch)
    if SHARED:
        z.writestr("patch/since-classroom-54ad6fe-shared.patch", shared_patch)
    if ASYNC:
        z.writestr("patch/since-shared-88a0761-async.patch", async_patch)
    for name in protected:
        z.write(prior / "preserved-rules/nuvia-career" / name, "preserved-remote-rules/nuvia-career/" + name)
    z.writestr("APPLY.md",
        "# 수업용 AI 누적 패치 적용\n\n"
        + ("긴 대기 자동 수신 수정본: 직전 공유 패키지 88a0761…를 적용했다면 patch/since-shared-88a0761-async.patch만 적용하세요. "
           "이전 기준 패치와 중복 적용하지 마세요. 사본 적용·전체 해시 비교 완료. docs/nuvia-async-ai-handoff.md가 최신 동작 설명입니다.\n\n" if ASYNC else "")
        + ("공유 조정 수정본: 이전 54ad6fe ZIP 소스를 적용했다면 `patch/since-classroom-54ad6fe-shared.patch`만 사용하세요. "
           "사본 check/apply와 전체 해시 대조를 완료했습니다. 다른 두 패치와 중복 적용하지 마세요. "
           "새 DB 테이블 3개·동일 SESSION_SECRET·공유 DB·전 복제본 새 경로 적용 조건을 handoff에서 확인하세요. 운영 스키마/배포는 이번에 적용하지 않았습니다.\n\n" if SHARED else "")
        +
        f"정확한 기준: {BASE}. 먼저 변경/학생 기록을 보존하세요.\n\n"
        "이 ZIP의 source/는 최신 전체 소스 사본입니다. 이전 ZIP으로 현재 작업본을 덮어쓰지 마세요.\n"
        "이전 한국어 인계본 b82c463과 같은 원본에서 `git apply --check patch/since-b82c463-classroom.patch`, "
        "이어서 `git apply patch/since-b82c463-classroom.patch`를 실행하세요. 사본 적용 후 전체 소스 해시를 검증했습니다.\n"
        "대안: GitHub 기준이 아직 f051942(규칙 문서뿐)라면 저장소 루트에서 "
        "`git apply --check patch/github-f051942-classroom-latest.patch` 후 같은 파일을 `git apply` 하세요. "
        "실제 이전에 읽은 원격 소스 사본에 최신 전체 소스를 적용·해시 대조했으며, 이번에 원격을 다시 읽은 것은 아닙니다. "
        "두 패치는 서로 대안이므로 둘 다 적용하지 마세요. 새 로컬 작업 브랜치에서만 진행하고 "
        "main·다른 LAB·보호 규칙 3개를 덮어쓰지 마세요. 기준이 다르면 강제 적용하지 말고 비교하세요.\n"
        "본 ZIP은 원격 저장·운영 배포 증거가 아닙니다. 자세한 운영 공유 큐/영속 중복 방지 요구는 "
        "source/docs/nuvia-classroom-ai-handoff.md를 확인하세요. 비밀값은 안전한 환경 설정에서만 준비하세요.\n")
    # Only this run's explicitly synthetic evidence. Never package old generated directories.
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p != zip_path and p.suffix.lower() in {".json", ".tap", ".log", ".md", ".png", ".jpg", ".txt", ".docx", ".hwpx"}:
            if p.name in {"source-manifest.json", "delivery-verification.json", "package-result.log"} or re.search(r"cookie|session|storage.?state|credential|token", p.name, re.I):
                continue
            z.write(p, "qa/" + p.relative_to(OUT).as_posix())
    sums = [f"{sha(z.read(name))}  {name}" for name in z.namelist()]
    z.writestr("ALL_FILES_SHA256.txt", "\n".join(sums) + "\n")
with zipfile.ZipFile(zip_path) as z:
    hashes = z.read("ALL_FILES_SHA256.txt").decode().splitlines()
    for line in hashes:
        digest, name = line.split("  ", 1)
        assert sha(z.read(name)) == digest, name
    assert len(z.namelist()) == len(set(z.namelist()))
    bad = [name for name in z.namelist() if any(part in excluded | {".env"} for part in Path(name).parts[1:])]
    assert not bad, bad
    secret_patterns = re.compile(rb"(?:sk-(?:proj-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)")
    assert not [name for name in z.namelist() if secret_patterns.search(z.read(name))], "credential-like pattern found"
result = {"verifiedAt": datetime.now(timezone.utc).isoformat(), "zip": zip_path.relative_to(ROOT).as_posix(),
          "zipSha256": sha(zip_path.read_bytes()), "sourceCommit": manifest["sourceCommit"],
          "runtimeFingerprintSha256": fingerprint, "sourceFiles": len(entries), "changedFiles": len(changes),
          "allEntryHashesVerified": len(hashes), "copyApply": "pass", "forbiddenPaths": 0, "credentialPatternMatches": 0,
          "note": "Pattern scan is not a universal proof of no secrets; allowlist and synthetic-only evidence are primary boundaries."}
(OUT / "delivery-verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
(OUT / (zip_path.name + ".sha256")).write_text(f'{result["zipSha256"]}  {zip_path.name}\n')
print(json.dumps(result, ensure_ascii=False))
