import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Audit only. This does not add unsupported locales or mark fallback as translated.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ui=fs.readFileSync(path.join(root,'artifacts/nuvia-ui-review/src/studio/StudioApp.tsx'),'utf8');
const offered=[...ui.matchAll(/<option value="([a-zA-Z-]+)">/g)].map(m=>m[1]);
const target=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const rows=target.map(locale=>({
  locale,selectable:offered.includes(locale),
  result:!offered.includes(locale)?'blocked_not_implemented':locale==='ko'?'partial_source_only':'fail_incomplete_translation',
  coverage:'not_certified',
  browserQA:offered.includes(locale)?'requires_recorded_ui_evidence':'blocked_no_runtime_locale',
}));
console.log(JSON.stringify({scope:'Studio only, not the legacy Planner',targetCount:target.length,offered,rows,
  blockers:['UI strings remain hardcoded; no complete stable-key resource manifest',
    'Only task-entry English is complete within its small dictionary; this is not app-wide coverage',
    'Do not count Korean fallback as translated or use this audit as browser QA']},null,2));
if(process.argv.includes('--strict'))process.exitCode=1;
