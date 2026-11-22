import { test } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";
import type { CareerAiAssistInput, CareerAiAssistResponse } from "@workspace/api-zod";
import { CareerAiQueue, CLASS_AI_POLICY } from "./career-ai-queue";
import { CareerAiError, classifyAiError } from "./career-ai-errors";
import { minimizedAiContext, OUTPUT_TOKENS } from "./career-ai-input";
import { aiIdentity, aiSettings } from "./career-ai-settings";

const signal = () => new AbortController().signal;
const input = (n = 0): CareerAiAssistInput => ({
  task: "coach", locale: "ko", writingLanguage: "ko", sourceFingerprint: `fingerprint-${n}`,
  confirmed: true, factsConfirmed: true, coachPrompt: "", strengths: [], userAnswers: [], voiceSources: [], voiceRules: [],
  application: { company: "합성기업", job: "서비스기획", question: "판단을 설명하세요", body: "" },
  experiences: [{ title: `SYNTHETIC_PRIVATE_${n}`, nature: "simulation", context: "class_simulation", cardType: "job_scenario",
    source: "synthetic", sourceVersion: "v1", sourceTitle: "가상 훈련", jobConnection: null,
    fields: { situation: "", roleGoal: "", action: `모의 예약 화면 안내 ${n}을 비교했다`, selectionReason: "",
      changed: "", result: "서로 다른 문구를 관찰했다", learning: "", resultEvidence: "", supportProvided: "", independentSteps: [] } }],
});
const response = (i: CareerAiAssistInput): CareerAiAssistResponse => ({
  task: i.task, sourceFingerprint: i.sourceFingerprint, coachQuestion: "모의 화면에서 무엇을 먼저 확인했나요?",
  candidates: [], feedback: [], voiceRules: [], notice: "",
});
const fast = { ...CLASS_AI_POLICY, startIntervalMs: 1, queueWaitMs: 5000, providerTimeoutMs: 300, requestTimeoutMs: 8000, cooldownMs: 30 };

test("55 synthetic owners + repeated clicks: 55 provider calls, concurrency <=4, no cross-account result, fresh fingerprints", async () => {
  let active = 0, peak = 0, calls = 0;
  const logs: unknown[] = [];
  const queue = new CareerAiQueue(async (i, s, usage) => {
    calls++; active++; peak = Math.max(active, peak);
    await sleep(3, undefined, { signal: s }); active--;
    usage({ inputTokens: 20, outputTokens: 8, totalTokens: 28, cachedInputTokens: 0 });
    return { ...response(i), notice: i.experiences[0].title };
  }, e => logs.push(e), fast);
  const requests = Array.from({ length: 55 }, (_, n) => queue.request(`synthetic-owner-${n}`, input(n), signal()));
  const repeats = Array.from({ length: 10 }, (_, n) => queue.request("synthetic-owner-0", { ...input(), sourceFingerprint: `new-${n}` }, signal()));
  const results = await Promise.all(requests);
  const joined = await Promise.all(repeats);
  assert.equal(calls, 55); assert.ok(peak <= 4);
  results.forEach((r, n) => assert.equal(r.response.notice, `SYNTHETIC_PRIVATE_${n}`));
  joined.forEach((r, n) => assert.equal(r.response.sourceFingerprint, `new-${n}`));
  assert.equal(queue.totals.joined, 10);
  assert.equal(queue.totals.inputTokens, 1100);
  const hit = await queue.request("synthetic-owner-0", { ...input(), sourceFingerprint: "after-refresh" }, signal());
  assert.equal(hit.reused, true); assert.equal(calls, 55);
  assert.equal(hit.response.sourceFingerprint, "after-refresh");
  assert.doesNotMatch(JSON.stringify(logs), /SYNTHETIC_PRIVATE|synthetic-owner|모의 예약|합성기업/);
});

test("identical content across accounts is never shared; mutated result cannot poison cached original", async () => {
  let calls = 0;
  const queue = new CareerAiQueue(async i => { calls++; return response(i); }, () => {}, fast);
  const a = await queue.request("A", input(), signal()); a.response.coachQuestion = "mutated";
  const b = await queue.request("B", input(), signal());
  const again = await queue.request("A", input(), signal());
  assert.equal(calls, 2); assert.notEqual(b.response.coachQuestion, "mutated");
  assert.notEqual(again.response.coachQuestion, "mutated");
});

