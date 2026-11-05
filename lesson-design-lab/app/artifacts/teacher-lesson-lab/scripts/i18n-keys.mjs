// Writes the exact Korean source-key lists translators must cover:
//   src/i18n/ui-source-keys.json  (static UI from codemod + authored data labels shown in UI)
//   src/i18n/job-source-keys.json (every authored string the card generator can emit)
import { createServer } from 'vite';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, resolve: { alias: { '@': path.join(root, 'src') } } });
try {
  const ws = await server.ssrLoadModule('/src/data/worksheets.ts');
  const dom = await server.ssrLoadModule('/src/lib/domain.ts');
  const cards = await server.ssrLoadModule('/src/lib/cards.ts');
  const diag = await server.ssrLoadModule('/src/lib/diagnostics.ts');
  const uiFile = path.join(root, 'src/i18n/ui-source-keys.json');
  const ui = new Set(JSON.parse(fs.readFileSync(uiFile, 'utf8')));
  const add = (x) => x && ui.add(x);
  Object.values(ws.STAGE_LABEL).forEach(add); ws.FAMILIES.forEach(add); Object.values(dom.DOMAIN_KO).forEach(add);
  cards.CARD_KINDS.forEach(add); Object.keys(cards.CAMP_TRACKS).forEach(add); dom.GENERAL_SUPPORTS.forEach(add);
  const conds = new Set();
  for (const st of ws.STAGES) for (const c of dom.allConditions().filter((x) => x.stage === st)) conds.add(c);
  const LV = ['H', 'M', 'L'];
  for (const st of ws.STAGES) { const p0 = dom.supportPlan(st, undefined); add(p0.note); p0.supports.forEach(add);
    for (const a of LV) for (const b of LV) for (const c of LV) for (const d of LV) { const p = dom.supportPlan(st, { verified: true, testName: 'x', version: 'x', criteria: 'x', levels: { planning: a, attention: b, simultaneous: c, sequential: d }, top5: [] }); add(p.note); p.supports.forEach(add); } }
  add(dom.supportPlan('middle', { verified: true, testName: 'x', version: 'x', criteria: 'x', levels: {}, top5: [] }).note);
  const stu = fs.readFileSync(path.join(root, 'src/pages/students.tsx'), 'utf8').match(/\{\[('계획 먼저[^\]]+)\]/);
  if (stu) stu[1].match(/'([^']+)'/g).forEach((x) => add(x.slice(1, -1)));
  // every remaining Korean string literal in UI source (module-level label tables rendered through T())
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['ui', 'i18n', 'data'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.tsx') ? [path.join(d, e.name)] : []));
  for (const f of walk(path.join(root, 'src'))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) { const v = m[1] ?? m[2]; if (/[\uac00-\ud7a3]/.test(v)) add(v.replace(/\\(.)/g, '$1')); }
  // The mode labels and grouping validation messages are authored outside TSX.
  for (const file of ['teaching.ts', 'materials.ts', 'material-print.ts', ...fs.readdirSync(path.join(root,'src/lib/studio')).filter((x)=>x.endsWith('.ts')).map((x)=>`studio/${x}`)]) {
    for (const m of fs.readFileSync(path.join(root, `src/lib/${file}`), 'utf8').matchAll(/'([^'\n]*)'/g)) {
      if (/[\uac00-\ud7a3]/.test(m[1])) add(m[1]);
    }
  }
  diag.runChecks().forEach((c) => { add(c.label); if (c.id !== 'i18n') add(c.detail); });
  fs.writeFileSync(uiFile, JSON.stringify([...ui].filter((x) => /[\uac00-\ud7a3]/.test(x)).sort(), null, 1));
  // job keys: run the generator for every job x stage x kind with lang 'xx' and record every lookup
  const jobs = new Set();
  const famJobs = Object.entries(dom.JOB_FAMILIES).flatMap(([f, js]) => js.map((j) => [f, j]));
  const goals = stu ? stu[1].match(/'([^']+)'/g).map((x) => x.slice(1, -1)) : [];
  const allSupports = [...ui].filter(Boolean);
  for (const st of ws.STAGES) for (const [family, job] of [...famJobs, ['', '']]) for (let k = 0; k < cards.CARD_KINDS.length; k++) {
    for (const task of ['', 'x']) {
      const s = { id: 'x', code: 'x', stage: st, grade: '', major: '', family, job, task, report: { verified: false, testName: '', version: '', criteria: '', levels: {}, top5: [] }, supports: [], practiceGoals: goals.slice(0, 2), prior: '', minutes: 50, teacherNote: '' };
      const m = new Set(); cards.generateFields(s, k, 'xx', m); m.forEach((x) => { if (!x.startsWith('worksheet:')) jobs.add(x); });
    }
  }
  goals.forEach((g) => jobs.add(g)); void allSupports;
  // supports that can land in help field
  for (const x of ui) if (dom.GENERAL_SUPPORTS.includes(x)) jobs.add(x);
  fs.writeFileSync(path.join(root, 'src/i18n/job-source-keys.json'), JSON.stringify([...jobs].sort(), null, 1));
  console.log('ui keys', ui.size, 'job keys', jobs.size);
} finally { await server.close(); }
