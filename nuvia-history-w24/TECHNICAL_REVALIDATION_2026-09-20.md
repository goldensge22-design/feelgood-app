# NUVIA HISTORY W24 복구 후 기술 재검수

상태: **W24 복구 후 기술 재검수 / 사용자 화면 검토 대기**

W24 동결과 W01 구현은 진행하지 않았다. `625dd10`은 현재 저장소에서 별도로 확보된 기준본일 뿐, 이 문서의 검수 W24 최신 실행본을 가리키지 않는다.

## 고정 환경

- 브랜치: `codex/nuvia-history-w24-recovery`
- 복구 커밋: `706bc0364eb415441b4a8b3acb025bb17b41040d`
- 전용 worktree: `C:\Users\golde\.codex\worktrees\nuvia-history-w24\feelgood-app`
- 앱 루트: `nuvia-history-w24\outputs\NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT`
- 실행 파일: 앱 루트의 `dist-app`
- 포트: `5192`
- 실행 명령:

```powershell
& 'C:\Users\golde\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 5192 --bind 0.0.0.0 --directory 'C:\Users\golde\.codex\worktrees\nuvia-history-w24\feelgood-app\nuvia-history-w24\outputs\NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT\dist-app'
```

다른 프로젝트의 checkout이나 branch 전환은 이 worktree의 파일과 실행 경로를 변경하지 않는다.

## 원본과 복구본

- 원본 경로: `C:\Users\임유하\Documents\Codex\2026-09-17\agents-md-nuvia-history-master-rules`
- 원본은 Git 저장소가 아니었다. 따라서 원본 commit/branch/remote는 없다.
- 실제 실행 소스·빌드·테스트·검수 산출물은 `SOURCE_SNAPSHOT_SHA256.json`에 기록된 468개 파일로 복구했다.
- 새 메인 PC에서 468개 전부의 SHA-256을 다시 계산했다. 누락 0, 변경 0이다.
- 원본의 보호 파일 검사는 `outputs/NUVIA_HISTORY_W24_REASON_EXPRESSION_v1.1.2_RECHECK/PROTECTED_FILES_SHA256.json`의 실제 목록을 사용한 당시 결과다. 당시 보고는 1,147개 변경 0·누락 0이다. 보호 대상 전체 원본 트리는 이번 복구 브랜치에 모두 복사하지 않았으므로 새 메인 PC에서 그 숫자만 재검증했다고 주장하지 않는다.
- 호환 수정 전 복구본과 별도 재빌드 결과는 21개 파일의 경로와 SHA-256이 모두 같았다. 이후 아래 LAN HTTP 호환 수정으로 현재 소스와 `dist-app`은 의도적으로 달라졌다.

## 새 메인 PC에서 다시 실행한 검사

| 검사 | 결과 |
|---|---|
| TypeScript `tsc --noEmit` | 통과 |
| Node 테스트 | 266/266 통과(비보안 context UUID 대체 경로 2개 포함) |
| Vite 6.4.3 프로덕션 빌드 | 통과 |
| 보존 `dist-app` ↔ 재빌드 21개 파일 해시 | 전부 일치 |
| Chrome 데스크톱 1440×900 로드·시작 | HTTP 200, 콘솔 오류 0 |
| Chrome 모바일 390×844 로드·시작 | HTTP 200, 콘솔 오류 0 |
| `new=1` 기존 작품 비삭제 | 기존 IndexedDB run 1개 유지, 새 시작 후 2개로 증가 |
| LAN 주소 자체 응답 | HTTP 200 |

입력 복구, 이유 건너뛰기, 이유와 이야기의 분리, C1/C2 분리, 실제 역사 비교와 이야기 완료는 266개 자동 테스트와 보존된 브라우저 검수 자료에서 확인된다. 이번 새 메인 PC 브라우저 smoke는 앱 시작과 저장 비삭제 경계를 다시 확인했으며, 과거 전체 12개 실제 UI 경로를 새로 수행한 것으로 표시하지 않는다.

## LAN HTTP 실행 오류 수정

- 재현: `http://192.168.0.154:5192`는 브라우저의 비보안 context이므로 `crypto.randomUUID()`가 제공되지 않았고, QA 프로필 생성 단계에서 실행이 중단됐다.
- 수정: ID 생성은 지원 환경에서 `crypto.randomUUID()`를 사용하고, 미지원 환경에서는 `crypto.getRandomValues()`로 RFC 4122 version 4 UUID를 만든다. 프로필·result/event·캔버스·그림·오디오 ID 경로에 같은 함수를 적용했다.
- 실제 LAN 재검증: 데스크톱 1440×900과 모바일 390×844 모두 `secureContext=false`, HTTP 200, intro 표시, 시작 후 `history` 진입, console/page 오류 0이었다.
- 저장 보존: 각 화면에서 첫 run 1개가 남은 상태로 `new=1`을 다시 열었고, 기존 run을 유지한 채 새 resultId로 2개가 됐다. 저장 삭제나 초기화는 수행하지 않았다.

## 실제 라우팅과 QA 파라미터

- `qa=1`: 구현됨. 명시적인 모의 프로필 진입에 필요하다.
- `age=preschool`: 구현됨. 허용된 age band로 검증된다.
- `new=1`: 구현됨. 저장된 작품을 삭제하지 않고 기존 작품 자동 재개만 막는다. 새 시작 시 별도 resultId를 만든다.
- `mission=gutenberg`: 현재 앱은 `app-entry.json`에서 Gutenberg로 고정되어 있어 이 query 값은 읽지 않는다. 오해를 피하려고 현재 링크에서는 제거한다.

현재 같은 Wi-Fi용 주소:

`http://192.168.0.154:5192/?qa=1&age=preschool&new=1`

## HTTPS·마이크 경계

자체서명 HTTPS와 인증서 검증 무시는 사용하지 않는다. 현재 LAN 링크는 HTTP이므로 인증서 오류는 없다. 다만 원격 노트북의 일반 HTTP origin에서는 브라우저가 마이크 API를 제한할 수 있다. 앱은 음성 인식을 지원하지 않으며, 녹음 API를 사용할 수 없을 때 오류 안내와 오디오 파일 가져오기를 제공한다. 실제 LAN 마이크 녹음까지 검수하려면 클라이언트가 신뢰하는 인증서가 있는 HTTPS 호스트가 별도로 필요하다.

## 확인된 제품 범위와 남은 문제

- 유아 이유 입력: 보존 검수본에서 말·그림 우선, 글쓰기는 `다른 방법` 안에 있다.
- 이유 건너뛰기: 핵심 활동 입력 뒤 이유만 deferred로 기록한다. 핵심 사고 행동 자체를 건너뛰지 않는다.
- 음성: 녹음과 파일 가져오기이며 음성 인식·자동 전사를 제공하지 않는다. 읽어주기는 `notProvided`다.
- 완성 흐름: 실제 역사 → 조건·예측 → 핵심 활동 → 내 이야기 → 실제 역사 비교 → 최초 예측 비교 → 결과물 순서다.
- 다국어: 현재 W24 실제 런타임은 한국어만 로드한다. 11개 locale 이름 배열은 선언돼 있지만 다른 언어 번역 파일과 로더는 구현되지 않았다. 다국어 적용은 OPEN이다.
- 새 메인 PC에서 실제 휴대전화, 터치펜, 마이크, Windows 인쇄 대화상자, 전 경로 사용자 화면 검토는 아직 수행하지 않았다.

따라서 현재 판정은 기존 문구를 승계한 “기술 검수 통과”가 아니라 **복구 무결성·자동 검사·대표 smoke 재통과, 사용자 화면 검토 대기**다.
