/** Local-only control; no arbitrary JS, secret/cookie access or public port. */
import { connect } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const action = process.argv[2] ?? 'status';
if (!['status', 'run-authenticated-qa'].includes(action)) {
  throw new Error('Only status and run-authenticated-qa are supported');
}
const socket = connect(resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../generated-artifacts/scoped-qa/shared-browser.sock',
));
socket.setTimeout(action === 'status' ? 15000 : 300000, () => {
  console.error('QA control timed out; do not restart or lose the user browser.');
  socket.destroy(); process.exitCode = 1;
});
socket.on('connect', () => socket.write(`${JSON.stringify({ action })}\n`));
socket.on('data', chunk => process.stdout.write(chunk));
socket.on('error', () => {
  console.error('Shared browser control is unavailable. Check QA Shared Browser workflow.');
  process.exitCode = 1;
});
