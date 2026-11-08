NUVIA daily-practice additive source REVIEW CANDIDATE — NOT PUBLISHED
QA complete: True; inspect QA_STATUS.json and handoff/QA documents, not filename alone.
Base: e1209da854493369e664d8922509390d55a7f34f
Source fingerprint SHA256: 2834b2f55c9d3f46dc247e78af7d0494e39b4595f01ecccefdb79b1cb073d19f
This is NOT a full repository. Apply to a matching checkout on a work branch only.
Do NOT overwrite a newer developer integration. Any hash/new-path conflict must stop.
Preflight covers changed files only; unchanged result/server dependencies still need developer review.
Dry-run: python apply.py --root /path/to/checkout
Apply: python apply.py --root /path/to/checkout --apply --backup /outside/checkout/backup
Rollback: restore modified originals from that backup; remove only newly added listed paths.
No browser storage clear/migration. Old backup import stays supported by the new patch;
new practice-bearing backups may not import into an older app. Preserve them, never strip records.
Build prerequisites are the original workspace pnpm lock/config; no new package added.
QA/dev comparison: /practice-compare.html (not a production entry).
Ordinary preview: /library-demo.html?demo=university -> Plan -> Recommended practice.
Excluded: personal/browser/backups, secrets/.env, node_modules, builds/caches/.git,
other apps, unchanged official result/legacy sources, old artifacts and private records.
AI draft translations/content are NOT native/professionally reviewed or efficacy validated.
All dependencies and unchanged source must come from your baseline checkout.
