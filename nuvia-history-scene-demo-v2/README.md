# NUVIA HISTORY W24-C2 장면 규칙 데모 v2

정식 규칙 적용 전 검토용 격리 데모다. W24 구텐베르크의 한 조건을 네 가지 활동 계약으로 실행하면서 `nuvia.history.scene-render-policy.demo.v1`을 실제 렌더링에 연결한다.

- 정식 W24 코드는 수정하지 않는다. 빌드 검증에서 승인 자산 레지스트리만 읽기 전용으로 참조한다.
- `runMode=demo`, `resultId=demo:*`이며 운영 기록으로 승격하지 않는다.
- 저장 키는 `nuviaHistory.sceneDemo.v1.{path}`로 기존 5197 데모 및 경로별 기록과 분리한다.
- 현재 제공 언어는 `ko`뿐이며 다른 locale은 진입을 차단한다.
- 자유 그림·글은 의미를 자동 판정하지 않는다. 필수 활동 증거와 별도로 저장한다.
- 저장된 실제 역사·조건·예측·활동·이야기·두 비교를 8쪽 이야기책 파생 뷰로 조립한다.
- 이미지 렌더링 역할은 `history-stage`, `condition-stage`, `storybook-cover`, `storybook-history`, `storybook-condition`, `storybook-result`로 분리한다.
- 이야기책 삽화는 4:3 `contain`, 단독 역사 장면은 16:9 `contain`, 조건 장면은 3:2 `contain`을 사용한다. 표지만 2:1 `cover`이며 초점은 아직 검수 전 임시값이다.
- C-P1-01은 미결정이므로 음성 기능은 변경하지 않았다.
- 누락된 `NUVIA_HISTORY_ART_BIBLE.md`는 OPEN이며 기존 W24 자산만 사용했다.
- 정책 문서는 `docs/NUVIA_HISTORY_SCENE_RENDER_POLICY_DEMO_v1.md`, 실행 레지스트리는 `src/sceneRegistry.mjs`에 둔다.
- 빌드 전에 W24 원본 `assets.json`과 파일 크기·SHA-256을 대조한다. 해시를 장면 계약에 중복 저장하지 않는다.

## 실행

`npm test`, `npm run validate:scenes`, `npm run build`, `$env:PORT=5199; npm run serve`

기본 주소: `http://localhost:5199/?lang=ko&age=preschool&mission=gutenberg&condition=w24-c2&qa=1`

`pass`는 `attention`, `simultaneous`, `sequential`, `planning` 중 하나다. 학생 화면에는 PASS 진단명을 노출하지 않는다.
