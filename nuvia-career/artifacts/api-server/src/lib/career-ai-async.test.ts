import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { pool } from "@workspace/db";
import { SharedCareerAi, SHARED_AI_POLICY } from "./career-ai-shared";
import { CareerAiError } from "./career-ai-errors";
import type { CareerAiAssistInput, CareerAiAssistResponse } from "@workspace/api-zod";

const secret = "synthetic-test-only-not-a-real-secret-2026";
const policy = { ...SHARED_AI_POLICY, pollMs: 20, queueWaitMs: 40, requestTimeoutMs: 60,
  startIntervalMs: 2, providerTimeoutMs: 1000, dispatchLeaseMs: 2000, concurrency: 1 };
const input = (n = 0): CareerAiAssistInput => ({ task: "coach", locale: "ko", writingLanguage: "ko",
  sourceFingerprint: `synthetic-${n}`, confirmed: true, factsConfirmed: true, coachPrompt: "",
  application: { company: "합성기업", job: "직무탐색", question: "무엇을 확인했나요?", body: "" },
  strengths: [], experiences: [], userAnswers: [{ question: "모의 연습", answer: `SYNTHETIC_FACT_${n}` }],
  voiceSources: [], voiceRules: [] });
const result = (i: CareerAiAssistInput): CareerAiAssistResponse => ({ task: i.task, sourceFingerprint: i.sourceFingerprint,
  coachQuestion: `${i.userAnswers[0].answer}에서 어떤 근거를 확인했나요?`, candidates: [], feedback: [], voiceRules: [], notice: "" });
