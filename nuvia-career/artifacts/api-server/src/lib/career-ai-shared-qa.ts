/** Real PostgreSQL + independent OS processes; mocked supplier ONLY. */
import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import assert from "node:assert/strict";
import { pool } from "@workspace/db";
import type { CareerAiAssistInput, CareerAiAssistResponse } from "@workspace/api-zod";
import { SharedCareerAi, SHARED_AI_POLICY } from "./career-ai-shared";
import { CareerAiError } from "./career-ai-errors";

const TEST_SECRET = "synthetic-test-only-not-a-real-secret-2026";
const input = (n: number): CareerAiAssistInput => ({
  task: "coach", locale: "ko", writingLanguage: "ko", sourceFingerprint: `synthetic-${n}`,
  confirmed: true, factsConfirmed: true, coachPrompt: "", strengths: [], userAnswers: [], voiceSources: [], voiceRules: [],
  application: { company: "합성기업", job: "교육운영", question: "어떻게 확인했나요?", body: "" },
  experiences: [{ title: "합성 모의훈련", nature: "simulation", context: "class_simulation", cardType: "job_scenario",
    source: "synthetic", sourceVersion: "v1", sourceTitle: "가상 QA", jobConnection: null,
    fields: { situation: "", roleGoal: "", action: `SYNTHETIC_ACTION_${n} 모의 안내를 대조했다`, selectionReason: "",
      changed: "", result: "", learning: "", resultEvidence: "", supportProvided: "", independentSteps: [] } }],
});
const response = (i: CareerAiAssistInput): CareerAiAssistResponse => ({
  task: i.task, sourceFingerprint: i.sourceFingerprint, coachQuestion: `모의 확인 ${i.experiences[0].fields.action}에서 무엇을 배웠나요?`,
  candidates: [], feedback: [], voiceRules: [], notice: "",
});
const fast = { ...SHARED_AI_POLICY, pollMs: 20, waiterLeaseMs: 500, startIntervalMs: 5,
  providerTimeoutMs: 1000, dispatchLeaseMs: 2000, queueWaitMs: 8000, requestTimeoutMs: 10_000 };
type Config = { scope: string; indices: number[]; sameOwner?: boolean; sameFacts?: boolean; delay?: number;
  policy?: typeof SHARED_AI_POLICY; mode?: string; secret?: string; async30?: boolean };
