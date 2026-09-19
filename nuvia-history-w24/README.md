# NUVIA HISTORY W24 복구 자료

상태: **W24 복구 후 기술 재검수 / 사용자 화면 검토 대기**

2026-09-20 원본 작업 폴더의 실제 파일을 바이트 단위로 보존한 복구 패키지다. 원본은 Git 저장소가 아니므로 원본 branch/commit/remote/미커밋 상태는 적용되지 않는다. `SOURCE_SNAPSHOT_SHA256.json`에 cwd·확인 결과·전체 원본 해시가 있다.

원격 main `1db4054104d1a4e1ec96033cf92490f686939b74`을 별도 clone하여 전용 복구 브랜치에 추가했다. `625dd10`은 별도 기준본이며, 이 복구본의 최신 검수 W24를 가리키는 커밋으로 사용하지 않는다.

## 파일 구분

- `outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/src`: 최신 실행 소스와 콘텐츠.
- 같은 폴더의 `dist-app`: 보존한 실행 앱 빌드. `dist`: 기존 공통 라이브러리 빌드.
- 같은 폴더의 `public`, `tests`, 설정 파일: 실행 자산·테스트·설정 원본.
- 같은 폴더의 `docs`, `qa`: 당시 검수 이력. 오래된 주소·버전·상태도 원본 그대로 보존했다.
- `outputs/NUVIA_HISTORY_W24_REASON_EXPRESSION_v1.1.2_RECHECK`: 이유 표현 검수 로그·PDF·스크린샷·보호 해시.
- 위 검수 폴더의 `preschool-simplification/REVIEW.md`: 최신 유아 입력 방식 표시 보완 검수. 말·그림 우선, 글쓰기 `다른 방법` 접기.
- 나머지 `outputs` 하위 폴더: 마스터·이유 표현·실행 순서·의미·연간 기준본 및 비교 규칙 참조 사본. 문서 내부 원본 절대 경로는 변경하지 않았다. 동일 폴더명의 복구 상대 경로에서 찾을 수 있다.

## 실행

프로덕션 앱 루트는 `outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/dist-app`이다. 이를 로컬 정적 서버로 제공하여 `/?qa=1&age=preschool&mission=gutenberg&new=1`로 연다. QA 매개변수는 기존 모의 프로필 인터페이스다. 일반 원격 기기에서 녹음·보안 API를 쓰려면 신뢰 가능한 HTTPS가 필요하다.

소스 재빌드는 앱 폴더에서 의존성을 설치하고 `npm run build:app`으로 수행한다. 원본 `node_modules`는 외부 경로를 가리키는 재생성 가능한 junction이므로 포함하지 않았다. 원본에는 lockfile이 없어 이번 복구에서 임의로 생성하지 않았다. 재설치 재현성은 별도 기술 재검수가 필요하다.

## 검수 경계

이번 복구는 원본/복사본/커밋 파일의 SHA-256 동일성 및 경로·빌드 진입 파일 확인을 수행한다. 보존한 과거 검수 로그는 복구 환경에서 새로 실행한 테스트로 표시하지 않는다. 사용자 브라우저 IndexedDB·녹음·그림 등 실사용 저장 기록을 추출하거나 업로드하지 않았다. QA 폴더의 테스트 기록과 시험 resultId는 검수 증빙으로 보존했다.

W01 구현·W24 동결·최종 화면 승인은 수행하지 않는다. 기존 P1/P2 및 실제 기기·터치펜·마이크·Windows 인쇄 미확인은 원본 보고서 상태를 유지한다. 로컬 TLS 개인키·의존성 캐시·브라우저 프로필은 포함하지 않는다. main·교사가이드·PLANNER·D-CAS 기존 파일은 변경하지 않는다.

## 새 메인 PC 기술 재검수

복구 후 독립 재검수 결과와 현재 실행 주소·명령은 [TECHNICAL_REVALIDATION_2026-09-20.md](TECHNICAL_REVALIDATION_2026-09-20.md)에 기록한다. 이 기록은 보존된 과거 검수와 새 메인 PC에서 다시 실행한 검사를 구분한다.
