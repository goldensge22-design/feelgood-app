import { createCipheriv, createDecipheriv, createHash, createHmac, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { RequestCareerAiAssistanceBody, RequestCareerAiAssistanceResponse, type CareerAiAssistInput, type CareerAiAssistResponse } from "@workspace/api-zod";
import { CareerAiError, classifyAiError, type AiErrorCode } from "./career-ai-errors";
import { CLASS_AI_POLICY } from "./career-ai-queue";
import { aiIdentity } from "./career-ai-settings";
import { minimizedAiContext } from "./career-ai-input";
import type { AiTokenUsage } from "./career-ai";

type Policy = { [K in keyof typeof CLASS_AI_POLICY]: number } & { pollMs: number; waiterLeaseMs: number; dispatchLeaseMs: number };
export const SHARED_AI_POLICY: Policy = { ...CLASS_AI_POLICY, pollMs: 500, waiterLeaseMs: 5000, dispatchLeaseMs: 90_000 };
type Provider = (i: CareerAiAssistInput, signal: AbortSignal, usage: (u: AiTokenUsage) => void) => Promise<CareerAiAssistResponse>;
const connect = () => pool.connect();
type Client = Awaited<ReturnType<typeof connect>>;
type Event = Record<string, string | number | boolean | undefined>;
interface Control { at: number; calls: number; nextStart: number; busyUntil: number; quotaUntil: number; policyTag: string; inputTokens: number; outputTokens: number; }
interface Owner { at: number; minute: number; count: number; total: number; }
interface Job {
  status: "queued" | "running" | "complete" | "failed" | "uncertain" | "cancelled";
  created: number; waitingUntil: number; leaseUntil: number; started: number; attempts: number;
  token: string; cipher?: string; resultUntil?: number; error?: AiErrorCode; retryAt?: number;
  queuedMs?: number; usage?: AiTokenUsage; retainUntil: number;
  async?: boolean; inputCipher?: string; inputUntil?: number; autoRetry?: boolean;
  clientIds?: string[];
  providerIdentity?: string;
}
type Action = { kind: "wait" | "claim" | "result" | "error"; job: Job; now: number };
const abort = () => new DOMException("Cancelled", "AbortError");

/**
 * Shared durable admission/dispatch ledger. A global row lock protects ALL
 * claims, rate slots, attempts, owner budgets and circuits across processes.
 * Once a dispatch is committed it is NEVER automatically reclaimed after a
 * crash. This deliberately favours no duplicate billing over guessed recovery.
 */
export class SharedCareerAi {
  private key: Buffer;
  private keyTag: string;
  private policyTag: string;
  private workerTimer?: ReturnType<typeof setInterval>;
  private ticking = false;
  constructor(
    private provider: Provider,
    private emit: (event: Event) => void,
    private secret: string,
    readonly scope = "career-ai-shared-v2",
    readonly policy: Policy = { ...SHARED_AI_POLICY },
    private identity = aiIdentity(),
  ) {
    if (secret.length < 32) throw new CareerAiError("AI_NOT_CONFIGURED");
    this.key = Buffer.from(hkdfSync("sha256", secret, "nuvia-ai-cache-v2", "encryption", 32));
    this.keyTag = createHash("sha256").update(this.key).digest("hex");
    this.policyTag = createHash("sha256").update(JSON.stringify(policy)).digest("hex");
  }
  private digest(data: unknown) { return createHmac("sha256", this.secret).update(JSON.stringify(data)).digest("hex"); }
  private seal(response: CareerAiAssistResponse, owner: string, key: string) {
    return this.encrypt(response, `${owner}:${key}`);
  }
  private encrypt(value: unknown, aad: string) {
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(aad));
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  }
  private decrypt(value: string, aad: string): unknown {
    const bytes = Buffer.from(value, "base64");
    const decipher = createDecipheriv("aes-256-gcm", this.key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(aad)); decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
  }
  private open(value: string, owner: string, key: string): CareerAiAssistResponse {
    try {
      return RequestCareerAiAssistanceResponse.parse(this.decrypt(value, `${owner}:${key}`));
    } catch { throw new CareerAiError("AI_UNCERTAIN"); }
  }
  private log(event: string, extra: Event = {}) { this.emit({ event, ...this.identity, coordinator: "postgres-v2", ...extra }); }
  private async transaction<T>(work: (c: Client, global: Control, now: number) => Promise<T>): Promise<T> {
    const c = await connect();
    try {
      await c.query("BEGIN");
      // No startup DDL: the three additive tables are in the Drizzle schema.
      await c.query("INSERT INTO career_ai_controls(scope,key_tag,state) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING",
        [this.scope, this.keyTag, JSON.stringify({ at: 0, calls: 0, nextStart: 0, busyUntil: 0, quotaUntil: 0, policyTag: this.policyTag, inputTokens: 0, outputTokens: 0 })]);
      const selected = await c.query("SELECT key_tag,state,(extract(epoch FROM clock_timestamp())*1000)::float8 AS now FROM career_ai_controls WHERE scope=$1 FOR UPDATE", [this.scope]);
      const row = selected.rows[0], global = row.state as Control, now = Number(row.now);
      if (row.key_tag !== this.keyTag || global.policyTag !== this.policyTag) throw new CareerAiError("AI_NOT_CONFIGURED");
      if (now - global.at >= this.policy.classMs) { global.at = now; global.calls = 0; global.inputTokens = 0; global.outputTokens = 0; }
      const result = await work(c, global, now);
      await c.query("UPDATE career_ai_controls SET state=$2::jsonb WHERE scope=$1", [this.scope, JSON.stringify(global)]);
      await c.query("COMMIT"); return result;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      if (e instanceof CareerAiError) throw e;
      // A missing table, DB outage, corruption or uncertain commit must never
      // fall back to an uncoordinated provider request.
      this.log("coordination_unavailable");
      throw new CareerAiError("AI_COORDINATION_UNAVAILABLE", 10);
    } finally { c.release(); }
  }
  private async put(c: Client, key: string, owner: string, job: Job) {
    await c.query(`INSERT INTO career_ai_jobs(request_key,scope,owner_key,state) VALUES($1,$2,$3,$4::jsonb)
      ON CONFLICT(request_key) DO UPDATE SET state=excluded.state WHERE career_ai_jobs.owner_key=excluded.owner_key`,
    [key, this.scope, owner, JSON.stringify(job)]);
  }
  private async peek(key: string, owner: string): Promise<Action | null> {
    try {
      const result = await pool.query(`SELECT state,(extract(epoch FROM clock_timestamp())*1000)::float8 AS now
        FROM career_ai_jobs WHERE request_key=$1 AND owner_key=$2 AND scope=$3`, [key, owner, this.scope]);
      if (!result.rows.length) return null;
      const job = result.rows[0].state as Job, now = Number(result.rows[0].now);
      if (job.status === "complete" && job.cipher && (job.resultUntil ?? 0) > now) return { kind: "result", job, now };
      if (job.status === "running" && job.leaseUntil > now) return { kind: "wait", job, now };
      if (job.status === "uncertain") return { kind: "error", job, now };
      if (job.status === "failed" && (!["AI_PROVIDER_BUSY", "AI_USAGE_LIMIT"].includes(job.error ?? "") || job.attempts >= 2 || (job.retryAt ?? Infinity) > now))
        return { kind: "error", job, now };
      if (job.status === "queued") {
        await pool.query(`UPDATE career_ai_jobs SET state=jsonb_set(state,'{waitingUntil}',to_jsonb($3::float8))
          WHERE request_key=$1 AND owner_key=$2 AND state->>'status'='queued'`, [key, owner, now + this.policy.waiterLeaseMs]);
        const ahead = await pool.query(`SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1
          AND state->>'status'='queued' AND (state->>'waitingUntil')::float8>$2
          AND (state->>'created')::float8<$3`, [this.scope, now, job.created]);
        if (ahead.rows[0].n && now - job.created < this.policy.queueWaitMs) return { kind: "wait", job, now };
      }
      return null; // Every dispatch still requires the serialized DB transaction.
    } catch { throw new CareerAiError("AI_COORDINATION_UNAVAILABLE", 10); }
  }
  private async step(key: string, owner: string, asyncInput?: CareerAiAssistInput, enqueueOnly = false, clientId?: string): Promise<Action> {
    return this.transaction(async (c, global, now) => {
      // Remove only expired encrypted result bytes. Keep dispatch tombstones
      // so cache expiry cannot accidentally authorize another paid generation.
      await c.query(`UPDATE career_ai_jobs SET state=state-'cipher'
        WHERE scope=$1 AND (state->>'resultUntil')::float8 < $2 AND state ? 'cipher'`, [this.scope, now]);
      const selected = await c.query("SELECT state FROM career_ai_jobs WHERE request_key=$1 AND owner_key=$2 AND scope=$3", [key, owner, this.scope]);
      let job = selected.rows[0]?.state as Job | undefined;
      if (job && clientId && !job.clientIds?.includes(clientId)) {
        job.clientIds = [...(job.clientIds ?? []), clientId].slice(-16);
        await this.put(c, key, owner, job);
      }
      if (job?.status === "complete") return { kind: job.cipher && (job.resultUntil ?? 0) > now ? "result" : "error",
        job: job.cipher ? job : { ...job, error: "AI_RESULT_EXPIRED" }, now };
      if (job?.status === "uncertain") return { kind: "error", job, now };
      if (job?.status === "cancelled") {
        if (asyncInput && job.attempts === 0) { job.status = "queued"; job.created = now; }
        else return { kind: "error", job, now };
      }
      if (job?.status === "running") {
        if (job.leaseUntil <= now) {
          job = { ...job, status: "uncertain", error: "AI_UNCERTAIN" };
          delete job.inputCipher;
          await this.put(c, key, owner, job);
          this.log("orphan_dispatch_held", { attempts: job.attempts });
          return { kind: "error", job, now };
        }
        return { kind: "wait", job, now };
      }
      if (job?.status === "failed") {
        // Only a DEFINITE provider rate rejection is eligible to retry later.
        // Timeout/network/schema errors are never silently billed again.
        if (!["AI_PROVIDER_BUSY", "AI_USAGE_LIMIT"].includes(job.error ?? "") || now < (job.retryAt ?? Infinity) || job.attempts >= 2) return { kind: "error", job, now };
        job.status = "queued"; job.created = now;
      }
      if (!job) {
        if (global.quotaUntil > now) throw new CareerAiError("AI_USAGE_LIMIT", Math.ceil((global.quotaUntil - now) / 1000));
        if (global.calls >= this.policy.maxClassCalls) throw new CareerAiError("AI_CLASS_LIMIT", Math.ceil((global.at + this.policy.classMs - now) / 1000));
        const count = await c.query(`SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1
          AND state->>'status'='queued' AND ((state->>'async')::boolean IS TRUE OR (state->>'waitingUntil')::float8 > $2)`, [this.scope, now]);
        if (count.rows[0].n >= this.policy.queueSize) throw new CareerAiError("AI_QUEUE_FULL", 15);
        const own = await c.query("SELECT state FROM career_ai_owners WHERE owner_key=$1 AND scope=$2", [owner, this.scope]);
        const record: Owner = own.rows[0]?.state ?? { at: now, minute: now, count: 0, total: 0 };
        if (now - record.at >= this.policy.classMs) { record.at = now; record.total = 0; }
        if (now - record.minute >= 60_000) { record.minute = now; record.count = 0; }
        if (record.count >= this.policy.ownerPerMinute) throw new CareerAiError("AI_LOCAL_LIMIT", Math.ceil((record.minute + 60_000 - now) / 1000));
        if (record.total >= this.policy.ownerPerClass) throw new CareerAiError("AI_CLASS_LIMIT", Math.ceil((record.at + this.policy.classMs - now) / 1000));
        record.count++; record.total++;
        await c.query(`INSERT INTO career_ai_owners(owner_key,scope,state) VALUES($1,$2,$3::jsonb)
          ON CONFLICT(owner_key) DO UPDATE SET state=excluded.state`, [owner, this.scope, JSON.stringify(record)]);
        job = { status: "queued", created: now, waitingUntil: 0, leaseUntil: 0, started: 0, attempts: 0,
          token: "", retainUntil: now + 30 * 24 * 60 * 60_000 };
      }
      if (asyncInput && (!job.async || !job.inputCipher)) {
        job.async = true;
        job.inputCipher = this.encrypt(asyncInput, `input:${owner}:${key}`);
        job.inputUntil = now + this.policy.cacheMs;
        job.providerIdentity = JSON.stringify(this.identity);
      }
      if (clientId && !job.clientIds?.includes(clientId)) job.clientIds = [...(job.clientIds ?? []), clientId].slice(-16);
      job.waitingUntil = now + this.policy.waiterLeaseMs;
      if (global.quotaUntil > now) {
        job.status = "failed"; job.error = "AI_USAGE_LIMIT"; await this.put(c, key, owner, job);
        return { kind: "error", job, now };
      }
      if (!job.async && now - job.created > this.policy.queueWaitMs) {
        // No dispatch yet: a future explicit request can safely wait again.
        job.created = now; await this.put(c, key, owner, job);
        return { kind: "error", job: { ...job, error: "AI_QUEUE_FULL" }, now };
      }
      if (enqueueOnly) { await this.put(c, key, owner, job); return { kind: "wait", job, now }; }
      // Exclude disconnected queued waiters; another server can resume them.
      const ahead = await c.query(`SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1 AND request_key<>$2
        AND state->>'status'='queued' AND ((state->>'async')::boolean IS TRUE OR (state->>'waitingUntil')::float8 > $3)
        AND (state->>'created')::float8 < $4`, [this.scope, key, now, job.created]);
      const active = await c.query(`SELECT count(*)::int AS n FROM career_ai_jobs WHERE scope=$1
        AND state->>'status'='running' AND (state->>'leaseUntil')::float8 > $2`, [this.scope, now]);
      if (ahead.rows[0].n || active.rows[0].n >= this.policy.concurrency || global.nextStart > now || global.busyUntil > now) {
        await this.put(c, key, owner, job); return { kind: "wait", job, now };
      }
      if (global.calls >= this.policy.maxClassCalls) throw new CareerAiError("AI_CLASS_LIMIT", Math.ceil((global.at + this.policy.classMs - now) / 1000));
      // Commit dispatch intent BEFORE touching the supplier. No other process
      // can reclaim running/uncertain jobs, even after a lease expires.
      global.calls++; global.nextStart = now + this.policy.startIntervalMs;
      job = { ...job, status: "running", token: randomUUID(), attempts: job.attempts + 1, started: now,
        queuedMs: now - job.created, leaseUntil: now + this.policy.dispatchLeaseMs };
      await this.put(c, key, owner, job);
      return { kind: "claim", job, now };
    });
  }
  private async complete(key: string, owner: string, token: string, response: CareerAiAssistResponse | null, error: CareerAiError | null, usage?: AiTokenUsage) {
    return this.transaction(async (c, global, now) => {
      const selected = await c.query("SELECT state FROM career_ai_jobs WHERE request_key=$1 AND owner_key=$2 AND scope=$3", [key, owner, this.scope]);
      const job = selected.rows[0]?.state as Job | undefined;
      if (!job || job.token !== token || !["running", "uncertain"].includes(job.status)) throw new CareerAiError("AI_UNCERTAIN");
      if (usage) { job.usage = usage; global.inputTokens += usage.inputTokens; global.outputTokens += usage.outputTokens; }
      if (response) {
        job.status = "complete"; job.cipher = this.seal(response, owner, key); job.resultUntil = now + this.policy.cacheMs; delete job.error;
        delete job.inputCipher;
      } else {
        job.status = ["AI_UNCERTAIN", "AI_TIMEOUT", "AI_UPSTREAM_FAILED"].includes(error!.code) ? "uncertain" : "failed";
        job.error = error!.code; job.retryAt = now + Math.max(2, error!.retryAfter) * 1000;
        job.autoRetry = error!.code === "AI_PROVIDER_BUSY" && error!.retryAfter <= 10 && job.attempts < 2;
        if (!job.autoRetry) delete job.inputCipher;
        if (error!.code === "AI_PROVIDER_BUSY") global.busyUntil = Math.max(global.busyUntil, job.retryAt);
        if (error!.code === "AI_USAGE_LIMIT") global.quotaUntil = now + this.policy.cooldownMs;
      }
      await this.put(c, key, owner, job);
      this.log("shared_finish", { status: job.status, code: job.error, attempts: job.attempts, queuedMs: job.queuedMs,
        totalCalls: global.calls, totalInputTokens: global.inputTokens, totalOutputTokens: global.outputTokens });
    });
  }
  /** Start/recover only previously consented async jobs. Never new requests. */
  startWorker() {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => { void this.tick().catch(() => this.log("worker_coordination_unavailable")); }, Math.max(100, this.policy.pollMs));
    this.workerTimer.unref();
    void this.tick().catch(() => this.log("worker_coordination_unavailable"));
  }
  stopWorker() { if (this.workerTimer) clearInterval(this.workerTimer); this.workerTimer = undefined; }
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const rows = await pool.query(`SELECT request_key,owner_key,state FROM career_ai_jobs WHERE scope=$1
        AND (state->>'async')::boolean IS TRUE AND
        (state->>'status'='queued' OR (state->>'status'='failed' AND (state->>'autoRetry')::boolean IS TRUE
          AND (state->>'retryAt')::float8 <= extract(epoch FROM clock_timestamp())*1000))
        ORDER BY (state->>'created')::float8 LIMIT $2`, [this.scope, this.policy.concurrency]);
      for (const row of rows.rows) {
        const job = row.state as Job;
        // A misconfigured replica must never process another provider/model's
        // queued consent snapshot (e.g. managed vs production OpenAI BYOK).
        if (job.providerIdentity !== JSON.stringify(this.identity)) {
          this.log("worker_model_mismatch"); continue;
        }
        let input: CareerAiAssistInput;
        try {
          if (!job.inputCipher || (job.inputUntil ?? 0) < Date.now()) throw new Error("expired");
          input = RequestCareerAiAssistanceBody.parse(this.decrypt(job.inputCipher, `input:${row.owner_key}:${row.request_key}`));
        } catch {
          await this.transaction(async (c) => {
            // Fence against a concurrent claim/completion; never replace it.
            await c.query(`UPDATE career_ai_jobs SET state=(state-'inputCipher') ||
              '{"status":"failed","error":"AI_RESULT_EXPIRED"}'::jsonb
              WHERE request_key=$1 AND scope=$2 AND state->>'status' IN ('queued','failed')`, [row.request_key, this.scope]);
          }); continue;
        }
        let next: Action;
        try { next = await this.step(row.request_key, row.owner_key); }
        catch (e) {
          if (e instanceof CareerAiError && ["AI_CLASS_LIMIT", "AI_USAGE_LIMIT"].includes(e.code)) {
            await this.transaction(async c => {
              await c.query(`UPDATE career_ai_jobs SET state=(state-'inputCipher') ||
                jsonb_build_object('status','failed','error',$3::text)
                WHERE request_key=$1 AND scope=$2 AND state->>'status'='queued'`, [row.request_key, this.scope, e.code]);
            }); continue;
          }
          throw e;
        }
        if (next.kind === "claim") {
          this.log("shared_dispatch", { attempts: next.job.attempts, queuedMs: next.job.queuedMs ?? 0 });
          void this.dispatch(row.request_key, row.owner_key, input, next.job).catch(() => this.log("completion_not_committed"));
        }
      }
    } finally { this.ticking = false; }
  }
  private keys(ownerId: string, input: CareerAiAssistInput) {
    const context = minimizedAiContext(input);
    if (JSON.stringify(context).length > this.policy.maxContextChars) throw new CareerAiError("AI_INPUT_LIMIT");
    const owner = this.digest({ scope: this.scope, ownerId });
    return { owner, key: this.digest({ scope: this.scope, owner, identity: this.identity, context }) };
  }
  async submit(ownerId: string, selected: CareerAiAssistInput, clientId?: string) {
    const { owner, key } = this.keys(ownerId, selected);
    // Persist ONLY the task's consented/minimal input, encrypted at application
    // level. No account ID, cookie, unselected memo or raw assessment is added.
    const voice = selected.task === "voice";
    const input: CareerAiAssistInput = { ...selected,
      application: voice ? { company: "", job: "", question: "", body: "" } : selected.application,
      strengths: voice ? [] : selected.strengths, experiences: voice ? [] : selected.experiences,
      userAnswers: voice ? [] : selected.userAnswers,
      voiceSources: voice ? selected.voiceSources : [],
      voiceRules: voice || selected.task === "draft" ? selected.voiceRules.filter(r => r.enabled) : [],
      coachPrompt: selected.task === "coach" ? selected.coachPrompt : "",
    };
    await this.step(key, owner, input, true, clientId);
    this.startWorker();
    return this.status(ownerId, key);
  }
  async byClient(ownerId: string, clientId: string) {
    const owner = this.digest({ scope: this.scope, ownerId });
    const result = await pool.query(`SELECT request_key FROM career_ai_jobs WHERE owner_key=$1 AND scope=$2
      AND (state->'clientIds') ? $3 LIMIT 1`, [owner, this.scope, clientId]);
    return result.rows.length ? this.status(ownerId, result.rows[0].request_key) : null;
  }
  async status(ownerId: string, key: string) {
    const owner = this.digest({ scope: this.scope, ownerId });
    const selected = await pool.query(`SELECT state,(extract(epoch FROM clock_timestamp())*1000)::float8 AS now
      FROM career_ai_jobs WHERE request_key=$1 AND owner_key=$2 AND scope=$3`, [key, owner, this.scope]);
    if (!selected.rows.length) return null;
    let job = selected.rows[0].state as Job;
    const now = Number(selected.rows[0].now);
    if (job.status === "running" && job.leaseUntil <= now) job = (await this.step(key, owner)).job;
    if (job.status === "complete" && (!job.cipher || (job.resultUntil ?? 0) <= now)) {
      return { id: key, state: "failed" as const, error: "AI_RESULT_EXPIRED", pollAfterMs: 2000, queuedMs: job.queuedMs ?? 0, elapsedMs: now - job.created };
    }
    this.startWorker();
    const state = job.status === "failed" && job.autoRetry && job.attempts < 2 ? "queued" as const : job.status;
    return { id: key, state, pollAfterMs: 2000, queuedMs: job.queuedMs ?? now - job.created,
      elapsedMs: now - job.created, ...(job.error ? { error: job.error } : {}),
      ...(job.status === "complete" && job.cipher ? { response: this.open(job.cipher, owner, key) } : {}) };
  }
  async cancelJob(ownerId: string, key: string) {
    const owner = this.digest({ scope: this.scope, ownerId });
    await this.transaction(async c => {
      await c.query(`UPDATE career_ai_jobs SET state=(state-'inputCipher') || '{"status":"cancelled"}'::jsonb
        WHERE request_key=$1 AND owner_key=$2 AND scope=$3 AND state->>'status'='queued'`, [key, owner, this.scope]);
    });
    return this.status(ownerId, key);
  }
  private async dispatch(key: string, owner: string, input: CareerAiAssistInput, job: Job) {
    const controller = new AbortController();
    let usage: AiTokenUsage | undefined;
    let response: CareerAiAssistResponse | null = null, error: CareerAiError | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = this.provider(input, controller.signal, u => { usage = u; this.log("provider_usage", { ...u }); });
      response = RequestCareerAiAssistanceResponse.parse(await Promise.race([
        work,
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new CareerAiError("AI_UNCERTAIN")); }, this.policy.providerTimeoutMs); }),
      ]));
    } catch (e) {
      error = controller.signal.aborted ? new CareerAiError("AI_UNCERTAIN") : classifyAiError(e);
      this.log("provider_error", { code: error.code, upstreamStatus: error.upstreamStatus, upstreamCode: error.upstreamCode });
    } finally { if (timer) clearTimeout(timer); }
    if (!usage) this.log("usage_unknown");
    // A disconnected browser must not cancel a dispatched billable job. Finish
    // and persist it so the next request can reuse it after reconnection.
    await this.complete(key, owner, job.token, response, error, usage);
  }
  async request(ownerId: string, input: CareerAiAssistInput, signal: AbortSignal) {
    if (signal.aborted) throw abort();
    const context = minimizedAiContext(input);
    if (JSON.stringify(context).length > this.policy.maxContextChars) throw new CareerAiError("AI_INPUT_LIMIT");
    const owner = this.digest({ scope: this.scope, ownerId });
    const key = this.digest({ scope: this.scope, owner, identity: this.identity, context });
    const started = Date.now();
    let ownClaim = false, retry = 0;
    while (!signal.aborted && Date.now() - started < this.policy.requestTimeoutMs) {
      const action = await this.peek(key, owner) ?? await this.step(key, owner);
      if (action.kind === "result") {
        this.log(ownClaim ? "shared_result" : "shared_reuse", { queuedMs: action.job.queuedMs ?? 0 });
        return { response: { ...this.open(action.job.cipher!, owner, key), sourceFingerprint: input.sourceFingerprint },
          reused: !ownClaim, queuedMs: action.job.queuedMs ?? 0 };
      }
      if (action.kind === "error") {
        if (action.job.error === "AI_PROVIDER_BUSY" && action.job.attempts < 2 &&
          (action.job.retryAt ?? Infinity) - action.now <= 10_000 && retry++ === 0) {
          await this.pause(Math.max(0, (action.job.retryAt ?? action.now) - action.now), signal); continue;
        }
        throw new CareerAiError(action.job.error ?? "AI_UNCERTAIN", Math.max(0, Math.ceil(((action.job.retryAt ?? action.now) - action.now) / 1000)));
      }
      if (action.kind === "claim") {
        ownClaim = true; this.log("shared_dispatch", { attempts: action.job.attempts, queuedMs: action.job.queuedMs ?? 0 });
        // No unhandled rejection, no fallback or re-generation on DB failure.
        void this.dispatch(key, owner, structuredClone(input), action.job).catch(() => this.log("completion_not_committed"));
      }
      await this.pause(this.policy.pollMs + Math.floor(Math.random() * this.policy.pollMs / 4), signal);
    }
    if (signal.aborted) throw abort();
    throw new CareerAiError("AI_COORDINATION_WAIT", 5);
  }
  private async pause(ms: number, signal: AbortSignal) {
    if (signal.aborted) throw abort();
    await new Promise<void>((resolve, reject) => {
      const cancel = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); reject(abort()); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, ms);
      signal.addEventListener("abort", cancel, { once: true });
    });
  }
}
