# NUVIA 직무 연결 보강 — 개발자 적용 안내

## 범위

이 패치는 기존 자소서 앱의 학생 화면과 기기 저장 sidecar만 보강한다. 플래너·결과지·기업/LAB 연결, 로그인 서버 저장, 공개 배포, GitHub 전송은 하지 않았다.

## 기준 트리와 적용 순서

- 패치를 만든 작업본의 저장소 `HEAD`: `06057da289029ebde26db88c5b5e9cd4e6f18257`.
- 이 작업본에서 앱 파일만 비교했을 때 `c51d3f2a834d5047374e55e4e5b97b7996b99917` 이후 앱 경로 차이는 없었다. 따라서 앱 변경은 STAR 기준 `c51d3f…` 위에 적용 가능하도록 작성했다.
- 사용자가 안내한 `b2afd61bdc34818e529985e994b743969a7cd7c4` 객체는 현재 Replit Git 객체에 없어 트리 비교를 독립 검증하지 못했다. 이를 패치의 검증된 기준으로 주장하지 않는다.
- 개발자가 `b2afd…`에서 시작한다면 기존 20개 파일 STAR 인계 패치를 먼저 적용·검증하여 `c51d3f…` 기준 상태를 만든 다음, 이번 직무 연결 패치를 적용한다. 최신 브랜치가 다르면 덮어쓰지 말고 변경을 병합한다.
- 적용 전 소스 지문과 적용 후 파일 SHA-256은 ZIP의 `manifest.json`에 기록한다. ZIP의 패치는 이번 작업본의 `06057da…` 기준 diff이며, 앱 소스는 위에서 확인한 `c51d3f…`와 동일했다. 실제 깨끗한 사본 적용 검사는 패키지 준비 중 별도 기록한다.

## 구현 요약

- 활동 유형(일상 적용형/직무 상황형), 경험 성격(실제/모의/미확인), 경험 맥락(일상/수업 모의훈련/실제 직무/합성/미확인)을 별도로 저장·표시한다.
- 지원서별로 구체 업무, 공통 행동, 배운 원칙, 향후 적용, 출처 종류/자료명/기업/직무/버전 기록을 제공한다.
- 앱은 출처를 조회·검증하지 않는다. 다른 회사·직무 출처가 현재 지원서와 어긋나면 경고하고 확인을 막는다.
- 학생이 확인한 보조 연결은 본문에 자동 삽입하지 않는다. 코치는 한 번에 질문 하나만 표시한다.
- 지원서/경험/근거가 수정되면 확인을 무효화하며, 이전 값으로 돌아와도 확인이 되살아나지 않는다.
- 버전 스냅샷은 선택 경험의 연결 기록과 유효한 당시 확인 상태만 보존한다. 과거 제출 버전은 수정하지 않는다.
- 보조 연결은 기존 기기 전용 sidecar에만 저장한다. 서버/다른 기기 동기화가 아니다.

## 포함된 변경 경로

- `artifacts/nuvia-career/src/components/provenance/badges.tsx`
- `artifacts/nuvia-career/src/components/provenance/context-coach.tsx`
- `artifacts/nuvia-career/src/components/provenance/experience-detail.tsx`
- `artifacts/nuvia-career/src/components/provenance/experience-story-help.tsx`
- `artifacts/nuvia-career/src/components/provenance/job-connection-notes.tsx`
- `artifacts/nuvia-career/src/components/provenance/synthetic-actions.ts`
- `artifacts/nuvia-career/src/components/provenance/version-provenance.tsx`
- `artifacts/nuvia-career/src/lib/job-connection-messages.ts`
- `artifacts/nuvia-career/src/lib/job-connection.test.ts`
- `artifacts/nuvia-career/src/lib/locales.test.ts`
- `artifacts/nuvia-career/src/lib/provenance.ts`
- `artifacts/nuvia-career/src/lib/star-story-messages.ts`
- `artifacts/nuvia-career/src/lib/star-story.ts`
- `artifacts/nuvia-career/src/pages/experiences.tsx`
- `artifacts/nuvia-career/src/pages/questions.tsx`
- `artifacts/nuvia-career/src/pages/write.tsx`
- `scripts/src/nuvia-star-story-localization-qa.ts`
- `docs/nuvia-job-connection-rules.md`

## QA 범위

최종 소스와 일치하는 현재 QA 결과는 ZIP에 넣는다. 최소 확인은 앱 타입 검사, 직무 연결/STAR/번역 단위 검사, UI 브라우저의 15개 언어×1440/768/360px, RTL 및 넘침, 회사 불일치, 값 수정 후 복귀 시 확인 무효화, 버전 동결, 작성 본문/내보내기 분리다.

이 검증은 합성·기기 저장 QA다. 실제 로그인/계정 권한, 운영 DB, D-CAS, 플래너, 기업/LAB 자료 연결, 서버 동기화, Word/한컴 실제 열기는 별도다. 번역 키 완전성과 UI 레이아웃 검사는 원어민 번역 품질 검수가 아니다.

## 담당 개발자 인계 항목

1. 인증된 플래너 연동에서 전송 필드 선택·동의·소유권·원본 버전·삭제·공유 철회를 서버 계약에 반영한다.
2. 결과지 및 LAB가 제공하는 직무 TOP 순서, 직무별 출처·공개 승인된 자료·버전/기준 시점과 사용자 공고의 범위를 정의한다.
3. 기기 sidecar의 직무 연결 데이터를 계정별 서버 저장으로 확장하되 기존 API 입력/결과와 권한 검사를 유지한다.
4. 저장 실패·충돌·다른 기기 복원·계정 간 격리를 실제 로그인 QA로 확인한다.
5. 실제 Word/한컴으로 생성 파일을 열어 검증한다.

이 문서는 적용 준비 자료이며 실제 외부 연동/서버 운영 완료 확인서가 아니다.
