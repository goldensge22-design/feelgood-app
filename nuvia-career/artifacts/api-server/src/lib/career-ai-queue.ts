import { createHmac, randomBytes, randomUUID } from "node:crypto";
import type { CareerAiAssistInput, CareerAiAssistResponse } from "@workspace/api-zod";
import { CareerAiError, classifyAiError } from "./career-ai-errors";
import { minimizedAiContext } from "./career-ai-input";
import type { AiTokenUsage } from "./career-ai";
import { aiIdentity } from "./career-ai-settings";

export const CLASS_AI_POLICY = {
  concurrency: 4, queueSize: 60, startIntervalMs: 2000, queueWaitMs: 180_000,
  providerTimeoutMs: 45_000, requestTimeoutMs: 200_000, cacheMs: 5 * 60 * 60_000,
  cacheSize: 1100, maxContextChars: 12_000, ownerPerMinute: 8, ownerPerClass: 30,
  classMs: 5 * 60 * 60_000, maxClassCalls: 1100, cooldownMs: 300_000,
} as const;
type Policy = { [K in keyof typeof CLASS_AI_POLICY]: number };
type Provider = (input: CareerAiAssistInput, signal: AbortSignal, usage: (u: AiTokenUsage) => void) => Promise<CareerAiAssistResponse>;
type Event = Record<string, string | number | boolean | undefined>;
type Result = { response: CareerAiAssistResponse; reused: boolean; queuedMs: number };
type Entry = {
  key: string; id: string; input: CareerAiAssistInput; at: number; controller: AbortController;
  promise: Promise<Result>; resolve: (r: Result) => void; reject: (e: unknown) => void;
  subscribers: number; started: boolean;
};
const abortError = () => new DOMException("Cancelled", "AbortError");

/**
 * Process-local safeguard. Private cache/queue keys are HMACs, never global by
 * student text. A shared durable coordinator is required before multi-replica
 * operation; see classroom handoff. No student context is sent to telemetry.
 */
