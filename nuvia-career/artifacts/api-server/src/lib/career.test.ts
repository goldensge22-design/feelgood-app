import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { emptyCareerState, exampleCareerState, careerOverview } from "./career-data";
import { characterCount, validateCareerState, safeSourceUrl } from "./career-validation";
import { submissionDocx, submissionText } from "./career-export";
import { SaveCareerWorkspaceBody, ExportCareerDocumentBody } from "@workspace/api-zod";

test("new personal workspace is empty and has no invented test result", () => {
  const state = emptyCareerState();
  assert.equal(state.report, null);
  assert.equal(state.experiences.length, 0);
  validateCareerState(state);
  assert.equal(careerOverview.integrations.find((x) => x.id === "planner")?.status, "unconnected");
});

test("fictional example is isolated and cannot be uploaded as a personal result", () => {
  const state = exampleCareerState();
  assert.equal(state.report?.isExample, true);
  assert.equal((state.report?.jobs as unknown[]).length, 1);
  assert.throws(() => validateCareerState(state), /REPORT_CONNECTOR_REQUIRED/);
  state.report = null;
  assert.throws(() => validateCareerState(state), /SOURCE_CONNECTOR_REQUIRED/);
});

test("manual experience can be saved without forcing every reflection field", () => {
  const state = emptyCareerState();
  state.experiences.push({
    id: "manual-one", title: "Observed an inconsistency", action: "Compared two notices",
    result: "", learning: "", strengths: [], criterionIds: ["common-observe"],
    confirmed: false, source: "manual",
  });
  assert.equal(SaveCareerWorkspaceBody.safeParse({ revision: 0, state }).success, true);
  validateCareerState(state);
});

test("official NCS and private company sources cannot be forged by a browser", () => {
  for (const type of ["official_ncs", "report", "company_public"] as const) {
    const state = emptyCareerState();
    state.criteria[0].sourceType = type;
    assert.throws(() => validateCareerState(state), /SOURCE_CONNECTOR_REQUIRED/);
  }
  const state = emptyCareerState();
  state.criteria[0].description = "Made up official competency";
  assert.throws(() => validateCareerState(state), /UNVERIFIED_CRITERION/);
});

test("missing references, duplicate imports and empty IDs are rejected", () => {
  const state = emptyCareerState();
  const example = exampleCareerState();
  state.activities = example.activities;
  state.experiences = example.experiences.map((x) => ({ ...x, source: "local_activity" }));
  validateCareerState(state);
  state.experiences.push({ ...state.experiences[0], id: "second-copy" });
  assert.throws(() => validateCareerState(state), /DUPLICATE_IMPORT/);
  state.experiences.pop();
  state.activities = [];
  assert.throws(() => validateCareerState(state), /MISSING_LOCAL_SOURCE/);
  const blank = emptyCareerState();
  blank.criteria[0].id = "";
  assert.throws(() => validateCareerState(blank), /EMPTY_ID/);
});

test("length count uses Unicode code points and optional whitespace exclusion", () => {
  assert.equal(characterCount("가 나\nA", true), 5);
  assert.equal(characterCount("가 나\nA", false), 3);
  assert.equal(characterCount("𠮷", true), 1);
  assert.equal(characterCount("مرحبا", true), 5);
});

test("source URLs reject script URLs, plaintext HTTP and embedded credentials", () => {
  assert.equal(safeSourceUrl("javascript:alert(1)"), null);
  assert.equal(safeSourceUrl("http://example.org/path"), null);
  assert.equal(safeSourceUrl("https://user:password@example.org"), null);
  assert.equal(safeSourceUrl("https://example.org/source"), "https://example.org/source");
});

test("export allows only company, role, question and user-written text", () => {
  const raw = {
    company: "가상 기업", job: "IT 서비스기획", question: "어떤 근거를 확인했나요?",
    text: "안내 두 곳을 비교했습니다.", format: "docx", confirmed: true,
    report: { iq: 123, userId: "SECRET_ID" },
    strengths: ["planning"], coach: "PRIVATE_COACH", memo: "PRIVATE_MEMO",
  };
  const parsed = ExportCareerDocumentBody.parse(raw);
  assert.equal("report" in parsed, false);
  const text = submissionText(parsed);
  assert.equal(text, [raw.company, raw.job, raw.question, raw.text].join("\n\n"));
  assert.doesNotMatch(text, /SECRET_ID|PRIVATE_COACH|PRIVATE_MEMO|123|planning/);
});

test("DOCX bytes are a ZIP/OOXML document, not renamed text", async () => {
  const docx = await submissionDocx({
    company: "검증 전용 가상 기업", job: "IT 서비스기획", question: "어떤 근거를 확인했나요?",
    text: "웹 안내와 현장 안내를 비교했습니다.\n관찰한 차이를 기록했습니다.\nEnglish 日本語 العربية ไทย ខ្មែរ",
  });
  assert.equal(docx.subarray(0, 2).toString(), "PK");
  await mkdir("generated-artifacts", { recursive: true });
  await writeFile("generated-artifacts/nuvia-export-verification.docx", docx);
});