async function scenario(work: (scope: string, engines: SharedCareerAi[]) => Promise<void>) {
  const scope = `qa-async-${randomUUID()}`, engines: SharedCareerAi[] = [];
  try { await work(scope, engines); }
  finally {
    engines.forEach(q => q.stopWorker()); await sleep(100);
    for (const table of ["career_ai_jobs", "career_ai_owners", "career_ai_controls"])
      await pool.query(`DELETE FROM ${table} WHERE scope=$1`, [scope]);
  }
}
async function finished(q: SharedCareerAi, owner: string, id: string) {
  for (let n = 0; n < 300; n++) {
    const value = await q.status(owner, id);
    if (value && !["queued", "running"].includes(value.state)) return value;
    await sleep(20);
  }
  throw new Error("synthetic guard");
}
test("lost acknowledgement resolves by client nonce, account isolation, durable result, no extra provider call", () => scenario(async (s, engines) => {
  let calls = 0;
  const provider = async (i: CareerAiAssistInput) => { calls++; await sleep(80); return result(i); };
  const q = new SharedCareerAi(provider, () => {}, secret, s, policy); engines.push(q);
  const client = randomUUID();
  const first = await q.submit("A", input(), client);
  assert.ok(first);
  assert.equal((await q.byClient("A", client))?.id, first.id);
  assert.equal(await q.byClient("B", client), null);
  assert.equal(await q.status("B", first.id), null);
  const same = await q.submit("A", input(), client); assert.equal(same?.id, first.id);
  assert.equal((await finished(q, "A", first.id)).state, "complete");
  q.stopWorker();
  const fresh = new SharedCareerAi(provider, () => {}, secret, s, policy); engines.push(fresh);
  assert.equal((await fresh.byClient("A", client))?.state, "complete");
  assert.equal(calls, 1);
}));
test("queued work survives reader disconnect and worker replacement; exceeds old queue and HTTP limits without failure", () => scenario(async (s, engines) => {
  let calls = 0;
  const provider = async (i: CareerAiAssistInput) => { calls++; await sleep(180); return result(i); };
  const q = new SharedCareerAi(provider, () => {}, secret, s, policy); engines.push(q);
  const a = await q.submit("A", input(1), randomUUID()); assert.ok(a);
  while (!calls) await sleep(10);
  const token = randomUUID(), b = await q.submit("B", input(2), token); assert.ok(b); q.stopWorker();
  const fresh = new SharedCareerAi(provider, () => {}, secret, s, policy); engines.push(fresh);
  await sleep(80); const waiting = await fresh.byClient("B", token);
  assert.equal(waiting?.state, "queued");
  const done = await finished(fresh, "B", b.id);
  assert.equal(done.state, "complete"); assert.ok(done.response?.coachQuestion.includes("SYNTHETIC_FACT_2"));
  assert.equal(calls, 2); assert.ok(done.elapsedMs > policy.requestTimeoutMs);
}));
test("queued cancellation costs no call, in-flight uncertain work is never regenerated on reconnect", () => scenario(async (s, engines) => {
  let calls = 0;
  const q = new SharedCareerAi(async () => { calls++; await new Promise(() => {}); return result(input()); },
    () => {}, secret, s, { ...policy, providerTimeoutMs: 150 });
  engines.push(q);
  const first = await q.submit("A", input(1)); assert.ok(first);
  while (!calls) await sleep(10);
  const second = await q.submit("B", input(2)); assert.ok(second);
  assert.equal((await q.cancelJob("B", second.id))?.state, "cancelled");
  assert.equal((await finished(q, "A", first.id)).state, "uncertain");
  assert.equal((await q.submit("A", input(1)))?.state, "uncertain");
  assert.equal(calls, 1);
  const row = await pool.query("SELECT state FROM career_ai_jobs WHERE request_key=$1", [first.id]);
  assert.equal(row.rows[0].state.inputCipher, undefined);
}));
test("temporary explicit rate rejection automatically waits and retries at most once", () => scenario(async (s, engines) => {
  let calls = 0;
  const q = new SharedCareerAi(async i => { if (++calls === 1) throw new CareerAiError("AI_PROVIDER_BUSY", 2); return result(i); },
    () => {}, secret, s, policy); engines.push(q);
  const first = await q.submit("A", input()); assert.ok(first);
  await sleep(100); assert.equal((await q.status("A", first.id))?.state, "queued");
  assert.equal((await finished(q, "A", first.id)).state, "complete"); assert.equal(calls, 2);
}));
test("shared cap remains enforced; encrypted queued payload contains no plaintext original", () => scenario(async (s, engines) => {
  let calls = 0;
  const q = new SharedCareerAi(async i => { calls++; await sleep(100); return result(i); },
    () => {}, secret, s, { ...policy, maxClassCalls: 1 }); engines.push(q);
  const first = await q.submit("A", input()); assert.ok(first);
  while (!calls) await sleep(10);
  await assert.rejects(() => q.submit("B", input(2)), (e: unknown) => e instanceof CareerAiError && e.code === "AI_CLASS_LIMIT");
  const rows = await pool.query("SELECT state FROM career_ai_jobs WHERE scope=$1", [s]);
  assert.doesNotMatch(JSON.stringify(rows.rows), /SYNTHETIC_FACT|합성기업|직무탐색/);
  await finished(q, "A", first.id); assert.equal(calls, 1);
}));
test("a differently configured provider cannot consume accepted queued work", () => scenario(async (s, engines) => {
  let wrongCalls = 0, rightCalls = 0;
  const q = new SharedCareerAi(async i => { rightCalls++; return result(i); }, () => {}, secret, s, policy);
  engines.push(q);
  // Hold admission's next slot in the future so neither test races dispatch.
  const first = await q.submit("A", input()); assert.ok(first);
  await finished(q, "A", first.id); q.stopWorker();
  await pool.query("UPDATE career_ai_controls SET state=jsonb_set(state,'{nextStart}',to_jsonb((extract(epoch FROM clock_timestamp())*1000+250)::float8)) WHERE scope=$1", [s]);
  const second = await q.submit("B", input(2)); assert.ok(second); q.stopWorker();
  const wrong = new SharedCareerAi(async i => { wrongCalls++; return result(i); }, () => {}, secret, s, policy,
    { provider: "openai", model: "different-synthetic-model", format: "json_schema" });
  engines.push(wrong); wrong.startWorker(); await sleep(350);
  assert.equal(wrongCalls, 0);
  assert.equal((await q.status("B", second.id))?.state, "queued");
  assert.equal((await finished(q, "B", second.id)).state, "complete");
  assert.equal(rightCalls, 2);
}));
test.after(async () => { await pool.end(); });
