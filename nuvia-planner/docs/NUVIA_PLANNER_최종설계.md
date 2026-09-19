# NUVIA PLANNER 최종본 설계

전 단계 검수(코드 리뷰) + 인기 플래너 앱 벤치마킹 + 전이 성장 서클 아이디어를 하나의 실행 가능한 설계로 정리합니다. 모든 항목은 기존 코드(`engine.ts`, `workspace.ts`, `AdaptivePlanner.tsx`, `TransferBridge.tsx`)를 최대한 재사용하는 방향으로 잡았습니다.

---

## 1. 신규 기능 5종 — 최종 스펙

### 1-1. 반복 할 일 (recurring task)
- **대상**: 밴드 A(초등) 우선, 전체 확장 가능
- **데이터 모델**: `PlannerTask`에 `repeat?: 'daily' | 'weekdays' | 'none'` 필드 추가 (`workspace.ts`)
- **동작**: 완료(`status:'done'`) 처리 시, `repeat`이 설정된 태스크는 다음 발생일의 사본을 자동 생성(steps/materials는 초기화, `done` 체크만 리셋). `recordCompletion()` 안에서 분기 처리.
- **UI**: `TaskEditor`의 날짜 필드 옆에 "매일 반복" 토글 1개만. 복잡한 rrule 없이 단순 토글로 시작.
- **문구 원칙**: "반복"이지 "연속 달성"이 아님 — 실패해도 다음 날 다시 생성될 뿐, 끊김을 알리지 않음.

### 1-2. 집중 타이머
- **대상**: `FocusDesk`("지금, 실제로 해볼 시간" 흐름)
- **데이터 모델**: 저장 안 함 — 순수 UI 상태(useState)로 카운트다운만. `CognitivePractice`에 필드 추가하지 않음(기록 비대화 방지).
- **동작**: "지금 시작" 클릭 시 선택한 예상 시간(`minutes`)만큼 카운트다운 표시. 끝나면 "시간이 다 됐어요, 계속할까요?"만 묻고 자동 종료/평가는 하지 않음(ADHD 친화 원칙 — 타이머가 실패 판정 도구가 되지 않게).
- **주의**: `Verification`/`TrainingRecord`에 타이머 데이터는 절대 넣지 않음 — "집중 시간 점수화 금지" 원칙(§34 계열)과 충돌 방지.

### 1-3. 일일 캐파 게이지
- **현황**: `ActivityDesks.tsx`의 `PlanningDesk`에 이미 숫자 입력형 `dailyCapacity` + `<progress>`가 있음 — **로직은 있고 시각만 약함**.
- **개선**: 기존 `<progress>`를 막대 블록형(예: 15분 단위 세그먼트)으로 교체. 데이터 변경 없이 `personal-planner.css`만 수정하면 됨. 신규 컴포넌트 불필요.

### 1-4. 연속 실행일(streak) — 중립 카운터
- **데이터 모델**: 신규 계산값. 저장하지 않고 `data.tasks` 완료일(`completedAt`)에서 매 렌더 시 계산 — "최근 며칠 연속 완료 기록이 있는지"만.
- **UI**: `GrowthIsland` 옆에 작은 카운터 한 줄 추가: "최근 3일 연속 기록". **숫자가 끊겨도 "0일로 리셋됐어요" 같은 손실 표현 금지** — 그냥 현재 값만 보여주고 과거 기록은 `growth` 탭 리스트에 그대로 남김.
- **레거시 원칙 승계**: Weekly Boss의 "실패 라벨 금지"(§16)를 그대로 적용.

### 1-5. 주간 리뷰 리추얼
- **현황**: `weeklyNote` textarea가 이미 `growth` 탭에 있음.
- **개선**: 매주 첫 방문 시(로컬에 `lastWeeklyReviewWeek` 저장) `growth` 탭으로 살짝 유도하는 배너 1줄만 추가. 강제 팝업 금지(§35 Instant Start 원칙과 충돌 방지 — 진입을 막으면 안 됨).

---

## 2. 전이 성장 서클 — 최종 설계 (핵심)

### 2-1. 이미 있는 것 / 새로 만들 것
`TransferBridge.tsx`의 `BridgePath`, `FollowupTask`는 **완성돼 있으나 어디서도 렌더링되지 않는 상태**입니다. 새로 설계하는 게 아니라 **배선(integration)만 하면 됩니다.**

| 구성 요소 | 상태 |
|---|---|
| `BridgePath` (4단계 카드 UI) | ✅ 완성, 미사용 |
| `FollowupTask` (다른 영역 재적용 폼) | ✅ 완성, 미사용 |
| `TransferLink` / `Verification` 타입 (`engine.ts`) | ✅ 완성, 이미 검증 로직까지 있음 |
| `TrainingRecord.kind==='followup_task'` | ✅ 타입 정의됨, **생성 경로 없음** ← 새로 만들 부분 |
| `assessment.transfer` 실제 주입 | ✅ `validateAssessment`가 이미 지원, **데모 모드만 강제로 `undefined`** ← 설정만 바꾸면 됨 |

### 2-2. 데이터 흐름 (최종)

