import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const unique = xs => new Set(xs).size === xs.length;
const future = (date, now) => Number.isFinite(Date.parse(date)) && Date.parse(date) > now;
const keys = t => Object.values(t.text).flat();

/** Reference release predicate for contract tests, not a connected server policy. */
export function eligible(t, pack, locale, audience, now=Date.now()) {
  if (!t || !pack || !['middle','high','university-adult'].includes(audience)) return false;
  if (t.status !== 'approved' || t.visibility !== 'public' || !t.audiences.includes(audience)) return false;
  if (!nonempty(t.source.reviewedBy) || !Number.isFinite(Date.parse(t.source.reviewedAt))) return false;
  if (Date.parse(t.source.reviewedAt)>now) return false;
  if (pack.locale !== locale || pack.status !== 'reviewed' || pack.sourceVersion !== t.version) return false;
  if (!keys(t).every(k => nonempty(pack.messages?.[k]))) return false;
  if (t.risk === 'safety-sensitive') {
    if (!future(t.source.reviewDueAt,now) || !t.source.officialReferences.length) return false;
    if (!t.source.officialReferences.every(r =>
      /^https:\/\//.test(r.uri) && nonempty(r.version) && nonempty(r.jurisdiction) &&
      Number.isFinite(Date.parse(r.effectiveAt)) && Date.parse(r.effectiveAt)<=now)) return false;
  }
  return true;
}
export function summarize(cards, contexts) {
  return {
    dailyTemplates:cards.filter(c=>c.kind==='daily').length,
    jobSituationTemplates:cards.filter(c=>c.kind==='job-simulation').length,
    totalTemplates:cards.length,
    contexts:contexts.map(c=>({id:c.id,
      situationCards:cards.filter(x=>x.contextId===c.id).length,
      linkedDailyCards:c.dailyCardIds.length})),
    dailyAssociations:contexts.reduce((n,c)=>n+c.dailyCardIds.length,0)
  };
}
export function validate(manifest,behaviors,contexts,cards,messages) {
  assert.equal(manifest.namespace,'feelgood.planner');
  assert.deepEqual(manifest.requiredLocales,['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']);
  assert.deepEqual(Object.keys(manifest.localeState),manifest.requiredLocales);
  assert.equal(manifest.runtimeConnected,false);
  assert.equal(manifest.storage.productionEndpoint,null);
  assert.equal(manifest.ai.autoPublish,false);
  assert.equal(manifest.ai.automaticGeneration,false);
  assert.equal(manifest.ai.rawPersonalRecordsInSharedCache,false);
  assert(unique(behaviors.map(b=>b.id)) && unique(contexts.map(c=>c.id)) && unique(cards.map(c=>c.id)));
  const behaviorIds=new Set(behaviors.map(b=>b.id)), contextIds=new Set(contexts.map(c=>c.id));
  const allKeys=[];
  for (const b of behaviors) { assert(unique(b.evidenceFields)); allKeys.push(b.labelKey); }
  for (const c of contexts) {
    allKeys.push(c.labelKey);
    assert.equal(c.mappingStatus,'draft');
    assert.deepEqual(c.officialJobRefs,[]);
    assert(c.behaviorIds.every(id=>behaviorIds.has(id)));
    assert(unique(c.dailyCardIds));
    assert(c.dailyCardIds.every(id=>cards.some(t=>t.id===id&&t.kind==='daily'&&c.behaviorIds.includes(t.behaviorId))));
  }
  const allowedCardKeys=['id','version','kind','behaviorId','contextId','audiences','status','visibility','risk','source','text','evidenceFields','personalization','completion','countsAsRealWorkExperience'].sort();
  for (const t of cards) {
    assert.deepEqual(Object.keys(t).sort(),allowedCardKeys);
    assert(behaviorIds.has(t.behaviorId));
    assert(['daily','job-simulation'].includes(t.kind));
    assert(t.kind==='daily' ? t.contextId===null : contextIds.has(t.contextId));
    assert.equal(t.status,'draft');
    assert.equal(t.visibility,'internal-design');
    assert.equal(t.source.reviewedBy,null);
    assert.equal(t.source.reviewedAt,null);
    assert.deepEqual(t.source.officialReferences,[]);
    assert.equal(t.source.kind,'authored-design-example');
    assert.equal(t.countsAsRealWorkExperience,false);
    assert.equal(t.completion,'user-confirmed-action-evidence-not-timer');
    assert.equal(t.personalization,'existing-pass-adapter-not-behavior-equals-pass');
    assert.deepEqual(t.evidenceFields,behaviors.find(b=>b.id===t.behaviorId).evidenceFields);
    assert.deepEqual(Object.keys(t.text).sort(),['titleKey','scenarioKey','goalKey','promptKeys','exampleKey','completionKey','noticeKey'].sort());
    assert.equal(t.text.promptKeys.length,3);
    assert(t.audiences.length && unique(t.audiences) && t.audiences.every(a=>['middle','high','university-adult'].includes(a)));
    if(t.contextId==='aviation-security') assert.equal(t.risk,'safety-sensitive');
    allKeys.push(...keys(t));
  }
  assert(unique(allKeys),'duplicate text keys');
  assert.deepEqual(Object.keys(messages).sort(),allKeys.sort(),'missing or orphan source keys');
  assert(Object.values(messages).every(v=>nonempty(v)&&!/<[^>]+>/.test(v)));
  assert(unique(cards.map(c=>messages[c.text.scenarioKey].normalize('NFKC').replace(/\s+/g,''))),'duplicate scenarios');
  const s=summarize(cards,contexts);
  assert.equal(s.dailyTemplates,manifest.counts.dailyTemplates);
  assert.equal(s.jobSituationTemplates,manifest.counts.jobSituationTemplates);
  assert.equal(s.totalTemplates,manifest.counts.totalTemplates);
  assert.equal(contexts.length,manifest.counts.jobContexts);
  for(const locale of manifest.requiredLocales){
    const ls=manifest.localeState[locale];
    assert.equal(ls.availableForProduction,false);
    assert.equal(ls.status,locale==='ko'?'draft':'needs-review');
    assert.equal(ls.resource,locale==='ko'?'locales/ko.json':null);
  }
  assert.equal(manifest.counts.productionReleased,0);
  return s;
}

