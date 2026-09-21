# NUVIA HISTORY W24-C2 연령 난이도·비교 데모

정식 규칙 적용 전 검토용 격리 데모다. W24-C2 계획 경로를 유아·중학생·고등학생으로 실행해 비교 누락 표시, 이야기·이미지 정합성, 연령별 사고 행동 난이도를 검토한다.

- 정식 W24 코드는 수정하지 않는다. 빌드 검증에서 승인 자산 레지스트리만 읽기 전용으로 참조한다.
- `runMode=demo`, `resultId=demo:*`이며 운영 기록으로 승격하지 않는다.
- 저장 키는 `nuviaHistory.ageComparisonDemo.v1.{ageBand}.{path}`로 기존 데모 및 연령별 기록과 분리한다.
- 현재 제공 언어는 `ko`뿐이며 다른 locale은 진입을 차단한다.
- 자유 그림·글은 의미를 자동 판정하지 않는다. 필수 활동 증거와 별도로 저장한다.
- 저장된 실제 역사·조건·예측·활동·이야기·두 비교를 8쪽 이야기책 파생 뷰로 조립한다.
- 이미지 렌더링 역할은 `history-stage`, `condition-stage`, `storybook-cover`, `storybook-history`, `storybook-condition`, `storybook-result`로 분리한다.
- 이야기책 삽화는 4:3 `contain`, 단독 역사 장면은 16:9 `contain`, 조건 장면은 3:2 `contain`을 사용한다. 표지만 2:1 `cover`이며 초점은 아직 검수 전 임시값이다.
- C-P1-01은 미결정이므로 음성 기능은 변경하지 않았다.
- 누락된 `NUVIA_HISTORY_ART_BIBLE.md`는 OPEN이며 기존 W24 자산만 사용했다.
- 정책 문서는 `docs/NUVIA_HISTORY_SCENE_RENDER_POLICY_DEMO_v1.md`, 실행 레지스트리는 `src/sceneRegistry.mjs`에 둔다.
- 빌드 전에 W24 원본 `assets.json`과 파일 크기·SHA-256을 대조한다. 해시를 장면 계약에 중복 저장하지 않는다.
- 비교 기록이 없으면 책 7·8쪽에 그 상태를 표시하고 승인된 실제 역사 핵심 내용을 함께 보여 준다.
- 선택한 방법과 일치하는 승인 이미지가 없으면 다른 이미지를 대체하지 않고 준비 상태를 표시한다.
- 중학생은 결과 근거, 고등학생은 근거와 불확실성까지 선택해야 계획 활동을 완료한다.

## 실행

`npm test`, `npm run validate:scenes`, `npm run build`, `$env:PORT=5200; npm run serve`

기본 주소: `http://localhost:5200/?lang=ko&age=preschool&mission=gutenberg&condition=w24-c2&pass=planning&qa=1`

난이도 비교 값은 `age=preschool`, `age=middle-school`, `age=high-school`이다. 중·고등 데모는 계획 경로만 제공하며 학생 화면에는 연령 코드나 PASS 진단명을 노출하지 않는다.
