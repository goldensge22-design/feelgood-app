import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { ActNuviaWorkspaceBody, GetNuviaWorkspaceResponse } from "@workspace/api-zod";
import { subjects, ReviewError, workspaceKey, type Actor } from "./nuvia-access";

type Workspace = ReturnType<typeof GetNuviaWorkspaceResponse.parse>;
type Action = ReturnType<typeof ActNuviaWorkspaceBody.parse>;
type Plan = Workspace["plans"][number];
type RecordItem = Workspace["records"][number] & { author: string };
type Personal = { note: string; observation: string; drafts: Workspace["drafts"]; weeklyChoice: string };
type Document = {
  version: number; plans: Plan[]; records: RecordItem[];
  personal: { [account: string]: Personal }; requests: { [id: string]: { account: string; type: string } };
  savedAt: string | null;
};
function empty(): Document {
  return { version: 0, plans: [], records: [], personal: {}, requests: {}, savedAt: null };
}
function personal(doc: Document, actor: Actor): Personal {
  return doc.personal[actor.account] ??= { note: "", observation: "", drafts: [], weeklyChoice: "" };
}
export function view(doc: Document, subjectId: string, actor: Actor): Workspace {
  const own = personal(doc, actor);
  return GetNuviaWorkspaceResponse.parse({
    subject: subjects.find(s => s.id === subjectId), version: doc.version, plans: doc.plans,
    records: doc.records.filter(r => actor.role !== "self" || r.author === actor.account),
    drafts: actor.role === "self" ? own.drafts : [],
    privateNote: own.note,
    observation: actor.role === "parent" ? own.observation : "",
    weeklyChoice: own.weeklyChoice, savedAt: doc.savedAt,
  });
}
export async function readWorkspace(subjectId: string, actor: Actor): Promise<Workspace> {
  const { rows } = await pool.query("SELECT document FROM nuvia_review_workspaces WHERE subject_id=$1", [workspaceKey(subjectId, actor)]);
  return view(rows[0]?.document ?? empty(), subjectId, actor);
}
export async function readShared(subjectId: string, actor: Actor) {
  const { rows } = await pool.query("SELECT document FROM nuvia_review_workspaces WHERE subject_id=$1", [workspaceKey(subjectId, actor)]);
  const doc: Document = rows[0]?.document ?? empty();
  return { subject: subjects.find(s => s.id === subjectId), records: doc.records.filter(r => r.shared && r.author !== "parent").map(({ author: _author, ...r }) => r) };
}
function requireText(v: string | undefined, max = 2000) {
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new ReviewError(400, "invalid_input");
  return v.trim();
}
function settle(plan: Plan) {
  if (plan.startedAt) {
    plan.elapsed += Math.max(0, Math.floor((Date.now() - Date.parse(plan.startedAt)) / 1000));
    plan.startedAt = null;
  }
}
function record(doc: Document, actor: Actor, a: Action, kind: "planner" | "history", title: string) {
  if (a.outcome && !["tried", "finished", "continue", "skipped"].includes(a.outcome)) throw new ReviewError(400, "invalid_input");
  if (a.help && !["alone", "guide", "together"].includes(a.help)) throw new ReviewError(400, "invalid_input");
  doc.records.push({
    id: randomUUID(), kind, title, date: new Date().toISOString(), outcome: a.outcome ?? "skipped",
    help: a.help ?? "", feeling: a.feeling ?? "", action: a.action ?? "",
    difficulty: a.difficulty ?? "", change: a.change ?? "", result: a.result ?? "",
    learned: a.learned ?? "", version: 1, shared: false, author: actor.account,
  });
}
function apply(doc: Document, actor: Actor, a: Action) {
  const own = personal(doc, actor);
  const plan = a.planId ? doc.plans.find(p => p.id === a.planId) : undefined;
  if (["updatePlan", "start", "pause", "archive", "resume", "nextStep", "end", "reflect"].includes(a.type) && !plan) {
    throw new ReviewError(404, "plan_not_found");
  }
  switch (a.type) {
    case "createPlan":
    case "updatePlan": {
      const title = requireText(a.title, 300);
      if (!a.steps?.length || a.steps.length > 20) throw new ReviewError(400, "invalid_input");
      const steps = a.steps.map(s => requireText(s, 1000));
      if (a.duration != null && (!Number.isInteger(a.duration) || a.duration < 1 || a.duration > 86400)) throw new ReviewError(400, "invalid_input");
      if (a.type === "createPlan") {
        doc.plans.push({ id: randomUUID(), title, steps, example: a.example ?? "", step: 0, status: "ready", elapsed: 0, duration: a.duration ?? null, startedAt: null, source: a.source ?? "direct" });
      } else {
        if (plan!.status === "running") throw new ReviewError(409, "pause_before_edit");
        plan!.title = title; plan!.steps = steps; plan!.example = a.example ?? "";
        plan!.step = Math.min(plan!.step, steps.length - 1);
        plan!.duration = a.duration ?? null;
      }
      break;
    }
    case "start":
    case "resume":
      if (doc.plans.some(p => p.status === "running" && p.id !== plan!.id)) throw new ReviewError(409, "active_run");
      if (["completed", "ended"].includes(plan!.status)) throw new ReviewError(409, "run_ended");
      if (plan!.status !== "running") { plan!.status = "running"; plan!.startedAt = new Date().toISOString(); }
      break;
    case "pause":
    case "archive":
      if (["completed", "ended"].includes(plan!.status)) throw new ReviewError(409, "run_ended");
      settle(plan!); plan!.status = a.type === "pause" ? "paused" : "archived"; break;
    case "nextStep":
      if (plan!.status !== "running") throw new ReviewError(409, "start_required");
      plan!.step = Math.min(plan!.step + 1, plan!.steps.length - 1); break;
    case "end":
      settle(plan!); if (plan!.status !== "completed") plan!.status = "ended"; break;
    case "reflect":
      settle(plan!);
      plan!.status = a.outcome === "finished" ? "completed" : a.outcome === "continue" ? "paused" : "ended";
      record(doc, actor, a, "planner", plan!.title); break;
    case "history":
      record(doc, actor, a, "history", requireText(a.title, 300)); break;
    case "saveDraft": {
      if (actor.role !== "self") throw new ReviewError(403, "forbidden");
      if (!a.recordIds?.length || new Set(a.recordIds).size !== a.recordIds.length) throw new ReviewError(400, "select_records");
      const chosen = a.recordIds.map(id => doc.records.find(r => r.id === id));
      if (chosen.some(r => !r || r.author !== actor.account)) throw new ReviewError(403, "forbidden");
      if (chosen.some(r => a.sourceVersions?.[r!.id] !== r!.version)) throw new ReviewError(409, "source_changed");
      own.drafts.push({
        id: randomUUID(), recordIds: a.recordIds, sourceVersions: a.sourceVersions ?? {},
        action: a.action ?? "", difficulty: a.difficulty ?? "", change: a.change ?? "",
        result: a.result ?? "", learned: a.learned ?? "", text: a.text ?? "",
      }); break;
    }
    case "saveNote": own.note = a.text ?? ""; break;
    case "saveObservation":
      if (actor.role !== "parent") throw new ReviewError(403, "forbidden");
      own.observation = a.text ?? ""; break;
    case "weekly":
      if (!["maintain", "reduce", "change"].includes(a.text ?? "")) throw new ReviewError(400, "invalid_input");
      own.weeklyChoice = a.text!; break;
    case "shareRecord": {
      const r = doc.records.find(r => r.id === a.recordId);
      if (actor.role !== "self" || !r || r.author !== actor.account) throw new ReviewError(403, "forbidden");
      r.shared = a.shared === true; r.version++; break;
    }
  }
}
export async function actWorkspace(subjectId: string, actor: Actor, a: Action) {
  if (!/^[\w-]{8,128}$/.test(a.requestId) || !Number.isInteger(a.version) || a.version < 0) throw new ReviewError(400, "invalid_input");
  if (JSON.stringify(a).length > 50000) throw new ReviewError(413, "input_too_large");
  if (a.simulateFailure) throw new ReviewError(503, "simulated_failure");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const storageKey = workspaceKey(subjectId, actor);
    await client.query("INSERT INTO nuvia_review_workspaces(subject_id, document) VALUES($1,$2) ON CONFLICT DO NOTHING", [storageKey, empty()]);
    const { rows } = await client.query("SELECT document FROM nuvia_review_workspaces WHERE subject_id=$1 FOR UPDATE", [storageKey]);
    const doc = rows[0].document as Document;
    const previous = doc.requests[a.requestId];
    if (previous) {
      if (previous.account !== actor.account || previous.type !== a.type) throw new ReviewError(409, "request_id_reused");
      await client.query("COMMIT");
      return view(doc, subjectId, actor);
    }
    if (doc.version !== a.version) throw new ReviewError(409, "conflict");
    apply(doc, actor, a);
    doc.version++;
    doc.savedAt = new Date().toISOString();
    doc.requests[a.requestId] = { account: actor.account, type: a.type };
    await client.query("UPDATE nuvia_review_workspaces SET document=$2 WHERE subject_id=$1", [storageKey, doc]);
    await client.query("COMMIT");
    return view(doc, subjectId, actor);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
