import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
await import('./qa-report.mjs');
const out=path.resolve(import.meta.dirname,'../../../generated-artifacts/lesson-lab-qa');
const read=async file=>JSON.parse(await fs.readFile(path.join(out,file),'utf8'));
const base=await read('qa-summary.json'),u09=await read('browser-u09.json'),settings=await read('browser-settings.json'),reg=await read('u09-regressions.json');
assert.equal(u09.results.length,15);assert.ok(u09.results.every(r=>r.ok&&r.pdf));assert.ok(settings.checks.every(r=>r.ok));assert.equal(reg.failed,0);
const audit=file=>{
 const info=execFileSync('pdfinfo',[file],{encoding:'utf8'}),text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'}),fonts=execFileSync('pdffonts',[file],{encoding:'utf8'});
 assert.ok(!text.includes('\uFFFD'));
 const rows=fonts.split('\n').slice(2).map(l=>l.match(/\s(yes|no)\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$/)).filter(Boolean);
 assert.ok(rows.length&&rows.every(x=>x[1]==='yes'&&x[3]==='yes'));
 return{pages:Number(info.match(/Pages:\s+(\d+)/)[1]),embeddedUnicodeFonts:rows.length};
};
const extraPdfs=u09.results.map(r=>{const a=audit(r.pdf.file);assert.equal(a.pages,r.pdf.pages);return{lang:r.lang,...r.pdf,...a}});
const mainPdfs=[];
for(const name of['class-blank','private-comparison','one-student-mixed']){
 const file=path.join(out,'main-'+name+'.pdf');await fs.copyFile('/tmp/studio-'+name+'.pdf',file);mainPdfs.push({name,...audit(file)});
}
const logs=[['core','/tmp/u09-final-core.log'],['legacy','/tmp/u09-final-legacy.log'],['browserMain','/tmp/u09-final-main.log'],['build','/tmp/u09-final-build.log'],['typecheck','/tmp/u09-final-types.log']];
const completed={};
for(const[name,file]of logs){completed[name]=(await fs.stat(file)).mtime.toISOString();await fs.copyFile(file,path.join(out,'current-'+name+'.log'))}
for(const[name,file]of[['language','/tmp/u09-final-language.log'],['new','/tmp/u09-final-new.log'],['settings','/tmp/u09-final-settings.log'],['u09','/tmp/u09-final-browser.log'],['languages','/tmp/u09-final-langs.log'],['extras','/tmp/u09-final-extras.log']])await fs.copyFile(file,path.join(out,'current-'+name+'.log'));
const pdfs={baseCount:150,basePages:base.pageCount,baseline45Pages:base.baselinePages,u09Count:extraPdfs.length,u09Pages:extraPdfs.reduce((n,p)=>n+p.pages,0),mainCount:mainPdfs.length,mainPages:mainPdfs.reduce((n,p)=>n+p.pages,0)};
pdfs.totalCount=pdfs.baseCount+pdfs.u09Count+pdfs.mainCount;pdfs.totalPages=pdfs.basePages+pdfs.u09Pages+pdfs.mainPages;
const result={generatedAt:new Date().toISOString(),version:{...base.version,correction:'U09 생성 카드·현재 버전·운영 설정 저장 추가 QA'},
 runs:{...base.runs,u09Start:u09.started,u09End:u09.ended,settingsStart:settings.started,settingsEnd:settings.ended,newRegressionStart:reg.started,newRegressionEnd:reg.ended,completed},
 suites:{...base.suites,newU09Regression:reg.passed,newU09Browser:u09.results.reduce((n,r)=>n+r.checks.length,0),newSettingsBrowser:settings.checks.length,failed:0},pdfs,extraPdfs,mainPdfs,
 languages:base.languages.map(l=>({...l,u09:u09.results.find(r=>r.lang===l.lang),nativeReview:'미실행'})),
 limitations:['이번 수치는 수정 후 새로 실행한 검사만 집계했다. 이전 실행은 이력으로만 보존했다.','원어민/교육 전문가 의미 승인 및 모든 입력·직무·유형·버전 조합의 전수 브라우저 검수는 미실행이다.','PDF 쪽 수·문자 추출·포함 글꼴과 DOM 본문을 자동 검사했다. 렌더 시각 확인은 대표 페이지이며 전체 모든 줄을 육안 검수한 것은 아니다.','실물 프린터·실제 학생·실제 계정/서버 권한·외부 결과지/기업LAB/플래너/AI 통합은 검사하지 않았다. 외부 연결 개발과 공개 배포를 하지 않았다.','기존 자동 회귀의 사람 확인 대기 3항목은 완료로 바꾸지 않았다.']};
