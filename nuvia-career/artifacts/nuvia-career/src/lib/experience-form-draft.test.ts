import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readExperienceForm, writeExperienceForm, clearExperienceForm, type ExperienceFormDraft } from './experience-form-draft';
import { experienceDraftText } from './experience-form-draft-messages';
const primary = new Map<string, string>(), recovery = new Map<string, string>();
let failPrimary = false, failRecovery = false;
const store = (map: Map<string,string>, fail: () => boolean) => ({
  getItem: (key: string) => map.get(key) ?? null,
  setItem: (key: string, value: string) => { if (fail()) throw Error('synthetic_quota'); map.set(key,value); },
  removeItem: (key: string) => { map.delete(key); },
});
Object.assign(globalThis, { window: { localStorage: store(primary, () => failPrimary), sessionStorage: store(recovery, () => failRecovery) } });
const draft = (): ExperienceFormDraft => ({
  experience: { id: 'synthetic-draft', title: 'QA-20261118-이어쓰기-모의기록',
    action: '[모의 시험] 안내문 세 문장을 비교했다. 원문 보존 A1.', result: '', learning: '',
    strengths: [], criterionIds: [], confirmed: false, source: 'manual' },
  star: { situation: '모의 상황\n둘째 줄', roleGoal: '내 역할', action: '', result: '', learning: '' },
  context: 'class_simulation', baseSource: null,
});
beforeEach(() => {
  primary.clear(); recovery.clear(); failPrimary=false; failRecovery=false;
  for (const owner of ['guest','demo','account:A','account:B']) clearExperienceForm(owner,'new',null);
});
test('unsaved form is synchronously recoverable without registering an experience', () => {
  const value = draft();
  const result = writeExperienceForm('guest','new',value,null);
  assert.equal(result.ok,true);
  assert.deepEqual(readExperienceForm('guest','new').draft,value);
  assert.equal([...primary.keys()].some(k => k.includes('guest:state')),false);
});
test('guest/demo/account and existing-record slots do not share drafts', () => {
  writeExperienceForm('account:A','new',draft(),null);
  for (const owner of ['guest','demo','account:B']) assert.equal(readExperienceForm(owner,'new').draft,null);
  assert.equal(readExperienceForm('account:A','another-id').draft,null);
});
test('stale writer cannot replace newer input; its tab recovery remains readable', () => {
  const a=draft(),b=draft();b.experience.action='[모의 시험] 오래된 탭의 별도 원문';
  const first=writeExperienceForm('guest','new',a,null);
  const second=writeExperienceForm('guest','new',b,null);
  assert.equal(second.ok,false);assert.equal(second.conflict,true);assert.equal(second.recovered,true);
  assert.equal([...primary.values()][0],first.raw);
  assert.deepEqual(readExperienceForm('guest','new').draft,b);
  clearExperienceForm('guest','new',null);
  assert.deepEqual(readExperienceForm('guest','new').draft,a);
});
test('primary storage failure preserves tab recovery and explicit retry writes exact text', () => {
  failPrimary=true;const value=draft();
  assert.equal(writeExperienceForm('guest','new',value,null).recovered,true);
  assert.deepEqual(readExperienceForm('guest','new').draft,value);
  failPrimary=false;assert.equal(writeExperienceForm('guest','new',value,null).ok,true);
  assert.equal(recovery.size,0);
});
test('total storage failure never reports successful storage', () => {
  failPrimary=true;failRecovery=true;
  const result=writeExperienceForm('guest','new',draft(),null);
  assert.equal(result.ok,false);assert.equal(result.recovered,false);
  assert.deepEqual(readExperienceForm('guest','new').draft,draft());
});
test('acknowledgement cleanup cannot delete a newer tab draft', () => {
  const first=writeExperienceForm('guest','new',draft(),null);
  const next=draft();next.experience.title='새 입력';
  const second=writeExperienceForm('guest','new',next,first.raw);
  clearExperienceForm('guest','new',first.raw);
  assert.equal(readExperienceForm('guest','new').raw,second.raw);
});
test('new storage guidance exists explicitly for each of the existing 15 locales', () => {
  for (const locale of ['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'] as const) {
    for (const key of ['note','failed','conflict'] as const) assert.ok(experienceDraftText(locale,key).trim());
    if(locale!=='ko') assert.notEqual(experienceDraftText(locale,'note'),experienceDraftText('ko','note'));
  }
});
