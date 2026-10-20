# 독립 작업대 후보 · 적용 전 확인 / 되돌리기

## 기준
- 작성 Git HEAD: `1639266726ebd4ad7affa199af83c43a8449e3bf`.
- 이 SHA 외에 작업 시작 당시 이미 존재하던 개인 월간 미커밋 보강을 보존해 사용했습니다. **SHA만 같다고 소스가 동일한 것은 아닙니다.**
- 최신 개발자 결과지 연동본 `defa19d`와 이 후보의 실제 병합·호환 검증은 하지 않았습니다. 예전 패치의 호환성 명칭을 이 패치에 승계하지 않습니다.
- 패치는 현재 Replit의 React/Vite 폴더 구조에 대한 **추가 후보**입니다. GitHub 원본 구조·버전이 다르면 먼저 개발자 수동 검토가 필요합니다.

## 변경 범위
`FILES.txt`가 정확한 목록입니다.
- 신규 `studio.html`, `src/studio-main.tsx`, 독립 `src/studio/` 폴더.
- 기존 Vite 입력 목록에 `studio` 한 항목 추가. 기존 진입점은 유지합니다.
- QA 스크립트·사용/검수 문서.
- 원형 `src/official`, `src/enhancement`, `src/personal`, 기존 결과지·서버·번역·과거 ZIP은 패치하지 않습니다.
- 패키지 추가·DB 변경·서버 계약 변경·인증/배포/알림 서비스 설정 없음.

## 저장 경계
- 새 후보 저장 키: `nuvia:studio:v1:personal`, 검토 모드 `:review`.
- 이전 개인 월간 키를 자동 교체하거나 초기화하지 않습니다. 빈 후보에서 ‘이전 기록 복사’를 명시적으로 승인했을 때만 복사하고 원본은 남깁니다.
- 개인 백업은 `NUVIA_STUDIO_BACKUP` JSON. 같은 후보 공간만 복원 가능하며 보고서나 동기화 파일이 아닙니다.
- 되돌리기 전에 새 후보에서도 **내 기록 백업**을 받아 보관하세요. 키를 수동 삭제하지 마세요.
- 백업은 평문 개인정보를 포함할 수 있습니다. 학생 개인 백업을 교사·기업·공용 채널에 올리지 마세요.

## 안전하게 확인
운영본이 아니라 별도 검토 작업 폴더/브랜치에서만 진행하세요. 아직 main merge·push·운영 배포 승인이 아닙니다.

1. 기존 변경과 개인 기록을 별도 보존하고 `git status`로 미커밋 내용을 확인합니다. 강제 reset/clean 하지 않습니다.
2. ZIP을 **저장소 밖**에 풉니다. 소스 전체를 기존 폴더에 덮어쓰지 않습니다.
3. 현재 저장소 루트에서 아래 사전 확인을 실행합니다.

```
python /압축푼폴더/preflight.py
git apply --check /압축푼폴더/changes.patch
```

사전 확인은 기존 파일 해시·Vite 기준·신규 경로 충돌을 확인합니다. 하나라도 없거나 다르면 **중단**합니다. 파일을 억지로 맞추거나 `--reject`, `--3way`, 강제 덮어쓰기로 진행하지 않습니다.

4. 최신 결과지 계약의 검사 종류·단위·정규화·지원/강점 순서와 원형 타이머·반복·HISTORY·저장/번역 통합 지점을 개발자가 대조합니다.
5. 대조와 사용자 승인 후에만 검토 브랜치에서 `git apply changes.patch`로 적용합니다.
6. 타입 검사·build·QA 스크립트와 실제 브라우저 흐름을 다시 검수합니다. 현재 Replit 통과가 다른 소스·브라우저·운영 서버 통과를 대신하지 않습니다.

현재 구조의 재검수 명령 예:
```
pnpm --dir artifacts/nuvia-ui-review typecheck
PORT=5173 BASE_PATH=/ pnpm --dir artifacts/nuvia-ui-review build
node node_modules/.pnpm/tsx@*/node_modules/tsx/dist/cli.mjs tools/nuvia-studio/check.ts
node tools/nuvia-studio/browser.mjs
node tools/nuvia-studio/activity-browser.mjs
```
브라우저 검사는 실행 중인 이 Replit 미리보기와 Chromium을 사용하는 합성 검수입니다. 실제 사용자 환경에서 기록을 지우며 실행하지 마세요.
미리보기 workflow는 `artifacts/nuvia-ui-review: web`입니다. 서버가 꺼지면 이 workflow를 다시 실행해야 개발 미리보기가 열립니다.

## 되돌리기
1. 새 후보의 내 기록 백업, 원래 미커밋 변경 및 적용 전 상태를 다시 보존합니다.
2. `git apply -R --check /압축푼폴더/changes.patch`로 역패치 가능 여부만 확인합니다.
3. 이후 수정이 있거나 충돌하면 중단합니다. 무조건 삭제·초기화하지 않습니다.
4. 개발자 확인 후 검토 브랜치에서만 `git apply -R changes.patch`로 **이번 추가분만** 제거합니다.
5. 이전 `personal-monthly.html`로 돌아갑니다. 새 저장 키와 백업 파일은 삭제하지 않습니다. 복원하려면 후보 화면을 다시 확보해야 합니다.

ZIP에는 되돌리기를 자동 실행하는 코드가 없습니다. 정식 운영 URL 교체·배포·main 병합·push는 별도 승인 사항입니다.
