/** A separate client workspace, NOT an authentication mechanism or server permission. */
export function isPublicDemoPath(path: string, base = '') {
  const prefix = `${base.replace(/\/$/, '')}/demo`;
  return path === prefix || path.startsWith(`${prefix}/`);
}
export const PUBLIC_DEMO = typeof window !== 'undefined' &&
  isPublicDemoPath(window.location.pathname, import.meta.env?.BASE_URL ?? '');
export const DEMO_SESSION_PREFIX = 'nuvia:public-demo:v1:';
export function clientStorage(key: string): { storage: Storage; key: string } {
  return PUBLIC_DEMO
    ? { storage: window.sessionStorage, key: DEMO_SESSION_PREFIX + key }
    : { storage: window.localStorage, key };
}
export function clearPublicDemo() {
  if (!PUBLIC_DEMO) return;
  for (const key of Object.keys(window.sessionStorage)) {
    if (key.startsWith(DEMO_SESSION_PREFIX)) window.sessionStorage.removeItem(key);
  }
  window.location.reload();
}
export function localWorkspaceMode(publicDemo: boolean, signedIn: boolean, local: 'guest' | 'demo') {
  return publicDemo ? 'demo' : signedIn ? 'account' : local;
}
