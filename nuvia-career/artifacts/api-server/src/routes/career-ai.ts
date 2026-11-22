import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  RequestCareerAiAssistanceBody,
  RequestCareerAiAssistanceResponse,
} from "@workspace/api-zod";
import { CareerAiError, runCareerAiAssist } from "../lib/career-ai";
import { SharedCareerAi } from "../lib/career-ai-shared";
import { logger } from "../lib/logger";

const router: IRouter = Router();
let shared: SharedCareerAi | undefined;
function coordinator() {
  if (!shared) shared = new SharedCareerAi(runCareerAiAssist,
    (event) => logger.info(event, "Career AI capacity"), process.env.SESSION_SECRET ?? "");
  return shared;
}

router.post("/career/ai-assist", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "AUTH_REQUIRED" });
    return;
  }

  const parsed = RequestCareerAiAssistanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_INPUT" });
    return;
  }
  if (!parsed.data.confirmed) {
    res.status(409).json({ error: "AI_CONSENT_REQUIRED" });
    return;
  }
  if (parsed.data.task === "draft" && !parsed.data.factsConfirmed) {
    res.status(409).json({ error: "AI_FACTS_REVIEW_REQUIRED" });
    return;
  }
  if (JSON.stringify(parsed.data).length > 100_000) {
    res.status(413).json({ error: "REQUEST_TOO_LARGE" });
    return;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  req.once("aborted", abort);
  res.once("close", () => {
    if (!res.writableEnded) abort();
  });

  req.log.info({ task: parsed.data.task }, "Career AI assistance requested");
  try {
    const result = await coordinator().request(userId, parsed.data, controller.signal);
    if (!controller.signal.aborted && !res.headersSent) {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-AI-Reused", result.reused ? "1" : "0");
      res.setHeader("X-AI-Queue-Ms", String(result.queuedMs));
      res.json(RequestCareerAiAssistanceResponse.parse(result.response));
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error instanceof CareerAiError) {
      const status = error.code === "AI_NOT_CONFIGURED" || error.code === "AI_MODEL_CONFIG" ? 503
        : ["AI_LOCAL_LIMIT", "AI_CLASS_LIMIT", "AI_PROVIDER_BUSY", "AI_USAGE_LIMIT"].includes(error.code) ? 429
          : ["AI_QUEUE_FULL", "AI_COORDINATION_UNAVAILABLE"].includes(error.code) ? 503
            : error.code === "AI_COORDINATION_WAIT" ? 409
              : error.code === "AI_RESULT_EXPIRED" ? 410
            : error.code === "AI_INPUT_LIMIT" ? 413
              : ["AI_TIMEOUT", "AI_UNCERTAIN"].includes(error.code) ? 504 : 502;
      res.setHeader("Cache-Control", "private, no-store");
      if (error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
      req.log.warn({ code: error.code, task: parsed.data.task }, "Career AI assistance failed");
      res.status(status).json({ error: error.code });
      return;
    }
    req.log.error({ task: parsed.data.task }, "Career AI assistance failed");
    res.status(502).json({ error: "AI_UPSTREAM_FAILED" });
  } finally {
    req.off("aborted", abort);
  }
});

export default router;

// Short HTTP requests: ordinary queueing never turns into a 200-second failure.
router.post("/career/ai-jobs", async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const owner = getAuth(req).userId;
  if (!owner) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }
  const parsed = RequestCareerAiAssistanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT" }); return; }
  if (!parsed.data.confirmed || (parsed.data.task === "draft" && !parsed.data.factsConfirmed)) {
    res.status(409).json({ error: "AI_CONSENT_REQUIRED" }); return;
  }
  if (JSON.stringify(parsed.data).length > 100_000) { res.status(413).json({ error: "REQUEST_TOO_LARGE" }); return; }
  const clientId = req.header("X-Career-AI-Client");
  if (clientId && !/^[a-f0-9-]{36}$/.test(clientId)) { res.status(400).json({ error: "INVALID_INPUT" }); return; }
  try { res.status(202).json(await coordinator().submit(owner, parsed.data, clientId)); }
  catch (error) { jobError(error, res); }
});
router.get("/career/ai-jobs/by-client/:clientId", async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  const owner = getAuth(req).userId;
  if (!owner) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }
  const clientId = String(req.params.clientId);
  if (!/^[a-f0-9-]{36}$/.test(clientId)) { res.status(404).json({ error: "NOT_FOUND" }); return; }
  try {
    const job = await coordinator().byClient(owner, clientId);
    if (!job) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    res.json(job);
  } catch (error) { jobError(error, res); }
});

for (const method of ["get", "delete"] as const) {
  router[method]("/career/ai-jobs/:id", async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    const owner = getAuth(req).userId;
    if (!owner) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }
    const id = String(req.params.id);
    if (!/^[a-f0-9]{64}$/.test(id)) { res.status(404).json({ error: "NOT_FOUND" }); return; }
    try {
      const result = method === "get" ? await coordinator().status(owner, id) : await coordinator().cancelJob(owner, id);
      if (!result) { res.status(404).json({ error: "NOT_FOUND" }); return; }
      res.json(result);
    } catch (error) { jobError(error, res); }
  });
}
function jobError(error: unknown, res: import("express").Response) {
  const code = error instanceof CareerAiError ? error.code : "AI_COORDINATION_UNAVAILABLE";
  const status = ["AI_LOCAL_LIMIT", "AI_CLASS_LIMIT", "AI_USAGE_LIMIT"].includes(code) ? 429 : code === "AI_INPUT_LIMIT" ? 413 : 503;
  if (error instanceof CareerAiError && error.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
  res.status(status).json({ error: code });
}
