# P0 변경 전후와 저장 계약

| 항목 | 변경 전 | W24 새 실행 |
|---|---|---|
| RE-P0-01 | 고정 재료 ID reasonRef 필수 | typed/recorded/drawn 실제 입력만 `reason:<UUID>` 레코드 생성. reasonRef는 실제 이유 레코드 ID. 빈 입력·고정 ID 거부 |
| RE-P0-02 | 활동 전체 보류와 이유 건너뛰기 불분명 | 전체 보류 `activityDeferred(scope=activity)` / 실제 활동 유지 + `activityDeferred(scope=reason)` 구분 |
| RE-P0-03 | 고정 이유 카드가 유일한 응답 | 읽기 전용 예측·선택 내용 + 연령별 자유 입력 + 약한 보조 버튼 `이유는 건너뛸게요` |

## 데이터 출처

- `runs[resultId].reasonExpressions` 안에 `ReasonExpressionRecord`를 저장한다. 각 레코드의 reasonRef는 활동 기록 및 reasonExpressionRecorded 이벤트와 연결된다.
- 원문은 record.reasonText만 사용한다. 음성·그림은 media 저장소의 실제 로컬 레코드를 voiceRef/drawingRef로 연결한다.
- cognitiveActionRecorded와 reasonExpressionRecorded 또는 reason-scope activityDeferred는 **하나의 runs 트랜잭션**으로 확정한다. 실패하면 결과 공개 단계로 진행하지 않는다.
- 미디어 파일은 먼저 저장한다. 이후 run 확정 실패 시 미참조 미디어가 남을 가능성은 저장 수명주기 RE-P1-02 OPEN으로 유지한다. 존재하지 않는 참조를 완료 기록으로 확정하지 않는다.
- 이유 건너뛰기: reasonRef·reason record 없음; 실제 핵심 행동은 유지; 이유 source=deferred와 actionEventId/reasonQuestionId만 연결한다.
- 전체 활동 보류: cognitiveActionRecorded와 이유 기록 없음; 기존 scope 없는 보류는 종전 버전 전체 보류로 판독한다.
- `EO-P1-01`에 따라 접근성상 수행 불가의 구체적 사유를 추정하지 않는다.
- 음성: 0초·빈 Blob·잘못된 소유자/조건/버전 차단. 실제 UI 녹음 후 decodeAudioData로 재생 가능 길이를 확인한다. 파일 업로드로 녹음을 대신하지 않는다.
- 그림: 빈 캔버스·잘못된 PNG 차단, Pointer Events 및 touch cancel 시 이전 그림 복구. PNG와 이벤트 payload를 분리한다.
- 이유의 원문·그림·음성은 성장 리포트에만 연결한다. 나의 이야기와 이야기책 6·7·8쪽에 자동 복사하지 않는다.
- report.details.reason 및 reasonStatus는 실제 기록으로만 산출한다. 건너뛰기는 `이번 활동에서는 이유가 기록되지 않았어요`로 표시한다.

## 실행 순서

정규 8단계는 변경하지 않았다. coreActivity 안에서 실제 행동 선택 → 이유 입력/명시적 건너뛰기 → 원자적 활동 확정 → alternateResult 순서다. 최초 예측과 확정 핵심 활동은 결과 공개 이후 수정할 수 없다.

## 버전과 보존

저장 해석이 달라진 새 W24는 missionVersion 5.0.0, 이유 표시 콘텐츠는 contentVersion 3.1.0, appVersion 0.5.0을 사용한다. 이전 기록을 이 버전으로 변환하지 않는다. 다른 5미션의 원본 조건·문구·PASS·실행 콘텐츠는 변경하지 않았다.
