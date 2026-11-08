# v1.5 STAR 선택 도움 패치 — 개발자 적용 안내

## 경계와 보존

별도 AI자소서·기업대시보드·플래너 서버는 변경하지 않는다. 수업설계LAB의 로컬 경험 정리 도움·진행안·출력만 확장한다. 기존 18수업/36종과 81유형 지원, 결과지 원순위·이력, 학생 원문, V1/V2를 보존한다.

추가 규칙 원문: `artifacts/teacher-lesson-lab/public/rules/lesson-lab-rules-1.5-star.md`.

## 학생 흐름과 공유

1. `/studio/writing`에서 학생 역할과 가상 학생을 선택한다. V1 저장 전에도 경험 정리 도우미가 있다.
2. 목적(경험/지원동기/가치관/계획/직접 설정)과 도움(자동/STAR/목적별/없음)을 선택한다. 자동은 경험에만 STAR를 쓴다.
3. 상황/역할은 생략할 수 있다. 모든 메모는 빈 상태로 저장할 수 있고, 도움을 닫아도 직접 쓴 글은 저장된다.
4. 연결 경험을 골라도 본문/메모를 자동 채우지 않는다. 새 활용에는 명시적 원본 재확인이 필요하다. 가상/모의/미확인 표시는 사실 확인과 별개다.
5. 학생이 직접 작성·V1 저장·선택 공유·면담 예약을 진행한다. 상담 새 사실은 학생이 확인/제외해야 V2를 저장할 수 있다.
6. `/studio/print`의 과정 자료 또는 연결 인쇄의 추가 활동지 선택에서 경험 정리/글쓰기 점검/면담·수정 기록을 출력한다.
   교사는 노트의 `includePrint`와 `shareNotes`가 모두 참일 때만 현재 메모를 출력한다. 기본은 빈 양식이다.
   여러 학생 묶음은 각 학생의 기존 A4/A5 자료 뒤에 추가 활동지를 붙인다. 언어/선택/메모 변경은 이전 인쇄 확인을 취소한다.

## 데이터와 호환

- 선택적 `studio.experienceNotes`를 추가했다. 없으면 구 기록 그대로이며 과거 메모나 날짜를 만들지 않는다.
- 메모 키는 과정+학생. `versions`는 메모의 이전 상태이고 글의 V1/V2와 별개다.
- 공유 조회는 현재 메모만 반환하며 비공개였던 옛 메모 버전·원본 수신정보는 반환하지 않는다.
- `sourceReceipt`는 학생이 원본을 재확인했을 때만 기록한다. 원본 내용 변경/철회는 새 활용을 막지만 옛 저장본을 지우지 않는다.
- 확인 사실 없이 작성한 `freeDraft`는 미검증 초안이다. 사실 없는 초안을 체크박스만으로 최종 승인할 수 없다.
- 신규 글의 `experienceReceipts`는 저장 시 관찰한 사실을 기록한다. 구 글의 과거 수신정보는 추정하지 않으며 새 활용 때 재확인을 요구한다.
- 메모는 사실·본문·플래너 기록으로 자동 복사되지 않는다. 브라우저 로컬 역할 제한은 실제 인증 보안이 아니다.
- 서버 연동 시 원본 식별자/수정 버전/철회 상태, 담당 수업 권한, 학생 동의 범위, 원자적 버전 저장과 재시도 정책을 구현해야 한다.

## 실행/검사

인계 ZIP은 Node24·pnpm10.26.1 기준의 독립 workspace다. 루트 README와 `HANDOFF-VALIDATION.md`를 먼저 확인한다.

```sh
pnpm install --frozen-lockfile
pnpm verify:files
pnpm typecheck
pnpm build
pnpm dev
# Chrome/Chromium·Poppler·다국어 글꼴 준비 후
CHROME_BIN=/path/to/chromium pnpm qa
```

원본 검사: `studio-checks.mjs`, `diagnostics.mjs`, `language-regressions.mjs`, `u09-language-regressions.mjs`, `report-history-checks.mjs`와 기존 브라우저 두 개.
추가 검사: `star-coach-checks.mjs`, `browser-star-coach-checks.mjs`. 실행 결과/미실행 범위는 `QA-STAR.md`와 증거 JSON을 따른다. 과거 564 통과를 패치 결과로 재사용하지 않는다.

신규 번역은 `src/i18n/experience-coach.ts`의 15언어 작성 번역이다. 기존 generated 번역은 변경하지 않는다. 이 모듈의 누락/동일 대체/대상별 차이는 추가 검사에서 별도 확인한다. 의미와 교육 적절성은 원어민/전문가 승인 전이다.
