/** Mock supplier only: realistic latency and independent OS process boundaries. */
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import type { CareerAiAssistInput, CareerAiAssistResponse } from "@workspace/api-zod";
import { CareerAiQueue, CLASS_AI_POLICY } from "./career-ai-queue";

const input = (n: number): CareerAiAssistInput => ({
  task: "draft", locale: "ko", writingLanguage: "ko", sourceFingerprint: `synthetic-${n}`,
  confirmed: true, factsConfirmed: true, coachPrompt: "", strengths: [], userAnswers: [], voiceSources: [], voiceRules: [],
  application: { company: "가상기업", job: "교육운영", question: "판단 과정", body: "" },
  experiences: [{ title: `합성 모의훈련 ${n}`, nature: "simulation", context: "class_simulation", cardType: "job_scenario",
    source: "synthetic", sourceVersion: "v1", sourceTitle: "가상 QA", jobConnection: null,
    fields: { situation: "", roleGoal: "", action: `모의 안내 ${n}을 대조했다.`, selectionReason: "", changed: "",
      result: "다른 대상을 확인했다", learning: "", resultEvidence: "", supportProvided: "", independentSteps: [] } }],
});
const response = (i: CareerAiAssistInput): CareerAiAssistResponse => ({
  task: i.task, sourceFingerprint: i.sourceFingerprint, coachQuestion: "", candidates: [], feedback: [], voiceRules: [], notice: "합성 모의 결과",
});
if (process.argv.includes("--worker")) {
  let calls = 0;
  const q = new CareerAiQueue(async i => { calls++; return response(i); }, () => {}, { ...CLASS_AI_POLICY, maxClassCalls: 1 });
  const a = await q.request("same-synthetic-owner", input(0), new AbortController().signal);
  const b = await q.request("same-synthetic-owner", input(0), new AbortController().signal);
  let blocked = false;
  try { await q.request("another-synthetic-owner", input(1), new AbortController().signal); } catch { blocked = true; }
  console.log(JSON.stringify({ pid: process.pid, calls, ownCacheReused: b.reused, localClassLimitBlocked: blocked, received: !!a.response }));
} else {
  const begunAt = new Date().toISOString();
  const delayMs = 12_500; // Conservative synthetic near observed ~6–13s generation.
  const p95 = (a: number[]) => a.length ? [...a].sort((x, y) => x - y)[Math.ceil(a.length * 0.95) - 1] : 0;
  const stats = (a: number[]) => ({ p95Ms: p95(a), maxMs: Math.max(0, ...a), sumMs: a.reduce((x, y) => x + y, 0) });
  async function scenario(merged: boolean) {
    let calls = 0, active = 0, peak = 0;
    const waits: number[] = [], totals: number[] = [];
    const q = new CareerAiQueue(async (i, signal) => {
      calls++; active++; peak = Math.max(peak, active);
      try { await sleep(delayMs, undefined, { signal }); return response(i); } finally { active--; }
    }, () => {});
    const started = Date.now();
    const results = await Promise.all(Array.from({ length: 55 }, async (_, n) => {
      const at = Date.now();
      try {
        const r = await q.request(merged ? "same-synthetic-owner" : `synthetic-owner-${n}`, input(merged ? 0 : n), new AbortController().signal);
        waits.push(r.queuedMs); totals.push(Date.now() - at);
        return { status: "pass", queuedMs: r.queuedMs, totalMs: Date.now() - at };
      } catch (e) {
        return { status: "fail", code: e instanceof Error ? e.message : "UNKNOWN", totalMs: Date.now() - at };
      }
    }));
    return {
      scenario: merged ? "same-account-same-request-55" : "55-distinct-accounts-and-requests",
      data: "synthetic simulation only", supplier: "MOCK_DELAY_NOT_REAL_AI", requests: 55, providerCalls: calls,
      peak, expectedCalls: merged ? 1 : 55, pass: results.filter(r => r.status === "pass").length,
      fail: results.filter(r => r.status !== "pass").length, elapsedMs: Date.now() - started,
      wait: stats(waits), endToEnd: stats(totals), cacheHits: q.totals.cacheHits, inFlightJoins: q.totals.joined,
      withinServer200sAndBrowser210s: totals.length === 55 && Math.max(...totals) < CLASS_AI_POLICY.requestTimeoutMs,
      results,
    };
  }
  const same = await scenario(true);
  const distinct = await scenario(false);
  const worker = () => new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--worker"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "", errors = "";
    child.stdout.on("data", b => { output += b; });
    child.stderr.on("data", b => { errors += b; });
    child.on("error", reject);
    child.on("exit", code => {
      if (code !== 0) return reject(new Error(`Synthetic worker failed (${code}); ${errors.slice(0, 120)}`));
      try { resolve(JSON.parse(output)); } catch { reject(new Error("Invalid synthetic worker report")); }
    });
  });
  const parallelWorkers = await Promise.all([worker(), worker()]);
  const restartedWorker = await worker();
  const report = {
    begunAt, finishedAt: new Date().toISOString(), kind: "MOCK_REALISTIC_DELAY_NO_PAID_CALLS",
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpuCount: os.cpus().length,
      concurrency: 4, delayMs, policy: CLASS_AI_POLICY, actualAiCalls: 0 },
    scenarios: [same, distinct],
    processBoundary: {
      kind: "THREE_INDEPENDENT_OS_PROCESSES_MOCK_ONLY", parallelWorkers, restartedWorker,
      sameRequestProviderCallsAcrossTwoProcesses: parallelWorkers.reduce((sum, r) => sum + Number(r.calls), 0),
      sameRequestProviderCallsIncludingRestart: parallelWorkers.reduce((sum, r) => sum + Number(r.calls), Number(restartedWorker.calls)),
      crossProcessDedupeMaintained: false, restartDedupeMaintained: false, sharedGlobalCapMaintained: false,
      verdict: "CONFIRMED_OPERATIONAL_LIMITATION_SHARED_COORDINATOR_REQUIRED_NOT_A_PASS_FOR_MULTI_PROCESS_OPERATION",
    },
    limitations: ["55 identifiers are authenticated-owner inputs to the service, not 55 real Clerk/browser sessions.",
      "HTTP/proxy production timeout and deployed BYOK provider were not exercised.",
      "Shared persistent idempotency/rate budgets are not implemented by this process-local patch."],
  };
  const out = fileURLToPath(new URL("../../../../generated-artifacts/nuvia-classroom/", import.meta.url));
  await mkdir(out, { recursive: true });
  await writeFile(`${out}realistic-load.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ file: "generated-artifacts/nuvia-classroom/realistic-load.json",
    scenarios: report.scenarios.map(r => ({ scenario: r.scenario, pass: r.pass, fail: r.fail, calls: r.providerCalls, wait: r.wait, endToEnd: r.endToEnd })),
    operationalSharedBoundary: "not_guaranteed" }));
}
