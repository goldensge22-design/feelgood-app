import type { ReactNode } from "react";
import { enterpriseScenario } from "@workspace/api-zod";
import type { enterpriseScenario as Types } from "@workspace/api-zod";
const {scenarioLexicons,scenarioRtlLanguages}=enterpriseScenario;
type CardPlannerPreview=Types.CardPlannerPreview;
type ScenarioLanguage=Types.ScenarioLanguage;

type H = { opts: string; chg: string; prm: string; rub: string; src: string; pkt: string; meta: string; after: string; docs: string; verify: string; extra: string };
const HX: Record<ScenarioLanguage, H> = {
  ko: { opts: "선택지", chg: "선택 후 공개된 변화", prm: "질문", rub: "평가 기준", src: "출처", pkt: "의사결정 자료", meta: "기술 정보", after: "선택 이후", docs: "자료", verify: "확인 방법", extra: "추가 정보" },
  en: { opts: "Options", chg: "Changes revealed after a choice", prm: "Prompts", rub: "Rubric", src: "Sources", pkt: "Decision packet", meta: "Technical details", after: "After option", docs: "Documents", verify: "Verification", extra: "Additional fields" },
  ja: { opts: "選択肢", chg: "選択後に公開された変化", prm: "問い", rub: "評価基準", src: "出典", pkt: "意思決定資料", meta: "技術情報", after: "選択後", docs: "資料", verify: "確認方法", extra: "追加情報" },
  "zh-CN": { opts: "选项", chg: "选择后公开的变化", prm: "问题", rub: "评价标准", src: "来源", pkt: "决策资料", meta: "技术信息", after: "选择之后", docs: "资料", verify: "核实方式", extra: "其他字段" },
  "zh-TW": { opts: "選項", chg: "選擇後公開的變化", prm: "問題", rub: "評量標準", src: "來源", pkt: "決策資料", meta: "技術資訊", after: "選擇之後", docs: "資料", verify: "查核方式", extra: "其他欄位" },
  mn: { opts: "Сонголтууд", chg: "Сонголтын дараа нээгдсэн өөрчлөлт", prm: "Асуултууд", rub: "Үнэлгээний шалгуур", src: "Эх сурвалж", pkt: "Шийдвэрийн материал", meta: "Техникийн мэдээлэл", after: "Сонголтын дараа", docs: "Баримтууд", verify: "Шалгах арга", extra: "Нэмэлт талбар" },
  th: { opts: "ตัวเลือก", chg: "การเปลี่ยนแปลงที่เปิดเผยหลังเลือก", prm: "คำถาม", rub: "เกณฑ์การประเมิน", src: "แหล่งที่มา", pkt: "ชุดข้อมูลการตัดสินใจ", meta: "ข้อมูลทางเทคนิค", after: "หลังตัวเลือก", docs: "เอกสาร", verify: "วิธีตรวจสอบ", extra: "ข้อมูลเพิ่มเติม" },
  vi: { opts: "Lựa chọn", chg: "Thay đổi đã công khai sau lựa chọn", prm: "Câu hỏi", rub: "Tiêu chí đánh giá", src: "Nguồn", pkt: "Hồ sơ quyết định", meta: "Thông tin kỹ thuật", after: "Sau lựa chọn", docs: "Tài liệu", verify: "Cách kiểm chứng", extra: "Trường bổ sung" },
  ar: { opts: "الخيارات", chg: "التغييرات المكشوفة بعد الاختيار", prm: "الأسئلة", rub: "معايير التقييم", src: "المصادر", pkt: "ملف القرار", meta: "معلومات تقنية", after: "بعد الخيار", docs: "المستندات", verify: "طريقة التحقق", extra: "حقول إضافية" },
  ru: { opts: "Варианты", chg: "Изменения, открытые после выбора", prm: "Вопросы", rub: "Критерии оценки", src: "Источники", pkt: "Материалы для решения", meta: "Технические сведения", after: "После варианта", docs: "Документы", verify: "Проверка", extra: "Дополнительные поля" },
  km: { opts: "ជម្រើស", chg: "ការផ្លាស់ប្តូរដែលបានបង្ហាញក្រោយជ្រើស", prm: "សំណួរ", rub: "លក្ខណៈវាយតម្លៃ", src: "ប្រភព", pkt: "ឯកសារសម្រេចចិត្ត", meta: "ព័ត៌មានបច្ចេកទេស", after: "ក្រោយជម្រើស", docs: "ឯកសារ", verify: "វិធីផ្ទៀងផ្ទាត់", extra: "វាលបន្ថែម" },
  es: { opts: "Opciones", chg: "Cambios revelados tras elegir", prm: "Preguntas", rub: "Rúbrica", src: "Fuentes", pkt: "Dossier de decisión", meta: "Detalles técnicos", after: "Tras la opción", docs: "Documentos", verify: "Verificación", extra: "Campos adicionales" },
  fr: { opts: "Options", chg: "Changements révélés après un choix", prm: "Questions", rub: "Grille d'évaluation", src: "Sources", pkt: "Dossier de décision", meta: "Détails techniques", after: "Après l'option", docs: "Documents", verify: "Vérification", extra: "Champs supplémentaires" },
  it: { opts: "Opzioni", chg: "Cambiamenti rivelati dopo la scelta", prm: "Domande", rub: "Criteri di valutazione", src: "Fonti", pkt: "Dossier decisionale", meta: "Dettagli tecnici", after: "Dopo l'opzione", docs: "Documenti", verify: "Verifica", extra: "Campi aggiuntivi" },
  az: { opts: "Seçimlər", chg: "Seçimdən sonra açılan dəyişikliklər", prm: "Suallar", rub: "Qiymətləndirmə meyarları", src: "Mənbələr", pkt: "Qərar paketi", meta: "Texniki məlumat", after: "Seçimdən sonra", docs: "Sənədlər", verify: "Yoxlama", extra: "Əlavə sahələr" },
};

