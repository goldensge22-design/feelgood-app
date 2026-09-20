# FeelGood 전자 교사 가이드

정적 GitHub Pages와 오프라인 `file://` 실행을 모두 지원하는 독립 가이드입니다. 5개 최상위 목차와 48개 하위 페이지는 고유한 URL 해시로 이동하며, 한 번에 한 장만 표시됩니다.

- 기준 콘텐츠: `docs/KPASS_DCAS_NUVIA_전자교사가이드_통합기획_v2.0.md`
- 디자인·구현 기준: `docs/CODEX_전자교사가이드_B안_본제작_프롬프트.md`
- 목차·본문 데이터: `guide-data.js`
- 81가지 로컬 규칙 엔진: `profiles-data.js` (`3×3×3×3`, 생성형 AI·외부 API 없음)
- 언어 목록: `locales/languages-data.js` (한국어 외 언어는 준비 중 안내)
- 레거시 JSON: `data/profiles.ko.json`, `locales/languages.json`은 이전 버전 호환 자료로 보존
- 파일 직접 실행: `teacher-guide/index.html`을 브라우저에서 열기
- 로컬 실행 예: `python -m http.server 4173` 후 `http://127.0.0.1:4173/teacher-guide/`
- 자동 QA: 저장소 루트에서 `node teacher-guide/tests/browser-smoke.mjs`