```
[HISTORY 앱]
   전략 선택 완료 시 TransferLink 생성
   { bridgeId, strategyId, history:{activityId, evidenceId} }
        │
        ▼  window.NUVIAPlanner.setAssessment({ ...axes, transfer })
[PLANNER 부팅]
   assessment.transfer 로 수신 (engine.ts validateAssessment가 이미 검증)
        │
        ▼
[PLANNER growth 탭]
   <BridgePath link={assessment.transfer} records={data.records} demo={mode==='demo'} />
   → 01 KIDS / 02 HISTORY / 03 PLANNER / 04 MY NUVIA 4단계 카드 표시
        │
        ▼  사용자가 실제 할 일 완료
   recordCompletion() 이 TrainingRecord 생성
   strategyId를 하드코딩('PLAN_DO_CHECK') 대신
   assessment.transfer?.strategyId ?? 'PLAN_DO_CHECK' 로 대체
        │
        ▼  같은 전략을 "다른 영역"에서 한 번 더 써보고 싶을 때
   <FollowupTask strategy={link.strategyId} previousDomain=... previousTask=...
                 onDone={(measures)=>commit 새 TrainingRecord{kind:'followup_task', ...}} />
        │
        ▼  외부(부모/교사)가 결과지 시스템에서 확인
   window.NUVIAPlanner.setVerification({ recordId, outcome:'supported', reviewerRole:'parent', ... })
        │
        ▼  BridgePath가 verified 카운트 자동 갱신 (records.filter(r=>r.verification?.outcome==='supported'))
        │
        └──▶ (다음 HISTORY 방문 시) 강화된 전략이 우선 추천 — HISTORY 쪽 로직, PLANNER 담당 아님
```

### 2-3. 구체적 변경 지점 (파일별)

1. **`AdaptivePlanner.tsx`**
   - 데모 모드 `transfer:undefined` → `DEMOS[demo].transfer`를 그대로 사용하도록 변경(이미 `DEMOS` 배열엔 `demo-a`, `demo-b`에 `transfer` 예시 데이터가 채워져 있음 — `engine.ts` 21~24행 참고). 지금은 이 데모 데이터를 일부러 지우고 있어서 데모에서 서클을 볼 방법이 아예 없었음.
   - `recordCompletion()`의 `strategyId:'PLAN_DO_CHECK'` → `assessment.transfer?.strategyId ?? 'PLAN_DO_CHECK'`.

2. **`PersonalPlanner` (`AdaptivePlanner.tsx` 내부)**
   - `growth` 탭 최상단, 기존 `<div className="np-stats">` 위에 `<BridgePath link={assessment.transfer} records={data.records} demo={mode==='demo'}/>` 삽입.
   - `assessment.transfer`가 없으면 `BridgePath` 내부 조건문이 이미 "이전 활동 연결 대기"로 알아서 처리하므로 별도 빈 상태 코드 불필요.

3. **`workspace.ts`**
   - `validateWorkspace()`의 record kind 화이트리스트가 현재 `r.kind!=='real_task'`만 허용하도록 막고 있음(`engine.ts` 35행의 `validateVerification`도 동일) → `followup_task`도 허용하도록 조건 확장 필요. 이 부분을 안 고치면 `FollowupTask`가 기록을 남겨도 검증 통과가 안 됨.

4. **신규 진입점**: `growth` 탭에서 `BridgePath`의 04단계 카드를 누르면(`sendPrompt` 방식이 아니라 로컬 상태 토글) `FollowupTask` 폼이 펼쳐지도록 연결. `previousDomain`/`previousTask`는 가장 최근 `real_task` 기록에서 자동 채움.

### 2-4. 지켜야 할 원칙 (레거시에서 그대로 승계)
- 04단계(강화)에서도 **"실패"라는 단어·붉은색 경고 사용 금지** — 확인 안 됨/대기 중까지만 표현.
- `verified` 카운트는 **총점처럼 보이지 않게** — 숫자만, 등급·배지 없음(`§34 Unified Total Score 금지` 승계).
- 원문 데이터(무엇을 어떻게 했는지 서술)는 저장하지 않음 — `FollowupTask`의 `taskContentStored:false`가 이미 이를 강제하고 있으니 그대로 유지.

---

## 3. 구현 순서 (로드맵)

**Phase 1 (배선만, 신규 로직 최소)**
1. `config/ageUXProfiles.ts` 빈 파일 복구 (기존 검수 이슈)
2. `AdaptivePlanner.tsx`에 `BridgePath` 삽입 + 데모 `transfer` 데이터 되살리기
3. `workspace.ts` 검증 로직에 `followup_task` 허용

**Phase 2 (전이 서클 완성)**
4. `FollowupTask` 연결, `recordCompletion()`의 `strategyId` 동적화
5. 일일 캐파 게이지 시각 개선(CSS만)

**Phase 3 (신규 기능)**
6. 반복 할 일 토글
7. 집중 타이머(순수 UI, 저장 없음)
8. 연속 실행일 카운터 + 주간 리뷰 배너

---

## 4. 한눈에 보는 체크리스트
- [ ] `ageUXProfiles.ts` 복구
- [ ] 데모 `transfer` 데이터 복원
- [ ] `BridgePath`를 growth 탭에 삽입
- [ ] `followup_task` 검증 허용
- [ ] `strategyId` 동적 연결
- [ ] `FollowupTask` UI 배선
- [ ] 캐파 게이지 시각 개선
- [ ] 반복 할 일 / 타이머 / streak / 주간 리뷰 배너
