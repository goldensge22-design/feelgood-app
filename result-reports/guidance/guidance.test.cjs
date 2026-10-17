const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=__dirname;
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
const AXES=['P','A','S','Q'];
const kinds=Object.keys(manifest.programs);
function context(kind) {
  const c=vm.createContext({console,Intl});c.window=c;c.globalThis=c;
  const files=[kind+'.locales.js','pass-guidance-engine.js'];
  if(kind==='kpass-child') files.push('../kpass/candidate/kpass-content-engine.js','../kpass/candidate/kpass-profile81-unique-names.js');
  else {
    const folder='../dcas81/unpacked/APPLIED_FULL/'+(kind==='dcas-teen'?'DCAS_TEEN':'DCAS_ADULT')+'/';
    files.push(folder+'dcas-profile81-bank.js',folder+'dcas-profile81-unique-names.js');
  }
  for(const file of files) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
  return c;
}
let combinations=0, localizations=0;
for(const kind of kinds) {
  const c=context(kind), engine=c.FeelGoodPassGuidance;
  const isK=kind==='kpass-child', points=isK?[70,100,130]:[30,60,85];
  const pack=c.FeelGoodGuidanceResources[kind];
  const source=JSON.parse(fs.readFileSync(path.join(root,'sources',kind+'.ko.json')));
  assert.equal(pack.sourceHash,crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex'));
  for(const locale of manifest.locales) {
    const messages=pack.locales[locale];
    assert.deepEqual(Object.keys(messages).sort(),Object.keys(source).sort());
    for(const key of Object.keys(source)) {
      const tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
      assert.ok(messages[key].trim(),`${kind}/${locale}/${key}`);
      assert.deepEqual(tokens(messages[key]),tokens(source[key]),`${locale}/${key}`);
      assert.ok(!/[<>]|FGPH|\uFFFD/.test(messages[key]));
      if(locale!=='ko') assert.ok(!/[가-힣]/.test(messages[key]),`${locale}/${key} untranslated`);
    }
    const codes=new Set(),names=new Set();
    for(const P of points)for(const A of points)for(const S of points)for(const Q of points) {
      const scores={P,A,S,Q},profile={scores,ageYears:isK?8:kind==='dcas-teen'?16:30};
      const d=engine.describe(kind,profile,locale);
      const p=isK?c.KPassProfile81Names.classify(scores,locale):c.DCasProfile81.classify(scores,locale);
      codes.add(p.compactCode);names.add(p.title);
      assert.equal(d.model.code,p.compactCode);
      assert.equal(d.cards.length,4);
      assert.deepEqual(new Set(d.cards.map(x=>x.axis)),new Set(AXES));
      assert.equal(d.cards.filter(x=>x.support==='guided').length,d.model.low.length);
      assert.ok(!/\{\w+\}/.test([d.summary,d.reason,d.learning,d.interest,d.scoreLine,...d.cards.map(x=>x.title)].join(' ')));
      if(d.model.sameBand) { assert.equal(p.title,d.title);if(locale==='ko')assert.ok(!p.title.includes('균형')); }
      if(!isK) { assert.equal(p.summary,d.summary);assert.equal(p.recommendations.job,d.job); }
      localizations++;
    }
    assert.equal(codes.size,81);assert.equal(names.size,81,kind+'/'+locale+' unique names');
  }
  combinations+=81;
  const thresholds=isK?[[85,'L'],[86,'M'],[119,'M'],[120,'H']]:[[52,'L'],[53,'M'],[74,'M'],[75,'H']];
  for(const [value,level] of thresholds) assert.equal(engine.analyze(kind,{scores:{P:value,A:value,S:value,Q:value}}).levels.P,level);
  for(const bad of [undefined,null,'30',NaN,Infinity,-1,isK?161:101]) assert.throws(()=>engine.analyze(kind,{scores:{P:bad,A:50,S:50,Q:50}}));
  const width=isK?15:20;
  for(const diff of [0,width-1,width]) {
    const m=engine.analyze(kind,{scores:{P:30,A:30,S:30,Q:30+diff}});
    assert.equal(m.balanced,diff<width);
    if(diff<width) assert.equal(m.starters.length,4);else assert.equal(m.starters.join(), 'Q');
  }
  const tied=engine.analyze(kind,{scores:{P:20,A:20,S:50,Q:50}});
  assert.equal(tied.top.join(),'S,Q');assert.equal(tied.starters.join(),'S,Q');
  const s=engine.describe(kind,{scores:{P:30,A:35,S:50,Q:25}},'ko');
  const q=engine.describe(kind,{scores:{P:30,A:35,S:25,Q:50}},'ko');
  assert.equal(s.model.starters.join(),'S');assert.equal(q.model.starters.join(),'Q');
  assert.notEqual(s.reason,q.reason);assert.notEqual(s.learning,q.learning);
  assert.equal(s.model.code,'LLLL');assert.equal(q.model.code,'LLLL');
  const interest=engine.describe(kind,{scores:s.model.scores,interestLabel:'Drawing',majorName:'Engineering'},'en');
  assert.ok(interest.interest.includes('Drawing'));
  assert.ok(!engine.describe(kind,{scores:s.model.scores,majorName:'Engineering'},'en').interest.includes('Engineering'));
  assert.equal(engine.analyze(kind,{scores:s.model.scores}).ageBand,isK?'childUnknown':kind==='dcas-teen'?'teenUnknown':'adult');
  const h=engine.describe(kind,{scores:Object.fromEntries(AXES.map(a=>[a,isK?130:85]))},'ko');
  assert.equal(h.model.low.length,0);assert.equal(h.cards.filter(c=>c.support==='guided').length,0);
  if(isK) {
    const d=c.KPassEngine.buildDerived({scores:{P:50,A:55,S:60,Q:85},fullScaleScore:100,ageYears:10});
    assert.ok(!/평균 이상|함께 강해/.test(d.combo.temperament+d.combo.opinionLead));
    assert.equal(c.KPassEngine.buildDerived({scores:{P:80,A:80,S:80,Q:80},fullScaleScore:130}).balancedTier,'L');
    assert.notEqual(engine.describe(kind,{scores:s.model.scores,ageYears:6},'ko').activity,engine.describe(kind,{scores:s.model.scores,ageYears:11},'ko').activity);
  } else {
    for(const [S,Q,type] of [[60,60,'BALANCED'],[70,60,'BALANCED'],[71,60,'S_DOMINANT'],[60,71,'Q_DOMINANT']]) {
      const p=c.DCasProfile81.classify({P:60,A:60,S,Q},'ko');
      assert.equal(p.processing.kind,type);
    }
  }
}
console.log(`PASS guidance: ${combinations} combinations, ${localizations} locale/profile evaluations, unique names, boundaries, ties, invalid scores, age, support and S/Q checks`);
