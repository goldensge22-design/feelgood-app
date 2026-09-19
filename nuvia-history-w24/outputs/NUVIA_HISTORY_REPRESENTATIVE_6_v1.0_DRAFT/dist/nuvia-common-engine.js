var ie = Object.defineProperty;
var se = (e, t, n) => t in e ? ie(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var x = (e, t, n) => se(e, typeof t != "symbol" ? t + "" : t, n);
import { jsxs as b, jsx as R } from "react/jsx-runtime";
import { useState as A } from "react";
const Y = ["preschool", "elementary-low", "elementary-high", "middle-school", "high-school", "adult"], X = ["mapRelation", "arrangeSequence", "classifyEvidence", "compareStructures", "chooseGoalAndSteps", "prioritizeActions", "revisePlan"], f = (e) => ({ status: "recorded", value: e }), u = (e = "notRecorded") => ({ status: e }), T = ["history", "condition", "prediction", "alternate", "activity", "creation", "historyComparison", "predictionComparison", "complete"], $ = { id: () => crypto.randomUUID(), now: () => (/* @__PURE__ */ new Date()).toISOString() };
class re extends Error {
  constructor(t) {
    super(t), this.code = t;
  }
}
function i(e, t) {
  if (!e) throw new re(t);
}
const j = (e) => Array.isArray(e) && e.every((t) => typeof t == "string" && t.length > 0) && new Set(e).size === e.length;
function H(e, t) {
  i(t && typeof t == "object", "ACTION_INVALID");
  const n = t;
  i(X.includes(n.actionKind) && n.actionKind === e.actionKind, "ACTION_KIND_MISMATCH");
  const o = (r, p) => typeof r == "string" && e.materials.some((y) => y.id === r && y.role === p), s = (r, p) => i(o(r, p), "UNKNOWN_" + p.toUpperCase()), a = (r, p, y = 1) => {
    i(j(r) && r.length >= y, "INVALID_" + p.toUpperCase() + "_LIST"), r.forEach((w) => s(w, p));
  }, d = (r) => s(r, "reason");
  switch (n.actionKind) {
    case "mapRelation":
      a(n.nodeIds, "node", 2), i(n.nodeIds.length === 2, "RELATION_PAIR_REQUIRED"), s(n.meaningKey, "meaning"), i(n.relationId === e.id + ".relation", "RELATION_ID_MISMATCH");
      break;
    case "arrangeSequence":
      a(n.orderedStepIds, "step", 2), i(n.orderedStepIds.length === e.materials.filter((r) => r.role === "step").length, "INCOMPLETE_SEQUENCE"), i(Array.isArray(n.precedenceRefs) && n.precedenceRefs.length === n.orderedStepIds.length - 1 && n.precedenceRefs.every((r, p) => Array.isArray(r) && r.length === 2 && r[0] === n.orderedStepIds[p] && r[1] === n.orderedStepIds[p + 1]), "INVALID_PRECEDENCE"), i(["planned", "observed", "unknown"].includes(n.completionState), "COMPLETION_STATE_REQUIRED"), n.interruptedStepId && s(n.interruptedStepId, "step");
      break;
    case "classifyEvidence":
      a(n.evidenceItemIds, "evidence"), i(n.evidenceItemIds.length === e.materials.filter((r) => r.role === "evidence").length, "INCOMPLETE_CLASSIFICATION"), i(n.hiddenExplanationId === e.hiddenExplanationId, "HIDDEN_REFERENCE_MISMATCH"), i(n.categoryByItem && typeof n.categoryByItem == "object" && Object.keys(n.categoryByItem).length === n.evidenceItemIds.length, "CATEGORY_REQUIRED"), n.evidenceItemIds.forEach((r) => i(["confirmed", "hidden", "unknown"].includes(n.categoryByItem[r]), "CATEGORY_REQUIRED")), i(j(n.uncertainItemIds) && n.uncertainItemIds.length === n.evidenceItemIds.filter((r) => n.categoryByItem[r] === "unknown").length && n.uncertainItemIds.every((r) => n.evidenceItemIds.includes(r) && n.categoryByItem[r] === "unknown"), "UNCERTAINTY_MISMATCH"), d(n.reasonRef);
      break;
    case "compareStructures":
      a(n.leftRelationIds, "left"), a(n.rightRelationIds, "right"), d(n.differenceRef);
      break;
    case "chooseGoalAndSteps":
      s(n.goalId, "goal"), s(n.responseId, "response"), s(n.constraintId, "constraint"), d(n.reasonRef);
      break;
    case "prioritizeActions":
      s(n.goalId, "goal"), a(n.orderedResponseIds, "response", 2), i(n.orderedResponseIds.length === e.materials.filter((r) => r.role === "response").length, "INCOMPLETE_PRIORITIES"), s(n.constraintId, "constraint"), d(n.reasonRef);
      break;
    case "revisePlan":
      s(n.goalId, "goal"), s(n.beforeResponseId, "response"), s(n.afterResponseId, "response"), i(n.decision === (n.beforeResponseId === n.afterResponseId ? "keep" : "change"), "DECISION_MISMATCH"), d(n.reasonRef);
      break;
  }
  const l = { mapRelation: ["nodeIds", "relationId", "meaningKey"], arrangeSequence: ["orderedStepIds", "precedenceRefs", "interruptedStepId", "completionState"], classifyEvidence: ["evidenceItemIds", "categoryByItem", "hiddenExplanationId", "uncertainItemIds", "reasonRef"], compareStructures: ["leftRelationIds", "rightRelationIds", "differenceRef"], chooseGoalAndSteps: ["goalId", "responseId", "constraintId", "reasonRef"], prioritizeActions: ["goalId", "orderedResponseIds", "constraintId", "reasonRef"], revisePlan: ["goalId", "beforeResponseId", "afterResponseId", "decision", "reasonRef"] };
  return i(Object.keys(n).every((r) => r === "actionKind" || l[n.actionKind].includes(r)), "UNEXPECTED_ACTION_FIELD"), structuredClone(n);
}
async function ge(e = "ko") {
  i(e === "ko", "LANGUAGE_NOT_PROVIDED");
  const [t, n] = await Promise.all([import("./missions-D7TBqhhS.js"), import("./ko-BuFGgbST.js")]), o = { locale: "ko", missions: t.default, strings: n.default };
  return ae(o), o;
}
function ae(e) {
  const t = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set(), o = /^\d+\.\d+\.\d+$/, s = (a) => i(typeof e.strings[a] == "string" && e.strings[a].trim() && !e.strings[a].includes("조건별 표현 없음"), "MISSING_TRANSLATION:" + a);
  for (const a of e.missions) {
    i(!t.has(a.id), "DUPLICATE_MISSION"), t.add(a.id), i(o.test(a.missionVersion) && o.test(a.contentVersion), "INVALID_VERSION"), s(a.titleKey), i(a.conditions.length === 2, "TWO_CONDITIONS_REQUIRED");
    for (const d of a.conditions) {
      i(!n.has(d.id) && d.missionId === a.id, "CONDITION_ID_MISMATCH"), n.add(d.id), i(d.missionVersion === a.missionVersion && d.contentVersion === a.contentVersion, "CONDITION_VERSION_MISMATCH"), i([1, 2].includes(d.mechanismLevel) && d.sourceIds.length && d.sourceLocatorKeys.length, "MISSING_EVIDENCE"), i(d.bookTemplateId === "nuvia.book.mission-8page.v1", "BOOK_CONTRACT"), i(d.resultIdPolicy.includes("sameResultId"), "RESULT_CONTRACT"), i(X.includes(d.activity.actionKind) && d.activity.contractId === `action.${d.activity.actionKind}.r2`, "UNKNOWN_ACTION_CONTRACT"), [d.conditionKey, d.actualHistoryKey, d.actualSceneKey, d.mechanismKey, d.directKey, d.shortTermKey, d.longTermKey, d.additionalKey, ...d.sourceLocatorKeys, ...d.alternateKeys, d.activity.promptKey, d.activity.observationKey].forEach(s), i(d.alternateKeys.length === 2, "TWO_POSSIBILITIES_REQUIRED");
      for (const r of Y) {
        const p = d.ageVariants[r];
        i(p && p.ageBandRuleId === `nuvia.age.${r}.v1`, "INVALID_AGE_RULE"), s(p.promptKey), s(p.instructionKey);
      }
      const l = /* @__PURE__ */ new Set();
      for (const r of d.activity.materials)
        i(!l.has(r.id), "DUPLICATE_MATERIAL"), l.add(r.id), s(r.labelKey);
      i(!("prohibitedClaims" in d), "INTERNAL_FIELD_EXPOSED");
    }
  }
}
function me(e) {
  return (t) => (i(Object.hasOwn(e, t), "MISSING_TRANSLATION:" + t), e[t]);
}
function z(e) {
  i(e && typeof e == "object", "PROFILE_REQUIRED");
  const t = e;
  return i(typeof t.learnerId == "string" && t.learnerId.length > 0, "LEARNER_REQUIRED"), i(Y.includes(t.ageBand), "AGE_RULE_REQUIRED"), i([0, 1, 2, 3].includes(t.attentionSupport), "SUPPORT_RULE_REQUIRED"), i(["linked-result", "explicit-test"].includes(t.source), "PROFILE_SOURCE_REQUIRED"), { learnerId: t.learnerId, alias: typeof t.alias == "string" && t.alias.trim() ? t.alias : "어린이 탐험가", ageBand: t.ageBand, attentionSupport: t.attentionSupport, source: t.source };
}
function de(e, t) {
  const n = t.ageBand === "preschool", o = t.ageBand === "elementary-low", s = t.attentionSupport > 0;
  return { variant: e.ageVariants[t.ageBand], sceneCount: o ? 2 : 1, canvasOptional: !n && !o, choicePageSize: n || s ? 2 : 4, chunked: n || s, highlight: s, hideDecorations: s, sentenceBudget: n ? 1 : o ? 2 : 3, readAloud: { status: "notProvided" }, automaticSupport: s ? ["keyElement", "reducedChoices", "shortSteps", "visualGuide"] : [] };
}
const ce = "0.2.0";
function Se(e, t, n, o = $) {
  const s = e.missions.find((r) => r.id === t);
  i(s, "MISSION_NOT_FOUND");
  const a = z(n), d = o.now(), l = { schemaVersion: 1, revision: 0, resultId: o.id(), missionId: t, missionVersion: s.missionVersion, contentVersion: s.contentVersion, appVersion: ce, profile: a, ageBandRuleId: `nuvia.age.${a.ageBand}.v1`, createdAt: d, completedAt: null, stage: "history", conditionId: null, prediction: u(), alternate: u(), action: u(), story: u(), historyComparison: u(), predictionComparison: u(), canvas: u(), cover: "antique", events: [], contentSnapshot: structuredClone(s), localeSnapshot: le(e, t) };
  return E(l, "missionStarted", { profileSource: a.source }, o, d, 0), l;
}
function le(e, t) {
  const n = {};
  for (const [o, s] of Object.entries(e.strings)) (o.startsWith(t + ".") || o.startsWith("missing.") || o.startsWith("thought.")) && (n[o] = s);
  return n;
}
function E(e, t, n, o, s = o.now(), a = 0) {
  e.events.push({ eventId: o.id(), resultId: e.resultId, missionId: e.missionId, conditionId: e.conditionId, missionVersion: e.missionVersion, contentVersion: e.contentVersion, ageBandRuleId: e.ageBandRuleId, ageBand: e.profile.ageBand, eventType: t, timestamp: s, payload: structuredClone(n), supportLevel: a, appVersion: e.appVersion });
}
function S(e) {
  const t = e.contentSnapshot.conditions.find((n) => n.id === e.conditionId);
  return i(t, "CONDITION_REQUIRED"), t;
}
function pe(e) {
  return i(e.conditionId, "CONDITION_REQUIRED"), { resultId: e.resultId, missionId: e.missionId, conditionId: e.conditionId, missionVersion: e.missionVersion, contentVersion: e.contentVersion, learnerId: e.profile.learnerId };
}
function W(e, t) {
  for (const [n, o] of Object.entries(pe(e))) i(t[n] === o, "RESULT_LINK_ERROR");
}
function D(e) {
  if (i(e && typeof e == "object", "EXPRESSION_REQUIRED"), i(["choice", "text", "audio", "drawing", "unknown", "skip"].includes(e.method), "EXPRESSION_METHOD"), i(typeof e.text == "string", "EXPRESSION_TEXT"), e.method === "unknown" || e.method === "skip") {
    i(e.text === "", "EMPTY_DEFERRED_EXPRESSION");
    return;
  }
  e.method === "text" && i(e.text.trim(), "EMPTY_EXPRESSION"), e.method === "choice" && i(e.choiceId && e.text.trim(), "EMPTY_CHOICE"), e.method === "audio" && i(e.audioRef && e.audioRef.startsWith("local-audio:"), "LOCAL_AUDIO_REQUIRED"), e.method === "drawing" && i(e.canvasRef, "CANVAS_REQUIRED");
}
const B = (e) => ({ method: e.method, hasText: !!e.text, provided: e.method !== "unknown" && e.method !== "skip" });
function Ce(e, t, n = $) {
  v(e), i(e.stage !== "complete", "COMPLETED_RESULT_IMMUTABLE");
  const o = structuredClone(e);
  o.revision++;
  const s = (a) => i(o.stage === a, "INVALID_STAGE");
  switch (t.type) {
    case "historyViewed":
      s("history"), i(o.contentSnapshot.conditions.some((a) => a.id === t.conditionId), "CONDITION_NOT_FOUND"), E(o, "historyViewed", { viewedConditionId: t.conditionId }, n);
      break;
    case "continueHistory":
      s("history"), i(o.contentSnapshot.conditions.every((a) => o.events.some((d) => d.eventType === "historyViewed" && d.payload.viewedConditionId === a.id)), "HISTORY_NOT_VIEWED"), o.stage = "condition";
      break;
    case "selectCondition":
      i(o.stage === "condition" || o.stage === "prediction", "INVALID_STAGE"), i(o.prediction.status !== "recorded", "PREDICTION_IMMUTABLE"), i(o.contentSnapshot.conditions.some((a) => a.id === t.conditionId), "CONDITION_NOT_FOUND"), E(o, o.conditionId ? "choiceChanged" : "conditionSelected", { kind: "condition", conditionId: t.conditionId, previousConditionId: o.conditionId }, n), o.conditionId = t.conditionId, o.events[o.events.length - 1].conditionId = t.conditionId, o.stage = "prediction";
      for (const a of de(S(o), o.profile).automaticSupport) E(o, "supportApplied", { support: a, automatic: !0 }, n, void 0, o.profile.attentionSupport);
      break;
    case "prediction": {
      s("prediction"), i(o.prediction.status !== "recorded", "PREDICTION_IMMUTABLE"), S(o), D(t.expression);
      const a = n.now();
      o.prediction = f({ expression: structuredClone(t.expression), recordedAt: a }), E(o, "predictionRecorded", B(t.expression), n, a), o.stage = "alternate";
      break;
    }
    case "reveal":
      s("alternate"), i(o.prediction.status === "recorded", "PREDICTION_REQUIRED"), i(["A", "B"].includes(t.possibility), "POSSIBILITY_REQUIRED"), o.alternate = f(t.possibility), E(o, "alternateViewed", { possibility: t.possibility, kind: "fiction", causalLevel: 3 }, n), o.stage = "activity";
      break;
    case "action": {
      s("activity");
      const a = S(o), d = H(a.activity, t.value);
      o.action = f(d), E(o, "cognitiveActionRecorded", { ...d, activityId: a.activity.id, materialSetId: a.activity.materialSetId, interactionContractId: a.activity.contractId, source: "learner" }, n), o.stage = "creation";
      break;
    }
    case "deferAction":
      s("activity"), i(["unknown", "skip"].includes(t.reason), "INVALID_DEFER"), o.action = u("notProvided"), E(o, "activityDeferred", { reason: t.reason }, n), o.stage = "creation";
      break;
    case "retryActivity":
      s("activity"), E(o, "activityRetried", {}, n);
      break;
    case "canvas": {
      s("creation"), J(o, t.canvas), o.canvas = f(structuredClone(t.canvas));
      for (const a of t.events)
        Ie(a, t.canvas), E(o, a.type, a.payload, n);
      break;
    }
    case "story":
      s("creation"), D(t.expression), t.expression.method === "drawing" && i(o.canvas.status === "recorded" && o.canvas.value.completed && t.expression.canvasRef === o.canvas.value.id, "CANVAS_REQUIRED"), o.story = f(structuredClone(t.expression)), E(o, "storyRecorded", B(t.expression), n), o.stage = "historyComparison";
      break;
    case "comparison": {
      s(t.kind === "history" ? "historyComparison" : "predictionComparison"), D(t.expression), t.kind === "prediction" && i(o.prediction.status === "recorded", "PREDICTION_REQUIRED"), o[t.kind === "history" ? "historyComparison" : "predictionComparison"] = f(structuredClone(t.expression)), E(o, "comparisonCompleted", { comparisonKind: t.kind, ...B(t.expression) }, n), t.kind === "history" ? o.stage = "predictionComparison" : (o.stage = "complete", o.completedAt = n.now(), E(o, "missionCompleted", {}, n, o.completedAt));
      break;
    }
    case "hint":
      i(["pictureExample", "repeatGuide", "reducedChoices", "sequenceHelp", "keyElement", "canvasHelp", "visualGuide"].includes(t.hintType) && [0, 1, 2, 3].includes(t.level), "INVALID_HINT"), E(o, "hintRequested", { hintType: t.hintType, requestedAtStage: o.stage, requestCount: o.events.filter((a) => a.eventType === "hintRequested").length + 1, automatic: !1 }, n, void 0, t.level);
      break;
    case "cover":
      i(["antique", "linen", "adventure"].includes(t.cover), "INVALID_COVER"), o.cover = t.cover;
      break;
  }
  return v(o), o;
}
function Ie(e, t) {
  const n = { canvasObjectAdded: ["sceneId", "stickerId"], canvasObjectMoved: ["sceneId", "stickerId", "x", "y"], drawingAdded: ["sceneId", "lineCount", "tool", "width"], sceneCompleted: ["sceneId", "stickerCount", "lineCount"] };
  i(Object.hasOwn(n, e.type) && Object.keys(e.payload).every((o) => n[e.type].includes(o)), "CANVAS_EVENT_FIELDS"), i(t.scenes.some((o) => o.id === e.payload.sceneId), "SCENE_NOT_FOUND");
}
function J(e, t) {
  W(e, t), i(typeof t.id == "string" && t.id.length > 0 && Array.isArray(t.scenes) && t.scenes.length >= 1 && t.scenes.length <= 3, "INVALID_CANVAS");
  const n = /* @__PURE__ */ new Set();
  for (const o of t.scenes) {
    W(e, o), i(!n.has(o.id), "DUPLICATE_SCENE"), n.add(o.id), i(new Set(o.stickers.map((s) => s.id)).size === o.stickers.length, "DUPLICATE_STICKER");
    for (const s of o.stickers) i([s.x, s.y, s.scale].every(Number.isFinite) && s.scale > 0, "INVALID_PLACEMENT");
    i(o.preview === "" || o.preview.startsWith("data:image/png;base64,"), "LOCAL_PREVIEW_REQUIRED");
  }
}
function v(e) {
  i(e && e.schemaVersion === 1 && Number.isInteger(e.revision) && e.revision >= 0, "INVALID_RUN"), i(T.includes(e.stage), "INVALID_STAGE"), z(e.profile), i(e.contentSnapshot.id === e.missionId && e.contentSnapshot.missionVersion === e.missionVersion && e.contentSnapshot.contentVersion === e.contentVersion, "CONTENT_VERSION_MISMATCH"), i(e.ageBandRuleId === `nuvia.age.${e.profile.ageBand}.v1`, "AGE_RULE_MISMATCH"), i(!Number.isNaN(Date.parse(e.createdAt)), "INVALID_TIME"), i(typeof e.resultId == "string" && e.resultId.length > 0, "RESULT_ID_REQUIRED"), e.conditionId && S(e);
  for (const s of [e.prediction, e.alternate, e.action, e.story, e.canvas, e.historyComparison, e.predictionComparison]) i(s && ["recorded", "notRecorded", "notObserved", "notCollected", "notProvided"].includes(s.status), "INVALID_FIELD_STATUS");
  for (const s of [e.story, e.historyComparison, e.predictionComparison]) s.status === "recorded" && D(s.value);
  e.prediction.status === "recorded" && D(e.prediction.value.expression);
  const t = /* @__PURE__ */ new Set();
  for (const s of e.events)
    i(!t.has(s.eventId), "DUPLICATE_EVENT"), t.add(s.eventId), i(s.resultId === e.resultId && s.missionId === e.missionId && s.missionVersion === e.missionVersion && s.contentVersion === e.contentVersion && s.ageBandRuleId === e.ageBandRuleId, "RESULT_LINK_ERROR"), i(!s.conditionId || e.contentSnapshot.conditions.some((a) => a.id === s.conditionId), "EVENT_CONDITION_MISMATCH");
  T.indexOf(e.stage) >= 3 && i(e.prediction.status === "recorded", "PREDICTION_REQUIRED"), T.indexOf(e.stage) >= 4 && i(e.alternate.status === "recorded" && ["A", "B"].includes(e.alternate.value), "ALTERNATE_REQUIRED"), T.indexOf(e.stage) >= 5 && i(e.action.status === "recorded" || e.action.status === "notProvided", "ACTION_RECORD_REQUIRED"), T.indexOf(e.stage) >= 6 && i(e.story.status === "recorded", "STORY_REQUIRED"), T.indexOf(e.stage) >= 7 && i(e.historyComparison.status === "recorded", "HISTORY_COMPARISON_REQUIRED");
  const n = e.events.filter((s) => s.eventType === "predictionRecorded"), o = e.events.findIndex((s) => s.eventType === "alternateViewed");
  i(n.length <= 1, "PREDICTION_IMMUTABLE"), e.prediction.status === "recorded" && (i(n.length === 1 && n[0].timestamp === e.prediction.value.recordedAt, "PREDICTION_EVENT_MISMATCH"), o >= 0 && i(e.events.findIndex((s) => s.eventType === "predictionRecorded") < o, "PREDICTION_ORDER")), e.action.status === "recorded" && H(S(e).activity, e.action.value), e.canvas.status === "recorded" && J(e, e.canvas.value), e.stage === "complete" && (i(!!e.completedAt && Date.parse(e.completedAt) >= Date.parse(e.createdAt), "INVALID_COMPLETION_TIME"), i(e.historyComparison.status === "recorded" && e.predictionComparison.status === "recorded", "TWO_COMPARISONS_REQUIRED"), i(e.events.filter((s) => s.eventType === "comparisonCompleted" && s.payload.comparisonKind === "history").length === 1 && e.events.filter((s) => s.eventType === "comparisonCompleted" && s.payload.comparisonKind === "prediction").length === 1, "COMPARISON_EVENT_MISMATCH"));
}
function Z(e, t) {
  v(e), v(t), i(t.resultId === e.resultId && t.profile.learnerId === e.profile.learnerId && t.missionId === e.missionId, "RESULT_LINK_ERROR"), i(e.stage !== "complete", "COMPLETED_RESULT_IMMUTABLE"), i(t.revision === e.revision + 1, "REVISION_CONFLICT");
  for (const n of ["contentSnapshot", "localeSnapshot", "profile", "createdAt", "missionVersion", "contentVersion", "ageBandRuleId"]) i(JSON.stringify(e[n]) === JSON.stringify(t[n]), "SNAPSHOT_IMMUTABLE");
  i(JSON.stringify(t.events.slice(0, e.events.length)) === JSON.stringify(e.events), "EVENT_HISTORY_IMMUTABLE"), e.prediction.status === "recorded" && i(JSON.stringify(e.prediction) === JSON.stringify(t.prediction), "PREDICTION_IMMUTABLE");
}
const ue = "nuviaRepresentative6.v1";
class Ae {
  constructor(t = indexedDB) {
    this.factory = t;
  }
  open() {
    return new Promise((t, n) => {
      const o = this.factory.open(ue, 1);
      o.onupgradeneeded = () => {
        o.result.createObjectStore("runs", { keyPath: "resultId" }), o.result.createObjectStore("media", { keyPath: "id" });
      }, o.onerror = () => n(o.error), o.onblocked = () => n(Error("STORAGE_BLOCKED")), o.onsuccess = () => t(o.result);
    });
  }
  async create(t) {
    v(t), i(t.revision === 0, "NEW_RESULT_REVISION");
    const n = await this.open();
    try {
      await new Promise((o, s) => {
        const a = n.transaction("runs", "readwrite");
        a.objectStore("runs").add(structuredClone(t)), a.oncomplete = () => o(), a.onerror = () => s(a.error), a.onabort = () => s(a.error ?? Error("SAVE_ABORTED"));
      });
    } finally {
      n.close();
    }
  }
  async save(t, n) {
    v(t);
    for (const s of [t.story, t.historyComparison, t.predictionComparison, t.prediction.status === "recorded" ? { status: "recorded", value: t.prediction.value.expression } : t.prediction]) s.status === "recorded" && s.value.method === "audio" && await this.loadAudio(s.value.audioRef, t.resultId, t.profile.learnerId);
    const o = await this.open();
    try {
      await new Promise((s, a) => {
        const d = o.transaction("runs", "readwrite"), l = d.objectStore("runs"), r = l.get(t.resultId);
        let p;
        r.onsuccess = () => {
          try {
            const y = r.result;
            i(y, "RESULT_NOT_FOUND"), i(y.revision === n, "REVISION_CONFLICT"), Z(y, t), l.put(structuredClone(t));
          } catch (y) {
            p = y, d.abort();
          }
        }, d.oncomplete = () => s(), d.onerror = () => a(p ?? d.error), d.onabort = () => a(p ?? d.error ?? Error("SAVE_ABORTED"));
      });
    } finally {
      o.close();
    }
  }
  async load(t, n) {
    const o = await this.open();
    try {
      return await new Promise((s, a) => {
        const d = o.transaction("runs").objectStore("runs").get(t);
        d.onsuccess = () => {
          try {
            const l = d.result;
            if (!l) {
              s(null);
              return;
            }
            i(l.profile.learnerId === n, "OWNER_MISMATCH"), v(l), s(structuredClone(l));
          } catch (l) {
            a(l);
          }
        }, d.onerror = () => a(d.error);
      });
    } finally {
      o.close();
    }
  }
  async list(t) {
    const n = await this.open();
    try {
      return await new Promise((o, s) => {
        const a = n.transaction("runs").objectStore("runs").getAll();
        a.onsuccess = () => {
          try {
            const d = a.result.filter((l) => l.profile.learnerId === t);
            d.forEach(v), o(d);
          } catch (d) {
            s(d);
          }
        }, a.onerror = () => s(a.error);
      });
    } finally {
      n.close();
    }
  }
  async saveAudio(t, n, o) {
    i(o.type.startsWith("audio/") && o.size > 0 && o.size <= 75e4, "INVALID_AUDIO"), i(await this.load(t, n), "RESULT_NOT_FOUND");
    const s = "local-audio:" + crypto.randomUUID(), a = await this.open();
    try {
      return await new Promise((d, l) => {
        const r = a.transaction("media", "readwrite");
        r.objectStore("media").add({ id: s, resultId: t, learnerId: n, blob: o }), r.oncomplete = () => d(), r.onerror = () => l(r.error), r.onabort = () => l(r.error);
      }), s;
    } finally {
      a.close();
    }
  }
  async loadAudio(t, n, o) {
    const s = await this.open();
    try {
      return await new Promise((a, d) => {
        const l = s.transaction("media").objectStore("media").get(t);
        l.onsuccess = () => {
          try {
            const r = l.result;
            i(r && r.resultId === n && r.learnerId === o, "MEDIA_LINK_ERROR"), a(r.blob);
          } catch (r) {
            d(r);
          }
        }, l.onerror = () => d(l.error);
      });
    } finally {
      s.close();
    }
  }
}
class Te {
  constructor() {
    x(this, "rows", /* @__PURE__ */ new Map());
  }
  async create(t) {
    v(t), i(t.revision === 0, "NEW_RESULT_REVISION"), i(!this.rows.has(t.resultId), "DUPLICATE_RESULT"), this.rows.set(t.resultId, structuredClone(t));
  }
  async save(t, n) {
    const o = this.rows.get(t.resultId);
    i(o, "RESULT_NOT_FOUND"), i(o.revision === n, "REVISION_CONFLICT"), Z(o, t), this.rows.set(t.resultId, structuredClone(t));
  }
  async load(t, n) {
    const o = this.rows.get(t);
    return o ? (i(o.profile.learnerId === n, "OWNER_MISMATCH"), v(o), structuredClone(o)) : null;
  }
  async list(t) {
    return [...this.rows.values()].filter((n) => n.profile.learnerId === t).map((n) => structuredClone(n));
  }
}
const _e = ["cover", "actualHistory", "changedCondition", "initialPrediction", "alternateHistory", "learnerStory", "historyComparison", "predictionComparison"];
function U(e) {
  return e.status === "recorded" ? e.value.method === "skip" || e.value.method === "unknown" ? u("notProvided") : f(e.value.text) : u(e.status);
}
function ye(e) {
  v(e);
  const t = S(e), n = (d) => (i(Object.hasOwn(e.localeSnapshot, d), "SNAPSHOT_TRANSLATION_MISSING"), e.localeSnapshot[d]), o = e.prediction.status === "recorded" ? f(e.prediction.value.expression) : u(e.prediction.status), s = e.canvas.status === "recorded" ? e.canvas.value.scenes.map((d) => d.preview).filter(Boolean) : [], a = [
    { number: 1, role: "cover", kind: "cover", text: f(n(e.contentSnapshot.titleKey)), previews: [] },
    { number: 2, role: "actualHistory", kind: "fact", text: f(n(t.actualHistoryKey)), previews: [] },
    { number: 3, role: "changedCondition", kind: "assumption", text: f(n(t.conditionKey)), previews: [] },
    { number: 4, role: "initialPrediction", kind: "prediction", text: U(o), expression: o, previews: [] },
    { number: 5, role: "alternateHistory", kind: "fiction", text: e.alternate.status === "recorded" ? f(n(t.alternateKeys[e.alternate.value === "A" ? 0 : 1])) : u(e.alternate.status), previews: [] },
    { number: 6, role: "learnerStory", kind: "creation", text: U(e.story), expression: structuredClone(e.story), previews: s },
    { number: 7, role: "historyComparison", kind: "comparison", text: U(e.historyComparison), expression: structuredClone(e.historyComparison), previews: [] },
    { number: 8, role: "predictionComparison", kind: "comparison", text: U(e.predictionComparison), expression: structuredClone(e.predictionComparison), previews: [] }
  ];
  return { resultId: e.resultId, missionId: e.missionId, conditionId: e.conditionId, missionVersion: e.missionVersion, contentVersion: e.contentVersion, kind: "missionBook", templateId: "nuvia.book.mission-8page.v1", cover: e.cover, pages: a, sourceIds: [...t.sourceIds], monthlyCompilation: !1 };
}
function Ee(e) {
  switch (e.actionKind) {
    case "mapRelation":
      return { actionKind: e.actionKind, nodeIds: e.nodeIds, relationId: e.relationId, meaningKey: e.meaningKey };
    case "classifyEvidence":
      return { actionKind: e.actionKind, evidenceItemIds: e.evidenceItemIds, categoryByItem: e.categoryByItem, uncertainItemIds: e.uncertainItemIds, reasonRef: e.reasonRef };
    default:
      return structuredClone(e);
  }
}
function Ne(e) {
  v(e);
  const t = S(e), n = ye(e), o = e.events.filter((r) => r.eventType === "cognitiveActionRecorded" && r.conditionId === t.id && r.payload.source === "learner"), s = e.action.status === "recorded" && o.length > 0, a = e.events.filter((r) => r.eventType === "hintRequested"), d = /* @__PURE__ */ new Map();
  for (const r of a) {
    const p = String(r.payload.hintType);
    d.set(p, (d.get(p) ?? 0) + 1);
  }
  const l = { resultId: e.resultId, missionId: e.missionId, conditionId: t.id, missionVersion: e.missionVersion, contentVersion: e.contentVersion };
  return {
    ...l,
    titleKey: "report.singleMission",
    alias: e.profile.alias,
    createdAt: e.createdAt,
    completedAt: e.completedAt,
    completed: e.stage === "complete",
    durationMs: e.completedAt ? f(Date.parse(e.completedAt) - Date.parse(e.createdAt)) : u("notRecorded"),
    together: { actualHistory: e.localeSnapshot[t.actualHistoryKey], changedCondition: e.localeSnapshot[t.conditionKey], initialPrediction: structuredClone(e.prediction), story: structuredClone(e.story), historyComparison: structuredClone(e.historyComparison), predictionComparison: structuredClone(e.predictionComparison), thoughts: s ? [e.localeSnapshot["thought." + t.passDomain]] : [], preview: n.pages[5].previews.slice(0, 1) },
    details: { observations: s && e.action.status === "recorded" ? [{ eventId: o[o.length - 1].eventId, description: e.localeSnapshot[t.activity.observationKey], input: Ee(e.action.value) }] : [], observationStatus: s ? "recorded" : e.action.status === "notProvided" ? "notProvided" : "notObserved", hintCount: a.length, hints: a.map((r) => ({ type: r.payload.hintType, level: r.supportLevel, count: r.payload.requestCount, stage: r.payload.requestedAtStage, eventId: r.eventId })), automaticSupports: e.events.filter((r) => r.eventType === "supportApplied").map((r) => ({ type: r.payload.support, level: r.supportLevel })), choiceChanges: e.events.filter((r) => r.eventType === "choiceChanged" && r.payload.kind === "condition").length, retries: e.events.filter((r) => r.eventType === "activityRetried").length, stickerUse: e.events.filter((r) => r.eventType === "canvasObjectAdded").length, drawingUse: e.events.filter((r) => r.eventType === "drawingAdded").length, expressionModes: [...new Set([e.story, e.historyComparison, e.predictionComparison].filter((r) => r.status === "recorded").map((r) => r.value.method))], assessmentScores: u("notCollected") },
    nextSupport: [...d.entries()].sort((r, p) => p[1] - r[1] || r[0].localeCompare(p[0])).slice(0, 2).map(([r, p]) => ({ type: r, count: p })),
    bookLink: { ...l, artifact: "missionBook" },
    cumulativeReportEligible: !1
  };
}
function Oe(e) {
  return { resultId: e ?? null, initialPrediction: u(), action: u("notCollected"), story: u(), historyComparison: u(), predictionComparison: u(), completed: u(), canCreateBook: !1 };
}
class be {
  constructor(t) {
    x(this, "records", /* @__PURE__ */ new Map());
    for (const n of t)
      i(!this.records.has(n.id), "DUPLICATE_ASSET"), n.state === "existing" && i(n.path && !/^https?:/i.test(n.path) && n.sha256 && Number.isInteger(n.bytes), "ASSET_METADATA_REQUIRED"), this.records.set(n.id, { ...n });
  }
  resolve(t) {
    const n = this.records.get(t);
    return i(n, "ASSET_NOT_FOUND"), i(n.state === "existing", "ASSET_NOT_PROVIDED"), { ...n };
  }
  inspect(t) {
    const n = this.records.get(t);
    return n ? { ...n } : null;
  }
}
function De({ definition: e, t, labels: n, pageSize: o = 4, highlight: s = !1, onCommit: a, onDefer: d, onRetry: l }) {
  const [r, p] = A(0), [y, w] = A({}), [_, Q] = A({}), [P, G] = A(), [k, q] = A(""), [C, N] = A(0), L = (c) => e.materials.filter((h) => h.role === c), M = { mapRelation: ["nodes", "meaning"], arrangeSequence: ["order", "state", "interruption"], classifyEvidence: L("evidence").map((c) => c.id).concat("reason"), compareStructures: ["left", "right", "difference"], chooseGoalAndSteps: ["goal", "response", "constraint", "reason"], prioritizeActions: ["goal", "priorities", "constraint", "reason"], revisePlan: ["goal", "before", "after", "reason"] }[e.actionKind], I = M[r], F = { nodes: "node", meaning: "meaning", order: "step", left: "left", right: "right", difference: "reason", goal: "goal", response: "response", constraint: "constraint", reason: "reason", priorities: "response", before: "response", after: "response" }, K = I === "nodes" || I === "order" || I === "priorities", O = F[I] ? L(F[I]) : [], m = y[I] ?? [], ee = I === "state" ? !!P : I === "interruption" ? !!k : I in _ ? !0 : O.length ? m.length === (I === "nodes" ? 2 : K ? O.length : 1) : !1;
  function te(c) {
    w((h) => ({ ...h, [I]: K ? m.includes(c) ? m.filter((g) => g !== c) : I === "nodes" && m.length === 2 ? [m[1], c] : [...m, c] : [c] }));
  }
  function ne() {
    const c = (g) => {
      var V;
      return ((V = y[g]) == null ? void 0 : V[0]) ?? "";
    }, h = (g) => y[g] ?? [];
    switch (e.actionKind) {
      case "mapRelation":
        return { actionKind: e.actionKind, nodeIds: h("nodes"), relationId: e.id + ".relation", meaningKey: c("meaning") };
      case "arrangeSequence":
        return { actionKind: e.actionKind, orderedStepIds: h("order"), precedenceRefs: h("order").slice(1).map((g, V) => [h("order")[V], g]), completionState: P, ...k !== "none" ? { interruptedStepId: k } : {} };
      case "classifyEvidence":
        return { actionKind: e.actionKind, evidenceItemIds: L("evidence").map((g) => g.id), categoryByItem: _, hiddenExplanationId: e.hiddenExplanationId, uncertainItemIds: Object.keys(_).filter((g) => _[g] === "unknown"), reasonRef: c("reason") };
      case "compareStructures":
        return { actionKind: e.actionKind, leftRelationIds: h("left"), rightRelationIds: h("right"), differenceRef: c("difference") };
      case "chooseGoalAndSteps":
        return { actionKind: e.actionKind, goalId: c("goal"), responseId: c("response"), constraintId: c("constraint"), reasonRef: c("reason") };
      case "prioritizeActions":
        return { actionKind: e.actionKind, goalId: c("goal"), orderedResponseIds: h("priorities"), constraintId: c("constraint"), reasonRef: c("reason") };
      case "revisePlan":
        return { actionKind: e.actionKind, goalId: c("goal"), beforeResponseId: c("before"), afterResponseId: c("after"), decision: c("before") === c("after") ? "keep" : "change", reasonRef: c("reason") };
    }
  }
  const oe = { nodes: n.meaning, order: n.sequence, priorities: n.sequence, difference: n.reason, state: n.planned, interruption: n.interruption }[I] ?? n[I] ?? t(e.materials.find((c) => c.id === I).labelKey);
  return /* @__PURE__ */ b("section", { className: `activity-workbench ${s ? "highlight" : ""}`, "aria-label": t(e.promptKey), children: [
    /* @__PURE__ */ R("p", { className: "activity-instruction", children: t(e.promptKey) }),
    /* @__PURE__ */ b("fieldset", { children: [
      /* @__PURE__ */ R("legend", { children: oe }),
      O.slice(C * o, (C + 1) * o).map((c) => /* @__PURE__ */ b("button", { type: "button", "aria-pressed": m.includes(c.id), "data-material": c.id, onClick: () => te(c.id), children: [
        /* @__PURE__ */ R("span", { className: `material-symbol ${c.visual ?? "choice"}`, "aria-hidden": "true" }),
        t(c.labelKey),
        K && m.includes(c.id) ? ` · ${m.indexOf(c.id) + 1}` : ""
      ] }, c.id)),
      O.length > o && /* @__PURE__ */ b("nav", { children: [
        /* @__PURE__ */ R("button", { type: "button", disabled: C === 0, onClick: () => N(C - 1), children: n.back }),
        /* @__PURE__ */ R("button", { type: "button", disabled: (C + 1) * o >= O.length, onClick: () => N(C + 1), children: n.next })
      ] }),
      I === "state" && ["planned", "observed", "unknown"].map((c) => /* @__PURE__ */ R("button", { type: "button", "aria-pressed": P === c, onClick: () => G(c), children: c === "planned" ? n.planned : c === "observed" ? n.observed : n.completionUnknown }, c)),
      I === "interruption" && [{ id: "none", label: n.none }, ...L("step").map((c) => ({ id: c.id, label: t(c.labelKey) }))].map((c) => /* @__PURE__ */ R("button", { type: "button", "aria-pressed": k === c.id, onClick: () => q(c.id), children: c.label }, c.id)),
      e.actionKind === "classifyEvidence" && I !== "reason" && ["confirmed", "hidden", "unknown"].map((c) => /* @__PURE__ */ R("button", { type: "button", "aria-pressed": _[I] === c, onClick: () => Q((h) => ({ ...h, [I]: c })), children: c === "unknown" ? n.uncertain : n[c] }, c))
    ] }),
    /* @__PURE__ */ b("nav", { children: [
      /* @__PURE__ */ R("button", { type: "button", disabled: r === 0, onClick: () => {
        p(r - 1), N(0);
      }, children: n.back }),
      /* @__PURE__ */ R("button", { type: "button", disabled: !ee, onClick: () => {
        r === M.length - 1 ? a(H(e, ne())) : (p(r + 1), N(0));
      }, children: r === M.length - 1 ? n.save : n.next }),
      /* @__PURE__ */ R("button", { type: "button", onClick: d, children: n.unknown }),
      /* @__PURE__ */ R("button", { type: "button", onClick: () => {
        w({}), Q({}), G(void 0), q(""), p(0), N(0), l();
      }, children: n.reset })
    ] })
  ] });
}
export {
  X as ACTIONS,
  Y as AGE_BANDS,
  ce as APP_VERSION,
  De as ActivityRenderer,
  be as AssetRegistry,
  _e as BOOK_ROLES,
  Ae as BrowserRepository,
  re as ContractError,
  ue as DATABASE,
  Te as MemoryRepository,
  T as STAGES,
  pe as artifactLink,
  W as assertLink,
  v as assertRun,
  Z as assertSuccessor,
  ye as bookModel,
  S as condition,
  ge as loadContent,
  u as missing,
  i as need,
  Se as newRun,
  de as presentation,
  $ as productionDependencies,
  f as recorded,
  Ne as reportModel,
  z as resolveProfile,
  Ce as transition,
  me as translator,
  Oe as unavailableLegacyReport,
  H as validateAction,
  J as validateCanvas,
  ae as validateContent,
  D as validateExpression
};
