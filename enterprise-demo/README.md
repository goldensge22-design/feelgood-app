# 기업 대시보드 공개 데모

공개 주소: https://goldensge22-design.github.io/feelgood-app/enterprise-demo/?lang=ko#overview

2026-10-27 기존 공개 Sites 데모의 HTML, JavaScript, CSS, 15개 언어 JSON을 그대로 복사한 GitHub Pages용 독립 배포본입니다. 기존 루트 대시보드 파일과 다른 서비스는 변경하지 않습니다.

- 진입점: `index.html`
- 화면 및 계산 코드: `enterprise-dashboard/app.js`
- 가상 데이터: `enterprise-dashboard/mock-data.js`
- 연동 인터페이스: `enterprise-dashboard/data-adapter.js`
- 언어: `enterprise-dashboard/locales/` (15종, 상단 선택 메뉴)
- 배포: 기존 저장소의 main 기반 GitHub Pages 배포를 사용합니다.

기업·직원·지원자·점수는 가상 예시입니다. 공개 데모에는 운영 API나 실제 인사자료를 연결하지 않았습니다. 입력값은 해당 방문자의 브라우저에 임시 저장되며 공용 서버 저장 기능이 아닙니다. 실제 자료를 입력하지 말고 가상 사례로 확인하세요.

외국어 번역은 기존 AI 검토 초안을 유지합니다. 이번 이전 검증은 JavaScript 문법, 15개 언어 JSON 및 키 일치(601개), 공개 경로와 주요 화면의 동작을 대상으로 합니다. 운영 연동 및 인재 산출 규칙을 새로 검증하거나 변경한 배포가 아닙니다.

배포 후 확인: GitHub Pages 빌드 성공, 비로그인 HTTP 200, 한국어 경영 요약·기업 인재상 이동, 한국어↔영어 전환을 확인했습니다. 다만 기존 영어 번역의 여러 제목과 설명이 동일한 일반 문장으로 반복되는 오류를 발견했습니다. 파일/키 검증 통과가 번역 품질 통과를 의미하지 않으며, 외국어 안내에 사용하기 전 본문 번역 보완이 필요합니다. 이번 주소 이전에서는 기존 데모 내용을 유지했습니다.

원본 공개 데모: https://feelgood-enterprise-talent-demo.yoohaim.chatgpt.site/?lang=ko&v=14#overview
