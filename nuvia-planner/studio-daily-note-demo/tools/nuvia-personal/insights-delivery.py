"""Generate a review-only delta and a self-contained Korean verification note."""
from pathlib import Path
import base64, hashlib, html, json, subprocess, zipfile, os

out=Path('generated-artifacts/nuvia-insights')
out.mkdir(parents=True,exist_ok=True)
base=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
scope=['artifacts/nuvia-ui-review/src/personal',
       'tools/nuvia-personal/insights-check.ts',
       'tools/nuvia-personal/insights-browser.mjs',
       'tools/nuvia-personal/insights-report-smoke.mjs']
tracked=subprocess.check_output(['git','diff','--name-only','--',*scope],text=True).splitlines()
new=subprocess.check_output(['git','ls-files','--others','--exclude-standard','--',*scope],text=True).splitlines()
patch=subprocess.check_output(['git','diff','--binary','--',*scope])
for name in new:
    patch+=subprocess.run(['git','diff','--no-index','--binary','--','/dev/null',name],capture_output=True).stdout
(out/'review-only.patch').write_bytes(patch)
manifest={}
for name in tracked:
    data=subprocess.check_output(['git','show',f'{base}:{name}'])
    manifest[name]=hashlib.sha256(data).hexdigest()
(out/'preconditions.json').write_text(json.dumps({'localBaseCommit':base,'priorFilesSHA256':manifest,'newFiles':new,'developerLatestCompatibility':'NOT VERIFIED','productionApply':'NOT AUTHORIZED'},ensure_ascii=False,indent=2))
readme=f"""# 개인 월간 플래너 기능 보강 — 로컬 검토본 전용 증분 패치

기준 Replit commit: {base}

이 패치는 이 저장소의 기존 personal-monthly 검토본을 확장합니다.
개발자의 최신 GitHub NUVIA 파일에 바로 적용할 패치가 아닙니다.
defa19d 등 개발자 최신 결과지/서버 연동 체크아웃과의 호환성은 검증하지 않았습니다.
기준본/B형/기존 enhancement/결과지/서버/운영 URL/배포 설정은 변경하지 않습니다.
원본 보호 대상 300개 파일의 해시는 그대로 확인됐습니다.

## 적용 전
1. 현재 코드와 본인 개인 기록 백업을 별도로 보관합니다. 백업은 평문 복원용이며 보고서나 서버 동기화가 아닙니다.
2. 최신 개발자 브랜치와 계약을 먼저 확인합니다. 이 저장소와 경로나 기준이 다르면 중단하고 별도 이식·충돌 검토를 합니다.
3. 사용자 승인 후 새 검토 브랜치에서만 작업합니다. main/운영에는 적용하지 않습니다.
4. preconditions.json의 기존 파일 해시, 새 파일 부재, 로컬 기준 commit을 확인합니다.
5. `git apply --check review-only.patch`가 성공해야 합니다.
6. 실패하면 중단합니다. --reject/--3way/강제 덮어쓰기로 우회하지 않습니다.
7. 승인된 검토 브랜치에서만 `git apply review-only.patch` 후 타입·빌드·동작·저장 왕복을 검수합니다.

## 복구
변경 전 코드를 보관한 새 브랜치를 사용합니다. 사용자 추가 수정이 없는 경우에만
`git apply -R --check review-only.patch`를 확인하고 역적용합니다.
충돌이나 후속 수정이 있으면 중단하고 체크포인트/개별 변경을 검토합니다.
localStorage를 지우거나 다른 학생 백업으로 덮어쓰지 않습니다.
추가 필드 없는 이전 백업도 읽을 수 있으나, 이전 코드로 돌아간 뒤 신규 백업을 무조건 가져오지 않습니다.

## 범위와 한계
실제 결과지 전송·로그인·권한·기기간 동기화는 미연결입니다.
원본 결과 식별정보는 출처 기록에 보존하며 기존 합성 실행 계약과 분리합니다.
활동 사용과 선택적 자기보고는 독립 검사 검증이나 효과성 연구가 아닙니다.
신규 문구 다국어 번역/전면 검수와 실제 학생 독립 사용/4주 추적은 미완료입니다.
기존 원본 기대값 불일치 4건(단위 2, 바로 시작 조건 2)은 미해결로 명시합니다.
이번 원본 Vitest 재실행은 로컬 실행 도구 부재로 수행하지 못했습니다.
이전 257통과/4불일치 기록과 원본 보호 해시를 근거로 분리 보고하며 전체 통과로 주장하지 않습니다.
"""
(out/'APPLY_AND_RECOVER.md').write_text(readme)
images=[
 ('assessment-and-personal-guide-1440.png','명시적 검사 예시와 펼쳐 보는 개인별 안내'),
 ('contextual-responses-1440.png','과제별 맞아요·달라요·모르겠어요 응답'),
 ('method-use-feedback-1440.png','실제 사용한 도움과 선택적 응답'),
 ('rendered-report-1440.png','실제 렌더링된 개인 월간 보고서'),
 ('rendered-report-360.png','360px에서 보고서와 선택 공유'),
 ('next-month-1440.png','승인 전 수정 가능한 다음 달 초안'),
 ('next-month-360.png','360px 다음 달 초안')
]
figures=''
for name,caption in images:
    p=Path('screenshots/insights')/name
    if p.exists():figures+=f'<figure><img loading="lazy" alt="{html.escape(caption)}" src="data:image/png;base64,{base64.b64encode(p.read_bytes()).decode()}"><figcaption>{html.escape(caption)} — 합성 검토 기록의 실제 브라우저 캡처</figcaption></figure>'
