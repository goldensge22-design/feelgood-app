import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
for(const name of ['homeroom.html','school.html','track.html']){
  const html=fs.readFileSync(path.join(root,name),'utf8');
  const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  scripts.forEach((match,index)=>new vm.Script(match[1],{filename:`${name}:inline-${index+1}`}));
  console.log(`${name}: ${scripts.length} inline script(s) parsed`);
}
console.log('Dashboard syntax QA: PASS');
