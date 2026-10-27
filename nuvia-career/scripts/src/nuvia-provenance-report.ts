/** Self-contained reviewer packet; only synthetic data and existing QA evidence. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=`${root}generated-artifacts/provenance-qa`;
const matrix=JSON.parse(await readFile(`${out}/matrix.json`,'utf8'));
const render=JSON.parse(await readFile(`${out}/settled/render-matrix.json`,'utf8'));
const edges=JSON.parse(await readFile(`${out}/edges.json`,'utf8'));
const docs=JSON.parse(await readFile(`${out}/document-checks.json`,'utf8'));
for(const [v,n] of [[matrix,45],[render,45],[edges,9],[docs,4]] as const){
 assert.equal(v.results.length,n);assert(v.results.every((r:any)=>r.status==='passed'));
}
const hashes:Record<string,string>={};
async function scan(path:string){
 for(const e of await readdir(`${root}${path}`,{withFileTypes:true})){
  const p=`${path}/${e.name}`;
  if(e.isDirectory())await scan(p);
  else if(/\.(tsx?|css)$/.test(e.name)) hashes[p]=createHash('sha256').update(await readFile(`${root}${p}`)).digest('hex');
 }
}
await scan('artifacts/nuvia-career/src');
const preview=`https://${process.env.REPLIT_DEV_DOMAIN}/experiences?space=guest&synthetic=1&lang=ko`;
const report={
 createdAt:new Date().toISOString(),preview,scope:'frontend-only synthetic device-mode enhancement',
 journey:{lastChecked:matrix.checkedAt,passed:45,total:45},settledRendering:{lastChecked:render.checkedAt,passed:45,total:45},
 edgeStates:{lastChecked:edges.checkedAt,passed:9,total:9},documents:docs,
 unitTests:{passed:14,total:14},typecheck:{frontend:'passed',scripts:'passed'},productionBuild:'passed with existing sourcemap and bundle-size warnings',
 notRun:['Real D-CAS/PLANNER integration and server/auth operational QA: developer scope','Native Word/Hancom opening: no accessible licensed environment','Native-speaker translation review: translations remain machine drafts'],
 observedRetry:'Final 45-case run initially had one az-360 blank-page loading timeout at 15 seconds with no pageerror; isolated 30-second-timeout retry passed. Root cause not established. Original failure preserved in matrix-before-retry.json.',
 runtimeChanges:'Frontend only. No backend/generated API/auth/storage contract changed. New provenance sidecar is device-only, including in account scope; not cross-device persistence.',
 hashes,
};
await writeFile(`${out}/verification-manifest.json`,JSON.stringify(report,null,2));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const links:string[]=[];
for(const kind of ['actual','simulation']){
 const input=await readFile(`${out}/ko-1440-${kind}-input.json`,'utf8');
 const files=[];
 for(const ext of ['docx','hwpx']){
  const name=`ko-1440-${kind}.${ext}`,bytes=await readFile(`${out}/${name}`);
  const mime=ext==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/hwp+zip';
  files.push(`<a download="${name}" href="data:${mime};base64,${bytes.toString('base64')}">${ext.toUpperCase()} 내려받기</a>`);
 }
 links.push(`<section><h2>${kind==='actual'?'일상 적용형 · 실제 수행 성격의 합성 기록':'직무 상황형 · 모의 연습 합성 기록'}</h2><p>${files.join(' · ')}</p><details><summary>다운로드 당시 입력 원문</summary><pre>${esc(input)}</pre></details></section>`);
}
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUVIA 화면 보강 검증 묶음</title><style>body{font:16px/1.7 system-ui,sans-serif;color:#16213a;background:#f4f6fa;max-width:960px;margin:auto;padding:28px}header,section{background:white;border:1px solid #dce1ea;border-radius:14px;padding:24px;margin:20px 0}header{background:#14213d;color:white}a{display:inline-block;min-height:44px;color:#145dcc;padding:6px}header a{color:white}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}h1{font-size:28px}strong{color:#ab3c00}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;text-align:start;padding:10px}</style>
<header><h1>NUVIA 자소서 화면 보강 · 검증 묶음</h1><p>${esc(report.createdAt)} UTC</p><a href="${esc(preview)}">확인한 개발 미리보기 열기</a></header>
<section><h2>판정 범위</h2><p>연결 준비용 프런트엔드와 합성 기기 저장 흐름입니다. <strong>실제 플래너·결과지 연결, 로그인 계정 서버 저장, Word·한컴 실제 열기 완료가 아닙니다.</strong></p><table><tr><th>확인</th><th>결과</th></tr><tr><td>15개 언어 × PC·태블릿·360px 사용 여정</td><td>45/45 통과 (1건 재검사)</td></tr><tr><td>전환 후 안정된 상세 화면 렌더링</td><td>45/45 통과</td></tr><tr><td>중복·취소·누락·변경·삭제·공유 철회·실패·이전 기록·문항 추천</td><td>9/9 통과</td></tr><tr><td>단위·번역 키·기존 복구 규칙 검사</td><td>14/14 통과</td></tr><tr><td>화면에서 내려받은 문서의 기계 판독</td><td>DOCX 2개 / HWPX 2개 통과</td></tr></table><p>아제르바이잔어 360px의 첫 로딩 시간 초과는 별도 재검사에서 통과했으나 원인은 미확인입니다. 빌드 성공과 별개로 기존 소스맵·번들 크기 경고가 남아 있습니다. 번역은 기계 초안이며 원어민 검수 완료가 아닙니다.</p></section>
${links.join('')}
<section><h2>Word·한컴에서 이어서 확인하기</h2><ol><li>기존 허용된 Word에서 DOCX를, 한컴에서 HWPX와 가능하면 DOCX를 엽니다.</li><li>앱 이름·버전·환경·시각, 복구/손상 경고 여부를 기록합니다.</li><li>위 입력과 한글·문단·줄바꿈·첫/중간/마지막 페이지·폰트 대체·잘림·겹침을 대조합니다.</li><li>기업·직무·문항·사용자 본문 외 검사·코치·비공개 메모·내부 식별자가 없는지 확인합니다.</li><li>결과를 통과/실패/미실행으로 구분하고 개인정보를 가린 화면 증거를 남깁니다.</li></ol><p>첨부 문서는 계정이 아니라 합성 기기 저장 화면에서 실제 내려받은 파일입니다. 앱 실행 권한이나 유료 라이선스를 새로 요구하지 않습니다.</p></section>
<section><h2>개발자 인계</h2><p>실제 결과지·TOP5 원본 계약, 플래너 권한·선택 전송·복귀·원본 버전, 서버 저장 확장이 필요합니다. 현재 서버의 플래너 출처 거부 검사는 유지했습니다. 출처 부가정보는 기기 전용이며 다른 기기와 동기화되지 않습니다. 요구사항과 재현 명령은 docs/nuvia-frontend-integration-handoff.md에 있습니다.</p><details><summary>검증 범위·소스 SHA-256</summary><pre>${esc(JSON.stringify(report,null,2))}</pre></details></section></html>`;
await writeFile(`${out}/review-packet.html`,html);
console.log(JSON.stringify({report:`${out}/review-packet.html`,manifest:`${out}/verification-manifest.json`,preview},null,2));
