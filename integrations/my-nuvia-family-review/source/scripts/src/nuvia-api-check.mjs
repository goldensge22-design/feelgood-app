// API integration checks only; not browser end-to-end verification.
// Writes clearly marked fictional review records. Never uses production auth/data.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.NUVIA_CHECK_URL || "http://localhost:80";
const report = [];
const reviewSpace = process.env.QA_SPACE ?? `qa-api-${Date.now()}`;
class Client {
  cookie = "";
  async request(path, method = "GET", body) {
    if (path === "/session" && method === "POST" && body) body = { ...body, space: reviewSpace };
    const res = await fetch(`${base}/api/nuvia${path}`, {
      method, headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    return { status: res.status, data: await res.json() };
  }
  async enter(account) {
    const r = await this.request("/session", "POST", { account, acknowledged: true });
    assert.equal(r.status, 200); return r.data;
  }
  async workspace(id = "demo-teen") {
    const r = await this.request(`/subjects/${id}`);
    assert.equal(r.status, 200); return r.data;
  }
  async action(type, fields = {}, id = "demo-teen") {
    const w = await this.workspace(id);
    return this.request(`/subjects/${id}`, "POST", { type, version: w.version, requestId: randomUUID(), ...fields });
  }
}
function pass(name) { report.push({ name, result: "pass" }); }
const parent = new Client(), secondParent = new Client(), child = new Client(), teacher = new Client(), adult = new Client(), anonymous = new Client();
try {
  assert.equal((await anonymous.request("/subjects/demo-child")).status, 401);
  pass("Anonymous workspace denied");
  await parent.enter("parent");
  for (const path of ["/subjects/demo-unlinked", "/subjects/demo-adult", "/teacher/demo-child", "/subjects/demo-unlinked?role=teacher"]) {
    assert.equal((await parent.request(path)).status, 403);
  }
  pass("Parent unrelated child/adult and teacher data denied; URL role cannot elevate");
  await child.enter("teen");
  assert.equal((await child.request("/subjects/demo-child")).status, 403);
  assert.equal((await child.request("/teacher/demo-teen")).status, 403);
  pass("Self other-person and teacher data denied");
  await teacher.enter("teacher");
  assert.equal((await teacher.request("/teacher/demo-teen")).status, 403);
  assert.equal((await teacher.request("/subjects/demo-child")).status, 403);
  pass("Teacher out-of-scope and family workspace denied");
  await adult.enter("adult");
  assert.equal((await adult.request("/subjects/demo-child")).status, 403);
  pass("Adult self isolated from family subjects");
  let w = await parent.workspace();
  // End pre-existing active fictional run only if this script created it previously.
  const active = w.plans.find(p => p.status === "running");
  if (active) throw new Error("A review activity is already running; stop it before this isolated check.");
  const a = { type: "createPlan", version: w.version, requestId: randomUUID(), title: "가상 검증 · 준비물 두 개 정리", steps: ["준비물 하나 고르기", "다음 준비물 놓기"], example: "가상의 준비물", duration: 1, source: "api-check" };
  const before = w.plans.length;
  const [created, duplicate] = await Promise.all([
    parent.request("/subjects/demo-teen", "POST", a),
    parent.request("/subjects/demo-teen", "POST", a),
  ]);
  assert.equal(created.status, 200); assert.equal(duplicate.status, 200);
  w = await parent.workspace();
  assert.equal(w.plans.length, before + 1);
  const plan = w.plans.at(-1);
  pass("Concurrent duplicate request creates one plan");
  const failVersion = w.version;
  assert.equal((await parent.action("saveNote", { text: "가상 보존 검사", simulateFailure: true })).status, 503);
  assert.equal((await parent.workspace()).version, failVersion);
  pass("Simulated failed save leaves server data/version unchanged");
  assert.equal((await parent.request("/subjects/demo-teen", "POST", { type: "saveNote", version: failVersion - 1, requestId: randomUUID(), text: "stale" })).status, 409);
  pass("Stale write rejected, not silently overwritten");
  assert.equal((await parent.action("start", { planId: plan.id })).status, 200);
  assert.equal((await parent.action("nextStep", { planId: plan.id })).status, 200);
  await new Promise(resolve => setTimeout(resolve, 1100));
  w = await parent.workspace();
  assert.equal(w.plans.find(p => p.id === plan.id).status, "running");
  pass("Timer end does not automatically complete task");
  await parent.action("pause", { planId: plan.id });
  await secondParent.enter("parent");
  const second = await secondParent.workspace();
  const resumed = second.plans.find(p => p.id === plan.id);
  assert.equal(resumed.step, 1); assert.ok(resumed.elapsed >= 1);
  await secondParent.action("resume", { planId: plan.id });
  await secondParent.action("archive", { planId: plan.id });
  const archived = (await parent.workspace()).plans.find(p => p.id === plan.id);
  assert.equal(archived.status, "archived"); assert.equal(archived.step, 1);
  await parent.action("resume", { planId: plan.id });
  const other = await parent.action("createPlan", { title: "가상 검증 · 두 번째 실행", steps: ["첫 단계"], example: "" });
  const otherPlan = other.data.plans.at(-1);
  assert.equal((await parent.action("start", { planId: otherPlan.id })).status, 409);
  await parent.action("end", { planId: plan.id });
  assert.equal((await parent.workspace()).plans.find(p => p.id === plan.id).status, "ended");
  pass("Two independent cookie sessions resume same step/time; archive preserves state; one execution; end differs from completion");
  const selfNoteBeforeParentWrite = (await child.workspace()).privateNote;
  await parent.action("saveObservation", { text: "가상 부모 관찰 · 기다려 보기" });
  await parent.action("saveNote", { text: "가상 부모 개인 메모" });
  assert.equal((await child.workspace()).observation, "");
  assert.equal((await child.workspace()).privateNote, selfNoteBeforeParentWrite);
  await child.action("saveNote", { text: "가상 당사자 비공개 메모" });
  assert.equal((await parent.workspace()).privateNote, "가상 부모 개인 메모");
  pass("Parent observations and private notes isolated by actor");
  const history = await child.action("history", {
    title: "가상 검증 · 자원 순서 모형", outcome: "tried", help: "guide",
    action: "가상 도구 2개 중 하나 선택, 순서 정하기", difficulty: "순서를 정하기 어려움",
    change: "필요한 도구 먼저", result: "가정 모형의 두 단계 확인", learned: "먼저 필요한 것 고르기",
  });
  assert.equal(history.status, 200);
  const r = history.data.records.at(-1);
  const transferred = await child.action("createPlan", { title: "가상 검증 · 내일 먼저 필요한 것 고르기", steps: ["필요한 것 하나 고르기"], source: `history:${r.id}` });
  assert.equal(transferred.status, 200);
  pass("History model record and confirmed planner transfer saved");
  const draft = await child.action("saveDraft", {
    recordIds: [r.id], sourceVersions: { [r.id]: r.version },
    action: r.action, difficulty: r.difficulty, change: r.change, result: r.result, learned: r.learned,
    text: "가상 문장 틀 · 필요한 것을 먼저 골라 보았습니다.",
  });
  assert.equal(draft.status, 200);
  assert.deepEqual(draft.data.drafts.at(-1).recordIds, [r.id]);
  assert.equal((await parent.workspace()).drafts.length, 0);
  assert.equal((await parent.action("saveDraft", { recordIds: [r.id], sourceVersions: { [r.id]: 1 } })).status, 403);
  assert.equal((await child.action("saveDraft", { recordIds: ["not-owned"], sourceVersions: {} })).status, 403);
  pass("Only selected own source records in draft; no automatic parent access or foreign sources");
  await child.action("shareRecord", { recordId: r.id, shared: true });
  assert.equal((await child.action("saveDraft", { recordIds: [r.id], sourceVersions: { [r.id]: 1 } })).status, 409);
  pass("Source version change requires reconfirmation");
  const sharedEmpty = await teacher.request("/teacher/demo-child");
  assert.equal(sharedEmpty.status, 200);
  assert.equal("privateNote" in sharedEmpty.data, false);
  assert.equal("drafts" in sharedEmpty.data, false);
  assert.equal(sharedEmpty.data.records.some(record => record.id === r.id), false);
  pass("Teacher payload contains only allowed subject shared records, no notes/drafts");
  await child.request("/session", "DELETE");
  assert.equal((await child.request("/subjects/demo-teen")).status, 401);
  pass("Server session revocation requires reconnection");
} finally {
  for (const client of [parent, secondParent, child, teacher, adult]) await client.request("/session", "DELETE").catch(() => {});
  process.stdout.write(JSON.stringify({ scope: "Independent fictional review API integration, not browser E2E or production", timestamp: new Date().toISOString(), checks: report }, null, 2) + "\n");
}