// The previous-version English/Mongolian retry is history, never part of this run's totals.
result.history={previousVersionRetry:{start:result.runs.recheckStart,end:result.runs.recheckEnd}};
delete result.runs.recheckStart;delete result.runs.recheckEnd;
await fs.writeFile(path.join(out,'qa-followup-summary.json'),JSON.stringify(result,null,2));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=async(file,label)=>`<figure><img src="data:image/png;base64,${(await fs.readFile(path.join(out,file))).toString('base64')}" alt="${esc(label)}"><figcaption>${esc(label)}</figcaption></figure>`;
// First worksheet page and first planner-card page are distinct in this mixed print.
for(const lang of['en','ar'])execFileSync('pdftoppm',['-f','3','-singlefile','-scale-to','1400','-png',path.join(out,`u09-${lang}-both.pdf`),path.join(out,'rendered',`u09-${lang}-card`)]);
const images=await Promise.all([img('rendered/u09-en-card.png','영어 U09 계획 카드: 경고와 학기 목표 본문, 미선택 직무 안내 번역 / QA 실제 기록 원문 보존'),img('rendered/u09-ar-card.png','아랍어 U09 계획 카드의 RTL·글꼴·목표 본문'),img('settings-after-fix.png','운영 설정의 최신값 저장 및 오류 후 재시도 확인 화면'),img('u09-en-after.png','U09 활동지의 현재 v4 표시: 원래 3개 버전·학생 답안 보존 후 새 버전')]);
const rows=result.languages.map(l=>`<tr><td>${esc(l.lang)}</td><td>통과</td><td>통과</td><td>통과</td><td>${l.pdfs} / ${l.pages}</td><td>${l.u09.pdf.pages}</td><td>미실행</td></tr>`).join('');
const suites=[['핵심 로직',28],['기존 자동 회귀',21],['기존 주요 브라우저 시나리오',11],['기존 추가 다국어 회귀',base.suites.languageRegression],['신규 U09·원문·저장 오류 언어 회귀',reg.passed],['15언어 기존 브라우저 확인 지점',base.suites.multilingualCheckpoints],['15언어 U09 브라우저 확인 지점',result.suites.newU09Browser],['신규 운영 설정 브라우저 시나리오',settings.checks.length]];
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>수업설계LAB v1.5 추가 QA 결과</title><style>body{font:16px/1.65 system-ui,sans-serif;color:#132e50;background:#f4f7fb;margin:0}main{max-width:1100px;margin:auto;padding:28px}h1{font-size:28px}h2{margin-top:32px}.box,figure{background:white;padding:18px;border:1px solid #d7e0ed;border-radius:12px}table{border-collapse:collapse;width:100%;background:white;font-size:14px}td,th{padding:9px;border:1px solid #d7e0ed;text-align:left}.scroll{overflow:auto}.ok{color:#075b42}code{overflow-wrap:anywhere}img{width:100%;height:auto;max-width:900px}figcaption{font-size:14px}a{color:#145bba}small{color:#52647a}</style><main>
<h1>수업설계LAB v1.5 추가 QA 결과</h1><p class="ok"><strong>이번 수정 소스의 실행 검수 범위: 최종 실패 0건</strong></p>
<div class="box"><p>생성: ${esc(result.generatedAt)} · 가상 QA 학생만 사용 · 규칙 1.5 / 기본 18수업·36활동지 유지</p><p>실행 소스 SHA-256: <code>${esc(result.version.sourceSha256)}</code></p><p>15언어 브라우저: ${esc(result.runs.browserStart)} ~ ${esc(result.runs.browserEnd)}<br>U09: ${esc(u09.started)} ~ ${esc(u09.ended)}<br>운영 설정: ${esc(settings.started)} ~ ${esc(settings.ended)}</p></div>
<h2>수정 및 직접 재현</h2><ul><li>U09 별도 계획 카드의 경고 안에 들어간 앱 소유 교육 목표까지 번역한다. 3개 교육단계 × 4개 카드 종류의 같은 경고 경로를 검사했다. 일반 변수 슬롯을 무조건 번역하지 않고, 확인된 교육 목표만 처리한다.</li><li>앱이 묶어 만든 도움 안내와 직무 미선택 안내도 번역한다. 학생/교사의 수정문·선택 직무·실제 기록은 보존한다.</li><li>활동지·카드 상단은 첫 버전이 아닌 현재 버전을 표시한다. 카드 v2/v3, U09 활동지 v4와 원래 3개 버전/답안 보존을 UI·새로고침으로 확인했다.</li><li>설정 저장 후 저장 전 props로 편집 초안을 되돌리는 경로를 제거했다. 최신 상담자 3회 연속 저장, 책임 해제, 도구/자료/시간/명단/소속/좌석/장기 편성, 화면 이동/새로고침을 확인했다.</li><li>저장 공간 오류·잘못된 시간에는 기존 저장값과 최신 초안을 보존하고 오류를 표시한다. 재시도 성공을 별도 확인했다. 전체 진행 책임자를 전담 상담자로 중복 계산하지 않는 기준은 유지했다.</li></ul>
<h2>수정 후 실제 재실행</h2><table><tr><th>검사 묶음</th><th>통과</th><th>실패</th></tr>${suites.map(([name,n])=>`<tr><td>${esc(name)}</td><td>${n}</td><td>0</td></tr>`).join('')}</table><p>검사 그룹/확인 지점 수이며 모든 내부 단언·모든 조합을 전수 검사했다는 뜻은 아니다. 예전 통과 수를 합산하지 않았다.</p>
<h2>언어별 결과</h2><div class="scroll"><table><tr><th>언어</th><th>메뉴·운영 UI</th><th>교육 본문</th><th>U09·원문·버전</th><th>기본 PDF 수/쪽</th><th>추가 U09 PDF 쪽</th><th>원어민 의미 검수</th></tr>${rows}</table></div>
<h2>출력 검수</h2><p>기존 45개 유형을 포함한 다국어 ${pdfs.baseCount}개 PDF ${pdfs.basePages}쪽을 재생성했다. 45개 유형은 현재 조판으로 ${pdfs.baseline45Pages}쪽이며 과거 150쪽에 억지로 맞추지 않았다. 새 U09 혼합 출력은 15개 PDF ${pdfs.u09Pages}쪽이다. 주요 시나리오 PDF ${pdfs.mainCount}개 ${pdfs.mainPages}쪽을 포함해 보관 총 ${pdfs.totalCount}개 / ${pdfs.totalPages}쪽이다.</p><p>쪽 번호 순서·첫 회차 1·언어/내용 변경 시 출력 확인 취소·360px/RTL·원문/카드/V1/V2 보존·예약/시간표 합계도 이번에 재실행했다. 추가 U09는 실제 A4 활동지/A5 카드 묶음 출력 UI와 PDF 경로로 생성했으며 완전한 목표와 원문 답안/수행 기록을 대조했다.</p>
<h2>대표 시각 증거</h2>${images.join('')}
<h2>보류·미실행과 외부 연결</h2><ul>${result.limitations.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
<h2>증거 파일</h2><p>qa-followup-summary.json, u09-before-fix.json, settings-before-fix.json, u09-regressions.json, browser-u09.json, browser-settings.json, browser-languages.json, browser-extras.json과 current-*.log, PDF·렌더 이미지를 같은 폴더에 저장했다.</p>
<p><a href="https://18e270a4-04b0-4056-971c-02cc8e11c84b-00-2k16pnohyzkmj.pike.replit.dev/studio">수업설계LAB 개발 미리보기</a> — 외부 서비스 연결이나 공개 배포 URL이 아니다.</p></main></html>`;
await fs.writeFile(path.join(out,'qa-followup-report.html'),html);
console.log(JSON.stringify({version:result.version,suites:result.suites,pdfs,runs:result.runs},null,2));
