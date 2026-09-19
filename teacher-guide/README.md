# FeelGood 교사 가이드 한국어 MVP

정적 GitHub Pages용 독립 가이드입니다. 저장소 루트에서 정적 서버를 실행한 뒤 `/teacher-guide/`로 접속합니다. JSON 데이터를 불러오므로 `file://` 직접 열기보다 HTTP 실행을 권장합니다.

- 기준 콘텐츠: `docs/KPASS_DCAS_NUVIA_전자교사가이드_통합기획_v2.0.md`
- 디자인·구현 기준: `docs/CODEX_전자교사가이드_B안_본제작_프롬프트.md`
- 81특성 대표 데이터: `data/profiles.ko.json` (현재 대표 5개)
- 언어 구조: `locales/languages.json`과 `locales/ko.json` (외국어 12개는 `pending`으로만 등록)
- 로컬 실행 예: `python -m http.server 4173` 후 `http://127.0.0.1:4173/teacher-guide/`
