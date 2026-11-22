/**
 * Export an allowlisted source handoff; never copy the workspace wholesale.
 * This does NOT authenticate, commit, push, or claim remote GitHub success.
 */
import { readdir, readFile, mkdir, writeFile, copyFile, lstat, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const destination = path.resolve(process.argv[2] ?? 'generated-artifacts/github/feelgood-app/nuvia-career');
if (!destination.startsWith(path.join(root, 'generated-artifacts') + path.sep)) {
  throw new Error('Delivery output must remain inside ignored generated-artifacts/');
}
const directories = [
  'artifacts/nuvia-career/src', 'artifacts/nuvia-career/public',
  'artifacts/api-server/src', 'lib/api-client-react/src', 'lib/api-zod/src',
  'lib/db/src',
];
const files = [
  'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc',
  'tsconfig.json', 'tsconfig.base.json', '.gitignore', '.replitignore',
  'artifacts/nuvia-career/package.json', 'artifacts/nuvia-career/tsconfig.json',
  'artifacts/nuvia-career/vite.config.ts', 'artifacts/nuvia-career/index.html',
  'artifacts/nuvia-career/components.json',
  'artifacts/api-server/package.json', 'artifacts/api-server/tsconfig.json',
  'artifacts/api-server/build.mjs',
  'lib/api-client-react/package.json', 'lib/api-client-react/tsconfig.json',
  'lib/api-zod/package.json', 'lib/api-zod/tsconfig.json',
  'lib/db/package.json', 'lib/db/tsconfig.json', 'lib/db/drizzle.config.ts',
  'lib/api-spec/package.json', 'lib/api-spec/openapi.yaml', 'lib/api-spec/orval.config.ts',
  'scripts/package.json', 'scripts/tsconfig.json',
  'docs/nuvia-runbook.md', 'docs/nuvia-integration-contract.md', 'docs/nuvia-verification.md',
  'docs/nuvia-schema.sql',
];
for (const file of await readdir('scripts/src')) {
  if (/^nuvia-[a-z-]+\.ts$/.test(file)) files.push(`scripts/src/${file}`);
}
async function walk(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = `${directory}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink refused: ${name}`);
    if (entry.isDirectory()) await walk(name);
    else files.push(name);
  }
}
for (const directory of directories) await walk(directory);
const manifest: { path: string; sha256: string; bytes: number }[] = [];
for (const file of [...new Set(files)].sort()) {
  if (/(^|\/)(\.env(?:\..*)?|\.replit|\.git|node_modules|dist|\.agents)(\/|$)/.test(file)) {
    throw new Error(`Forbidden handoff path: ${file}`);
  }
  if (!(await lstat(file)).isFile()) throw new Error(`Not a regular file: ${file}`);
  const bytes = await readFile(file);
  // Avoid accidentally exporting a pasted private key or private Clerk token.
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk_(?:live|test)_[A-Za-z0-9]{15,}/.test(bytes.toString('utf8'))) {
    throw new Error(`Possible credential found; refusing to export ${file}`);
  }
  const out = path.join(destination, file);
  await mkdir(path.dirname(out), { recursive: true });
  await copyFile(file, out);
  manifest.push({ path: file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length });
}
await mkdir(path.join(destination, 'qa'), { recursive: true });
const qaSources: Record<string, string> = {
  'generated-artifacts/final-qa/summary.json': 'summary.json',
};
// Raw screenshots, downloads, browser traces and build/test logs stay ignored.
// The reviewed report and compact summary provide the requested QA handoff.
for (const name of [
  'device-journeys.json', 'edge-cases.json', 'document-results.json',
  'overlay-first-reproduction.json', 'overlay-observer-trace.json',
  'resize-stress-fixed.json', 'build.log', 'unit.log', 'locales.log',
  'demo-desktop.jpg', 'demo-arabic-360.jpg',
]) {
  await unlink(path.join(destination, 'qa', name)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
const missingEvidence: string[] = [];
for (const [input, name] of Object.entries(qaSources)) {
  const info = await lstat(input).catch(() => null);
  if (!info?.isFile()) { missingEvidence.push(name); continue; }
  await copyFile(input, path.join(destination, 'qa', name));
}
await writeFile(path.join(destination, 'qa/source-manifest.json'), JSON.stringify({
  schema: 1, scope: 'Allowlisted NUVIA career source only; not user data or external integration success',
  files: manifest, missingEvidence,
}, null, 2));
console.log(JSON.stringify({ destination, files: manifest.length, missingEvidence, remotePushPerformed: false }));
