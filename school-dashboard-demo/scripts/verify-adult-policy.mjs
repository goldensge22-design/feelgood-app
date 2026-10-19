import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dashboards=['homeroom.html','school.html','track.html'];
const locales=['ko','en','ja','zh-CN','zh-TW','es','fr','ru','vi','th','ar','it','az','mn','km'];
const policy=JSON.parse(fs.readFileSync(path.join(root,'i18n-source','adult-policy.json'),'utf8'));
const shellSource=fs.readFileSync(path.join(root,'full-dashboard-shell.js'),'utf8');
assert.match(shellSource,/new URL\(location\.href\)/,'dashboard switch must preserve the current URL context');
assert.match(shellSource,/searchParams\.set\('lang',locale\)/,'dashboard switch must update only the language parameter');

function functionSource(source,name,nextToken){
  const start=source.indexOf(`function ${name}(`);
  const end=source.indexOf(nextToken,start);
  assert.ok(start>=0&&end>start,`${name} source missing`);
  return source.slice(start,end).trim();
}

function runtime(source,adultMode){
  const context={
    ADULT_MODE:adultMode,
    CFG:{lo:85,hi:120,crisis:80,crisisCount:2,watchMax:99,lrGap:11,lrGap5:12,lrImb:20,spread:40,giftedMix:{each:110,avg:115},giftedAvg:110,attMate:110,dci:15,profileStrengthGap:10,edge:3},
    SC:[{k:'PLAN',n:'Planning'},{k:'ATT',n:'Attention'},{k:'SIM',n:'Simultaneous'},{k:'SUC',n:'Successive'}],
    avg(values){return values.reduce((sum,value)=>sum+value,0)/values.length;}
  };
  const lr=functionSource(source,'lrThresh','function analyze');
  const analyze=functionSource(source,'analyze','function stats');
  const flags=functionSource(source,'flagsFor','var FLAGNAME');
  vm.runInNewContext(`${lr}\n${analyze}\n${flags}\nthis.analyze=analyze;this.flagsFor=flagsFor;`,context);
  return context;
}

function student(values){
  return {age:'20y',ageYears:20,s:{PLAN:values[0],ATT:values[1],SIM:values[2],SUC:values[3]}};
}

for(const dashboard of dashboards){
  const source=fs.readFileSync(path.join(root,dashboard),'utf8');
  const adult=runtime(source,true);
  const allLow=adult.analyze(student([80,81,82,83]));
  assert.equal(allLow.tier,'crisis',`${dashboard}: all-low tier`);
  assert.equal(allLow.allLow,true,`${dashboard}: all-low marker`);
  assert.deepEqual([...adult.flagsFor(allLow)],['crisis'],`${dashboard}: all-low queue`);

  const threeLow=adult.analyze(student([80,81,82,100]));
  assert.equal(threeLow.tier,'support',`${dashboard}: three-low suggestion`);
  assert.equal(threeLow.allLow,false,`${dashboard}: three-low marker`);
  assert.deepEqual([...adult.flagsFor(threeLow)],[],`${dashboard}: three-low excluded from queue`);

  const variance=adult.analyze(student([80,120,121,122]));
  assert.equal(variance.tier,'support',`${dashboard}: one-low suggestion`);
  assert.equal(variance.twoE,true,`${dashboard}: variance retained as reference`);
  assert.deepEqual([...adult.flagsFor(variance)],[],`${dashboard}: variance excluded from queue`);

  const youth=runtime(source,false);
  const youthCrisis=youth.analyze(student([80,80,100,100]));
  assert.equal(youthCrisis.tier,'crisis',`${dashboard}: youth policy regression`);
  assert.ok(youth.flagsFor(youthCrisis).includes('crisis'),`${dashboard}: youth queue regression`);
}

function placeholders(value){return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(match=>match[1]).sort();}
const expectedKeys=policy.keys.map(key=>`adult.${key}`);
for(const locale of locales){
  const pack=JSON.parse(fs.readFileSync(path.join(root,'locales',`${locale}.json`),'utf8'));
  for(const key of expectedKeys){
    assert.equal(typeof pack.messages[key],'string',`${locale}: missing ${key}`);
    assert.ok(pack.messages[key].trim(),`${locale}: empty ${key}`);
    assert.deepEqual(placeholders(pack.messages[key]),placeholders(JSON.parse(fs.readFileSync(path.join(root,'locales','ko.json'),'utf8')).messages[key]),`${locale}: placeholder mismatch ${key}`);
  }
}

console.log('Adult dashboard policy QA: PASS (3 dashboards, 15 locales)');
