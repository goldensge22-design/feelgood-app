export type ReviewAudience = 'adult' | 'youth' | 'family';
export const REVIEW_AUDIENCE = 'review:audience:v1';

export function reviewAudience(value: unknown): ReviewAudience | null {
  return value === 'adult' || value === 'youth' || value === 'family' ? value : null;
}

export const usesActivityWorkspace = (audience: ReviewAudience | null) => audience === 'adult' || audience === 'youth';

const adultProducts = ['company', 'storyboard'] as const;
const youthProducts = ['career', 'storyboard'] as const;
const familyProducts = ['familyLab', 'planner', 'history', 'storyboard'] as const;
export type ReviewProduct = typeof adultProducts[number] | typeof youthProducts[number] | typeof familyProducts[number];
export const reviewProducts = (audience: ReviewAudience | null): readonly ReviewProduct[] =>
  audience === 'adult' ? adultProducts : audience === 'youth' ? youthProducts : audience === 'family' ? familyProducts : [];

export const REVIEW_PRODUCT_LINKS = {
  company: ['/lab', 'audience.company'],
  career: ['/lab', 'audience.career'],
  familyLab: ['/lab', 'audience.familyLab'],
  planner: ['/planner', 'audience.planner'],
  history: ['/history', 'audience.history'],
  storyboard: ['/storyboard', 'audience.story'],
} as const satisfies Record<ReviewProduct, readonly [string, string]>;

/** Gate before mounting any page. Only the separate family context may render product history. */
export function reviewRouteRedirect(path: string, audience: ReviewAudience | null, started: boolean): string | null {
  const route = path.replace(/\/+$/, '') || '/';
  if (route === '/' || route === '/teacher') return null;
  if (route === '/family') return started && audience !== 'family' ? '/home' : null;
  if (!started || !audience) return '/';
  const raw = route.split('/')[1];
  let section=raw.toLowerCase();
  try { section=decodeURIComponent(raw).toLowerCase().split('/')[0]; } catch { /* unknown paths fall back safely */ }
  if (['kids', 'kid', 'child', 'children', 'nuvia-kids', 'kids-lab', 'kidshub'].includes(section)) return '/home';
  if (['history', 'my-history', 'activity-history', 'experiences'].includes(section) && audience !== 'family') return '/planner';
  if (section === 'career-lab' || section === 'company-lab') return '/lab';
  return null;
}
