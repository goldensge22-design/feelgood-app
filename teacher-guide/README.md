# FeelGood 교사 가이드 한국어 MVP

정적 GitHub Pages용 독립 가이드입니다. 저장소 루트에서 정적 서버를 실행한 뒤 `/teacher-guide/`로 접속합니다. JSON 데이터를 불러오므로 `file://` 직접 열기보다 HTTP 실행을 권장합니다.

## 승인된 최종 공개본

- 승인일: 2026-09-21 (Asia/Seoul)
- 상태: K-PASS·D-CAS 전자교사가이드 최종본
- 브랜치: `codex/build-teacher-guide-b`
- 콘텐츠 커밋: `4df5857221d41c10f25e97ae82e354293b97f402`
- Git 태그: `teacher-guide-final-2026-09-21`
- 공개 링크: [전자교사가이드 최종본](https://htmlpreview.github.io/?https://github.com/goldensge22-design/feelgood-app/blob/4df5857221d41c10f25e97ae82e354293b97f402/teacher-guide/public-preview.html#opening)
- QA: 13개 언어, 14개 장, PC·태블릿·모바일·확대·인쇄·RTL·81개 PASS 조합 및 언어 전환 시 fallback 깜빡임 검사를 통과했습니다.
- 번역 상태: 한국어 `ready`, 외국어 12개 `ai-draft`를 유지합니다.
- 공개본 보안: 토큰형 결과지 샘플 링크는 공개 미리보기에서 비활성화하며 원본 가이드 파일은 변경하지 않습니다.

이 기록의 `최종본`은 위 커밋과 공개 미리보기 URL을 의미합니다. 별도 승인 없이 이 링크를 다른 커밋으로 교체하거나 태그를 이동하지 않습니다.

- 기준 콘텐츠: `docs/KPASS_DCAS_NUVIA_전자교사가이드_통합기획_v2.0.md`
- 디자인·구현 기준: `docs/CODEX_전자교사가이드_B안_본제작_프롬프트.md`
- 콘텐츠 공통 규칙: `docs/교사용_쉬운말_실행중심_콘텐츠_규칙.md`
- 81특성 대표 데이터: `data/profiles.ko.json` (현재 대표 5개)
- 언어 구조: `locales/languages.json`과 언어별 JSON pack (한국어 `ready`, 외국어 12개 `ai-draft`)
- 로컬 실행 예: `python -m http.server 4173` 후 `http://127.0.0.1:4173/teacher-guide/`

## 기존 다국어 문구 변경 절차

한국어 원문을 `index.html`, `app.js`, `profile-engine.js`의 기존 위치에서 먼저 확정합니다. 81유형 동적 문구는 `profile-engine.js`의 공통 규칙을 재사용하며 유형별 완성 문장을 별도 파일에 반복 작성하지 않습니다. `tests/locale-source.mjs`가 교사용(`teacher`), 학생에게 직접 말하는 문장(`student`), 보호자 상담용(`parent`) 사용처와 공통 키 재사용 횟수를 수집합니다.

```powershell
node teacher-guide/tests/locale-coverage.mjs --sync --browser
```

이 한 명령은 현재 한국어 동적 원문과 기존 locale pack을 비교해 신규·변경 문장을 추출하고, 누락된 키만 12개 외국어 pack에 빈 `needs-review` 항목으로 추가한 뒤 상태·누락·빈 값·한국어 잔존·placeholder·RTL을 검사합니다. 이어서 임시 스크린샷 디렉터리에서 전체 언어 전환과 PC/노트북/태블릿/모바일 overflow·잘림을 검사합니다. 기존 번역값은 재생성하거나 수정하지 않습니다.

`--sync` 없이 실행하면 파일을 수정하지 않는 추출·검사 모드이고, `--browser` 없이 실행하면 빠른 locale 데이터 QA만 수행합니다. 새 항목은 실제 번역과 검수를 마쳐 빈 값과 `needsReview` 상태를 해소하기 전에는 QA를 통과하지 않습니다.
