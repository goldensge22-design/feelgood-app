# K-PASS·D-CAS 전자교사가이드 개발자 전달사항

## 최종 기준선

- 승인일: 2026-09-21 (Asia/Seoul)
- 저장소: `goldensge22-design/feelgood-app`
- 작업 브랜치: `codex/build-teacher-guide-b`
- 최종 콘텐츠 커밋: `4df5857221d41c10f25e97ae82e354293b97f402`
- 최종 태그: `teacher-guide-final-2026-09-21`
- 기준선 기록 커밋: `6b3ff059d32cfb7c0b1e77eee2f25d755c467966`
- 공개 최종본: [전자교사가이드 열기](https://htmlpreview.github.io/?https://github.com/goldensge22-design/feelgood-app/blob/teacher-guide-final-2026-09-21/teacher-guide/public-preview.html#opening)
- 배포 구분: 외부 공개 미리보기이며 GitHub Pages 운영 배포본은 아닙니다.

## 개발자가 먼저 확인할 파일

- `teacher-guide/index.html`: 전자책 14개 장의 한국어 기준 콘텐츠
- `teacher-guide/app.js`: 장 전환, 해시, 언어 전환, 결과지 상세 화면과 UI 상태
- `teacher-guide/profile-engine.js`: PASS 81개 조합과 8·9·12번 분석 엔진
- `teacher-guide/ebook.css`: 반응형·RTL·인쇄 스타일
- `teacher-guide/locales/languages.json`: 지원 언어 13개와 검수 상태
- `teacher-guide/locales/*.json`: 외국어 locale pack
- `teacher-guide/public-preview.html`, `teacher-guide/public-app.js`: 토큰형 결과지 링크를 제외한 공개 미리보기
- `teacher-guide/build-public-preview.mjs`: 공개 미리보기 재생성 스크립트
- `teacher-guide/tests/browser-smoke.mjs`: 언어·화면·탐색·인쇄·전환 회귀검사
- `teacher-guide/tests/profile-matrix.mjs`: PASS 81개 조합 검사
- `AGENTS.md`, `docs/i18n/README.md`: 저장소 공통 i18n·반응형·원자적 언어 전환 규칙

## 반드시 보존할 동작

1. 왼쪽 목차 기반 전자책 구조와 한 번에 한 장만 표시되는 해시 라우팅
2. 새로고침·뒤로가기·앞으로가기·이전 장·다음 장
3. 결과지 3종 상세 해석 화면과 돌아가기
4. 8번·9번·12번의 PASS 선택, 적용, 초기화와 상태 보존
5. 13개 언어 선택과 아랍어 RTL
6. 언어 전환 시 현재 장·선택값·분석 결과 유지
7. 번역을 모두 받은 뒤 한 번에 교체하여 한국어 fallback 화면이 중간에 깜빡이지 않는 동작
8. 인쇄 시 목차 순서대로 14개 장 전체 출력
9. 일반 사용자 화면에서 번역·개발·QA 상태 문구를 생성하지 않는 동작

## 번역 상태

- 한국어: `ready`
- 외국어 12개: `ai-draft`
- 사람 검수 전에는 외국어를 `ready`로 변경하지 않습니다.
- 기존 번역을 전체 재생성하지 않고 신규 또는 의미가 변경된 key만 갱신합니다.
- 번역 상태와 `sourceHash`는 내부 metadata에 유지하되 사용자 화면에는 노출하지 않습니다.

## 공개본 주의사항

- 공개 미리보기는 장기 토큰 형태의 값이 포함된 결과지 샘플 URL을 복제하지 않습니다.
- 따라서 공개본의 결과지 외부 링크 9개는 비활성화되어 있습니다.
- 원본 `teacher-guide/index.html`과 `teacher-guide/app.js`의 결과지 연결 구조는 변경하지 않았습니다.
- 운영 배포가 필요하면 토큰 없는 공식 샘플 URL을 발급한 뒤 공개본에 연결하고 다시 QA해야 합니다.
- 최종 태그는 별도 승인 없이 이동·삭제·덮어쓰기하지 않습니다.

## 재현 및 QA 명령

저장소 루트에서 실행합니다.

```powershell
node scripts/check-i18n.mjs
node scripts/check-i18n.mjs --changed --strict-hardcoded
node teacher-guide/tests/profile-matrix.mjs
node teacher-guide/tests/browser-smoke.mjs
```

공개 미리보기를 재생성할 때는 다음을 실행하고, 생성된 `public-preview.html`과 `public-app.js`에 토큰형 URL이 포함되지 않았는지 반드시 확인합니다.

```powershell
node teacher-guide/build-public-preview.mjs
```

## 완료된 QA

- 지원 언어 13개, 14개 장
- 1440×900, 1280×720, 1024×768, 768×1024, 430×932, 390×844, 360×800
- 확대 100%, 125%, 150%, 200%
- A4 세로·가로 인쇄
- 아랍어 RTL
- PASS 81개 조합 코드 중복·빈 결과 검사
- 언어 전환 중 fallback 한국어 깜빡임 검사
- JavaScript 콘솔 오류, 가로 overflow, 글자·버튼·카드 잘림 검사

## Git 보호

- `main`에는 병합하지 않은 상태입니다.
- 작업 시작 전에 브랜치·HEAD·원격 대비 ahead/behind·작업 트리를 다시 확인합니다.
- 기존 사용자 미커밋 스크린샷과 `.report-stage/` 같은 별도 작업 파일은 임의로 수정·삭제·커밋하지 않습니다.
