import type { ScenarioLanguage } from "./scenario-model";
import { packetKo, packetEn } from "./scenario-packet-text";
import { packetJa } from "./scenario-packet-locales/ja";
import { packetZhCN } from "./scenario-packet-locales/zh-CN";
import { packetZhTW } from "./scenario-packet-locales/zh-TW";
import { packetMn } from "./scenario-packet-locales/mn";
import { packetTh } from "./scenario-packet-locales/th";
import { packetVi } from "./scenario-packet-locales/vi";
import { packetAr } from "./scenario-packet-locales/ar";
import { packetRu } from "./scenario-packet-locales/ru";
import { packetKm } from "./scenario-packet-locales/km";
import { packetEs } from "./scenario-packet-locales/es";
import { packetFr } from "./scenario-packet-locales/fr";
import { packetIt } from "./scenario-packet-locales/it";
import { packetAz } from "./scenario-packet-locales/az";

export const packetLexicons: Record<ScenarioLanguage, Record<string, string>> = {
  ko: packetKo, en: packetEn, ja: packetJa, "zh-CN": packetZhCN, "zh-TW": packetZhTW,
  mn: packetMn, th: packetTh, vi: packetVi, ar: packetAr, ru: packetRu, km: packetKm,
  es: packetEs, fr: packetFr, it: packetIt, az: packetAz,
};
// A floor is explicit fictional data, never inferred from a room number.
const floorLabels:Record<ScenarioLanguage,string>={
 ko:"층",en:"Floor",ja:"階","zh-CN":"楼层","zh-TW":"樓層",mn:"Давхар",th:"ชั้น",vi:"Tầng",
 ar:"الطابق",ru:"Этаж",km:"ជាន់",es:"Planta",fr:"Étage",it:"Piano",az:"Mərtəbə",
};
for(const language of Object.keys(packetLexicons) as ScenarioLanguage[])packetLexicons[language].floor=floorLabels[language];
