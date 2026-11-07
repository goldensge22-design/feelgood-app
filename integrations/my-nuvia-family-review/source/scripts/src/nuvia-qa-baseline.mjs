import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
export const qaDir = 'generated-artifacts/nuvia-qa-full';
export async function fingerprint() {
  const files = [];
  async function walk(dir) {
    for (const e of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['node_modules', 'dist', '.git'].includes(e.name) || e.isSymbolicLink()) continue;
      const path = `${dir}/${e.name}`;
      if (e.isDirectory()) await walk(path); else files.push(path);
    }
  }
  for (const dir of ['artifacts/my-nuvia/src', 'artifacts/api-server/src', 'lib/api-spec', 'scripts/src']) await walk(dir);
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(await readFile(f));
  return { sha256: hash.digest('hex'), files: files.length, head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() };
}
if (process.argv[1]?.endsWith('nuvia-qa-baseline.mjs')) {
  await mkdir(qaDir, { recursive: true });
  const result = { at: new Date().toISOString(), baseline: await fingerprint(), status: execFileSync('git', ['status', '--short'], { encoding: 'utf8' }), scope: 'development fictional review only; no production' };
  await writeFile(`${qaDir}/${process.argv[2] ?? 'start'}.json`, JSON.stringify(result, null, 2));
  console.log('Recorded baseline', result.baseline.sha256);
}
