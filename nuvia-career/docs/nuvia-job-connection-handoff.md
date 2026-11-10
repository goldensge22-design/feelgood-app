# NUVIA 직무 연결 보강 — 개발자 적용 안내

## 범위

이 패치는 기존 자소서 앱의 학생 화면과 기기 저장 sidecar만 보강한다. 플래너·결과지·기업/LAB 연결, 로그인 서버 저장, 공개 배포, GitHub 전송은 하지 않았다.

## 기준 트리와 적용 순서

- GitHub 저장소: `goldensge22-design/feelgood-app`, 브랜치 `codex/nuvia-career-handoff-20261027`, 프로그램 경로 `nuvia-career/`.
- 이번 누적 패치의 실제 기준은 `b2afd61bdc34818e529985e994b743969a7cd7c4`이다. 기존 STAR 보강과 이번 직무 연결 보강을 함께 포함하므로 이전 20개 파일 패치를 중복 적용하지 않는다.
- 최신 Replit 소스는 `bd181075f5a301d4f19bc340e571d2494bfdc819`이며 인증된 Replit 작업공간에서 Git archive로 내보냈다. ZIP 내부 커밋과 다운로드 SHA-256을 대조했다.
- 이 브랜치를 가져오거나 이 기준의 패치를 적용한다. 기존 main, 다른 프로그램, 기업 공유 규칙, 과거 QA 기록을 보존한다. 개발자 변경이 있다면 덮어쓰지 않고 변경을 병합한다.
- Replit 앱 소스는 그대로 보존했다. QA 실행 중 발견한 잘못된 Radix 선택자, 언어 메뉴 전환 대기, 문서 검사 결과 폴더만 검사 코드에서 바로잡았다.
- 최신 검증과 파일 지문은 `qa/job-connection-20261110/`을 확인한다. 기준 ZIP의 SHA-256과 업데이트 파일 목록은 `source-manifest.json`에 있다. 이는 공개 배포 완료를 뜻하지 않는다.

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

최종 소스 기준의 실행 결과는 `qa/job-connection-20261110/QA-REPORT.md`와 JSON 기록을 확인한다. 최소 확인은 앱 타입 검사, 직무 연결/STAR/번역 단위 검사, UI 브라우저의 15개 언어×1440/768/360px, RTL 및 넘침, 회사 불일치, 값 수정 후 복귀 시 확인 무효화, 버전 동결, 작성 본문/내보내기 분리다.

이 검증은 합성·기기 저장 QA다. 실제 로그인/계정 권한, 운영 DB, D-CAS, 플래너, 기업/LAB 자료 연결, 서버 동기화, Word/한컴 실제 열기는 별도다. 번역 키 완전성과 UI 레이아웃 검사는 원어민 번역 품질 검수가 아니다.

## 담당 개발자 인계 항목

1. 인증된 플래너 연동에서 전송 필드 선택·동의·소유권·원본 버전·삭제·공유 철회를 서버 계약에 반영한다.
2. 결과지 및 LAB가 제공하는 직무 TOP 순서, 직무별 출처·공개 승인된 자료·버전/기준 시점과 사용자 공고의 범위를 정의한다.
3. 기기 sidecar의 직무 연결 데이터를 계정별 서버 저장으로 확장하되 기존 API 입력/결과와 권한 검사를 유지한다.
4. 저장 실패·충돌·다른 기기 복원·계정 간 격리를 실제 로그인 QA로 확인한다.
5. 실제 Word/한컴으로 생성 파일을 열어 검증한다.

이 문서는 적용 준비 자료이며 실제 외부 연동/서버 운영 완료 확인서가 아니다.