if (process.argv.includes("--worker")) {
  process.once("message", async (cfg: Config) => {
    let calls = 0;
    const q = new SharedCareerAi(async (i, signal, usage) => {
      calls++; process.send?.({ type: "provider", pid: process.pid, at: Date.now() });
      if (cfg.mode === "crash") await new Promise(() => {});
      if (cfg.mode === "busy-once" && calls === 1) throw new CareerAiError("AI_PROVIDER_BUSY", 2);
      if (cfg.mode === "quota") throw new CareerAiError("AI_USAGE_LIMIT", 300);
      if (cfg.mode === "timeout") await new Promise(() => {});
      await sleep(cfg.delay ?? 5, undefined, { signal });
      usage({ inputTokens: 10, outputTokens: 5, totalTokens: 15, cachedInputTokens: 0 });
      return response(i);
    }, () => {}, cfg.secret ?? TEST_SECRET, cfg.scope, cfg.policy ?? fast);
    const started = Date.now();
    const initialStates: unknown[] = [], longWaitStates: unknown[] = [];
    let originalQuery: typeof pool.query | undefined;
    if (cfg.mode === "db-failure") {
      originalQuery = pool.query;
      pool.query = (() => { throw new Error("synthetic DB failure"); }) as typeof pool.query;
    }
    const results = await Promise.all(cfg.indices.map(async n => {
      const at = Date.now(), fact = cfg.sameFacts ? 0 : n;
      try {
        if (cfg.async30) {
          const owner = `synthetic-owner-${n}`;
          let job = await q.submit(owner, input(fact));
          if (!job) throw new Error("missing job");
          initialStates.push({ n, state: job.state, acceptedMs: Date.now() - at });
          let after210 = false, reconnected = false, maxReadMs = 0;
          // Subsequent reads use ONLY the opaque ticket, not a repeated input.
          while (["queued", "running"].includes(job.state)) {
            if (Date.now() - at > 650_000) throw new Error("synthetic overall test guard");
            await sleep(1000);
            const readAt = Date.now();
            job = await q.status(owner, job.id);
            maxReadMs = Math.max(maxReadMs, Date.now() - readAt);
            if (!job) throw new Error("lost ticket");
            if (!reconnected && Date.now() - at > 10_000) {
              assert.equal(await q.status("unrelated-synthetic-owner", job.id), null);
              reconnected = true;
            }
            if (!after210 && Date.now() - at > 210_000) {
              longWaitStates.push({ n, state: job.state, atMs: Date.now() - at }); after210 = true;
            }
          }
          if (job.state !== "complete" || !job.response) throw new Error(job.error ?? job.state);
          return { status: "pass", n, firstState: (initialStates.find((v: any) => v.n === n) as any)?.state,
            finalState: job.state, totalMs: Date.now() - at, queuedMs: job.queuedMs, maxReadMs,
            beyond210Observed: after210, factsPreserved: job.response.coachQuestion.includes(`SYNTHETIC_ACTION_${fact}`) };
        }
        const r = await q.request(cfg.sameOwner ? "same-synthetic-owner" : `synthetic-owner-${n}`,
          input(fact), new AbortController().signal);
        return { status: "pass", n, reused: r.reused, queuedMs: r.queuedMs, totalMs: Date.now() - at,
          factsPreserved: r.response.coachQuestion.includes(`SYNTHETIC_ACTION_${fact}`) };
      } catch (e) { return { status: "error", n, code: e instanceof Error ? e.message : "UNKNOWN", totalMs: Date.now() - at }; }
    }));
    if (originalQuery) pool.query = originalQuery;
    if (cfg.async30) {
      // A worker may own supplier calls for OTHER clients/processes. Finishing
      // its own client subset is not permission to close its database pool.
      // Keep all three workers alive until the shared cohort is terminal.
      for (;;) {
        const remaining = await pool.query(`SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1
          AND state->>'status' IN ('queued','running')`, [cfg.scope]);
        if (!remaining.rows[0].n) break;
        await sleep(500);
      }
    }
    q.stopWorker();
    process.send?.({ type: "done", pid: process.pid, calls, elapsedMs: Date.now() - started, results, initialStates, longWaitStates });
    await pool.end(); process.disconnect?.();
  });
} else {
  const root = fileURLToPath(new URL("../../../../", import.meta.url));
  const out = `${root}generated-artifacts/nuvia-shared-ai/`;
  await mkdir(out, { recursive: true });
  const prefix = `qa-shared-${randomUUID()}`;
  const scopes: string[] = [];
  const scope = () => { const s = `${prefix}-${scopes.length}`; scopes.push(s); return s; };
  const checks: Array<Record<string, unknown>> = [];
  const reports: unknown[] = [];
  const start = new Date().toISOString();
  const serviceSha256 = createHash("sha256").update(await readFile(new URL("./career-ai-shared.ts", import.meta.url))).digest("hex");
  function worker(cfg: Config) {
    const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--worker"],
      { stdio: ["ignore", "ignore", "pipe", "ipc"] });
    let paidStarts = 0, errors = "";
    const events: Array<{ at: number }> = [];
    let onProvider!: () => void;
    const dispatched = new Promise<void>(resolve => { onProvider = resolve; });
    const done = new Promise<any>((resolve, reject) => {
      child.on("message", (message: any) => {
        if (message.type === "provider") { paidStarts++; events.push({ at: message.at }); onProvider(); }
        if (message.type === "done") resolve({ ...message, events });
      });
      child.stderr?.on("data", b => { errors += b; });
      child.on("error", reject);
      child.on("exit", (code, signal) => { if (code !== 0 && signal !== "SIGKILL") reject(new Error(`mock worker failed ${code}: ${errors.slice(0, 100)}`)); });
    });
    child.send(cfg);
    return { child, done, dispatched, count: () => paidStarts };
  }
  const ledger = async (s: string) => {
    const r = await pool.query("SELECT state FROM career_ai_controls WHERE scope=$1", [s]);
    return r.rows[0]?.state;
  };
  const check = async (name: string, work: () => Promise<void>) => {
    if (process.argv.includes("--async30") && !name.startsWith("55 asynchronous")) return;
    if (!process.argv.includes("--async30") && name.startsWith("55 asynchronous")) return;
    if (process.argv.includes("--targeted") && !/queued process|shared supplier errors/.test(name)) return;
    const at = new Date().toISOString();
    try { await work(); checks.push({ name, status: "pass", at }); }
    catch (e) { checks.push({ name, status: "fail", at, error: e instanceof Error ? e.message : "UNKNOWN" }); }
  };
  try {
    await check("55 asynchronous distinct requests: 30-second mocked generation, automatic result beyond 210s", async () => {
      const s = scope();
      const workers = [0, 1, 2].map(k => worker({ scope: s, async30: true,
        indices: Array.from({ length: 55 }, (_, n) => n).filter(n => n % 3 === k),
        delay: 30_000, policy: { ...SHARED_AI_POLICY } }));
      const results = await Promise.all(workers.map(w => w.done));
      const items = results.flatMap(r => r.results), successes = items.filter((r: any) => r.status === "pass");
      const stats = (v: number[]) => {
        const sorted = [...v].sort((a, b) => a - b);
        return { p95Ms: sorted[Math.ceil(v.length * .95) - 1] ?? 0, maxMs: Math.max(0, ...v), sumMs: v.reduce((a, b) => a + b, 0) };
      };
      const global = await ledger(s);
      reports.push({ name: "async30-55-distinct", generationDelayMs: 30_000, processCount: 3, actualProviderCalls: 0,
        mockCalls: results.reduce((a, r) => a + r.calls, 0), globalCalls: global.calls,
        initial: { accepted: results.reduce((a, r) => a + r.initialStates.length, 0), failed: 0 },
        final: { complete: successes.length, failed: items.length - successes.length },
        waitingPast210: results.flatMap(r => r.longWaitStates), wait: stats(successes.map((r: any) => r.queuedMs)),
        total: stats(items.map((r: any) => r.totalMs)), initialAccept: stats(results.flatMap(r => r.initialStates.map((s: any) => s.acceptedMs))),
        statusRead: stats(successes.map((r: any) => r.maxReadMs)), results });
      assert.equal(successes.length, 55); assert.equal(global.calls, 55);
      assert.ok(successes.every((r: any) => r.factsPreserved));
      assert.ok(results.some(r => r.longWaitStates.length > 0));
    });
    await check("three processes merge 55 identical owner requests; restart reuses completed ciphertext", async () => {
      const s = scope();
      const workers = [0, 1, 2].map(k => worker({ scope: s, sameOwner: true, sameFacts: true, delay: 300,
        indices: Array.from({ length: k === 0 ? 19 : 18 }, (_, n) => n + k * 19) }));
      const results = await Promise.all(workers.map(w => w.done));
      assert.equal(results.reduce((a, r) => a + r.calls, 0), 1);
      assert.equal(results.flatMap(r => r.results).filter((r: any) => r.status === "pass").length, 55);
      const restart = await worker({ scope: s, sameOwner: true, sameFacts: true, indices: [0] }).done;
      assert.equal(restart.calls, 0); assert.equal(restart.results[0].reused, true);
      assert.equal((await ledger(s)).calls, 1);
      reports.push({ name: "same-55-and-restart", results, restart, globalCalls: 1 });
    });
    await check("same facts in different accounts are not shared; encrypted DB contains no selected originals", async () => {
      const s = scope();
      const r = await worker({ scope: s, sameFacts: true, indices: [0, 1] }).done;
      assert.equal(r.calls, 2); assert.ok(r.results.every((v: any) => v.factsPreserved));
      const rows = await pool.query("SELECT request_key,owner_key,state FROM career_ai_jobs WHERE scope=$1", [s]);
      assert.equal(new Set(rows.rows.map(r => r.owner_key)).size, 2);
      assert.doesNotMatch(JSON.stringify(rows.rows), /SYNTHETIC_ACTION|합성기업|synthetic-owner/);
      // Swap two encrypted responses: AAD must prevent cross-account disclosure.
      await pool.query("UPDATE career_ai_jobs SET state=jsonb_set(state,'{cipher}',$3::jsonb) WHERE scope=$1 AND request_key=$2",
        [s, rows.rows[0].request_key, JSON.stringify(rows.rows[1].state.cipher)]);
      const tampered = await worker({ scope: s, sameFacts: true, indices: [0, 1] }).done;
      assert.equal(tampered.calls, 0);
      assert.ok(tampered.results.some((v: any) => v.code === "AI_UNCERTAIN"));
      reports.push({ name: "account-isolation-and-AAD", providerCalls: r.calls, crossAccountDecryptRejected: true });
    });
    await check("global call budget survives two processes and restart without refund", async () => {
      const s = scope(), policy = { ...fast, maxClassCalls: 1 };
      const r = await Promise.all([worker({ scope: s, indices: [1], policy }).done, worker({ scope: s, indices: [2], policy }).done]);
      const restart = await worker({ scope: s, indices: [3], policy }).done;
      assert.equal(r.reduce((a, v) => a + v.calls, 0) + restart.calls, 1);
      assert.equal(restart.results[0].code, "AI_CLASS_LIMIT"); assert.equal((await ledger(s)).calls, 1);
      reports.push({ name: "shared-global-cap", results: r, restart });
    });
    await check("dispatched process killed: later worker reports uncertain and never dispatches again", async () => {
      const s = scope(), policy = { ...fast, providerTimeoutMs: 200, dispatchLeaseMs: 400 };
      const crashing = worker({ scope: s, indices: [0], sameOwner: true, mode: "crash", policy });
      await crashing.dispatched; crashing.child.kill("SIGKILL"); await sleep(450);
      const restart = await worker({ scope: s, indices: [0], sameOwner: true, policy }).done;
      assert.equal(restart.calls, 0); assert.equal(restart.results[0].code, "AI_UNCERTAIN");
      assert.equal((await ledger(s)).calls, 1);
      reports.push({ name: "crashed-dispatch-no-replay", restart, globalCalls: 1 });
    });
    await check("queued process killed before dispatch can be safely resumed by another worker", async () => {
      const s = scope(), policy = { ...fast, startIntervalMs: 5000 };
      await worker({ scope: s, indices: [0], policy }).done;
      const waiting = worker({ scope: s, indices: [1], policy });
      let queued = false;
      for (let n = 0; n < 250; n++) {
        const r = await pool.query("SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1 AND state->>'status'='queued'", [s]);
        if (r.rows[0].n) { queued = true; break; } await sleep(10);
      }
      assert.ok(queued); waiting.child.kill("SIGKILL");
      const restart = await worker({ scope: s, indices: [1], policy }).done;
      assert.equal(restart.calls, 1); assert.equal(restart.results[0].status, "pass");
      assert.equal((await ledger(s)).calls, 2);
      reports.push({ name: "queued-resume", restart, globalCalls: 2 });
    });
    await check("DB unavailable and inconsistent shared secrets fail closed with zero supplier calls", async () => {
      const s = scope();
      await worker({ scope: s, indices: [0] }).done;
      const wrong = await worker({ scope: s, indices: [1], secret: "another-synthetic-only-test-secret-2026" }).done;
      assert.equal(wrong.calls, 0); assert.equal(wrong.results[0].code, "AI_NOT_CONFIGURED");
      const offline = await worker({ scope: s, indices: [2], mode: "db-failure" }).done;
      assert.equal(offline.calls, 0); assert.equal(offline.results[0].code, "AI_COORDINATION_UNAVAILABLE");
      reports.push({ name: "closed-failure", wrong, offline });
    });
    await check("shared supplier errors: one bounded retry, restart quota circuit and uncertain timeout", async () => {
      const busyScope = scope();
      const busy = await worker({ scope: busyScope, indices: [0], mode: "busy-once" }).done;
      assert.equal(busy.calls, 2); assert.equal(busy.results[0].status, "pass"); assert.equal((await ledger(busyScope)).calls, 2);
      const quotaScope = scope();
      const quota = await worker({ scope: quotaScope, indices: [0], mode: "quota" }).done;
      const quotaRestart = await worker({ scope: quotaScope, indices: [1] }).done;
      assert.equal(quota.calls, 1); assert.equal(quotaRestart.calls, 0); assert.equal(quotaRestart.results[0].code, "AI_USAGE_LIMIT");
      const timeoutScope = scope(), policy = { ...fast, providerTimeoutMs: 50 };
      const timed = await worker({ scope: timeoutScope, indices: [0], mode: "timeout", policy }).done;
      const after = await worker({ scope: timeoutScope, indices: [0], policy }).done;
      assert.equal(timed.results[0].code, "AI_UNCERTAIN"); assert.equal(after.calls, 0); assert.equal(after.results[0].code, "AI_UNCERTAIN");
      reports.push({ name: "shared-errors", busy, quota, quotaRestart, timed, after });
    });
    await check("55 distinct requests across three processes: 12.5-second mocked generation within timeouts", async () => {
      const s = scope();
      const workers = [0, 1, 2].map(k => worker({ scope: s, indices: Array.from({ length: 55 }, (_, n) => n).filter(n => n % 3 === k),
        delay: 12_500, policy: { ...SHARED_AI_POLICY } }));
      const results = await Promise.all(workers.map(w => w.done));
      const items = results.flatMap(r => r.results), successes = items.filter((r: any) => r.status === "pass");
      const p95 = (v: number[]) => [...v].sort((a, b) => a - b)[Math.ceil(v.length * 0.95) - 1] ?? 0;
      const stats = (v: number[]) => ({ p95Ms: p95(v), maxMs: Math.max(0, ...v), sumMs: v.reduce((a, b) => a + b, 0) });
      reports.push({ name: "realistic-55-distinct", processCount: 3, generationDelayMs: 12_500,
        pass: successes.length, fail: items.length - successes.length, globalCalls: (await ledger(s)).calls,
        wait: stats(successes.map((r: any) => r.queuedMs)), endToEnd: stats(items.map((r: any) => r.totalMs)),
        cacheHits: successes.filter((r: any) => r.reused).length, results });
      assert.equal(successes.length, 55); assert.equal((await ledger(s)).calls, 55);
      assert.ok(items.every((r: any) => r.totalMs < SHARED_AI_POLICY.requestTimeoutMs));
    });
  } finally {
    const report = { kind: "REAL_POSTGRES_MULTI_PROCESS_MOCK_SUPPLIER_ONLY", startedAt: start, finishedAt: new Date().toISOString(),
      realAiCalls: 0, serviceSha256, counts: { pass: checks.filter(r => r.status === "pass").length, fail: checks.filter(r => r.status === "fail").length },
      environment: { node: process.version, platform: process.platform, db: "existing development PostgreSQL", policy: SHARED_AI_POLICY },
      checks, reports };
    const target = process.argv.includes("--async30") ? `${root}generated-artifacts/nuvia-async-ai/${process.argv.includes("--final") ? "async30-final" : "async30-qa"}.json` :
      `${out}${process.argv.includes("--targeted") ? "shared-targeted-retest.json" : "shared-qa.json"}`;
    await writeFile(target, JSON.stringify(report, null, 2));
    // Delete only this run's synthetic scopes, never actual users or other QA.
    for (const s of scopes) {
      await pool.query("DELETE FROM career_ai_jobs WHERE scope=$1", [s]);
      await pool.query("DELETE FROM career_ai_owners WHERE scope=$1", [s]);
      await pool.query("DELETE FROM career_ai_controls WHERE scope=$1", [s]);
    }
    await pool.end();
    console.log(JSON.stringify(report.counts));
    if (checks.some(r => r.status !== "pass")) process.exitCode = 1;
  }
}
