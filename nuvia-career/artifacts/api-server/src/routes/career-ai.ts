import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  RequestCareerAiAssistanceBody,
  RequestCareerAiAssistanceResponse,
} from "@workspace/api-zod";
import { CareerAiError, runCareerAiAssist } from "../lib/career-ai";

const router: IRouter = Router();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const requestsByOwner = new Map<string, { start: number; count: number }>();

router.post("/career/ai-assist", async (req, res): Promise<void> => {
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

  const now = Date.now();
  if (requestsByOwner.size > 10_000) {
    for (const [owner, entry] of requestsByOwner) {
      if (now - entry.start >= RATE_WINDOW_MS) requestsByOwner.delete(owner);
    }
  }
  const count = requestsByOwner.get(userId);
  if (count && now - count.start < RATE_WINDOW_MS && count.count >= RATE_LIMIT) {
    res.status(429).json({ error: "AI_RATE_LIMITED" });
    return;
  }
  requestsByOwner.set(userId, count && now - count.start < RATE_WINDOW_MS
    ? { ...count, count: count.count + 1 }
    : { start: now, count: 1 });

  const controller = new AbortController();
  const abort = () => controller.abort();
  req.once("aborted", abort);
  res.once("close", () => {
    if (!res.writableEnded) abort();
  });

  req.log.info({ task: parsed.data.task }, "Career AI assistance requested");
  try {
    const response = await runCareerAiAssist(parsed.data, controller.signal);
    if (!controller.signal.aborted && !res.headersSent) {
      res.json(RequestCareerAiAssistanceResponse.parse(response));
    }
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error instanceof CareerAiError) {
      const status = error.code === "AI_NOT_CONFIGURED" ? 503
        : error.code === "AI_RATE_LIMITED" ? 429
          : error.code === "AI_TIMEOUT" ? 504 : 502;
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
