# 실제 UI 12경로

| 조건 | 내부 연령 경로 | 뷰포트 | 이유 입력 | resultId | 정규 단계 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| W24-C1 | preschool | 1440x900 | drawn | ad94f41e-257c-4deb-bee9-e16821debbbd | 8/8 | 통과 |
| W24-C2 | preschool | 390x844 | deferred | e99ba108-84e9-4eac-b457-e9e7ffd5f7ef | 8/8 | 통과 |
| W24-C1 | elementary-low | 390x844 | recorded | 181dcdd5-89ec-4734-82d2-318150adb67c | 8/8 | 통과 |
| W24-C2 | elementary-low | 1440x900 | typed | 87afec72-0603-4e99-aa45-134a6b24b725 | 8/8 | 통과 |
| W24-C1 | elementary-high | 1440x900 | typed | 98a145f7-fa9a-4ffe-8d9a-ac48975d00a5 | 8/8 | 통과 |
| W24-C2 | elementary-high | 390x844 | deferred | 61f9c43c-0056-462c-9999-26a6aa901429 | 8/8 | 통과 |
| W24-C1 | middle-school | 390x844 | typed | a82672a9-f674-4f9c-b802-b2d96458941e | 8/8 | 통과 |
| W24-C2 | middle-school | 1440x900 | deferred | e7692d21-6238-4cc7-816f-1f51ac6ff3ad | 8/8 | 통과 |
| W24-C1 | high-school | 1440x900 | typed | 7ac79231-de80-4eb5-ba4b-e497a2f32e97 | 8/8 | 통과 |
| W24-C2 | high-school | 390x844 | deferred | 83854b8c-3f00-41b5-83db-551f8dd16062 | 8/8 | 통과 |
| W24-C1 | adult | 390x844 | typed | f9afe8b1-5db4-47b4-b9de-945e6f9fd6fa | 8/8 | 통과 |
| W24-C2 | adult | 1440x900 | deferred | f6707cfd-830e-4f03-a336-b22599d96fbe | 8/8 | 통과 |

내부 연령은 검수표에만 표기한다. 96/96 정규 단계는 이벤트 canonicalStage 순서와 실제 화면 이동을 함께 검수했다. 원문·그림·음성 참조·두 비교 기록은 각 `*-run.json`에 보존했다.

12경로 모두 이유 화면에서 새로고침하여 임시 입력·모드를 복구하고, 저장 직전 네트워크를 차단했다. 저장 후 기존 로컬 자산으로 결과 화면이 이어짐을 확인했다. 인터넷 연결 없는 최초 설치·빈 캐시 상태에서의 앱 다운로드까지 검수한 것은 아니다.