type O = Record<string, unknown>;
const isObj = (v: unknown): v is O => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const rest = (o: unknown, used: string[]): O => isObj(o) ? Object.fromEntries(Object.entries(o).filter(([k]) => !used.includes(k))) : {};
const safeHttps = (u: unknown) => { try { const x = new URL(str(u)); return x.protocol === "https:" && !x.username && !x.password ? x.href : null; } catch { return null; } };
const txt = "whitespace-pre-wrap [overflow-wrap:anywhere]";

/** Read-only readable tree for any value; never serializes to JSON. */
function Tree({ v }: { v: unknown }): ReactNode {
  if (Array.isArray(v)) {
    if (!v.length) return <span className="text-muted-foreground">-</span>;
    return <ol className="list-decimal space-y-1 ps-5">{v.map((x, i) => <li key={i} className={txt}><Tree v={x} /></li>)}</ol>;
  }
  if (isObj(v)) {
    const e = Object.entries(v);
    if (!e.length) return <span className="text-muted-foreground">-</span>;
    return (
      <dl className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
        {e.map(([k, x]) => (<div key={k} className="contents"><dt dir="ltr" className="font-mono text-[11px] text-muted-foreground [overflow-wrap:anywhere]">{k}</dt><dd className={`min-w-0 ${txt}`}><Tree v={x} /></dd></div>))}
      </dl>
    );
  }
  return <span className={txt}>{str(v)}</span>;
}
const Extra = ({ o, used, label }: { o: unknown; used: string[]; label: string }) => {
  const r = rest(o, used);
  return Object.keys(r).length ? <div className="mt-1 rounded-md bg-muted/60 p-2 text-[11px]"><p className="font-semibold">{label}</p><Tree v={r} /></div> : null;
};

