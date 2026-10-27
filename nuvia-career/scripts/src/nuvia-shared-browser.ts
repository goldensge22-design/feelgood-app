/**
 * User-operated native browser for scoped authenticated QA.
 * No sign-in automation, tokens, account creation, public control ports or
 * persistent cookie export. The user signs in through the native VNC window.
 */
import { chromium, type Page } from 'playwright';
import { createServer } from 'node:net';
import { mkdir, chmod, unlink, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../generated-artifacts/scoped-qa');
const socketPath = resolve(out, 'shared-browser.sock');
const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain) throw new Error('Development host is unavailable');
const origin = `https://${domain}`;
await mkdir(out, { recursive: true });
await unlink(socketPath).catch((error: NodeJS.ErrnoException) => {
  if (error.code !== 'ENOENT') throw error;
});
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium',
  headless: false,
  args: ['--no-sandbox', '--window-size=1440,1000'],
});
const context = await browser.newContext({
  viewport: { width: 1400, height: 900 },
  acceptDownloads: true,
});
const initialPage = await context.newPage();
await initialPage.goto(`${origin}/sign-in?lang=ko`, { waitUntil: 'domcontentloaded' });
await initialPage.getByTestId('button-language').waitFor();
await initialPage.screenshot({ path: resolve(out, 'shared-browser-login.jpg') });

function appPage(): Page {
  return context.pages().find(p => p.url().startsWith(origin)) ?? initialPage;
}

async function status() {
  const page = appPage();
  if (page.isClosed()) return { browserOpen: false, authenticated: false };
  const isSignedIn = await page.evaluate(() =>
    Boolean((window as unknown as { Clerk?: { user?: unknown } }).Clerk?.user));
  const workspaceStatus = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/career/workspace', { credentials: 'same-origin' });
      await response.body?.cancel();
      return response.status;
    } catch { return null; }
  });
  return {
    browserOpen: true,
    route: new URL(page.url()).pathname,
    clerkSignedIn: isSignedIn,
    workspaceHttp: workspaceStatus,
    authenticated: isSignedIn && workspaceStatus === 200,
    checkedAt: new Date().toISOString(),
  };
}

let running = false;
const server = createServer(connection => {
  let data = '';
  connection.setTimeout(5000, () => connection.destroy());
  connection.on('data', chunk => {
    data += chunk.toString('utf8');
    if (data.length > 1024) { connection.destroy(); return; }
    if (!data.includes('\n')) return;
    connection.removeAllListeners('data');
    connection.setTimeout(0);
    void (async () => {
      try {
        const { action } = JSON.parse(data);
        if (action === 'status') {
          connection.end(`${JSON.stringify(await status())}\n`);
          return;
        }
        if (action !== 'run-authenticated-qa') {
          connection.end('{"error":"UNKNOWN_ACTION"}\n'); return;
        }
        if (running) { connection.end('{"error":"QA_ALREADY_RUNNING"}\n'); return; }
        const current = await status();
        if (!current.authenticated) {
          connection.end('{"error":"USER_SIGN_IN_REQUIRED"}\n'); return;
        }
        // Loaded only after explicit user authentication. A scenario can be
        // added without restarting this browser and losing the user's session.
        const scenarioUrl = new URL('./nuvia-authenticated-journey.ts', import.meta.url);
        running = true;
        try {
          const scenario = await import(scenarioUrl.href);
          const result = await scenario.runAuthenticatedJourney({
            page: appPage(), context, origin, out,
          });
          connection.end(`${JSON.stringify(result)}\n`);
        } finally { running = false; }
      } catch {
        // Never emit auth URLs, cookies, page text or an exception containing
        // user-entered credentials into workflow output.
        connection.end('{"error":"QA_CONTROL_FAILED","details":"See scoped QA preparation; browser kept open"}\n');
      }
    })();
  });
});
await new Promise<void>(resolveReady => server.listen(socketPath, resolveReady));
await chmod(socketPath, 0o600);
await writeFile(resolve(out, 'shared-browser-handoff.json'), JSON.stringify({
  openedAt: new Date().toISOString(),
  loginUrl: `${origin}/sign-in?lang=ko`,
  workflow: 'QA Shared Browser',
  browser: await browser.version(),
  interface: 'Native desktop / VNC',
  credentialsCaptured: false,
  authenticatedQa: 'not_started; awaiting user sign-in in this exact browser',
  control: 'Local filesystem socket only; no public TCP control endpoint',
}, null, 2));
console.log('SHARED_BROWSER_READY: Use the native VNC window to sign in with an existing authorized test account.');
console.log('Do not restart this workflow while handing off. Credentials and cookies are not logged or exported.');
browser.on('disconnected', () => { server.close(); process.exit(0); });
async function close() {
  server.close();
  await browser.close();
  await unlink(socketPath).catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => void close());
process.on('SIGINT', () => void close());
