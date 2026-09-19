import {describe,it,expect} from 'vitest';
import {AXES,DEMOS,AGE_RULES,validateAssessment,resolveTraining,makePuzzle,evaluatePuzzle,signalRules,makeSignals,matchesSignal,relationPairs,profileKey} from '../adaptive/engine';
import type {Band,Level,Assessment} from '../adaptive/engine';
describe('PASS adaptive training contract',()=>{
 it('81 profiles map to 8/8/8/8/33/16 without changing assessment',()=>{
  const levels:Level[]=['high','mid','low'];const counts:Record<string,number>={};
  for(const p of levels)for(const a of levels)for(const s of levels)for(const q of levels){
   const raw=structuredClone(DEMOS[0]);[p,a,s,q].forEach((l,i)=>raw.axes[AXES[i]]={level:l});const before=JSON.stringify(raw);
   const r=resolveTraining(raw);counts[r.route]=(counts[r.route]??0)+1;expect(JSON.stringify(raw)).toBe(before);
   expect(raw.axes[r.target].level==='low'||r.route==='integrated').toBe(true);
  }
  expect(counts).toEqual({planning:8,attention:8,simultaneous:8,successive:8,combined:33,integrated:16});
 });
 it('two demo profiles produce different targets and actual scaffold types',()=>{
  expect(resolveTraining(DEMOS[0])).toMatchObject({route:'planning',support:'simultaneous'});
  expect(resolveTraining(DEMOS[1])).toMatchObject({route:'attention',support:'successive'});
 });
 for(const band of ['A','B','C','D'] as Band[])for(const round of [0,1]){
  it(`${band}/${round}: age rules have a feasible solution; incomplete, duplicated and wrong orders fail`,()=>{
   const p=makePuzzle(band,round);expect(p.rules.length).toBe(AGE_RULES[band].conditions);expect(evaluatePuzzle(p,p.solution).ok).toBe(true);
   expect(evaluatePuzzle(p,p.solution.slice(1)).ok).toBe(false);expect(evaluatePuzzle(p,p.solution.map(()=>p.solution[0])).ok).toBe(false);expect(evaluatePuzzle(p,[...p.solution].reverse()).ok).toBe(false);
   expect(p.tasks.length-1).toBe(AGE_RULES[band].conditions);expect(relationPairs(band,round)).toHaveLength(AGE_RULES[band].conditions);
  });
  it(`${band}/${round}: every attention predicate changes the correct decision`,()=>{
   const rules=signalRules(band,round),cards=makeSignals(band,round);expect(rules.length).toBe(AGE_RULES[band].conditions);expect(cards.length).toBe(AGE_RULES[band].cards);
   expect(cards.some(s=>matchesSignal(s,rules))).toBe(true);
   for(const rule of rules)expect(cards.some(s=>s[rule.key]!==rule.value&&rules.filter(r=>r!==rule).every(r=>s[r.key]===r.value))).toBe(true);
  });
 }
 it('transfer changes the active attention goal rather than just copy',()=>{
  const first=signalRules('A',0),next=signalRules('A',1),card=makeSignals('A',0).find(s=>matchesSignal(s,first))!;
  expect(matchesSignal(card,next)).toBe(false);
 });
 it('official results are validated and preserve scores with explicit units',()=>{
  const a=structuredClone(DEMOS[0]);a.axes.planning={level:'low',value:82,unit:'표준점수'};const r=validateAssessment(a);
  expect(r.axes.planning).toEqual(a.axes.planning);expect(r).not.toBe(a);
 });
 it('accepts elementary lower-stage assessment without changing its cognitive axes',()=>{const a={...DEMOS[0],educationStage:'elementary_1_3' as const};expect(validateAssessment(a).axes).toEqual(a.axes);expect(validateAssessment(a).educationStage).toBe('elementary_1_3');});
 it.each([null,{}, {...DEMOS[0],schemaVersion:'2.0'},{...DEMOS[0],educationStage:'preschool'},{...DEMOS[0],axes:{planning:{level:'low'}}},{...DEMOS[0],subjectId:''}])('missing or unsupported official data fails closed: %j',raw=>expect(()=>validateAssessment(raw)).toThrow());
 it('unknown score scale cannot silently become a percentile or classify the learner',()=>{
  const a=structuredClone(DEMOS[0]);a.axes.planning={level:'low',value:82};expect(()=>validateAssessment(a)).toThrow();
  a.axes.planning={level:'low',value:NaN,unit:'test'};expect(()=>validateAssessment(a)).toThrow();
 });
 it('profile keys distinguish individuals, versions and axis changes',()=>{
  const a=structuredClone(DEMOS[0]);a.subjectId='another';expect(profileKey(a)).not.toBe(profileKey(DEMOS[0]));a.subjectId=DEMOS[0].subjectId;a.profileVersion='new';expect(profileKey(a)).not.toBe(profileKey(DEMOS[0]));
 });
});

describe('KIDS / HISTORY / PLANNER transfer provenance',()=>{
 it('keeps demo provenance explicitly linked and strategy consistent',()=>{
  const a=validateAssessment(DEMOS[0]);expect(a.transfer?.strategyId).toBe('STEP_BREAKDOWN');expect(a.transfer?.history.evidenceId).toBe('demo-history-a');expect(a.transfer?.kids?.evidenceId).toBe('demo-kids-a');
 });
 it('does not invent HISTORY use when incoming profile has no history',()=>{
  const a=structuredClone(DEMOS[0]);delete a.transfer;expect(validateAssessment(a).transfer).toBeUndefined();
 });
 it('rejects incomplete provenance and unknown strategy names',()=>{
  expect(()=>validateAssessment({...DEMOS[0],transfer:{bridgeId:'x',strategyId:'MAGIC'}})).toThrow();
 });
 it('new source activity resets the training context key',()=>{
  const a=structuredClone(DEMOS[0]);a.transfer!.history.activityId='new';expect(profileKey(a)).not.toEqual(profileKey(DEMOS[0]));
 });
});
