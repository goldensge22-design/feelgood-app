/** Fast read-only-review evidence. Does not publish or change access controls. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=`${root}generated-artifacts/public-demo-qa`;
const load=async(n:string)=>JSON.parse(await readFile(`${out}/${n}.json`,'utf8'));
const journey=await load('matrix'),privacy=await load('privacy'),documents=await load('document-checks');
assert.equal(journey.results.length,45);assert(journey.results.every((r:any)=>r.status==='passed'));
assert.equal(privacy.results.length,8);assert(privacy.results.every((r:any)=>r.status==='passed'));
assert.equal(documents.results.length,4);assert(documents.results.every((r:any)=>r.status==='passed'));
const hashes:Record<string,string>={};
async function scan(path:string,filter:RegExp){
 for(const e of await readdir(`${root}${path}`,{withFileTypes:true})){
  const file=`${path}/${e.name}`;if(e.isDirectory())await scan(file,filter);
  else if(filter.test(e.name))hashes[file]=createHash('sha256').update(await readFile(`${root}${file}`)).digest('hex');
 }
}
await scan('artifacts/nuvia-career/src',/\.(tsx?|css)$/);
await scan('artifacts/nuvia-career/dist/public',/\.(html|js|css)$/);
const fingerprint=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const preview=`https://${process.env.REPLIT_DEV_DOMAIN}/demo?lang=ko`;
const manifest={
 recordedAt:new Date().toISOString(),sourceAndBuiltAssetFingerprint:fingerprint,hashes,
 approvalStatus:'Evidence prepared ONLY. Automated publishing approval has NOT been re-run, granted, or bypassed.',
 publication:'NOT performed; no visibility, permission, domain, or hosting changes',
 entry:{path:'/demo?lang=ko',preview,publicUrl:null,loginRequired:false,meaning:'Development preview only; NOT a publicly published URL'},
 data:'Only authored fictional result/example and common/official-public criteria; no production user records copied',
 architecture:'Tab-scoped synthetic client workspace. Existing account/guest/demo localStorage is neither read nor changed; server owner checks unchanged. API needed for public examples, criteria and exports.',
 build:{status:'passed',environment:'Vite production assets served at 127.0.0.1:4319 with existing API at 8080; no public listener/routing was created',warnings:['existing sourcemap original-location warnings','large JavaScript chunk']},
 journey:{checkedAt:journey.checkedAt,passed:45,total:45,scope:'ALL 15 locales x 1440/768/360, rebuilt current PUBLIC-DEMO anonymous flow, not old device-only results'},
 privacy:{checkedAt:privacy.checkedAt,passed:8,total:8,checks:privacy.results.map((r:any)=>r.name),limitations:privacy.limitations},
 documents,
 regression:'Existing non-public guest ko-1440 journey, source/state-scope tests and all-15-locale key checks passed; 16 unit tests plus frontend/scripts typechecks passed',
 notRun:['Real deployed hostname, proxy/routing, production Clerk environment and real public-visitor verification','Actual signed-in identities/cross-account server operational QA; pure mode-policy and anonymous denial tested instead','Real D-CAS/PLANNER/company integrations and server persistence: separate developer scope','Native Word/Hancom opening and full official HWPX schema validation','Native-speaker review for new translations','Production-scale concurrency/rate-limit validation'],
 recovery:'Current API recovery plus built-browser injected 503 -> visible error/no criteria -> explicit retry -> actual success; no fabricated offline success or static fallback',
};
await writeFile(`${out}/readiness.json`,JSON.stringify(manifest,null,2));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const links=[];
for(const kind of ['actual','simulation']){
 const files=[];
 for(const ext of ['docx','hwpx']){
  const n=`ko-1440-${kind}.${ext}`,bytes=await readFile(`${out}/${n}`);
  files.push(`<a download="${n}" href="data:application/octet-stream;base64,${bytes.toString('base64')}">${kind} ${ext.toUpperCase()}</a>`);
 }
 links.push(`<section><h2>운영 빌드 합성 체험에서 실제 다운로드한 ${kind} 문서</h2>${files.join(' · ')}<details><summary>대응 입력 원문</summary><pre>${esc(await readFile(`${out}/ko-1440-${kind}-input.json`,'utf8'))}</pre></details></section>`);
}
await writeFile(`${out}/approval-review.html`,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUVIA 공개 체험 사전 검증</title><style>body{font:16px/1.7 system-ui;max-width:960px;margin:auto;padding:24px;background:#f4f6fa;color:#15213b}header,section{border:1px solid #dce1ea;border-radius:12px;padding:20px;margin:18px 0;background:white}header{background:#14213d;color:white}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}a{display:inline-block;min-height:44px;padding:6px;color:#145dcc}header a{color:white}</style><header><h1>공개 체험 승인 검토용 증거</h1><p>${esc(manifest.recordedAt)} · 게시·공개 설정 변경 없음</p><a href="${esc(preview)}">개발 미리보기 /demo</a></header><section><h2>확인 결과와 범위</h2><p>최신 운영 빌드의 익명 체험 45/45, 개인정보 경계·응답·오류 복구 검사 8/8, 다운로드 문서 기계 판독 4/4, 단위 검사 16/16 통과. 이전 45개 기기 저장 모드 기록을 재사용한 판정이 아닙니다.</p><p>체험은 합성 자료이며 탭 저장소만 사용합니다. 기존 사용자 기록·서버 소유권 검사를 대체하지 않습니다. 실제 서버 연동, 공개 도메인, Word·한컴 실제 열기, 원어민 검수는 미확인입니다. 비밀정보 검사는 패턴/파일 검사이며 실제 환경 비밀값은 읽거나 출력하지 않았습니다.</p><p>브라우저의 탭 복제는 초기 체험 내용을 복사할 수 있습니다. 공용 기기에서는 체험 종료 버튼으로 지우고 닫으세요. 로그인된 실제 계정의 실행 검증은 이번 증거에 포함하지 않습니다.</p></section>${links.join('')}<section><h2>검토 기록</h2><pre>${esc(JSON.stringify(manifest,null,2))}</pre></section></html>`);
console.log(JSON.stringify({recordedAt:manifest.recordedAt,fingerprint,journey:manifest.journey,privacy:manifest.privacy.passed,preview},null,2));