export default function ScenarioSourceCardPreview({ projection, language }: { projection: CardPlannerPreview["displayProjection"]; language: ScenarioLanguage }) {
  const h = HX[language] ?? HX.en;
  const card = projection.card as unknown as O;
  const loc = (scenarioLexicons as Record<string, { ui: Record<string, string> }>)[str(card.locale)] ? (str(card.locale) as ScenarioLanguage) : language;
  const ct = scenarioLexicons[loc].ui;
  const dir = scenarioRtlLanguages.includes(loc) ? "rtl" : "ltr";
  const arr = (k: string) => (Array.isArray(card[k]) ? (card[k] as unknown[]) : []);
  const H4 = ({ children }: { children: ReactNode }) => <h4 className="mt-3 text-sm font-semibold">{children}</h4>;
  const pkt = card.decisionPacket;
  const PRIMARY = ["title", "companyName", "sections", "options", "changes", "prompts", "rubric", "officialFacts", "decisionPacket"];
  const meta = { ...rest(projection, ["card"]), ...rest(card, PRIMARY) };

  return (
    <div data-testid="planner-source-card" lang={loc} dir={dir} className="min-w-0 max-w-full text-sm [overflow-wrap:anywhere]">
      <h4 className={`font-display text-base font-bold ${txt}`}>{str(card.title)}</h4>
      {"companyName" in card && <p className={`text-muted-foreground ${txt}`}>{str(card.companyName)}</p>}

      {arr("sections").map((s, i) => isObj(s) ? (
        <section key={i}><H4>{str(s.title)}</H4>
          <ul className="list-disc space-y-1 ps-5">{(Array.isArray(s.items) ? s.items : []).map((it, j) => <li key={j} className={txt}>{isObj(it) || Array.isArray(it) ? <Tree v={it} /> : str(it)}</li>)}</ul>
          <Extra o={s} used={["title", "items"]} label={h.extra} />
        </section>) : <Tree key={i} v={s} />)}

      {arr("options").length > 0 && <section><H4>{h.opts}</H4>
        <ul className="space-y-2">{arr("options").map((o, i) => isObj(o) ? (
          <li key={i} className="rounded-lg border border-card-border bg-card p-2">
            <p className={txt}><strong>{o.id === "A" ? ct.optA : o.id === "B" ? ct.optB : str(o.id)}:</strong> {str(o.text)}</p>
            <p className={`mt-1 text-xs text-muted-foreground ${txt}`}>{ct.benefit}: {str(o.benefit)}</p>
            <p className={`text-xs text-muted-foreground ${txt}`}>{ct.tradeoff}: {str(o.tradeoff)}</p>
            <Extra o={o} used={["id", "text", "benefit", "tradeoff"]} label={h.extra} />
          </li>) : <li key={i}><Tree v={o} /></li>)}</ul></section>}

      {arr("changes").length > 0 && <section><H4>{h.chg}</H4>
        <ul className="space-y-2">{arr("changes").map((c, i) => isObj(c) ? (
          <li key={i} className="rounded-lg border border-dashed border-card-border p-2">
            <p className="text-xs text-muted-foreground">{h.after}: <span dir="ltr">{str(c.afterOption)}</span></p>
            <p className={txt}>{str(c.information)}</p>
            <p className={`mt-1 font-medium ${txt}`}>{str(c.question)}</p>
            <Extra o={c} used={["afterOption", "information", "question"]} label={h.extra} />
          </li>) : <li key={i}><Tree v={c} /></li>)}</ul></section>}

      {arr("prompts").length > 0 && <section><H4>{h.prm}</H4>
        <ul className="list-disc space-y-1 ps-5">{arr("prompts").map((p, i) => <li key={i} className={txt}>{isObj(p) ? <>{str(p.label)} <span dir="ltr" className="font-mono text-[11px] text-muted-foreground">({str(p.key)})</span><Extra o={p} used={["key", "label"]} label={h.extra} /></> : <Tree v={p} />}</li>)}</ul></section>}

      {arr("rubric").length > 0 && <section><H4>{h.rub}</H4>
        <ul className="list-disc space-y-1 ps-5">{arr("rubric").map((r, i) => <li key={i} className={txt}><Tree v={r} /></li>)}</ul></section>}

      {arr("officialFacts").length > 0 && <section><H4>{h.src}</H4>
        <ul className="space-y-2">{arr("officialFacts").map((f, i) => { if (!isObj(f)) return <li key={i}><Tree v={f} /></li>; const href = safeHttps(f.url); return (
          <li key={i} lang={str(f.language) || undefined} className="rounded-lg border border-card-border p-2">
            <p className={`font-semibold ${txt}`}>{str(f.title)}</p>
            <p className={txt}>{str(f.summary)}</p>
            {href ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="break-all text-xs text-secondary-foreground underline">{str(f.url)}</a> : <p dir="ltr" className="break-all text-xs text-muted-foreground">{str(f.url)}</p>}
            <p className={`text-[11px] text-muted-foreground ${txt}`}>{str(f.scope)} · <span dir="ltr">{str(f.checkedAt)}</span>{f.language ? <> · <span dir="ltr">{str(f.language)}</span></> : null}</p>
            <Extra o={f} used={["url", "title", "summary", "checkedAt", "scope", "language"]} label={h.extra} />
          </li>); })}</ul></section>}

      {pkt !== undefined && <section><H4>{h.pkt}</H4>
        {isObj(pkt) && Array.isArray(pkt.documents) && <><p className="mt-1 text-xs font-semibold">{h.docs}</p>
          <ul className="space-y-2">{pkt.documents.map((d, i) => isObj(d) ? (
            <li key={i} className="rounded-lg border border-card-border p-2">
              <p className={`font-semibold ${txt}`}>{str(d.author)} <span dir="ltr" className="text-[11px] font-normal text-muted-foreground">{str(d.issuedAt)}</span></p>
              {Array.isArray(d.facts) && <ul className="mt-1 space-y-0.5">{d.facts.map((x, j) => <li key={j} className={txt}>{isObj(x) ? <>{str(x.label)}: <strong>{str(x.rawValue)}</strong><Extra o={x} used={["label", "rawValue"]} label={h.extra} /></> : <Tree v={x} />}</li>)}</ul>}
              {isObj(d.verification) && <div className="mt-1 text-xs"><p className="font-semibold">{h.verify}</p><p className={txt}>{str(d.verification.question)}</p><p className={`text-muted-foreground ${txt}`}>{str(d.verification.method)} · {str(d.verification.target)}</p><Extra o={d.verification} used={["question", "method", "target"]} label={h.extra} /></div>}
              <Extra o={d} used={["author", "issuedAt", "facts", "verification"]} label={h.extra} />
            </li>) : <li key={i}><Tree v={d} /></li>)}</ul></>}
        {isObj(pkt) && Array.isArray(pkt.changes) && pkt.changes.length > 0 && <ul className="mt-2 space-y-2">{pkt.changes.map((c, i) => isObj(c) ? (
          <li key={i} className="rounded-lg border border-dashed border-card-border p-2">
            <p className="text-xs text-muted-foreground">{h.after}: <span dir="ltr">{str(c.afterOption)}</span></p>
            <p className={txt}>{str(c.information)}</p><p className={`font-medium ${txt}`}>{str(c.question)}</p>
            <Extra o={c} used={["afterOption", "information", "question"]} label={h.extra} />
          </li>) : <li key={i}><Tree v={c} /></li>)}</ul>}
        <Extra o={isObj(pkt) ? pkt : { decisionPacket: pkt }} used={isObj(pkt) ? ["documents", "changes"] : []} label={h.extra} />
      </section>}

      <details className="mt-3 rounded-md bg-muted/60 p-2 text-xs">
        <summary className="cursor-pointer font-semibold">{h.meta}</summary>
        <div className="mt-2" dir="ltr"><Tree v={meta} /></div>
      </details>
    </div>
  );
}
