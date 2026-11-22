import type { ScenarioLexicon, ScenarioLanguage, ScenarioFamily } from "./scenario-model";
import { ko } from "./scenario-locales/ko";
import { en } from "./scenario-locales/en";
import { ja } from "./scenario-locales/ja";
import { zhCN } from "./scenario-locales/zh-CN";
import { zhTW } from "./scenario-locales/zh-TW";
import { mn } from "./scenario-locales/mn";
import { th } from "./scenario-locales/th";
import { vi } from "./scenario-locales/vi";
import { ar } from "./scenario-locales/ar";
import { ru } from "./scenario-locales/ru";
import { km } from "./scenario-locales/km";
import { es } from "./scenario-locales/es";
import { fr } from "./scenario-locales/fr";
import { it } from "./scenario-locales/it";
import { az } from "./scenario-locales/az";

// Authored translations. Coverage is technical (every key present); native-speaker review NOT done.
export const scenarioLexicons: Record<ScenarioLanguage, ScenarioLexicon> = {
  ko, en, ja, "zh-CN": zhCN, "zh-TW": zhTW, mn, th, vi, ar, ru, km, es, fr, it, az,
};

export const scenarioRtlLanguages: readonly ScenarioLanguage[] = ["ar"];
export const scenarioLanguageNames: Record<ScenarioLanguage, string> = {
  ko: "한국어", en: "English", ja: "日本語", "zh-CN": "简体中文", "zh-TW": "繁體中文", mn: "Монгол", th: "ไทย", vi: "Tiếng Việt",
  ar: "العربية", ru: "Русский", km: "ខ្មែរ", es: "Español", fr: "Français", it: "Italiano", az: "Azərbaycanca",
};

export const scenarioCommonKeys = [
  "role","goal","conflict","materials","alternatives","studentAction","change","summary","dailyTransfer","safety","schedule","evidence",
  "roleText","goalText","fictionNotice","authority","conflictText","sourceMeta","verifyInfo","constraintTime","constraintPeople","constraintResource",
  "noCost","safeChoices","soloHelp","groupHelp","guided","independent","coursePlan","lecturePlan","dailyBoundary","jobBoundary","workplaceBoundary",
  "workplaceTask","decision","execute","why","revise","reflection","contribution","rulesNotice","genericNotice","verifiedNotice","askChange",
  "rubric1","rubric2","rubric3","rubric4","rubric5","ktlFact","cjFact","ktlScope","cjScope","sourceTitleKtl","sourceTitleCj","alternativeA","alternativeB","dailyArtifact","workplaceArtifact",
  "dailyOptionA","dailyProA","dailyConA","dailyOptionB","dailyProB","dailyConB","dailyChangeA","dailyChangeB",
  "workplaceOptionA","workplaceProA","workplaceConA","workplaceOptionB","workplaceProB","workplaceConB","workplaceChangeA","workplaceChangeB","secondChange",
] as const;
export const scenarioFamilyKeys = [
  "title","jobContext","dailyContext","artifact","sourceA","sourceB","sourceC","sourceD","limit","optionA","proA","conA","optionB","proB","conB",
  "changeA","changeB","dailyTask","transfer","professionDifference",
] as const;

/** Technical coverage check only: lists missing keys per language. Not a quality review. */
export function scenarioLexiconGaps(): string[] {
  const gaps: string[] = [];
  const uiKeys = Object.keys(scenarioLexicons.ko.ui);
  for (const [lang, lx] of Object.entries(scenarioLexicons)) {
    uiKeys.forEach((k) => { if (!lx.ui[k]) gaps.push(`${lang}.ui.${k}`); });
    scenarioCommonKeys.forEach((k) => { if (!lx.common[k]) gaps.push(`${lang}.common.${k}`); });
    (Object.keys(lx.families) as ScenarioFamily[]).forEach((f) =>
      scenarioFamilyKeys.forEach((k) => { if (!lx.families[f][k]) gaps.push(`${lang}.families.${f}.${k}`); }));
  }
  return gaps;
}
