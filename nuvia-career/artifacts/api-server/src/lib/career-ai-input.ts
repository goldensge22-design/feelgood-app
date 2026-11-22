import type { CareerAiAssistInput } from "@workspace/api-zod";

export const AI_MODEL = "gpt-5.6-luna";
export const OUTPUT_TOKENS = { coach: 768, draft: 1800, analyze: 1200, voice: 1200 } as const;

/** Drop unrelated task context, never silently truncate selected student facts. */
export function minimizedAiContext(input: CareerAiAssistInput) {
  if (input.task === "voice") return {
    task: input.task, writingLanguage: input.writingLanguage,
    selectedVoiceSamples: input.voiceSources,
    confirmedVoiceRules: input.voiceRules.filter((rule) => rule.enabled),
  };
  return {
    task: input.task, writingLanguage: input.writingLanguage,
    application: input.application,
    selectedStrengthInterpretations: input.strengths,
    selectedExperiences: input.experiences,
    studentAnswers: input.userAnswers,
    ...(input.task === "draft" ? { confirmedVoiceRules: input.voiceRules.filter((rule) => rule.enabled) } : {}),
    ...(input.task === "coach" ? { requestedCoachQuestion: input.coachPrompt } : {}),
  };
}