test("temporary provider 429 retries exactly once then caches; unknown 429 is congestion not invented billing", async () => {
  let calls = 0;
  const queue = new CareerAiQueue(async i => {
    calls++; if (calls === 1) throw { status: 429, code: "rate_limit_exceeded", headers: new Headers({ "retry-after": "0.01" }) };
    return response(i);
  }, () => {}, fast);
  await queue.request("A", input(), signal());
  assert.equal(calls, 2);
  await queue.request("A", input(), signal()); assert.equal(calls, 2);
  assert.equal(classifyAiError({ status: 429 }).code, "AI_PROVIDER_BUSY");
});

test("quota/billing opens circuit; queued and repeated requests do not repeatedly call provider", async () => {
  let calls = 0;
  const queue = new CareerAiQueue(async () => { calls++; throw { status: 429, code: "insufficient_quota" }; }, () => {}, { ...fast, concurrency: 1, cooldownMs: 1000 });
  const outcomes = await Promise.allSettled(Array.from({ length: 55 }, (_, n) => queue.request(`quota-${n}`, input(n), signal())));
  assert.equal(calls, 1);
  assert.ok(outcomes.every(r => r.status === "rejected" && r.reason.code === "AI_USAGE_LIMIT"));
  await assert.rejects(queue.request("new", input(), signal()), { code: "AI_USAGE_LIMIT" });
  assert.equal(calls, 1);
});

test("persistent transient 429 has at most two attempts, never infinite retry", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async () => { calls++; throw new CareerAiError("AI_PROVIDER_BUSY", 1); }, () => {}, fast);
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_PROVIDER_BUSY" });
  assert.equal(calls, 2);
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_PROVIDER_BUSY" });
  assert.equal(calls, 2);
});

test("ambiguous timeout holds identical requests; no automatic paid retry", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async (_i, s) => {
    calls++; await sleep(1000, undefined, { signal: s }); return response(input());
  }, () => {}, { ...fast, providerTimeoutMs: 10, cooldownMs: 1000 });
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_UNCERTAIN" });
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_UNCERTAIN" });
  assert.equal(calls, 1);
});

test("provider ignoring cancellation is bounded too; no replay on uncertain outcome", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async () => {
    calls++; await sleep(80); return response(input());
  }, () => {}, { ...fast, providerTimeoutMs: 5, cooldownMs: 1000 });
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_UNCERTAIN" });
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_UNCERTAIN" });
  assert.equal(calls, 1);
});

test("all subscribers cancelling before dispatch avoids the model entirely", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async i => { calls++; return response(i); }, () => {}, fast);
  const abort = new AbortController();
  const result = q.request("A", input(), abort.signal); abort.abort();
  await assert.rejects(result, { name: "AbortError" });
  await sleep(5); assert.equal(calls, 0);
});

test("long provider retry-after is honoured without automatic attempt", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async () => { calls++; throw new CareerAiError("AI_PROVIDER_BUSY", 120); }, () => {}, fast);
  await assert.rejects(q.request("A", input(), signal()), { code: "AI_PROVIDER_BUSY" });
  assert.equal(calls, 1);
  assert.equal(classifyAiError({ status: 402 }).code, "AI_USAGE_LIMIT");
});

test("one subscriber cancelling does not cancel another; input edit gets a different request", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async (i, s) => { calls++; await sleep(12, undefined, { signal: s }); return response(i); }, () => {}, fast);
  const abort = new AbortController();
  const first = q.request("A", input(), abort.signal);
  const second = q.request("A", { ...input(), sourceFingerprint: "later" }, signal());
  abort.abort();
  await assert.rejects(first, { name: "AbortError" });
  assert.equal((await second).response.sourceFingerprint, "later");
  await q.request("A", input(2), signal()); assert.equal(calls, 2);
});

test("local limits and queue full are distinct and free; cache reuse bypasses unique-request limit", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async i => { calls++; return response(i); }, () => {}, { ...fast, ownerPerMinute: 1 });
  await q.request("A", input(), signal());
  await q.request("A", input(), signal());
  await assert.rejects(q.request("A", input(1), signal()), { code: "AI_LOCAL_LIMIT" });
  assert.equal(calls, 1);
  const blocked = new CareerAiQueue(async i => response(i), () => {}, { ...fast, queueSize: 0 });
  await assert.rejects(blocked.request("A", input(), signal()), { code: "AI_QUEUE_FULL" });
});