url=f'https://{os.environ["REPLIT_DEV_DOMAIN"]}/personal-monthly.html'
body=f"""<h1>NUVIA PLANNER 기능 보강 검수 요약</h1>
<p>기존 디자인 유지 · 운영 배포/병합/push 없음 · 브라우저 저장 전용</p>
<p><a href="{url}">개인 사용 미리보기</a> / <a href="{url}?review=1">분리된 합성 검토 모드</a>. HTTP 200 확인. 서버가 종료되면 임시 링크는 열리지 않을 수 있습니다.</p>
<h2>확인 순서</h2><ol><li>개인 화면은 결과 없음으로 시작합니다. 제목 한 줄로 과제를 저장하고 선택 카드에서 실제 활동을 합니다.</li><li>검토 모드 상단에서 검토 도구를 펼친 뒤 명시적 예시 또는 합성 JSON 계약 입력을 선택합니다. 실제 학생 자료를 넣지 마세요.</li><li>‘나에게 맞춘 안내’의 펼쳐 보기를 열어 이번 행동·이유·필수 조작·강점 도움을 봅니다.</li><li>실행 후 ‘방법·목표’ 화면에서 설명별 응답과 실제 쓴 도움 후기를 선택합니다. 응답 변경 전 이력이 남습니다.</li><li>하단 검토 관리의 ‘월간 비교 예시 (완료된 두 달)’를 펼쳐 불러옵니다. 현재 검토 공간만 교체한다는 확인이 나오며 일반 개인 공간은 변경하지 않습니다.</li><li>보고서에서 지난달을 골라 6/10 → 8/10, 20퍼센트포인트의 합성 예시를 봅니다. ‘이번 달’의 다음 달 초안은 수정/수락/보류하며 수락 전 일정은 그대로입니다.</li></ol>
<h2>완료한 로컬 동작</h2><ul><li>검사 종류/일자/네 값/척도와 단위, 출처 표시. 예시·로컬 계약 입력·출처 미확인을 분리. 과거 실행의 출발점 보존.</li><li>설명/과제/검사 문맥별 응답 추가 이력. 선택적 예시, 긍정/중립/부정/모름/미응답 후기. 사용 건수와 최신 응답 건수 분리.</li><li>고정 검사 출발점 / 나의 실행 변화 / 다음 달 제안의 세 영역. 재개는 사실만, 시간은 일시정지 제외 값. 조건 차이·부분 월·기록 부족 표기.</li><li>수행률 4구간·근거·분모·초과 수행·목표 변경·정정 보존. 다음 달 도움 선호 참고, 공식 점수/목표 불변, 승인 중복 방지.</li><li>개인 백업/복원에 새 출처·응답·맥락 포함. 이전 백업 호환, 실행 중 복원은 안전 일시정지. 공유 점수는 기본 미선택, 자동 외부 전송 없음.</li></ul>
<h2>이번에 실행한 검사</h2><table><tr><th>검사</th><th>결과와 범위</th></tr><tr><td>새 핵심 규칙</td><td>57항목 통과: 4회 사용/3회 응답/그중 2회 긍정, 응답 변경, 단위 거부, 출처 보존, 시간, 비교 제한, 백업, 중복 수락</td></tr><tr><td>기존 개인 핵심 회귀</td><td>1,896단언 통과. 81/81 조합 목표·강점·두 회차 순환, 실제 근거·미확인·건너뜀·월간 경계·변경/정정·저장</td></tr><tr><td>새 실제 브라우저</td><td>38항목 통과. 세 출처 상태, 응답 변경/다른 과제, 긍정/중립/부정/모름/미응답, 실행/멈춤/깃발/새로고침/재개/종료, 복원, 초안 수정/수락, 1440/360, 키보드 포커스, 콘솔 오류 0</td></tr><tr><td>기존 브라우저</td><td>35항목 통과: 중학생 주의/고등학생 순차/대학생 동시·통합과 기본 계획 활동 등 5활동, 인쇄 호출/HTML 보고서/선택 공유/개인 복원</td></tr><tr><td>기존 보충 브라우저</td><td>23항목 통과: 고교 분량 제안 수정·승인·중복 방지, 긴 크메르/아랍어 입력 및 RTL, 오프라인 시간 제외, 같은 데이터 비교</td></tr><tr><td>보고서 실제 렌더</td><td>샌드박스 프레임 본문 20퍼센트포인트 표시 확인, 준비 후 데스크톱/모바일 캡처. HTML 문자열 확인만으로 대체하지 않음</td></tr><tr><td>타입/빌드</td><td>통과. 빌드 시 기존 비교 화면의 classic script 경고 3개는 남음</td></tr><tr><td>보존</td><td>보호 대상 원본 300파일 SHA256 일치</td></tr></table>
<h2>부분·미연결·미검증</h2><p>실제 결과지 서버, 실제 소유자/교사 인증과 권한, 기기 간 동기화는 미연결입니다. 로컬 결과 계약 입력 성공은 서버 연동 완료가 아닙니다. 공식 81유형별 세부 해석표가 아니라 네 상중하의 3⁴ 조합에 따른 5활동·4강점 도움 처리입니다. 신규 문구의 다국어 번역/전면 검수는 미완료이며 기존 번역을 변경하지 않았습니다. 실제 학생 독립 사용·비교 연구·4주 추적은 수행하지 않았습니다.</p>
<p>기존 원본 회귀 4건은 점수 단위 2건과 바로 시작 기대조건 2건의 불일치로 남아 있습니다. 원본은 수정하지 않았고 이번 Vitest 재실행은 로컬 실행 도구 부재로 수행하지 못했습니다. 이전 257통과/4불일치 기록과 불변 해시를 구분해 보고하며 전체 통과로 주장하지 않습니다. 현재 개인 보강 검수에서는 새 단위 혼용 거부 및 바로 시작 시 가짜 목표 수행을 만들지 않는 규칙을 확인했습니다.</p>
<p>개발자 최신 연동본과 호환성 검증은 미수행입니다. 로컬 기능 검수에서 새로 발견된 실행 불가·데이터 손실은 없었으나 정식 적용 가능성이나 효과성을 보증하지 않습니다.</p>
<h2>변경 범위·적용 전 중단 조건</h2><p>개인 검토본 내부 기능과 선택적 저장 필드, 안내·리포트만 확장했습니다. 운영과 원본은 미변경. 로컬 패치 기준 commit: <code>{base}</code>. 개발자 최신 기준/계약 확인 전 적용 금지, 충돌 시 중단, 강제 덮어쓰기 금지. 첨부 적용·복구 안내를 먼저 읽으세요.</p>
<h2>실제 화면</h2>{figures}"""
(out/'QA.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NUVIA 기능 보강 검수</title><style>body{font:16px/1.8 system-ui;color:#172c4c;background:#fffdf6;max-width:1000px;margin:auto;padding:24px}h1,h2{line-height:1.4}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c4cad4;padding:10px;text-align:left}img{max-width:100%;max-height:900px;object-fit:contain}figure{margin:30px 0}code,a{overflow-wrap:anywhere}@media print{img{max-height:650px}figure{break-inside:avoid}}</style><body>'+body+'</body></html>')
with zipfile.ZipFile(out/'NUVIA-personal-insights-review-delta.zip','w',zipfile.ZIP_DEFLATED) as z:
    for name in ['review-only.patch','preconditions.json','APPLY_AND_RECOVER.md','QA.html']:
        z.write(out/name,name)
print('Generated QA.html and review-only delta;',len(tracked)+len(new),'app files; base',base)
