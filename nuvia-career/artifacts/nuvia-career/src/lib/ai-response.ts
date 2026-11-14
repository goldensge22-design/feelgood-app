import { RequestCareerAiAssistanceResponse } from '@workspace/api-zod';

export const normalizeAiPurpose = (value: string | null | undefined): string => value?.trim() || 'essay';
export function normalizeStoredAiRule<T extends { purpose: string; confirmed: boolean; enabled: boolean }>(rule: T): T {
  const purpose = normalizeAiPurpose(rule.purpose);
  return purpose === rule.purpose ? rule : { ...rule, purpose, confirmed: false, enabled: false };
}

/** Validate before display AND persistence. Never trust HTTP 200 or cached JSON alone. */
export function validateAiResponse(value: unknown) {
  const parsed = RequestCareerAiAssistanceResponse.safeParse(value);
  if (!parsed.success) throw Object.assign(new Error('AI_INVALID_RESPONSE'), { code: 'AI_INVALID_RESPONSE' });
  return parsed.data;
}

export function isValidAiResponse(value: unknown): boolean {
  return RequestCareerAiAssistanceResponse.safeParse(value).success;
}

export interface AiHistoryEntry {
  id: string;
  task: ReturnType<typeof validateAiResponse>['task'];
  sourceFingerprint: string;
  createdAt: string;
  response: ReturnType<typeof validateAiResponse>;
}

/** Ignore corrupt AI-only history in memory; never clear essays, answers or versions. */
export function safeAiHistory(value: unknown): Record<string, AiHistoryEntry[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([id, entries]) => [id,
    Array.isArray(entries) ? entries.filter((entry): entry is AiHistoryEntry =>
      !!entry && typeof entry === 'object' && typeof entry.id === 'string' &&
      typeof entry.createdAt === 'string' && typeof entry.sourceFingerprint === 'string' &&
      isValidAiResponse(entry.response)) : [],
  ]));
}
