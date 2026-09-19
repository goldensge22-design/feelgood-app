# R2 후보 → 최종 기준본 변경 이력

## 허용된 변경

- 최상위 상태: R2 CANDIDATE → FINAL BASELINE.
- 기준본 이름·버전 v1.1·승격일·후보/최종/다음 구현 참조 경로 추가.
- DEC-01~05 상태: approvedApplied → finalBaselineApproved.
- 72개 agePathContent의 version, approvalStatus, candidateVerdict를 최종 승인 메타데이터로 변경.
- 72개 missionFlows의 approvalStatus를 최종 승인 상태로 변경.
- 최종 선언·OPEN 이슈·차이 검수·참조 경로·무결성 문서 신규 작성.

## 변경하지 않은 내용

조건·실제 역사·출처·인과 범위·가상 가능성, 질문·안내·선택지, 18개 의미 필드, 연령 표현, PASS·인지 행동·계약, 화면 의미·이벤트·리포트·책7/8·resultId 계약, W15 단서와 금지 문구를 변경하지 않았다.

후보 JSON과 최종 JSON에서 허용 메타데이터를 제거한 의미 투영을 재귀 비교했다. 필드 차이 0, 의미 투영 SHA-256 일치다. 576단계 최종 CSV는 후보 파일을 바이트 그대로 복제했다.
