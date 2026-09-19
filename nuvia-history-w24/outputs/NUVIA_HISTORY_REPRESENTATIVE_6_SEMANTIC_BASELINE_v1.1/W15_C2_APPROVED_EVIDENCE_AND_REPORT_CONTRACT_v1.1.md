# W15-C2 승인 단서와 리포트 계약

| 내부 ID | 사용자 표시 | 근거 역할 | 출처·위치 | 표시 경계 |
|---|---|---|---|---|
| marker | 후나인이 말했어요 | 번역자의 설명과 주변 본문을 구분하는 시작 표지 | S1324-04 / Adding supplemental information: translation notes, 둘째 문단; qāla Ḥunayn 표지 설명 | 실제 글 단서로 제시; 내부 ID만 단독 노출 금지 |
| reading-note | 이 글은 여러 가지로 나누어 읽을 수 있어요 | 한 구절을 여러 방식으로 나누어 읽을 수 있다는 번역 설명 | S1324-04 / 같은 절, Galen Commentary on Book 2 of the Epidemics 예시 도입과 첫 번역 인용 | 쉬운 한국어 단서로 제시; 실제 필사본 이미지라고 표시 금지 |


`manuscript-image-held`는 제외한다. 직접 확인하지 않은 실물 필사본 이미지·folio를 단서·배경·alt·TTS·보고서에 넣지 않는다.

분류 칸은 `확인할 수 있음 / 가려져 있음 / 현재 자료로 알 수 없음`이다. 칸 이름을 evidenceItem으로 저장하지 않는다. 화면 evidenceItemIds는 `marker`, `reading-note` 두 개뿐이다. 일부 가림은 게임의 변경 조건이며 실제 사료의 훼손·원래 누락이 아니다.

성장 리포트에는 실제 `categoryByItem`, 실제 이유 입력, `uncertainItemIds` 또는 deferred, 도움 이벤트만 표시한다. `hintRequested`와 자동 `supportApplied`를 구분한다. “추측으로 채우지 않았다 / 정확하게 분류했다 / 신중하게 판단했다 / 근거를 올바르게 이해했다”는 문장을 생성하지 않는다. 정답 키·정확도·AI 평가를 추가하지 않는다.
