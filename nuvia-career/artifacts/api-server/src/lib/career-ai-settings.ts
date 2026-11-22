import { CareerAiError } from "./career-ai-errors";
import { AI_MODEL } from "./career-ai-input";

type Env = Record<string, string | undefined>;
export function aiIdentity(env: Env = process.env) {
  const provider = env.CAREER_AI_PROVIDER ?? "managed";
  const candidate = env.CAREER_AI_MODEL ?? (provider === "managed" ? AI_MODEL : "");
  return {
    provider: provider === "openai" ? "openai" : provider === "managed" ? "managed" : "unconfigured",
    model: /^[a-zA-Z0-9._:/-]{1,100}$/.test(candidate) ? candidate : "unconfigured",
    format: env.CAREER_AI_RESPONSE_FORMAT === "json_object" ? "json_object" : "json_schema",
  };
}

/** Explicit provider choice. Never fall through to another account/key on failure. */
export function aiSettings(env: Env = process.env) {
  const identity = aiIdentity(env);
  if (identity.provider === "unconfigured" || identity.model === "unconfigured") throw new CareerAiError("AI_NOT_CONFIGURED");
  if (env.CAREER_AI_RESPONSE_FORMAT && !["json_schema", "json_object"].includes(env.CAREER_AI_RESPONSE_FORMAT)) throw new CareerAiError("AI_NOT_CONFIGURED");
  const apiKey = identity.provider === "openai" ? env.OPENAI_API_KEY : env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = identity.provider === "openai" ? env.OPENAI_BASE_URL ?? "https://api.openai.com/v1" : env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) throw new CareerAiError("AI_NOT_CONFIGURED");
  return { ...identity, apiKey, baseURL };
}