test("input size and task minimization; no silent truncation or voice-to-coach leakage", async () => {
  const i = { ...input(), voiceSources: [{ kind: "user_original" as const, text: "VOICE_PRIVATE" }] };
  assert.doesNotMatch(JSON.stringify(minimizedAiContext(i)), /VOICE_PRIVATE/);
  const voice = minimizedAiContext({ ...i, task: "voice" });
  assert.doesNotMatch(JSON.stringify(voice), /SYNTHETIC_PRIVATE|합성기업/);
  const q = new CareerAiQueue(async p => response(p), () => {}, { ...fast, maxContextChars: 2 });
  await assert.rejects(q.request("A", i, signal()), { code: "AI_INPUT_LIMIT" });
  assert.ok(OUTPUT_TOKENS.draft < 8192); assert.ok(OUTPUT_TOKENS.coach < OUTPUT_TOKENS.draft);
});

test("explicit managed and BYOK configurations remain separate; no key fallback or managed model alias on direct OpenAI", () => {
  // These values are test placeholders, not usable credentials; never print settings.
  const managed = aiSettings({ AI_INTEGRATIONS_OPENAI_API_KEY: "test-placeholder", AI_INTEGRATIONS_OPENAI_BASE_URL: "https://example.invalid/v1" });
  assert.equal(managed.provider, "managed"); assert.equal(managed.model, "gpt-5.6-luna");
  const direct = aiSettings({ CAREER_AI_PROVIDER: "openai", CAREER_AI_MODEL: "operator-selected-model", OPENAI_API_KEY: "test-placeholder" });
  assert.equal(direct.provider, "openai"); assert.equal(direct.baseURL, "https://api.openai.com/v1");
  assert.equal(direct.model, "operator-selected-model");
  assert.throws(() => aiSettings({ CAREER_AI_PROVIDER: "openai", OPENAI_API_KEY: "test-placeholder" }), { code: "AI_NOT_CONFIGURED" });
  assert.throws(() => aiSettings({ CAREER_AI_PROVIDER: "openai", CAREER_AI_MODEL: "operator-model",
    AI_INTEGRATIONS_OPENAI_API_KEY: "test-placeholder", AI_INTEGRATIONS_OPENAI_BASE_URL: "https://example.invalid/v1" }), { code: "AI_NOT_CONFIGURED" });
  assert.notDeepEqual(aiIdentity({}), aiIdentity({ CAREER_AI_PROVIDER: "openai", CAREER_AI_MODEL: "operator-model" }));
});

test("provider model/parameter errors and auth failures are configuration problems, not quota", () => {
  for (const code of ["model_not_found", "unsupported_parameter", "unsupported_value", "invalid_json_schema"]) {
    assert.equal(classifyAiError({ status: 400, code }).code, "AI_MODEL_CONFIG");
  }
  assert.equal(classifyAiError({ status: 401 }).code, "AI_NOT_CONFIGURED");
  assert.equal(classifyAiError({ status: 404 }).code, "AI_MODEL_CONFIG");
  assert.equal(classifyAiError({ status: 429, code: "insufficient_quota" }).code, "AI_USAGE_LIMIT");
  assert.equal(classifyAiError({ status: 429, code: "rate_limit_exceeded" }).code, "AI_PROVIDER_BUSY");
});

test("class call budget counts attempts, blocks further billing, but cached successes remain usable", async () => {
  let calls = 0;
  const q = new CareerAiQueue(async i => { calls++; return response(i); }, () => {}, { ...fast, maxClassCalls: 1 });
  await q.request("A", input(), signal());
  await assert.rejects(q.request("B", input(1), signal()), { code: "AI_CLASS_LIMIT" });
  await q.request("A", input(), signal()); assert.equal(calls, 1);
});

test("production pacing: 55 synthetic owners, real two-second start spacing, no paid provider", { timeout: 160_000 }, async () => {
  const starts: number[] = [];
  const q = new CareerAiQueue(async i => { starts.push(Date.now()); return response(i); }, () => {});
  const begun = Date.now();
  await Promise.all(Array.from({ length: 55 }, (_, n) => q.request(`paced-${n}`, input(n), signal())));
  assert.equal(starts.length, 55);
  assert.ok(Date.now() - begun >= 107_000);
  assert.ok(Date.now() - begun < CLASS_AI_POLICY.queueWaitMs);
  for (let n = 1; n < starts.length; n++) assert.ok(starts[n] - starts[n - 1] >= 1950);
});
