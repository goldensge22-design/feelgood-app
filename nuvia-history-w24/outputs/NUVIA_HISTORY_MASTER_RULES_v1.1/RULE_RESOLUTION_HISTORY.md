# R2 이슈 최종 상태

| ID | 등급 | 상태 | 변경 전 문제 / 잔여 범위 |
|---|---|---|---|
|C-P0-01|P0|RESOLVED_BY_USER|기존 자유 비교: comparisonKind=history/prediction, 기존 책 role=historyComparison/predictionComparison. 새 15.5는 comparisonKind=history_vs_story/prediction_vs_actual, 15.1·2는 같은 문자열을 pageRole로 명시.|
|C-P0-02|P0|RESOLVED_BY_USER|새15.7의 동일 사용자 문장 P0는 사용자가 두 질문에 독립적으로 같은 글을 남긴 경우까지 포함할 수 있음. 기존 부록은 분류·교정·요약 없이 원문 보존.|
|C-P0-03|P0|RESOLVED_BY_USER|동결 본문과 Gate3은 최초 예측 그림 선택 경로를 허용하고 실제 선택을 원본 예측으로 저장. 새15.2는 선택지 문구를 금지 출처로 명시.|
|C-P0-04|P0|RESOLVED_W24_VERIFIED|질문 ‘종이가 부족하면 책을 어떻게 만들까요?’의 제작 자원은 종이. 승인 활동 응답 gutenberg.c1.response.2는 ‘남은 책이 있는지 확인하기’여서 자원·목표·단계가 달라짐.|
|C-P0-05|P0|RESOLVED_W24_VERIFIED|현재 creation에서 response 재료의 label을 이야기 선택지로 제시하고 선택 시 story.expression의 text에 저장하는 경로가 있음. 새14.9·15.1은 활동/선택지 문구를 자작 이야기로 쓰는 것을 금지.|
|C-P0-06|P0|RESOLVED_W24_VERIFIED|ResultViews는 두 페이지에 같은 c.actualHistoryKey 전체 문장을 사용. 같은 book-page 템플릿에 조건부 블록으로 붙임. 7쪽 story는 text만 출력해 storyDrawingRef 전용 비교 장면이 없고, 새 비교판/타임라인 역할 분리가 없음.|
|C-P1-01|P1|OPEN|새 페이지 허용 목록은 이야기 음성/최초 예측 음성 및 사용자가 쓴 evidenceText를 직접 열거하지 않음. 기존 비교 규칙은 음성/그림과 근거 원문 연결을 허용.|
|C-P1-02|P1|OPEN|행동 목표 동일성을 검사하지만 18필드에 독립 goal ID는 없음. 자원 없는 질문의 resourceId, 자유 표현의 allowedAnswerIds 비적용 표현도 미정.|
|C-P2-01|P2|OPEN|W24 UI/브라우저 PDF는 검수 완료. 나머지 96조건 전수 의미 검수·11언어·실제 휴대기기/터치펜·Windows 인쇄 대화상자/실물 인쇄는 미수행.|

C-P0-01~03은 사용자 결정으로, C-P0-04~06은 W24 구현/검수로 해소했다. P1 2 / P2 1은 OPEN. 기존 연간·Gate3 이슈는 별도이며 이 숫자로 통합 종결하지 않는다.


최종 상태: 2026-09-19 사용자 화면 검토 통과 · 사용자 승인 완료 · v1.1 FINAL BASELINE. [기준본 선언](./00_BASELINE_DECLARATION.md)과 [OPEN 이슈](./OPEN_ISSUES_P1_P2.md)를 함께 읽는다.
