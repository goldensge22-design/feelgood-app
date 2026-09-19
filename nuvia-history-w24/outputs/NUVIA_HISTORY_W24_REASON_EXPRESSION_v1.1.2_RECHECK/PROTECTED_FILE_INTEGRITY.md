# 보호 파일 무결성

작업 전 outputs 스냅샷: 1219개. 코드·테스트·dist-app을 제외한 보호 대상 1147개를 작업 후 SHA-256과 대조했다.

- 보호 파일 변경: 0건
- 보호 파일 누락: 0건
- 기존 미션 원본 missions.json, 역사 문구 ko.json, W24 의미 원본 w24-semantic.json / w24-semantic.ko.json: 동일 SHA-256
- 최종 이유 규칙·실행 순서·마스터·연간·역사·대표 의미 기준본: 무변경
- 변경 코드/테스트는 CHANGED_FILES_AND_SHA256.md에 개별 해시와 함께 분리했다.
- 새 W24 실행만 missionVersion 5.0.0 / contentVersion 3.1.0 / appVersion 0.5.0을 사용한다. 종전 실행 스냅샷은 종전 버전 그대로 판독한다.
- 사용자 브라우저 프로필을 조작하지 않았다. 브라우저 검수는 별도 임시 컨텍스트·새 learner/resultId로 수행했다. 기존 사용자 저장자료의 삭제·변환 코드는 추가하지 않았다. 사용자 브라우저 DB 자체를 해시 비교한 것은 아니다.

전체 원본별 대조: PROTECTED_FILES_SHA256.json.
