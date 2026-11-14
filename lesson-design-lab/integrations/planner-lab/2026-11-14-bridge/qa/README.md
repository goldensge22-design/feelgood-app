# 검증 재현

Node 24에서 `node --test qa/bridge.test.mjs`를 실행합니다. 외부 계정·외부 AI·운영 DB를 사용하지 않고, loopback 합성 LAB HTTP 서버와 SQLite 임시 DB로 테스트합니다. 원본 작업폴더와 ZIP 안의 테스트는 import 경로만 다릅니다. 패키지는 자체 payload의 실행 모듈을 읽습니다.

새 React 컴포넌트를 별도 검사하려면 React/ReactDOM/@types/react/TypeScript/esbuild가 이미 설치된 작업폴더를 `BRIDGE_QA_DEPENDENCIES` 환경 변수로 지정하고 `node qa/build-ui.mjs`를 실행합니다. 검증 과정에서 새 패키지를 자동 설치하지 않습니다. 이는 기존 전체 플래너 빌드가 아닙니다.

`node qa/preview-server.mjs`는 loopback 43871 포트에 합성 QA 서버를 엽니다. QA 소스는 실세션 인증을 제공하지 않으므로 **운영 배포 대상이 아닙니다.** 화면이 안 열리면 서버 실행 상태·포트·로컬 네트워크 권한을 확인합니다. QA 서버의 생성 응답은 고정 합성 예시이며 AI 생성 품질 검사가 아닙니다.

브라우저 QA는 한국어에서 추천 후보 3개, 한 카드 등록, 입력, 시작, 저장, 새로고침, 저장본 복구, 수정·재저장을 확인했습니다. 최종 화면 증거는 `browser-saved-final.png`입니다. 점검 중 타이머의 시작 직후 분 단위 올림 표시를 수정했습니다. 초기 선택 요청이 한 차례 화면 변경 없이 끝나 서버를 재시작하고 새로고침한 뒤 최종 소스로 선택·저장·복구를 재검증했습니다. 이 점을 포함해 운영 SSO·실 LAB을 연결한 브라우저 회귀 검증은 별도로 필요합니다.

실 PostgreSQL 실행 검증과 새로운 15언어 화면 번역·자연스러움 QA는 이번 통과 범위에 없습니다. `QA_STATUS.json`, `http-tests.log`, `ui-build.log`를 범위와 함께 읽어 주세요.
