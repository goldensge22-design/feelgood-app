# 진로 연결 검토 패치: 기존 실패와 자원 오류 조사

## 보호 경계

이번 조사에서 정식 `official` 소스와 기존 테스트를 수정하지 않았다.
아래 여섯 관련 파일은 패치 적용 전 기준
`9dde34203ddc92c225c3420174a62b0bc6876c13`과 바이트가 같다.
해시 근거는 `generated-artifacts/studio-career-review/legacy-source-audit.json`에 있다.

## 구형 기준 4건: 현재 재현, 패치와 별개인 기존 기대값 충돌

실행:

```sh
pnpm --package=vitest@5.0.5 --package=vite dlx vitest run --config tools/nuvia-enhancement/vitest.config.mjs
```

결과: 14파일 중 11통과/3실패, 261테스트 중 **257통과/4실패**, 종료코드 1.
`generated-artifacts/studio-career-review/legacy-four-current.log`에 전체 결과를 보관한다.

| 기존 실패 | 직접 확인한 원인 | 이번 패치와의 관계 |
|---|---|---|
| adaptiveTraining: official results are validated and preserve scores with explicit units | D-CAS 예시의 planning만 표준점수로 바꾼 테스트가 성공을 기대한다. 현재 engine은 schema 1.1에서 네 영역의 공통 단위와 D-CAS의 `%` 단위를 명시적으로 검증하므로 거부한다. | engine과 테스트 모두 기준 커밋과 동일. 새 검토 어댑터가 이 테스트나 정식 engine을 바꾸지 않는다. |
| cognitiveActivity: planning requires first-action decision and rationale | 기존 테스트가 준비 답변 전 시작 불가를 기대한다. 현재 `practiceReady`는 실제 과제의 시작을 항상 허용한다. | 소스·테스트 모두 기준 커밋과 동일. 시작 가능과 목표 수행 인정은 별개이며 신규 검토 모델에도 명시적 시작을 유지한다. |
| cognitiveActivity: attention has its own start condition | 위와 같은 준비 답변 기반 시작 차단 기대값과 현재 항상 시작 규칙의 충돌이다. | 같은 기존 불일치. 이번 패치의 회귀 발생으로 분류하지 않는다. |
| timeBlockUX: keeps deliberate step selection for a multi-step task | 기존 테스트가 다단계 과제의 `15분 시작` 버튼 비활성화를 기대하지만 현재 구현은 직접 시작을 허용한다. | TimeBlockBoard와 테스트 모두 기준 커밋과 동일. 이번 검토 화면은 이 컴포넌트를 교체하지 않는다. |

실패를 숨기기 위해 기대값을 느슨하게 하거나 보호 대상 소스를 바꾸지 않았다.
제품 담당자의 기존 정책·테스트 계약 정리는 별도 작업이다.
사용자가 이전 GitHub 기준에서 확인한 262개 통과와 이 Replit의 261개 결과를 동일시하지 않는다.

## 초기 HTTP404: 원인 확정에 필요한 과거 URL이 없음

이전 브라우저 보고서에는 HTTP404 한 건만 남아 있고 요청 URL·응답 본문·시각별 네트워크 기록이 없다.
따라서 favicon이나 특정 앱 파일이 원인이었다고 단정할 근거가 없다.
현재 진입 HTML에는 `./favicon.svg`가 명시돼 있고 개발 미리보기의
`/career-review.html`과 `/favicon.svg`는 각각 HTTP200을 반환한다.

이번 전체 언어 기능 QA는 탐색 전에 console/pageerror/requestfailed/HTTP오류 수집기를
붙이는 것을 기준으로 한다. 언어별 실제 수집 결과는 QA 보고서에 별도 기록한다.
후속 재현이 없더라도 과거 404의 원인을 “해결 확인”으로 바꾸지 않는다.
기능 차단을 재현하면 해당 URL·상태·실행 단계로 새 결함을 분류한다.

## 빌드 실행 조건

첫 재검증은 환경 변수 없이 실행해 `PORT environment variable is required`로 종료코드 1이었다.
앱 코드 오류가 아니라 서비스 실행 조건 누락이다. 기존 서비스와 같은
`PORT=24422 BASE_PATH=/`를 지정한 빌드는 종료코드 0으로 통과했다.
두 로그를 모두 보존하며 최초 실패를 삭제하지 않는다.

## 중요도 해석

- 기존 4건은 현재 재현되는 **기존 정책/테스트 기대값 충돌**이지 이번 패치에서 새로 생긴 P0/P1이라는 근거가 아니다.
- 실제 공식 결과지 계약·서버 연결 부재는 명시된 검토 범위의 미연결 항목이다. 정식 연동 완료로 보고하지 않는다.
- 새 검토 패치의 P0/P1/P2 판정은 전체 기능 여정의 실제 실패 결과와 함께 QA 보고서에서 확정한다.
- 신규 외국어는 계속 AI 초안이며 브라우저 통과가 원어민 검수 완료를 의미하지 않는다.
