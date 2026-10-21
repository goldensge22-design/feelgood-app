# NUVIA PLANNER 통합 B형 UI 후보 패치 · 적용 보류

**기준:** `goldensge22-design/feelgood-app`의 `codex/recover-planner-dcas81`, `defa19d7c7601157b47ddb10cf4d62fdf9bebf82` (`nuvia-planner/source`).
이 버전이 담당 개발자의 최신 결과지 연동본이라는 뜻은 아닙니다.
**이 패치는 새 승인 전 후보입니다. 기존 `NUVIA_PLANNER_UI_patch_defa19d.zip`과 이전 `NUVIA_PLANNER_UI_candidate_defa19d.zip`은 보존하며 적용하지 마세요. 후보들을 연이어 적용하지 마세요.** 디자인 승인과 최신 연동본 수동 검토 전에는 정식 제품·공개 데모·main에 반영하지 않습니다.

## 구성

- `ui-changes.patch`: 기준 소스 대비 UI 변경의 통합 diff
- `files/src/...`: 변경된 파일 및 신규 자산의 최종본
- `manifest.json`: 대상 파일별 기준/변경 SHA-256
- `apply.py`: 전체 파일 사전 검사, 백업, 설치, 중복 적용 건너뛰기, 되돌리기
- `QA_REPORT.md`: 이전 후보 대비 새 후보의 동일 데이터 비교, 클릭 검증, 상태별 구현/한계

`files/src/...`의 경로는 **`nuvia-planner/source/` 아래** 기준입니다. Replit 미리보기 래퍼나 도메인·D-CAS·결과지·BrainMap·교사 가이드 파일은 패치에 들어가지 않습니다. 새 번역문은 한국어이며 다른 언어의 검수 번역 완료를 뜻하지 않습니다.

## 적용 전

1. 담당 개발자는 최신 연동본의 작업을 커밋 또는 별도 백업하고, 자신의 브랜치에서 적용합니다. 공개 데모, main, 운영 URL에 바로 적용하지 않습니다.
2. 압축을 풀고 `python3 NUVIA_PLANNER_UI_candidate_v2_defa19d/apply.py --source /path/to/feelgood-app/nuvia-planner/source --check`를 실행합니다.
3. `CONFLICT`가 하나라도 나오면 **아무 파일도 쓰지 않습니다**. 대상 파일이 기준본에서 달라진 것이므로 담당 개발자가 diff를 검토하고 수동으로 합쳐야 합니다. 강제 복사하지 마세요.
4. 디자인 승인 후, 충돌이 없을 때만 같은 명령에서 `--check`를 빼고 적용합니다. 전체 원본 파일은 `nuvia-planner/nuvia-ui-backup-<UTC>`에 백업됩니다.
5. 같은 패치를 다시 실행하면 이미 바뀐 파일은 건너뜁니다. 저장 공간과 학생 기록은 이 스크립트가 열거나 초기화하지 않습니다.
6. 되돌리기: `python3 NUVIA_PLANNER_UI_candidate_v2_defa19d/apply.py --source /path/to/feelgood-app/nuvia-planner/source --rollback /path/to/feelgood-app/nuvia-planner/nuvia-ui-backup-<UTC>`. 설치 후 수정한 대상 파일이 있으면 되돌리기도 중단됩니다.

## 별도 통합 QA

최신 연동본에서 결과지 진입부터 리포트 저장까지, 백업/복원, 다른 탭과 언어 전환, 모바일 실기기 터치·가상 키보드를 담당 개발자가 재검수해야 합니다. 이 패키지는 기준 커밋에 대한 UI 검토본이며 라이브 제품에 대한 검증이나 배포가 아닙니다.