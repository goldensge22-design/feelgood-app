import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { emptyCareerState } from "./career-data";
import { readWorkspace, writeWorkspace, snapshotVersion, listVersions } from "./career-store";

test("database ownership, save race, snapshot idempotency and historical preservation", async () => {
  // Synthetic owner IDs are never accepted by the HTTP API. Tests exercise the
  // same repository as authenticated routes and remove ONLY their own fixtures.
  const ownerA = `qa-synthetic-${randomUUID()}`;
  const ownerB = `qa-synthetic-${randomUUID()}`;
  try {
    const [initialA, initialB] = await Promise.all([readWorkspace(ownerA), readWorkspace(ownerB)]);
    assert.equal(initialA.revision, 0);
    assert.equal(initialB.state.selectedJob, "");
    const state = emptyCareerState();
    state.selectedJob = "TEST_PRIVATE_A";
    state.applications = [{
      id: "a", company: "FICTIONAL_COMPANY", job: "planning", question: "Fictional question",
      limit: 100, countSpaces: true, writingLanguage: "en", experienceIds: [],
      criterionIds: ["common-observe"], text: "Original user-written answer",
    }];
    const [one, two] = await Promise.all([
      writeWorkspace(ownerA, 0, state), writeWorkspace(ownerA, 0, state),
    ]);
    assert.equal([one, two].filter(Boolean).length, 1, "Only one concurrent writer wins");
    assert.equal((await readWorkspace(ownerB)).state.selectedJob, "", "Other owner cannot see A");
    const input = {
      applicationId: "a", revision: 1, label: "Submitted", submitted: true, requestId: randomUUID(),
    };
    const [v1, retry] = await Promise.all([snapshotVersion(ownerA, input), snapshotVersion(ownerA, input)]);
    assert.equal(v1.id, retry.id, "Repeated request returns same version");
    assert.equal((await listVersions(ownerA)).length, 1);
    assert.equal((await listVersions(ownerB)).length, 0);
    await assert.rejects(snapshotVersion(ownerB, input), /SAVE_DRAFT_FIRST/);
    state.applications[0].text = "Later edited draft";
    assert.equal((await writeWorkspace(ownerA, 1, state))?.revision, 2);
    assert.equal((await listVersions(ownerA))[0].application.text, "Original user-written answer");
    assert.equal((await listVersions(ownerA))[0].criteria[0].version, "1");
    state.applications = [];
    assert.equal((await writeWorkspace(ownerA, 2, state))?.revision, 3);
    assert.equal((await listVersions(ownerA))[0].application.company, "FICTIONAL_COMPANY");
    assert.equal(await writeWorkspace(ownerA, 1, state), null, "Stale revision cannot overwrite");
  } finally {
    await pool.query("DELETE FROM career_versions WHERE owner_id=ANY($1::text[])", [[ownerA, ownerB]]);
    await pool.query("DELETE FROM career_workspaces WHERE owner_id=ANY($1::text[])", [[ownerA, ownerB]]);
    await pool.end();
  }
});
