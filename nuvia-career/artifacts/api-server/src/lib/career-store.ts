import { pool } from "@workspace/db";
import { emptyCareerState } from "./career-data";
import { randomUUID } from "node:crypto";
import { characterCount } from "./career-validation";
import type { CareerState, CareerVersionInput, CareerVersion } from "@workspace/api-zod";

export async function readWorkspace(owner: string) {
  await pool.query(
    "INSERT INTO career_workspaces(owner_id,state) VALUES($1,$2::jsonb) ON CONFLICT(owner_id) DO NOTHING",
    [owner, JSON.stringify(emptyCareerState())],
  );
  const result = await pool.query(
    "SELECT revision,state,saved_at FROM career_workspaces WHERE owner_id=$1", [owner],
  );
  return workspaceRow(result.rows[0]);
}

function workspaceRow(row: { revision: number; state: CareerState; saved_at: Date }) {
  return { revision: row.revision, state: row.state, savedAt: row.saved_at.toISOString() };
}

export async function writeWorkspace(owner: string, revision: number, state: CareerState) {
  await readWorkspace(owner);
  const result = await pool.query(
    `UPDATE career_workspaces SET state=$1::jsonb, revision=revision+1, saved_at=now()
     WHERE owner_id=$2 AND revision=$3 RETURNING revision,state,saved_at`,
    [JSON.stringify(state), owner, revision],
  );
  return result.rows.length ? workspaceRow(result.rows[0]) : null;
}

export async function listVersions(owner: string): Promise<CareerVersion[]> {
  const result = await pool.query(
    "SELECT snapshot FROM career_versions WHERE owner_id=$1 ORDER BY created_at DESC", [owner],
  );
  return result.rows.map((x) => x.snapshot);
}

export class SnapshotError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export async function snapshotVersion(owner: string, input: CareerVersionInput): Promise<CareerVersion> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Lock before idempotency lookup, so two concurrent retries cannot duplicate.
    const result = await client.query(
      "SELECT revision,state FROM career_workspaces WHERE owner_id=$1 FOR UPDATE", [owner],
    );
    const existing = await client.query(
      "SELECT snapshot FROM career_versions WHERE owner_id=$1 AND request_id=$2", [owner, input.requestId],
    );
    if (existing.rows.length) {
      await client.query("COMMIT");
      return existing.rows[0].snapshot;
    }
    const workspace = result.rows[0];
    if (!workspace || workspace.revision !== input.revision)
      throw new SnapshotError(409, "SAVE_DRAFT_FIRST");
    const state = workspace.state as CareerState;
    const application = state.applications.find((x) => x.id === input.applicationId);
    if (!application) throw new SnapshotError(404, "APPLICATION_NOT_FOUND");
    if (input.submitted && (!application.text.trim() || (
      application.limit > 0 && characterCount(application.text, application.countSpaces) > application.limit
    ))) throw new SnapshotError(422, "INVALID_SUBMISSION_LENGTH");
    const snapshot: CareerVersion = {
      id: randomUUID(), label: input.label, submitted: input.submitted,
      createdAt: new Date().toISOString(), application: structuredClone(application),
      criteria: state.criteria.filter((x) => application.criterionIds.includes(x.id)),
    };
    await client.query(
      "INSERT INTO career_versions(id,owner_id,request_id,snapshot) VALUES($1,$2,$3,$4::jsonb)",
      [snapshot.id, owner, input.requestId, JSON.stringify(snapshot)],
    );
    await client.query("COMMIT");
    return snapshot;
  } catch (error) {
    await client.query("ROLLBACK"); throw error;
  } finally { client.release(); }
}
