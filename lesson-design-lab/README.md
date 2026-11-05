# 수업설계LAB — 개발 인계

결과지 → 플래너 기본 연습 → 진로/기업·직무 탐색 → 개인 활동카드 → 수행 기록 → 자소서 V1 → 면담 → 학생 확인 후 V2를 운영하는 별도 교사용 앱입니다.

2026-11-05 인계는 최신 실행 소스, 규칙 1.5와 기술 QA 증거를 포함합니다.

추가 요청을 반영한 [보강 설계 1.6](docs/LESSON-DESIGN-1.6.md), [최신 프로그램 대조](docs/LATEST-PROGRAM-AUDIT-20261105.md), [개발자 연결·수용 시험](docs/INTEGRATION-AND-ACCEPTANCE-1.6.md)을 먼저 확인하세요. 이 세 문서는 **다음 구현의 기준**이며 현재 앱의 구현·QA 완료 범위와 구분합니다. 자동 TOP5 카드 생성 대신 최신 LAB의 학생 선택 등록 규칙을 적용합니다.

## 개발 시작

1. `codex/lesson-design-lab-handoff` 브랜치를 가져옵니다.
2. [개발자 인계 안내](DEVELOPER_HANDOFF.md)를 읽습니다.
3. `app/`의 인계 안내에 따라 설치·개발 서버·빌드·검사를 실행합니다. feelgood-app 최상위의 다른 앱 명령과 구분합니다.

## 기준 문서

- [최신 규칙 1.5](docs/product-rules-v1.5-ko.txt), [기간 규칙 1.4](docs/course-duration-rules-v1.4-ko.txt), [승계 규칙 1.2](PRODUCT_RULES.md)
- [QA 및 최종 규칙 대조](docs/qa-final-20261105-ko.txt), [기계 판독 QA 상태](docs/qa-status-20261105.json)
- [연동 계약 초안](INTEGRATION_CONTRACT.md), [검수 체크리스트](ACCEPTANCE_CHECKLIST.md), [인계 상태](HANDOFF_STATUS.json)

## 완료 범위

중고생/대학생 분기, 18개 기본 수업·36종 활동지, 81유형 지원, 하루 개인 미션/장기 과정, 학생별 활동지·카드 출력, 15언어, 결과지 원순위·수정 이력, 사실 확인 기반 V1/V2의 브라우저 로컬 데모입니다.

Replit 최종 검사·확인 지점 564개 통과(실패 0), 타입 검사·빌드 통과. 최종 수정 후 PDF 검사는 18개·111쪽입니다. 이전 168개·718쪽 증거를 최신 전체 재실행으로 합산하지 않습니다.

실제 LAB·플래너·AI 연결, 로그인·서버 권한·공통 저장소는 미구현입니다. 가상 역할 전환은 보안 경계가 아닙니다. 원어민·교육 전문가 의미 승인과 실물 인쇄도 별도입니다.

[Replit 원본](https://replit.com/replid/18e270a4-04b0-4056-971c-02cc8e11c84b)은 개발 주소이며 운영 배포 주소가 아닙니다.
