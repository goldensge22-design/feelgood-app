/**
 * Proposed future server DTO, not an agreed transport contract.
 * Approved languages/order: languages.ts. Shipped static resources: message-status.json.
 * This proposal is NOT the active UI release/QA gate and does not certify native review.
 */
export type TranslationOrigin = 'human' | 'machine' | 'official';
export type ReviewStatus = 'pending' | 'reviewed' | 'rejected';
export interface TranslatedText {
  original: string; originalLanguage: string;
  translation: string; targetLanguage: string; origin: TranslationOrigin;
  review: ReviewStatus; sourceVersion: string; translatedAt?: string; reviewedAt?: string;
}
export interface LanguageRelease {
  code: string; nameOriginal: string; direction: 'ltr' | 'rtl';
  approvedInLanguageList: boolean;
  surfaces: Record<string, { translation: 'pending' | 'partial' | 'complete'; review: ReviewStatus }>;
  messages: Record<string, TranslatedText>;
}
export function resolveTranslatedText(original: string, pack?: LanguageRelease, originalLanguage = 'ko') {
  const unit = pack?.messages[original];
  if (!pack?.approvedInLanguageList || !unit?.translation || unit.original !== original || unit.targetLanguage !== pack.code || unit.review !== 'reviewed') {
    return { text: original, status: 'fallback-pending' as const, language: originalLanguage, origin: 'original' as const };
  }
  return { text: unit.translation, status: 'reviewed' as const, language: pack.code, origin: unit.origin };
}
export function canReleaseLanguage(pack: LanguageRelease, requiredSurfaces: string[]) {
  return pack.approvedInLanguageList && Object.keys(pack.messages).length > 0
    && Object.values(pack.messages).every(unit => unit.review === 'reviewed' && unit.targetLanguage === pack.code && !!unit.translation && !!unit.sourceVersion)
    && requiredSurfaces.every(key => pack.surfaces[key]?.translation === 'complete' && pack.surfaces[key]?.review === 'reviewed');
}
