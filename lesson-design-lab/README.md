# 수업설계LAB — 개발 인계

결과지 → 플래너 기본 연습 → 진로/기업·직무 탐색 → 개인 활동카드 → 수행 기록 → 자소서 V1 → 면담 → 학생 확인 후 V2를 운영하는 별도 교사용 앱입니다.

2026-11-08 인계는 최신 **1.5-star 실행 소스**, STAR 선택 도움 규칙과 기술 QA 증거를 포함합니다. 개발자에게는 [개발자 전달 문구](DEVELOPER_MESSAGE.md)를 먼저 전달하세요.

추가 요청을 반영한 [보강 설계 1.6](docs/LESSON-DESIGN-1.6.md), [11월 5일 프로그램 대조](docs/LATEST-PROGRAM-AUDIT-20261105.md), [개발자 연결·수용 시험](docs/INTEGRATION-AND-ACCEPTANCE-1.6.md)은 유지합니다. 1.6 전체를 이번 STAR 패치에서 구현한 것은 아닙니다. 자동 TOP5 카드 생성 대신 최신 LAB의 학생 선택 등록 규칙을 적용합니다.

## 개발 시작

1. `codex/lesson-design-lab-handoff` 브랜치를 가져옵니다.
2. [개발자 인계 안내](DEVELOPER_HANDOFF.md)를 읽습니다.
3. `app/`의 인계 안내에 따라 설치·개발 서버·빌드·검사를 실행합니다. feelgood-app 최상위의 다른 앱 명령과 구분합니다.

## 기준 문서

- [최신 STAR 추가 규칙](app/artifacts/teacher-lesson-lab/public/rules/lesson-lab-rules-1.5-star.md), [기존 규칙 1.5](docs/product-rules-v1.5-ko.txt), [기간 규칙 1.4](docs/course-duration-rules-v1.4-ko.txt), [승계 규칙 1.2](PRODUCT_RULES.md)
- [최신 STAR QA](app/docs/lesson-lab/QA-STAR.md), [최신 기계 판독 QA](app/qa/evidence/star-patch/summary.json), [11월 5일 과거 QA](docs/qa-final-20261105-ko.txt)
- [연동 계약 초안](INTEGRATION_CONTRACT.md), [검수 체크리스트](ACCEPTANCE_CHECKLIST.md), [인계 상태](HANDOFF_STATUS.json)

## 완료 범위

중고생/대학생 분기, 18개 기본 수업·36종 활동지, 81유형 지원, 하루 개인 미션/장기 과정, 학생별 활동지·카드 출력, 15언어, 결과지 원순위·수정 이력, 사실 확인 기반 V1/V2의 브라우저 로컬 데모입니다.

STAR 보강은 V1 전 경험 정리 도움, 문항 목적별 한 질문씩 보기, 중·고·대학별 도움, 학생 직접 작성, 선택 공유/출력, 부속 활동지 3종을 추가합니다. 기본 18수업·36종은 유지합니다.

Replit 분리 설치 사본에서 기존 564개를 새 소스로 재실행하고 신규 111개를 더해 **675개 통과(실패 0)**, 타입 검사·빌드 통과. PDF 증거는 **38개·357쪽**이며 전체 페이지 육안 승인은 아닙니다. 과거 증거와 최신 실행을 합산하지 않습니다. `app/qa/evidence/handoff-replay/`는 11월 5일의 과거 기록으로 보존하며 최신 패키지 해시 목록 밖의 추가 증거입니다.

실제 LAB·플래너·AI 연결, 로그인·서버 권한·공통 저장소는 미구현입니다. 가상 역할 전환은 보안 경계가 아닙니다. 원어민·교육 전문가 의미 승인과 실물 인쇄도 별도입니다.

[Replit 원본](https://replit.com/replid/18e270a4-04b0-4056-971c-02cc8e11c84b)은 개발 주소이며 운영 배포 주소가 아닙니다.
