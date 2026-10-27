import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  GetCareerOverviewResponse, GetCareerExampleResponse, GetCareerWorkspaceResponse,
  SaveCareerWorkspaceBody, SaveCareerWorkspaceResponse, CreateCareerVersionBody,
  CreateCareerVersionResponse, GetCareerVersionsResponse, ExportCareerDocumentBody,
} from "@workspace/api-zod";
import { careerOverview, exampleCareerState } from "../lib/career-data";
import { CareerValidationError, validateCareerState } from "../lib/career-validation";
import { submissionDocx, submissionText } from "../lib/career-export";
import { assertDocumentCharacters, submissionHwpx } from "../lib/career-hwpx";
import { readWorkspace, writeWorkspace, listVersions, snapshotVersion, SnapshotError } from "../lib/career-store";

const router: IRouter = Router();
router.use("/career", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});
router.get("/career/overview", (_req, res) => {
  res.json(GetCareerOverviewResponse.parse(careerOverview));
});
router.get("/career/example", (_req, res) => {
  res.json(GetCareerExampleResponse.parse(exampleCareerState()));
});

const exportWindows = new Map<string, { start: number; count: number }>();
router.post("/career/export", async (req, res): Promise<void> => {
  const now = Date.now();
  const key = req.ip || "unknown";
  // Bounded ephemeral rate limiter; no document contents are retained.
  if (exportWindows.size > 5000)
    for (const [ip, record] of exportWindows) if (now - record.start > 60000) exportWindows.delete(ip);
  const record = exportWindows.get(key);
  if (record && now - record.start < 60000 && record.count >= 20) {
    res.status(429).json({ error: "EXPORT_RATE_LIMIT" }); return;
  }
  exportWindows.set(key, record && now - record.start < 60000
    ? { ...record, count: record.count + 1 } : { start: now, count: 1 });
  const parsed = ExportCareerDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT" }); return; }
  if (!parsed.data.confirmed || !parsed.data.text.trim()) {
    res.status(422).json({ error: "FACT_CONFIRMATION_REQUIRED" }); return;
  }
  const { company, job, question, text, format } = parsed.data;
  const safe = { company, job, question, text };
  try { assertDocumentCharacters(safe); }
  catch { res.status(422).json({ error: "INVALID_DOCUMENT_CHARACTER" }); return; }
  res.setHeader("Content-Disposition", `attachment; filename="nuvia-submission.${format}"`);
  if (format === "txt") {
    res.type("text/plain; charset=utf-8").send(submissionText(safe)); return;
  }
  if (format === "hwpx") {
    res.type("application/hwp+zip").send(await submissionHwpx(safe)); return;
  }
  res.type("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    .send(await submissionDocx(safe));
});

// Every route below this line derives ownership from the validated session only.
router.use("/career", (req, res, next) => {
  const userId = getAuth(req).userId;
  if (!userId) { res.status(401).json({ error: "AUTH_REQUIRED" }); return; }
  {
    const origin = req.get("origin");
    const expected = req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== expected) {
          res.status(403).json({ error: "ORIGIN_REJECTED" }); return;
        }
      } catch { res.status(403).json({ error: "ORIGIN_REJECTED" }); return; }
    }
  }
  res.locals.ownerId = userId;
  next();
});

router.get("/career/workspace", async (_req, res): Promise<void> => {
  res.json(GetCareerWorkspaceResponse.parse(await readWorkspace(res.locals.ownerId)));
});

router.put("/career/workspace", async (req, res): Promise<void> => {
  const parsed = SaveCareerWorkspaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT" }); return; }
  try { validateCareerState(parsed.data.state); }
  catch (error) {
    if (error instanceof CareerValidationError) {
      res.status(422).json({ error: error.message }); return;
    }
    throw error;
  }
  const owner = res.locals.ownerId as string;
  const saved = await writeWorkspace(owner, parsed.data.revision, parsed.data.state);
  if (!saved) {
    res.status(409).json({ error: "REVISION_CONFLICT", message: "Keep local edits and reload the latest saved revision." });
    return;
  }
  res.json(SaveCareerWorkspaceResponse.parse(saved));
});

router.get("/career/versions", async (_req, res): Promise<void> => {
  res.json(GetCareerVersionsResponse.parse(await listVersions(res.locals.ownerId)));
});

router.post("/career/versions", async (req, res): Promise<void> => {
  const parsed = CreateCareerVersionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "INVALID_INPUT" }); return; }
  try {
    const snapshot = await snapshotVersion(res.locals.ownerId, parsed.data);
    res.status(201).json(CreateCareerVersionResponse.parse(snapshot));
  } catch (error) {
    if (error instanceof SnapshotError) { res.status(error.status).json({ error: error.code }); return; }
    throw error;
  }
});

export default router;