const manifest=read('manifest.json'), behaviors=read('behaviors.json'), contexts=read('job-contexts.json'), cards=read('cards.json'), messages=read('locales/ko.json');
const summary=validate(manifest,behaviors,contexts,cards,messages);
let checks=0;
const check=(label,fn)=>{ fn(); checks++; console.log('PASS '+label); };
check('draft cards excluded for every locale',()=>{
  for(const locale of manifest.requiredLocales) for(const c of cards)
    assert.equal(eligible(c,{locale,status:'reviewed',sourceVersion:c.version,messages},locale,'university-adult'),false);
});
const now=Date.parse('2026-10-23T00:00:00Z');
const approved=structuredClone(cards.find(c=>c.id==='job-office-sequence'));
approved.status='approved';approved.visibility='public';
approved.source.reviewedBy='test-reviewer';approved.source.reviewedAt='2026-10-22T00:00:00Z';
const pack={locale:'ko',status:'reviewed',sourceVersion:approved.version,messages};
check('approved complete general fixture eligible',()=>assert(eligible(approved,pack,'ko','university-adult',now)));
check('wrong locale blocked',()=>assert(!eligible(approved,pack,'en','university-adult',now)));
check('wrong source version blocked',()=>assert(!eligible(approved,{...pack,sourceVersion:'0.9'},'ko','university-adult',now)));
check('unreviewed translation blocked',()=>assert(!eligible(approved,{...pack,status:'draft'},'ko','university-adult',now)));
check('missing translation blocked',()=>assert(!eligible(approved,{...pack,messages:{}},'ko','university-adult',now)));
check('middle age job fixture blocked',()=>assert(!eligible(approved,pack,'ko','middle',now)));
check('private template blocked',()=>assert(!eligible({...approved,visibility:'internal-design'},pack,'ko','university-adult',now)));
check('retired template blocked',()=>assert(!eligible({...approved,status:'retired'},pack,'ko','university-adult',now)));
const safety=structuredClone(approved); safety.risk='safety-sensitive';
check('safety without official evidence blocked',()=>assert(!eligible(safety,pack,'ko','university-adult',now)));
safety.source.officialReferences=[{uri:'https://example.invalid/test-only',version:'fixture',jurisdiction:'fixture-only',effectiveAt:'2026-01-01'}];
safety.source.reviewDueAt='2026-10-24';
check('valid safety test fixture eligible structurally',()=>assert(eligible(safety,pack,'ko','university-adult',now)));
check('expired safety blocked',()=>assert(!eligible(safety,pack,'ko','university-adult',Date.parse('2026-10-25'))));
check('future official policy blocked',()=>{
 const x=structuredClone(safety);x.source.officialReferences[0].effectiveAt='2027-01-01';
 assert(!eligible(x,pack,'ko','university-adult',now));
});
check('duplicate template rejected',()=>assert.throws(()=>validate(manifest,behaviors,contexts,[...cards,cards[0]],messages)));
check('broken daily reference rejected',()=>{
 const x=structuredClone(contexts);x[0].dailyCardIds.push('missing');
 assert.throws(()=>validate(manifest,behaviors,x,cards,messages));
});
check('private top-level field rejected',()=>{
 const x=structuredClone(cards);x[0].ownerId='private-user';
 assert.throws(()=>validate(manifest,behaviors,contexts,x,messages));
});
check('incorrect declared count rejected',()=>{
 const x=structuredClone(manifest);x.counts.dailyTemplates=18;
 assert.throws(()=>validate(x,behaviors,contexts,cards,messages));
});
console.log(JSON.stringify({result:'PASS',contractChecks:checks,counts:summary,sourceKeys:Object.keys(messages).length,productionReleased:0,translatedReleaseLocales:0},null,2));
