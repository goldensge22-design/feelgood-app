import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { REVIEW_SHORTCUTS, reviewShortcutBrowser, reviewShortcutEntry, reviewShortcutHref, type ReviewShortcut } from './review-shortcuts';

test('only the exact marked home and planner pages launch the isolated demo', () => {
  assert.equal(reviewShortcutEntry('/product/demo/review/home', '?lang=ko&shortcut=home', '/product/'), 'home');
  assert.equal(reviewShortcutEntry('/demo/review/planner', '?shortcut=planner', '/'), 'planner');
  for (const [path, search] of [
    ['/demo/review/home', '?shortcut=planner'], ['/home', '?shortcut=home'],
    ['/sign-in', '?shortcut=home'], ['/demo/review/planner/card/abc', '?shortcut=planner'],
    ['/demo/review/home', ''], ['/demo/review', '?shortcut=home'],
  ]) assert.equal(reviewShortcutEntry(path, search, '/'), null);
});

test('manifests are separate and point to the appropriate base-prefixed start URL and icons', () => {
  const ids = new Set();
  const scopes = new Set();
  for (const [target, def] of Object.entries(REVIEW_SHORTCUTS)) {
    const file = new URL(`../../public/${def.manifest}`, import.meta.url);
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as { id: string; start_url: string; scope: string; icons: { src: string; sizes: string }[] };
    const origin = 'https://example.test/subpath/';
    const start = new URL(manifest.start_url, origin);
    assert.equal(start.pathname + start.search, reviewShortcutHref('/subpath/', target as ReviewShortcut));
    assert.equal(new URL(manifest.id, origin).pathname, '/subpath' + def.path);
    assert.equal(new URL(manifest.scope, origin).pathname, start.pathname);
    assert.deepEqual(manifest.icons.map(i => i.sizes), ['192x192', '512x512']);
    for (const icon of manifest.icons) {
      const png = readFileSync(new URL(icon.src, file));
      const [width, height] = icon.sizes.split('x').map(Number);
      assert.equal(png.subarray(1, 4).toString(), 'PNG');
      assert.equal(png.readUInt32BE(16), width);
      assert.equal(png.readUInt32BE(20), height);
    }
    ids.add(manifest.id);
    scopes.add(manifest.scope);
  }
  assert.equal(ids.size, 2);
  assert.equal(scopes.size, 2);
});

test('fallback guidance distinguishes iPad desktop mode, other iOS browsers, Android and in-app browsers', () => {
  assert.equal(reviewShortcutBrowser('Macintosh Version/18 Safari/605', 5, false), 'safari-ios');
  assert.equal(reviewShortcutBrowser('iPhone CriOS/111 Safari/604', 5, false), 'other-ios');
  assert.equal(reviewShortcutBrowser('iPhone Instagram Safari/604', 5, false), 'embedded');
  assert.equal(reviewShortcutBrowser('Android 15 Chrome/135', 5, false), 'android');
  assert.equal(reviewShortcutBrowser('Android 15 Chrome/135', 5, true), 'embedded');
  assert.equal(reviewShortcutBrowser('X11 Chrome/135', 0, false), 'desktop');
});
