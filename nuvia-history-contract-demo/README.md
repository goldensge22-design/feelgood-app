# NUVIA HISTORY W24-C2 계약 데모

정식 규칙 적용 전 검토용 격리 데모다. W24 구텐베르크의 한 조건을 네 가지 활동 계약으로 실행한다.

- 정식 W24 코드와 저장소를 읽거나 수정하지 않는다.
- `runMode=demo`, `resultId=demo:*`이며 운영 기록으로 승격하지 않는다.
- 저장 키는 `nuviaHistory.contractDemo.v1.{path}`로 경로별 분리되어 서로 덮어쓰지 않는다.
- 현재 제공 언어는 `ko`뿐이며 다른 locale은 진입을 차단한다.
- 자유 그림·글은 의미를 자동 판정하지 않는다. 필수 활동 증거와 별도로 저장한다.
- C-P1-01은 미결정이므로 음성 기능은 변경하지 않았다.
- 누락된 `NUVIA_HISTORY_ART_BIBLE.md`는 OPEN이며 기존 W24 자산만 사용했다.

## 실행

`npm test`, `npm run build`, `$env:PORT=5197; npm run serve`

기본 주소: `http://localhost:5197/?lang=ko&age=preschool&mission=gutenberg&condition=w24-c2&qa=1`

`pass`는 `attention`, `simultaneous`, `sequential`, `planning` 중 하나다. 학생 화면에는 PASS 진단명을 노출하지 않는다.
