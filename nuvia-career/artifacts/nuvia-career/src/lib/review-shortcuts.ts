export const REVIEW_SHORTCUTS = {
  home: { path: '/demo/review/home', name: 'NUVIA', manifest: 'review-home.webmanifest' },
  planner: { path: '/demo/review/planner', name: '플래너', manifest: 'review-planner.webmanifest' },
} as const;
export type ReviewShortcut = keyof typeof REVIEW_SHORTCUTS;

export function reviewShortcutHref(base: string, target: ReviewShortcut) {
  return `${base.replace(/\/$/, '')}${REVIEW_SHORTCUTS[target].path}?shortcut=${target}`;
}

/** Only a matching, explicit entry into the isolated review—not an auth parameter. */
export function reviewShortcutEntry(path: string, search: string, base: string): ReviewShortcut | null {
  const target = new URLSearchParams(search).get('shortcut');
  if (target !== 'home' && target !== 'planner') return null;
  return path === `${base.replace(/\/$/, '')}${REVIEW_SHORTCUTS[target].path}` ? target : null;
}

export function reviewShortcutBrowser(ua: string, touchPoints: number, embedded: boolean) {
  if (embedded || /KAKAOTALK|NAVER[(/]|FBAN|FBAV|Instagram|Line\/|;\s*wv\)|TikTok|GSA\//i.test(ua)) return 'embedded';
  if (/iPad|iPhone|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)) {
    return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua) ? 'safari-ios' : 'other-ios';
  }
  return /Android/i.test(ua) ? 'android' : 'desktop';
}
