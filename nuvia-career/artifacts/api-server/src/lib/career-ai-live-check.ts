/** Explicit opt-in; synthetic only; hard cap two real supplier attempts. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { CareerAiQueue, CLASS_AI_POLICY } from "./career-ai-queue";
import { runCareerAiAssist } from "./career-ai";
import { OUTPUT_TOKENS } from "./career-ai-input";
import type { CareerAiAssistInput } from "@workspace/api-zod";
if (!process.argv.includes("--live")) throw new Error("Use --live for at most two paid synthetic calls.");
const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const events: unknown[] = [];
const queue = new CareerAiQueue(runCareerAiAssist, e => events.push(e), { ...CLASS_AI_POLICY, maxClassCalls: 2 });
const base: CareerAiAssistInput = {
  task: "coach", locale: "ko", writingLanguage: "ko", sourceFingerprint: "synthetic-classroom-v1",
  confirmed: true, factsConfirmed: true, coachPrompt: "", strengths: [], userAnswers: [], voiceSources: [], voiceRules: [],
  application: { company: "가상 교육서비스", job: "교육 운영 지원", question: "직접 판단한 과정을 설명하세요.", body: "" },
  experiences: [{
    title: "합성 수업 모의훈련", nature: "simulation", context: "class_simulation", cardType: "job_scenario",
    source: "synthetic", sourceVersion: "v1", sourceTitle: "개인정보 없는 합성 QA", jobConnection: null,
    fields: {
      situation: "수업의 모의 행사 안내자료 두 개를 받았다.", roleGoal: "적용 대상과 승인 여부를 대조하는 연습을 했다.",
      action: "작성 시각과 승인 여부, 적용 대상을 표로 비교했다. 최신 v3은 다른 대상용이어서 승인된 v2 유지안을 작성했다.",
      selectionReason: "최신 여부만으로 적용 가능하다고 판단하지 않기 위해서였다.", changed: "",
      result: "빈 확인칸은 미수행으로 단정하지 않고 질문 목록에 남겼다. 실제 행사에 적용한 결과는 없다.",
      learning: "확정 사실과 추가 확인사항을 구분해 전달해야 한다고 느꼈다.",
      resultEvidence: "모의 비교표와 질문 목록", supportProvided: "교사가 비교표 양식을 제공했다.", independentSteps: [],
    },
  }],
};
const results: unknown[] = [];
const onlyDraft = process.argv.includes("--draft-only");
const onlyCoach = process.argv.includes("--coach-only");
for (const task of (onlyDraft ? ["draft"] : onlyCoach ? ["coach"] : ["coach", "draft"]) as Array<"coach" | "draft">) {
  const startedAt = new Date().toISOString();
  try {
    const first = await queue.request("synthetic-live-owner", { ...base, task }, new AbortController().signal);
    const again = await queue.request("synthetic-live-owner", { ...base, task, sourceFingerprint: `refresh-${task}` }, new AbortController().signal);
    const r = first.response;
    const grounded = task === "coach" ? !!r.coachQuestion.trim() && !r.candidates.length
      : r.candidates.length === 2 && r.candidates.every(c => /모의|수업|연습/.test(c.text) && !/\d+\s*%|재직|근무 경력|합격률/.test(c.text));
    results.push({ task, startedAt, finishedAt: new Date().toISOString(), status: grounded && again.reused ? "pass" : "fail",
      reused: again.reused, maxOutputTokens: OUTPUT_TOKENS[task], response: r });
  } catch (e) {
    results.push({ task, startedAt, finishedAt: new Date().toISOString(), status: "fail", error: e instanceof Error ? e.message : "UNKNOWN" });
  }
}
await mkdir(`${root}/generated-artifacts/nuvia-classroom`, { recursive: true });
const report = { kind: "REAL_MANAGED_AI_SYNTHETIC_MAX_TWO_CALLS", checkedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  totals: queue.totals, events, results,
  note: "Reported tokens only; failed calls without provider usage have unknown billing. Not an operating /career integration test." };
const json = JSON.stringify(report, null, 2);
await writeFile(`${root}/generated-artifacts/nuvia-classroom/${onlyDraft ? "live-model-retest" : onlyCoach ? "live-model-coach-final" : "live-model"}.json`, json);
console.log(JSON.stringify({ calls: queue.totals.providerCalls, tokens: queue.totals.inputTokens + queue.totals.outputTokens,
  results: results.map(r => { const v = r as { task: string; status: string }; return { task: v.task, status: v.status }; }),
  sha256: createHash("sha256").update(json).digest("hex") }));
