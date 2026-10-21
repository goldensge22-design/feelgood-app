"""Package the current source, preserving the historical daily-note ZIP."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import zipfile

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("source_policy", HERE / "package-daily-note-final.py")
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
ROOT = policy.ROOT
OUT = ROOT / "generated-artifacts/nuvia-studio"
QA = ROOT / "generated-artifacts/studio-nav-15"
NAME = "NUVIA_STUDIO_NAV_15LOCALES_20261021_FULL_SOURCE"


def main():
    archive = OUT / (NAME + ".zip")
    if archive.exists():
        raise RuntimeError("Refusing to overwrite existing ZIP: " + archive.name)
    payload = {}
    for folder in policy.SOURCE_ROOTS + [".github"]:
        for current, dirs, files in os.walk(ROOT / folder, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in policy.BLOCK_DIRS and not (Path(current) / d).is_symlink())
            for name in sorted(files):
                p = Path(current) / name
                if policy.allowed(p):
                    payload[p.relative_to(ROOT).as_posix()] = p.read_bytes()
    for name in policy.ROOT_FILES + ["README.md", "LICENSE", "LICENSE.md", ".nvmrc", ".node-version"]:
        p = ROOT / name
        if p.is_file() and not p.is_symlink():
            payload[name] = p.read_bytes()
    baseline = policy.git("rev-parse", "HEAD")
    tree = {}
    for row in policy.git("ls-tree", "-rz", baseline).split("\0"):
        if row:
            meta, path = row.split("\t", 1)
            tree[path] = meta.split()[2]
    changed = []
    for path, data in sorted(payload.items()):
        oid = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()
        if tree.get(path) != oid:
            changed.append(path)
    protected = ("artifacts/api-server/", "artifacts/mockup-sandbox/",
                 "artifacts/nuvia-ui-review/src/official/", "artifacts/nuvia-ui-review/src/before/",
                 "artifacts/nuvia-ui-review/src/enhancement/", "artifacts/nuvia-ui-review/src/personal/",
                 "artifacts/nuvia-ui-review/src/studio/i18n/locales/")
    if any(p.startswith(protected) or p.endswith("/i18n/note-resources.json") for p in changed):
        raise RuntimeError("Unexpected protected source or translation change; stopped")
    if any(p.startswith("artifacts/") and p != "artifacts/nuvia-ui-review/src/studio/studio.css" for p in changed):
        raise RuntimeError("Navigation handoff expects CSS-only app changes; stopped")
    qa = {}
    for name in ("automatic.log", "QA_BROWSER.md", "matrix.json"):
        p = QA / name
        if not p.is_file():
            raise RuntimeError("Missing actual QA evidence: " + name)
        qa["handoff/navigation-qa/" + name] = p.read_bytes()
    for path, data in {**payload, **qa}.items():
        if any(re.search(pattern, data) for pattern in policy.SECRET_PATTERNS):
            raise RuntimeError("Credential-shaped content detected; stopped at " + path)
    entries = [{"path": p, "bytes": len(v), "sha256": hashlib.sha256(v).hexdigest()}
               for p, v in sorted(payload.items())]
    snapshot = hashlib.sha256(json.dumps(entries, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    manifest = {
        "sourceGitHead": baseline, "sourceGitHeadIsBaselineNotFinalCommit": bool(changed),
        "sourceSnapshotSHA256": snapshot, "workingTreeSourceChanges": changed,
        "sourceEntries": entries,
        "sourceSnapshotDefinition": "SHA256 of UTF-8 canonical JSON sorted source entries; excludes generated README, manifest and QA attachments.",
        "qaEntries": [{"path": p, "bytes": len(v), "sha256": hashlib.sha256(v).hexdigest()} for p, v in sorted(qa.items())],
    }
    readme = f"""# NUVIA Studio — 15-locale navigation source snapshot

## Source identity
- Source Git HEAD (baseline, not necessarily final commit): `{baseline}`
- Current working-tree source snapshot SHA-256: `{snapshot}`
- Exact per-file hashes and differences from HEAD: SOURCE_MANIFEST.json.
- Includes the current Azerbaijani correction, ko/mn wrapping, daily note and this all-locale navigation fix.
- No commit, branch merge, push, publication or deployment was performed by this packaging tool.

## Scope and data protection
Current artifacts/, lib/, scripts/, tools/, docs/, .github/ (if present), root package/lock/workspace/TypeScript/Replit configuration and source assets are included. Official/legacy/result-related and other application source dependencies are copies, not modified by this navigation change.
Synthetic fixtures embedded in source are included. Existing locale JSON values and daily-note translations are unchanged from the stated HEAD. Translations retain their AI-draft/native-review limitations.
Excluded: .git, .agents, .local, secrets/.env, credentials/private keys, personal uploads/DB/storage/session/user backups, node_modules, dist/build outputs/caches, generated-artifacts, screenshots and attached originals.
Only the explicitly selected synthetic navigation QA files are attached under handoff/navigation-qa/. Known credential patterns are rejected, not printed; this is not a substitute for external security review.
The previous NUVIA_STUDIO_DAILY_NOTE_FINAL.zip is not overwritten or updated.

## Reproduce
Extract into a NEW empty directory, not over an operating product.
Use the repository's Node/pnpm configuration:
```
pnpm install --frozen-lockfile
pnpm run typecheck:libs
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review dev
```
Open http://localhost:24422/studio.html?demo=school (or university/enterprise).
Studio itself uses browser storage; no actual result server, login or device sync is provided.
```
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-external-demo-check.mjs
pnpm --filter @workspace/nuvia-ui-review typecheck
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review build
```

## QA and limitations
Actual commands/results and per-locale browser matrix are attached, not inferred. See docs/STUDIO_NAVIGATION_15LOCALES.md and handoff/navigation-qa/.
Physical iPhone/Safari is distinct from a desktop browser viewport test. Existing report sandbox warnings, bundle-size/comparison-script warnings, historic unrelated baseline mismatches and lack of native-language review are not declared resolved.
No claim of actual student research, efficacy, real result-service integration or full operating-system compatibility is made.

## GitHub handoff / rollback
Import into a separate working branch. Compare against the developer's current integration baseline first; stop on conflicts rather than force-overwriting. Do not replace official result contracts or reset browser records.
This navigation fix is CSS-only in artifacts/nuvia-ui-review/src/studio/studio.css. To undo just this fix, restore that file's prior navigation rules from the stated baseline after reviewing any later changes; no data migration or record reset is needed.
The ZIP is a source snapshot, not Git history and not proof of a GitHub remote commit. SOURCE_MANIFEST records any uncommitted additions. Keep personal JSON backups outside the public repository.
"""
    files = {**payload, **qa, "README_NAVIGATION_SOURCE.md": readme.encode(),
             "SOURCE_MANIFEST.json": (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()}
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 21, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o755 if name.endswith(".sh") else 0o644) << 16
            z.writestr(info, data)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert set(z.namelist()) == set(files)
        for path, data in files.items():
            assert z.read(path) == data
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    result = {"zip": str(archive.relative_to(ROOT)), "bytes": archive.stat().st_size,
              "files": len(files), "sourceGitHead": baseline, "sourceSnapshotSHA256": snapshot,
              "zipSHA256": digest, "workingTreeSourceChanges": changed}
    (OUT / (NAME + ".sha256")).write_text(digest + "  " + archive.name + "\n")
    (OUT / (NAME + "_README.md")).write_text(readme)
    (OUT / (NAME + "_MANIFEST.json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (OUT / (NAME + "_RESULT.json")).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
