import { Router, type IRouter } from "express";
import {
  EnterNuviaReviewBody, ActNuviaWorkspaceBody, GetNuviaWorkspaceParams,
  GetNuviaSessionResponse, EnterNuviaReviewResponse, GetNuviaTeacherResponse,
} from "@workspace/api-zod";
import { readActor, sessionView, enterReview, leaveReview, assertScope, ReviewError } from "../lib/nuvia-access";
import { readWorkspace, actWorkspace, readShared } from "../lib/nuvia-workspace";

const router: IRouter = Router();
router.use("/nuvia", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  // Browser cross-site mutations cannot enter or alter the review session.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("sec-fetch-site") === "cross-site") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  next();
});
router.get("/nuvia/session", async (req, res): Promise<void> => {
  res.json(GetNuviaSessionResponse.parse(sessionView(await readActor(req))));
});
router.post("/nuvia/session", async (req, res): Promise<void> => {
  const parsed = EnterNuviaReviewBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.acknowledged) { res.status(400).json({ error: "review_acknowledgment_required" }); return; }
  res.json(EnterNuviaReviewResponse.parse(await enterReview(req, res, parsed.data.account, parsed.data.space)));
});
router.delete("/nuvia/session", async (req, res): Promise<void> => {
  await leaveReview(req, res); res.json({ ok: true });
});
router.get("/nuvia/subjects/:subjectId", async (req, res): Promise<void> => {
  const { subjectId } = GetNuviaWorkspaceParams.parse(req.params);
  const actor = await readActor(req); assertScope(actor, subjectId);
  res.json(await readWorkspace(subjectId, actor));
});
router.post("/nuvia/subjects/:subjectId", async (req, res): Promise<void> => {
  const { subjectId } = GetNuviaWorkspaceParams.parse(req.params);
  const actor = await readActor(req); assertScope(actor, subjectId);
  const parsed = ActNuviaWorkspaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid_input" }); return; }
  res.json(await actWorkspace(subjectId, actor, parsed.data));
});
router.get("/nuvia/teacher/:subjectId", async (req, res): Promise<void> => {
  const { subjectId } = GetNuviaWorkspaceParams.parse(req.params);
  const actor = await readActor(req); assertScope(actor, subjectId, true);
  res.json(GetNuviaTeacherResponse.parse(await readShared(subjectId, actor)));
});
router.use("/nuvia", (error: unknown, req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  if (error instanceof ReviewError) { res.status(error.status).json({ error: error.code }); return; }
  req.log.error({ errorType: error instanceof Error ? error.name : "unknown" }, "Independent review request failed");
  res.status(500).json({ error: "storage_unavailable" });
});
export default router;
