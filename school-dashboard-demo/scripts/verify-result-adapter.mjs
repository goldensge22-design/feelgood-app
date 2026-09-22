import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const configSource=fs.readFileSync(path.join(root,'dashboard-runtime-config.js'),'utf8');
const adapterSource=fs.readFileSync(path.join(root,'result-data-adapter.js'),'utf8');

function runtime({hostname='127.0.0.1',search='',fetchImpl}={}){
  const window={};
  const context={
    window,
    location:{protocol:'http:',hostname,search},
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    fetch:fetchImpl||(()=>Promise.reject(new Error('unexpected fetch')))
  };
  vm.runInNewContext(configSource,context,{filename:'dashboard-runtime-config.js'});
  vm.runInNewContext(adapterSource,context,{filename:'result-data-adapter.js'});
  return window;
}

{
  const window=runtime();
  const result=await window.KPASSDashboardDataAdapter.load({
    scope:'homeroom',context:{},sampleFactory:()=>[{id:'sample-class'}]
  });
  assert.equal(result.source,'sample');
  assert.equal(result.classes[0].id,'sample-class');
}

{
  let requestedUrl='';
  const window=runtime({
    hostname:'dashboard.example.test',
    search:'?data=live',
    fetchImpl:async url=>{
      requestedUrl=String(url);
      return {ok:true,json:async()=>({
        meta:{requestId:'request-1',assessmentCycleId:'cycle-1'},
        class:{id:'class-1',students:[{id:'display-1',resultId:'result-1',testId:'test-1',userId:'user-1'}]}
      })};
    }
  });
  const result=await window.KPASSDashboardDataAdapter.load({
    scope:'homeroom',
    context:{classId:'class-1',locale:'ko'},
    normalizeClass:value=>value
  });
  assert.equal(requestedUrl,'/api/v1/kpass/dashboard/classes/class-1');
  assert.equal(result.source,'live');
  assert.equal(result.meta.requestId,'request-1');
  assert.equal(result.classes[0].students[0].resultId,'result-1');
  assert.equal(result.classes[0].students[0].testId,'test-1');
  assert.equal(result.classes[0].students[0].userId,'user-1');
}

{
  const window=runtime({hostname:'dashboard.example.test',search:'?data=live'});
  await assert.rejects(
    async()=>window.KPASSDashboardDataAdapter.load({scope:'school',context:{},normalizeClass:value=>value}),
    value=>value&&value.code==='MISSING_CONTEXT'&&value.dashboardFatal===true
  );
}

console.log('Result adapter contract QA: PASS');
