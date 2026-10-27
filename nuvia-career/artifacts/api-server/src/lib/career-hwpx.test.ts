import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import JSZip from "jszip";
import { assertDocumentCharacters, submissionHwpx } from "./career-hwpx";
import { submissionDocx } from "./career-export";
import { officialNcsCriteria } from "./career-ncs";
import { emptyCareerState } from "./career-data";
import { validateCareerState } from "./career-validation";

test("HWPX is a real OWPML package with a stored first mimetype entry", async () => {
  const input = {
    company: "검증용 가상 기업", job: "IT 서비스기획",
    question: "근거를 설명해 주세요.\n" + "긴 문항 · ".repeat(100),
    text: "안내 A와 B를 비교했습니다.\n\n<사실> & \"인용\"\nEnglish 日本語 العربية ไทย ខ្មែរ 𠮷\n" + "긴 본문 ".repeat(1000),
    privateMemo: "PRIVATE-NOTE-DO-NOT-EXPORT",
    internalId: "INTERNAL-ID-DO-NOT-EXPORT",
  };
  const bytes = await submissionHwpx(input);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt16LE(8), 0); // ZIP_STORED
  assert.equal(bytes.subarray(30, 30 + bytes.readUInt16LE(26)).toString(), "mimetype");
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  assert.equal(await zip.file("mimetype")!.async("string"), "application/hwp+zip");
  const section = await zip.file("Contents/section0.xml")!.async("string");
  assert.match(section, /<hs:sec/);
  assert.match(section, /&lt;사실&gt; &amp; &quot;인용&quot;/);
  assert.match(section, /𠮷/);
  assert.doesNotMatch(section, /lineseg/); // Never carry stale layout caches.
  const preview = await zip.file("Preview/PrvText.txt")!.async("string");
  assert.equal(preview, [input.company, input.job, input.question, input.text].join("\n\n"));
  for (const entry of Object.values(zip.files).filter((x) => !x.dir)) {
    const text = await entry.async("string");
    assert.doesNotMatch(text, /PRIVATE-NOTE-DO-NOT-EXPORT|INTERNAL-ID-DO-NOT-EXPORT|synthetic-fixture-author|Scripts\//);
  }
  mkdirSync("generated-artifacts", { recursive: true });
  writeFileSync("generated-artifacts/nuvia-submission-current.hwpx", bytes);
  writeFileSync("generated-artifacts/nuvia-submission-current.docx", await submissionDocx(input));
});

test("XML-illegal characters fail explicitly and supplementary Unicode remains valid", () => {
  const base = { company: "", job: "", question: "", text: "𠮷 العربية ไทย ខ្មែរ\n\t" };
  assert.doesNotThrow(() => assertDocumentCharacters(base));
  assert.throws(() => assertDocumentCharacters({ ...base, text: "\u0000" }), /INVALID_DOCUMENT_CHARACTER/);
  assert.throws(() => assertDocumentCharacters({ ...base, text: "\ud800" }), /INVALID_DOCUMENT_CHARACTER/);
});

test("only pinned, verified official NCS content can be adopted", () => {
  const state = emptyCareerState();
  state.criteria.push(...structuredClone(officialNcsCriteria));
  assert.doesNotThrow(() => validateCareerState(state));
  state.criteria.at(-1)!.description = "Browser-forged requirement";
  assert.throws(() => validateCareerState(state), /UNVERIFIED_CRITERION/);
});
