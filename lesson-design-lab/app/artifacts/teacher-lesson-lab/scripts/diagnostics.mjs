// Run: pnpm --filter @workspace/teacher-lesson-lab run diagnostics
// Automated content-structure checks only (not print/translation QA).
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = await createServer({ root, configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true }, resolve: { alias: { '@': path.join(root, 'src') } } });
let fail = 0;
try {
  const { runChecks } = await server.ssrLoadModule('/src/lib/diagnostics.ts');
  for (const c of runChecks()) {
    const tag = c.kind === 'human' ? 'PENDING(human)' : c.ok ? 'PASS' : 'FAIL';
    if (c.kind === 'auto' && !c.ok) fail++;
    console.log(`${tag.padEnd(15)} ${c.label} :: ${c.detail}`);
  }
} finally { await server.close(); }
process.exit(fail ? 1 : 0);
