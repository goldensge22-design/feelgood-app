import { useSyncExternalStore } from 'react';
import { REVIEW_SHORTCUTS, reviewShortcutEntry, type ReviewShortcut } from './review-shortcuts';

type Prompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
type Status = 'waiting' | 'available' | 'requesting' | 'accepted' | 'dismissed' | 'failed' | 'installed' | 'standalone';
type Snapshot = { entry: ReviewShortcut | null; status: Status };
const initial: Snapshot = { entry: null, status: 'waiting' };
let snapshot = initial;
let prompt: Prompt | undefined;
const subscribers = new Set<() => void>();
const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => { subscribers.delete(listener); };
};
const setStatus = (status: Status) => {
  snapshot = { ...snapshot, status };
  subscribers.forEach(listener => listener());
};
export const useReviewInstall = () => useSyncExternalStore(subscribe, () => snapshot, () => initial);

// Keep one manifest identity for the life of this document. SPA navigation
// between products must not retarget a browser's already deferred prompt.
export function initReviewInstall(base: string) {
  const entry = reviewShortcutEntry(location.pathname, location.search, base);
  if (!entry || snapshot.entry) return;
  snapshot = { entry, status: window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone ? 'standalone' : 'waiting' };
  if (window.self === window.top) {
    window.addEventListener('beforeinstallprompt', (event) => {
      const next = event as Prompt;
      if (typeof next.prompt !== 'function') return;
      event.preventDefault();
      if (snapshot.status === 'installed' || snapshot.status === 'requesting' || snapshot.status === 'standalone') return;
      prompt = next;
      setStatus('available');
    });
    window.addEventListener('appinstalled', () => {
      prompt = undefined;
      setStatus('installed');
    });
  }
  const manifest = document.createElement('link');
  manifest.rel = 'manifest';
  manifest.href = `${base.replace(/\/$/, '')}/${REVIEW_SHORTCUTS[entry].manifest}`;
  document.head.appendChild(manifest);
  const icon = document.createElement('link');
  icon.rel = 'apple-touch-icon';
  icon.href = `${base.replace(/\/$/, '')}/review-${entry}-192.png`;
  document.head.appendChild(icon);
  document.title = entry === 'home' ? 'MY NUVIA · 검토용 데모' : 'NUVIA PLANNER · 검토용 데모';
}

export async function requestReviewInstall(target: ReviewShortcut) {
  if (!prompt || snapshot.entry !== target || snapshot.status !== 'available') return;
  const request = prompt;
  prompt = undefined;
  setStatus('requesting');
  try {
    await request.prompt(); // Called synchronously from the user's click, before yielding.
    const choice = await request.userChoice;
    if (getStatus() === 'requesting') setStatus(choice.outcome);
  } catch {
    if (getStatus() === 'requesting') setStatus('failed');
  }
}
const getStatus = () => snapshot.status;
