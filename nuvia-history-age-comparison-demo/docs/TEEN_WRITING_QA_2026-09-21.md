# 중·고 직접 작성 데모 검증 기록

상태: 기술 검사 완료 / 사용자 화면·교육적 난이도 검토 대기. 2026-09-21.

## 실행과 보존

- 소스: nuvia-history-age-comparison-demo, entry writing.html, 새 모듈 src/writing-app.mjs 및 writing-contract.mjs.
- 기존 계획 엔진·화면: reconsideration.mjs / reconsiderationView.mjs 직접 재사용. 기존 파일 내용은 수정하지 않았다.
- 시작 명령: `node scripts/serve.mjs dist-writing`, PORT=5203. 기존 5192·5200·5201·5202 서버에 중지·교체 명령을 수행하지 않았다.
- 빌드: `node scripts/build-writing.mjs`, 결과 dist-writing/. 기존 dist/ 및 dist-reconsider/ 보존.
- 기존 교사가이드 dirty 스크린샷 3개를 수정하거나 정리하지 않았다. main·W01·연간 Excel·W24 기준선은 변경하지 않았다.

## 기술 검사

| 검사 | 결과 |
|---|---|
| 신규 상태/기록 계약 tests/writing.test.mjs | 7/7 PASS |
| 기존 contracts/scenes/reconsideration 회귀 | 21/21 PASS |
| JS 구문 검사 | 통과. 이 앱은 JS이며 TypeScript 검사로 표시하지 않음 |
| 새 빌드 및 승인 자산 레지스트리 bytes/hash | 통과 |
| PC 1440×900 고등, 방법 변경 | 완주 PASS |
| 모바일 390×844 고등, 유지 | 완주 PASS |
| 폰 가로 844×390 고등, 비교 보류 | 완주 및 미완료 책 상태 PASS |
| 태블릿 1024×768 중등 | 완주 PASS |
| 모바일 390×844 중등, 방법 변경·비교 보류 | 완주 PASS |
| 가로 넘침/화면 밖 입력·버튼 | 5경로 검출 없음 |
| 브라우저 오류/이미지·CSS·폰트 404 | 5경로 검출 없음 |
| 최초 예상 원문·조건·시도 잠금 | 새로고침·뒤로 이동 후 동일 |
| 직접 글·그림 초안 복구 | 동일 resultId에서 복구 |
| 방법 수정 | 다른 방법 선택·새 근거 입력 전 완료 차단 |
| 7/8쪽 | history/prediction 별도 레코드·eventId, 원문 분리, 그림 fallback 없음 |
| 비교 보류 | 작성 중 글 보존, 비교 기록 없음 표시, 실제 역사 제공 |
| 이야기/계획 재편집 | 이전 작품·비교 보존, 새 비교 완료 무효화 |
| new=1 | 이전 resultId별 기록 및 구 데모 sentinel 보존 |
| 저장 공간 오류 | 최초 예상 확정 시 오류 안내, 목표·결과 공개 차단 |
| 미지원 언어 | 본문 없음, 한국어 명시 선택 링크, 기록 삭제 없음 |
| 공개 검토 산출물 | 정적 HTML·JSON·Markdown·규칙 MD 존재/로컬 HTTP 200 |

자동 브라우저 기록과 합성 테스트 입력 캡처는 qa-writing/에 있다. 자동 완주 소요 시간을 학생 사고 시간이나 난이도 증거로 사용하지 않았다. 데스크톱·모바일 역사 비교 캡처를 시각 확인했으며 글·입력·버튼 겹침은 보이지 않았다. 세로 스크롤은 허용한다.

## i18n

- HISTORY 사전·사후 `node scripts/check-i18n.mjs --program=nuvia-history`: 동일 FAIL 3건.
- LOCALE_PACK_INCOMPLETE ko pack/required-key contract, RELEASE_REVIEW_MISSING ko:rtl, ko:font.
- 새 파일을 git intent-to-add로 포함한 `--changed --strict-hardcoded --program=nuvia-history`: 신규 하드코딩 후보 0, 같은 기존 3건.
- 전체 검사 FAIL 20건: 위 HISTORY 3건 + 다른 프로그램의 레거시 fallback/등록 메타데이터/이 worktree의 기존 manifest 부재. 다른 프로그램을 수정하지 않았다.
- 11언어 번역 완료, 전체 i18n 통과, 실제 기기 폰트/RTL 검수 완료로 주장하지 않는다.

## 남은 검토

- 중·고등 대상 학생의 실제 난이도·문항 이해·소요 시간, 사용자 화면 승인 대기.
- 샘플은 W24-C2 Planning 하나. 다른 조건 선택/조건 변경 후 별도 시도와 나머지 세 PASS 경로는 미구현. 단일 조건을 선택 문제로 위장하지 않는다.
- 역사 비교는 승인된 자료의 범위 안에서만 제공. 실제 열람 제한·모임·요약본 배포가 있었음을 역사 사실로 주장하지 않는다.
- 고등 미확인 정보·계획 문항은 격리 데모 후보이며 정식 사건별 문항 승인과 다르다.
- C-P1-01 음성 관련 기능 변경 없음. C-P1-02 공통 스키마 미결정 유지. ART_BIBLE 누락을 새 문서로 임의 복원하지 않음.
- 실물 휴대기기/터치펜/운영체제 인쇄, 전체 48주·96조건, 검사 결과지·MY NUVIA는 검증/연동하지 않았다.
