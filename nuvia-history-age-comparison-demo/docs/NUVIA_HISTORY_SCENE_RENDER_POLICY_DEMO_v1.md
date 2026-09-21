# NUVIA HISTORY 장면·이미지 렌더링 규칙 DEMO v1

- 상태: `DRAFT CANDIDATE — HISTORY 데모 검증용`
- 정책 ID: `nuvia.history.scene-render-policy.demo.v1`
- 적용 범위: NUVIA HISTORY 승인 자산 기반 화면과 이야기책
- 비적용 범위: NUVIA CORE, KIDS, 런타임 생성형 이미지, 정식 배포

## 1. 목적

장면 의미와 화면 렌더링 역할을 분리하여 실제 역사·변경 조건·사용자 상상 장면이 잘리거나 서로 오인되지 않도록 한다. PASS는 강조·힌트·순서·인터랙션에만 작용하며 역사 장면의 인물·도구·건물을 바꾸지 않는다.

## 2. 장면과 자산

- 장면은 `sceneId`, 자산은 승인 레지스트리의 `assetId`로 식별한다.
- 해시는 장면 계약에 복제하지 않는다. 빌드 검사가 W24 `assets.json`의 `assetId`, 경로, 크기, SHA-256을 원본으로 사용한다.
- `factMode`는 `history | altered | user_imagined` 중 하나다.
- `history`는 출처 ID가 필요하고 `alteredConditionId`를 갖지 않는다.
- `altered`는 `baselineSceneId`, `alteredConditionId`, 화면 구분용 `modeLabelKey`가 필요하다.
- `user_imagined`는 사실이 아님을 알리는 `modeLabelKey`가 필요하며 역사 출처를 강제하지 않는다.

## 3. 렌더링 역할과 정책

역할과 정책은 1:1로 묶지 않는다. 여러 역할이 같은 정책 ID를 참조할 수 있다.

| 역할 | 정책 | 비율 | fit |
|---|---|---:|---|
| `history-stage` | `stage-16x9-contain` | 16:9 | contain |
| `condition-stage` | `stage-3x2-contain` | 3:2 | contain |
| `storybook-history` | `book-4x3-contain` | 4:3 | contain |
| `storybook-condition` | `book-4x3-contain` | 4:3 | contain |
| `storybook-result` | `book-4x3-contain` | 4:3 | contain |
| `storybook-cover` | `cover-2x1-focal` | 2:1 | cover |

- `contain`의 중립 여백은 이미지가 아니라 `.scene-media` wrapper가 제공한다.
- 이야기책 삽화는 PC 최대 453×340, 모바일 최대 400×300으로 통일한다.
- 표지만 `cover`를 허용한다. 현재 초점 50%/50%는 미검수 임시값이다.
- wrapper는 `data-scene-role`을 가져야 하며 계약 역할 키와 일치해야 한다.
- 전체 활동 카드는 고정 높이가 아니라 `min(680px, 100dvh - 120px)`를 최소 높이로 사용하고 콘텐츠가 길면 세로로 늘어난다.

## 4. 가용성과 완료

`availability.fileStatus`는 `present | missing`의 파일 사실만 기록한다.

현재 데모의 파생 판정 코드는 다음 세 개만 사용한다.

- `ASSET_FILE_MISSING`
- `RIGHTS_SCOPE_MISMATCH`
- `REQUIRED_ACTIVITY_ASSET_UNAVAILABLE`

장식·맥락 자산이 없으면 아이 눈높이의 준비 상태를 표시하고 진행할 수 있다. 필수 활동 자료는 동등한 승인 대체 자료가 있을 때만 진행한다. 대체 자료가 없으면 완료 처리하지 않고 진행과 사용자 입력을 보존한다. 다른 사건·조건 이미지를 대체하지 않는다.

## 5. 권리와 검수

- `rights.status`와 역할별 `usageScope`를 기록한다.
- 검수 상태는 `historical`, `educational`, `visual`, `rights`, `accessibility`로 분리한다.
- 자동검사는 `checked`까지만 표시하며 `approved`를 만들지 않는다.
- 해시 기반 승인 무효화와 `focalReview` 자동화는 자산 규모가 커지거나 생성형 이미지 계약이 생길 때 도입한다.

## 6. 연령과 접근성

- 유아의 핵심 판단 요소는 보통 2~3개, 한 화면 필수 행동은 1개다.
- 핵심 의미를 이미지 안 글자로 전달하지 않는다.
- `factMode`는 색상만이 아니라 제목·배지·아이콘·프레임 중 둘 이상으로 구분한다.
- 이미지에는 번역된 `alt`가 필요하다.

## 7. 현재 OPEN

- 표지 초점의 정식 검수 기록
- 순차처리·주의 활동 이모지의 승인 자산 대응
- 이모지는 텍스트 라벨이 있어 기능을 차단하지 않지만 `P1 — 시각 단서 품질 저하 위험`으로 둔다.
- CORE 승격은 KIDS 자산 구조 대조 전까지 금지한다.

## 8. 시행 단계

- 지금 시행: 역할 분리, wrapper, 역할별 비율·fit, 파일 존재·원본 레지스트리 무결성 검사
- 후속 시행: 승인 아이콘 등록, 필수 활동 자산 완료 게이트
- 보류: 생성형 이미지, 분야별 검수 기준 해시, 전체 승인 무효화 자동화
