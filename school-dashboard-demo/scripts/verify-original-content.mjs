import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pairs=[
  ['C:/Users/golde/Downloads/kpass_homeroom_dashboard (1).html','homeroom.html','homeroom',['overview','profile','tiers','balance','mix','student','queue','gifted','parent','retest','strategy','pairs']],
  ['C:/Users/golde/Downloads/kpass_class_dashboard.html','school.html','school',['overview','profile','tiers','balance','mix','school','formation','queue','gifted','retest']],
  ['C:/Users/golde/Downloads/kpass_track_dashboard.html','track.html','track',['overview','profile','tiers','balance','mix','students','career','queue','gifted','retest']]
];

for(const [source,target,mode,expectedSections] of pairs){
  const original=fs.readFileSync(source,'utf8').replace(/\r\n/g,'\n');
  const demo=fs.readFileSync(path.join(root,target),'utf8').replace(/\r\n/g,'\n');
  const normalized=demo
    .replace(/<link rel="stylesheet" href="full-dashboard-shell\.css(?:\?v=\d+)?">\n/,'')
    .replace(`<body data-mode="${mode}">`,'<body>')
    .replace(/<script src="full-dashboard-shell\.js(?:\?v=\d+)?"><\/script>\n/,'');
  const scripts=[...demo.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(Boolean);
  scripts.forEach(code=>new Function(code));
  const sectionIds=[...demo.matchAll(/\{g:'[^']+',id:'([^']+)',t:'[^']+'/g)].map(match=>match[1]);
  if(JSON.stringify(sectionIds)!==JSON.stringify(expectedSections))throw new Error(`${target}: section contract mismatch: ${sectionIds.join(',')}`);
  ['profileHTML','tiersHTML','balanceHTML','mixHTML','queueHTML','giftedHTML','retestHTML','criteriaHTML','dataHTML','buildShell','setupSpy','boot'].forEach(name=>{
    if(!demo.includes(`function ${name}(`))throw new Error(`${target}: missing preserved function ${name}`);
  });
  console.log(`${target}: approved section contract ${sectionIds.length}; preserved functions present; ${scripts.length} inline script parsed`);
}

const track=fs.readFileSync(path.join(root,'track.html'),'utf8');
['고교학점제 추천 선택과목','생기부 활동 아이디어','계열 맞춤 지도 전략','전체 계열 비교'].forEach(text=>{
  if(track.includes(text))throw new Error(`track.html: excluded content remains: ${text}`);
});
if(!track.includes('function departmentStudentsHTML('))throw new Error('track.html: missing department student comparison');
