// JSON-schema equivalent of the generated response contract, used only to
// constrain generation. The generated Zod contract still validates every reply.
const text = (maxLength: number) => ({ type: "string", maxLength });
const object = (properties: Record<string, unknown>) => ({
  type: "object", additionalProperties: false, required: Object.keys(properties), properties,
});
const list = (items: unknown, maxItems: number) => ({ type: "array", items, maxItems });
export const CAREER_AI_OUTPUT_SCHEMA = object({
  task: { type: "string", enum: ["coach", "draft", "voice", "analyze"] },
  sourceFingerprint: text(200), coachQuestion: text(2000),
  candidates: list(object({
    text: text(5000), rationale: text(2000), sourceFacts: list(text(500), 10),
    strengthConnection: text(1000), caution: text(1000),
  }), 3),
  feedback: list(object({ category: text(100), note: text(1000), evidence: text(500) }), 12),
  voiceRules: list(object({
    aspect: text(100), rule: text(1000), example: text(500),
    confidence: { type: "string", enum: ["tentative", "repeated"] },
  }), 12),
  notice: text(1000),
});
