export type AiErrorCode =
  | "AI_NOT_CONFIGURED" | "AI_LOCAL_LIMIT" | "AI_CLASS_LIMIT" | "AI_QUEUE_FULL"
  | "AI_PROVIDER_BUSY" | "AI_USAGE_LIMIT" | "AI_TIMEOUT" | "AI_UNCERTAIN"
  | "AI_UPSTREAM_FAILED" | "AI_INVALID_RESPONSE" | "AI_INPUT_LIMIT" | "AI_MODEL_CONFIG"
  | "AI_COORDINATION_UNAVAILABLE" | "AI_COORDINATION_WAIT" | "AI_RESULT_EXPIRED";

/** Only allowlisted diagnostics may enter logs. Never retain provider messages/bodies. */
export class CareerAiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    readonly retryAfter = 0,
    readonly upstreamCode?: string,
    readonly upstreamStatus?: number,
  ) { super(code); }
}

export function classifyAiError(error: unknown): CareerAiError {
  if (error instanceof CareerAiError) return error;
  const e = error as { status?: number; code?: string; error?: { code?: string }; name?: string; headers?: { get?: (name: string) => string | null } };
  const code = e?.code ?? e?.error?.code;
  const safeCode = ["insufficient_quota", "billing_hard_limit_reached", "billing_not_active",
    "rate_limit_exceeded", "tokens", "requests", "account_deactivated",
    "model_not_found", "unsupported_parameter", "unsupported_value", "invalid_json_schema", "model_not_supported"].includes(code ?? "") ? code : undefined;
  if (["model_not_found", "unsupported_parameter", "unsupported_value", "invalid_json_schema", "model_not_supported"].includes(safeCode ?? "")) {
    return new CareerAiError("AI_MODEL_CONFIG", 300, safeCode, e?.status);
  }
  if (e?.status === 401 || e?.status === 403) return new CareerAiError("AI_NOT_CONFIGURED", 300, safeCode, e.status);
  if (e?.status === 404) return new CareerAiError("AI_MODEL_CONFIG", 300, safeCode, e.status);
  if (e?.status === 402 || ["insufficient_quota", "billing_hard_limit_reached", "billing_not_active", "account_deactivated"].includes(safeCode ?? "")) {
    return new CareerAiError("AI_USAGE_LIMIT", 300, safeCode, e?.status);
  }
  if (e?.status === 429) {
    const raw = Number(e.headers?.get?.("retry-after"));
    return new CareerAiError("AI_PROVIDER_BUSY", Number.isFinite(raw) && raw > 0 ? Math.ceil(raw) : 2, safeCode, 429);
  }
  if ([408, 504].includes(e?.status ?? 0) || ["TimeoutError", "APIConnectionTimeoutError"].includes(e?.name ?? "")) {
    return new CareerAiError("AI_TIMEOUT", 300, safeCode, e?.status);
  }
  return new CareerAiError("AI_UPSTREAM_FAILED", 300, safeCode, e?.status);
}