export class CareerAiQueue {
  private readonly secret = randomBytes(32);
  private cache = new Map<string, { until: number; response?: CareerAiAssistResponse; error?: CareerAiError }>();
  private pending = new Map<string, Entry>();
  private waiting: Entry[] = [];
  private owners = new Map<string, { at: number; minute: number; count: number; total: number }>();
  private active = 0;
  private nextStart = 0;
  private busyUntil = 0;
  private quotaUntil = 0;
  private classAt = Date.now();
  private classCalls = 0;
  readonly totals = { providerCalls: 0, cacheHits: 0, joined: 0, queued: 0, errors: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
  constructor(
    private provider: Provider,
    private emit: (event: Event) => void,
    readonly policy: Policy = { ...CLASS_AI_POLICY },
    private identity = aiIdentity(),
  ) {}
  private digest(data: unknown) { return createHmac("sha256", this.secret).update(JSON.stringify(data)).digest("hex"); }
  private log(event: string, extra: Event = {}) {
    this.emit({ event, ...this.identity, active: this.active, queueDepth: this.waiting.length, ...this.totals, ...extra });
  }
  async request(owner: string, input: CareerAiAssistInput, signal: AbortSignal): Promise<Result> {
    if (signal.aborted) throw abortError();
    const context = minimizedAiContext(input);
    if (JSON.stringify(context).length > this.policy.maxContextChars) throw new CareerAiError("AI_INPUT_LIMIT");
    const key = this.digest({ owner, identity: this.identity, context });
    const now = Date.now();
    for (const [k, v] of this.cache) if (v.until <= now) this.cache.delete(k);
    const cached = this.cache.get(key);
    if (cached) {
      if (cached.error) { this.log("error_reused_no_call", { code: cached.error.code }); throw cached.error; }
      this.totals.cacheHits++;
      this.log("cache_hit");
      return { response: { ...structuredClone(cached.response!), sourceFingerprint: input.sourceFingerprint }, reused: true, queuedMs: 0 };
    }
    let entry = this.pending.get(key);
    if (!entry) {
      if (now < this.quotaUntil) throw new CareerAiError("AI_USAGE_LIMIT", Math.ceil((this.quotaUntil - now) / 1000));
      if (this.waiting.length >= this.policy.queueSize) throw new CareerAiError("AI_QUEUE_FULL", 15);
      const ownerKey = this.digest(owner);
      for (const [k, v] of this.owners) if (now - v.at >= this.policy.classMs) this.owners.delete(k);
      if (this.owners.size >= 2000 && !this.owners.has(ownerKey)) throw new CareerAiError("AI_QUEUE_FULL", 60);
      const record = this.owners.get(ownerKey) ?? { at: now, minute: now, count: 0, total: 0 };
      if (now - record.minute >= 60_000) { record.minute = now; record.count = 0; }
      if (record.count >= this.policy.ownerPerMinute) throw new CareerAiError("AI_LOCAL_LIMIT", Math.ceil((record.minute + 60_000 - now) / 1000));
      if (record.total >= this.policy.ownerPerClass) throw new CareerAiError("AI_CLASS_LIMIT", Math.ceil((record.at + this.policy.classMs - now) / 1000));
      record.count++; record.total++; this.owners.set(ownerKey, record);
      let resolve!: Entry["resolve"], reject!: Entry["reject"];
      const promise = new Promise<Result>((yes, no) => { resolve = yes; reject = no; });
      // Prevent unhandled rejection if a caller disconnects before dequeue.
      void promise.catch(() => {});
      entry = { key, id: randomUUID(), input: structuredClone(input), at: now, controller: new AbortController(), promise, resolve, reject, subscribers: 0, started: false };
      this.pending.set(key, entry); this.waiting.push(entry);
      this.totals.queued++; this.log("queued", { jobId: entry.id, task: input.task });
      queueMicrotask(() => this.pump());
    } else {
      this.totals.joined++; this.log("coalesced");
    }
    const target = entry;
    target.subscribers++;
    return new Promise<Result>((resolve, reject) => {
      let settled = false;
      const finish = () => {
        if (settled) return false;
        settled = true; signal.removeEventListener("abort", abort);
        target.subscribers--;
        if (!target.subscribers && this.pending.has(key)) target.controller.abort();
        return true;
      };
      const abort = () => { if (finish()) reject(abortError()); };
      signal.addEventListener("abort", abort, { once: true });
      target.promise.then((result) => {
        if (finish()) resolve({ ...result, response: { ...structuredClone(result.response), sourceFingerprint: input.sourceFingerprint } });
      }, (error) => { if (finish()) reject(error); });
      if (signal.aborted) abort();
    });
  }
  private pump() {
    while (this.active < this.policy.concurrency && this.waiting.length) {
      const entry = this.waiting.shift()!;
      this.active++;
      void this.run(entry).finally(() => { this.active--; this.pending.delete(entry.key); this.pump(); });
    }
  }
  private async pause(ms: number, signal: AbortSignal) {
    if (signal.aborted) throw abortError();
    if (ms <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const end = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); };
      const cancel = () => { end(); reject(abortError()); };
      const timer = setTimeout(() => { end(); resolve(); }, ms);
      signal.addEventListener("abort", cancel, { once: true });
    });
  }
  private remember(entry: Entry, value: { response?: CareerAiAssistResponse; error?: CareerAiError }, ms: number) {
    if (this.cache.size >= this.policy.cacheSize) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(entry.key, { ...value, until: Date.now() + ms });
  }
  private async bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) { void work.catch(() => {}); throw abortError(); }
    return new Promise<T>((resolve, reject) => {
      const cancel = () => reject(abortError());
      signal.addEventListener("abort", cancel, { once: true });
      work.then(resolve, reject).finally(() => signal.removeEventListener("abort", cancel));
    });
  }
  private async run(entry: Entry) {
    const { signal } = entry.controller;
    const timer = setTimeout(() => entry.controller.abort(), Math.max(0, this.policy.requestTimeoutMs - (Date.now() - entry.at)));
    let queuedMs = 0;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal.aborted) throw abortError();
        if (Date.now() < this.quotaUntil) throw new CareerAiError("AI_USAGE_LIMIT", Math.ceil((this.quotaUntil - Date.now()) / 1000));
        const slot = Math.max(Date.now(), this.nextStart, this.busyUntil);
        if (!entry.started && slot - entry.at > this.policy.queueWaitMs) throw new CareerAiError("AI_QUEUE_FULL", 15);
        this.nextStart = slot + this.policy.startIntervalMs;
        await this.pause(slot - Date.now(), signal);
        // Honour rate-limit cooldowns learned after this job reserved its slot.
        while (Date.now() < this.busyUntil) await this.pause(this.busyUntil - Date.now(), signal);
        // A different job may have opened the quota circuit while this one waited.
        if (Date.now() < this.quotaUntil) throw new CareerAiError("AI_USAGE_LIMIT", Math.ceil((this.quotaUntil - Date.now()) / 1000));
        if (Date.now() - this.classAt >= this.policy.classMs) { this.classAt = Date.now(); this.classCalls = 0; }
        if (this.classCalls >= this.policy.maxClassCalls) throw new CareerAiError("AI_CLASS_LIMIT", Math.ceil((this.classAt + this.policy.classMs - Date.now()) / 1000));
        this.classCalls++; this.totals.providerCalls++;
        entry.started = true; queuedMs = Date.now() - entry.at;
        this.log("provider_start", { jobId: entry.id, task: entry.input.task, attempt: attempt + 1, queuedMs });
        const call = new AbortController();
        const cancel = () => call.abort();
        signal.addEventListener("abort", cancel, { once: true });
        const callTimer = setTimeout(() => call.abort(), this.policy.providerTimeoutMs);
        let reportedUsage = false;
        try {
          const response = await this.bounded(this.provider(entry.input, call.signal, (usage) => {
            reportedUsage = true;
            this.totals.inputTokens += usage.inputTokens; this.totals.outputTokens += usage.outputTokens;
            this.totals.cachedInputTokens += usage.cachedInputTokens;
            this.log("provider_usage", { jobId: entry.id, task: entry.input.task, ...usage });
          }), call.signal);
          this.remember(entry, { response: structuredClone(response) }, this.policy.cacheMs);
          this.log("complete", { jobId: entry.id, task: entry.input.task, queuedMs });
          entry.resolve({ response, reused: false, queuedMs }); return;
        } catch (error) {
          const failure = call.signal.aborted ? new CareerAiError("AI_UNCERTAIN", 300) : classifyAiError(error);
          this.log("provider_error", { jobId: entry.id, task: entry.input.task, code: failure.code, upstreamCode: failure.upstreamCode, upstreamStatus: failure.upstreamStatus, attempt: attempt + 1 });
          if (failure.code === "AI_USAGE_LIMIT") this.quotaUntil = Date.now() + this.policy.cooldownMs;
          if (failure.code === "AI_PROVIDER_BUSY") {
            this.busyUntil = Math.max(this.busyUntil, Date.now() + Math.max(2, failure.retryAfter) * 1000);
            if (attempt === 0 && !signal.aborted && failure.retryAfter <= 10) continue;
          }
          throw failure;
        } finally {
          if (!reportedUsage) this.log("usage_unknown", { jobId: entry.id, task: entry.input.task });
          clearTimeout(callTimer); signal.removeEventListener("abort", cancel);
        }
      }
    } catch (error) {
      const failure = signal.aborted
        ? (entry.started ? new CareerAiError("AI_UNCERTAIN", 300) : abortError())
        : error;
      if (entry.started && failure instanceof CareerAiError) {
        // Ambiguous failures are never auto-replayed: the provider may have billed.
        this.remember(entry, { error: failure }, failure.code === "AI_PROVIDER_BUSY" ? Math.max(2, failure.retryAfter) * 1000 : this.policy.cooldownMs);
      }
      this.totals.errors++; this.log("failed", { jobId: entry.id, code: failure instanceof CareerAiError ? failure.code : "CANCELLED_BEFORE_SEND" });
      entry.reject(failure);
    } finally { clearTimeout(timer); }
  }
}
