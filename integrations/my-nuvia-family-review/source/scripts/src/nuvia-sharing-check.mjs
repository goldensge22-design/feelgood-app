// Positive sharing boundary check, independent from browser E2E.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.NUVIA_CHECK_URL || "http://localhost:80";
const reviewSpace = process.env.QA_SPACE ?? `qa-sharing-${Date.now()}`;
function client() {
  let cookie = "";
  return async (path, method = "GET", body) => {
    if (path === "/session" && method === "POST" && body) body = { ...body, space: reviewSpace };
    const res = await fetch(`${base}/api/nuvia${path}`, {
      method, headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, data: await res.json() };
  };
}
const self = client(), teacher = client(), parent = client();
try {
  await self("/session", "POST", { account: "child", acknowledged: true, role: "teacher" });
  assert.equal((await self("/session")).data.role, "self");
  await teacher("/session", "POST", { account: "teacher", acknowledged: true });
  await parent("/session", "POST", { account: "parent", acknowledged: true });
  const act = async (type, fields) => {
    const w = (await self("/subjects/demo-child")).data;
    const r = await self("/subjects/demo-child", "POST", { type, version: w.version, requestId: randomUUID(), ...fields });
    assert.equal(r.status, 200); return r.data;
  };
  let w = await act("history", { title: "가상 공유 검증 · 나만 보는 모형", outcome: "tried", action: "도구를 먼저 골라 보았다", help: "alone" });
  const privateId = w.records.at(-1).id;
  w = await act("history", { title: "가상 공유 검증 · 교사에게 공유한 모형", outcome: "tried", action: "순서를 바꿔 보았다", help: "guide" });
  const sharedId = w.records.at(-1).id;
  await act("shareRecord", { recordId: sharedId, shared: true });
  await act("saveNote", { text: "가상 비공개 문장" });
  const result = await teacher("/teacher/demo-child");
  assert.equal(result.status, 200);
  assert.ok(result.data.records.some(r => r.id === sharedId));
  assert.ok(!result.data.records.some(r => r.id === privateId));
  assert.ok(!JSON.stringify(result.data).includes("가상 비공개 문장"));
  for (const key of ["privateNote", "observation", "drafts"]) assert.ok(!(key in result.data));
  const pw = (await parent("/subjects/demo-child")).data;
  assert.notEqual(pw.privateNote, "가상 비공개 문장");
  process.stdout.write(JSON.stringify({
    scope: "Independent fictional review API only", timestamp: new Date().toISOString(),
    results: { requestRoleIgnored: "pass", explicitlySharedRecordVisibleToAssignedTeacher: "pass", unsharedRecordHidden: "pass", privateNotesAndDraftsExcluded: "pass", parentPrivateNoteIsolation: "pass" },
  }, null, 2) + "\n");
} finally {
  for (const call of [self, teacher, parent]) await call("/session", "DELETE");
}
