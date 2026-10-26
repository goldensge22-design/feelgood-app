# D-CAS ENTERPRISE LABS — 인사담당자 채용 실무 가이드

개발자는 [실행·배포 안내](dcas-guide/README_KO.md)부터 확인하세요. 이 디렉터리는 Replit에서 제작한 전자책 전체 소스의 전달본입니다. 기존 기업 대시보드와 독립된 pnpm 워크스페이스입니다.

## 전달 구성

- `dcas-guide/artifacts/dcas-quick-guide/`: 전자책 UI, 15개 언어 본문 및 검증 스크립트
- `dcas-guide/lib/`, 루트 설정·잠금 파일: 원본 공유 의존성과 재현 가능한 설치 정보
- `dcas-guide/release/`: 루트 및 `/dcas-guide/` 하위 경로용 정적 빌드
- `dcas-guide/qa/dcas-guide/`: 언어·화면·인쇄·동작 QA 보고서와 실행 기록
- `dcas-guide/handoff/verification/`: 깨끗한 Linux 환경 설치·빌드 및 240개 화면 상태 재확인 기록
- `dcas-guide/SHA256SUMS`: 전달 파일 무결성 목록

## 확인된 상태와 제한

Replit 앱: https://replit.com/replid/5c2c220c-8dbb-40d4-8821-d50c8255791d

배포 주소: https://brave-complete-dimension.replit.app

2026-10-27(KST) 사용자 승인 후 공개 범위를 **Public**으로 전환하여 재게시를 완료했습니다. 인증 쿠키 없이 공개 URL에 요청하여 로그인 페이지로 이동하지 않는 HTTP 200 및 전자책 HTML 응답을 확인했고, 공개 사이트에서 한국어 표지와 1장·6장 탐색을 확인했습니다. 공개 URL: https://brave-complete-dimension.replit.app/?lang=ko#cover . 기존 원본 QA의 접근 제한 기록은 공개 전환 이전 검사 시점의 결과입니다.

전자책 15개 언어 구조 검사와 Replit의 화면·PDF QA 기록을 포함합니다. 외국어 14종은 AI 검토 초안이며 원어민 검수 완료가 아닙니다. 실제 운영 대시보드의 로그인 후 자료 연결·서버 저장, Chromium 이외 브라우저, 물리 프린터는 미검증입니다.

대용량 화면·PDF 원본 1,042개는 Replit Library의 별도 증거 패키지 9개에 있으며 이 Git 브랜치에는 포함하지 않습니다. 소스에 포함된 증거 목록·해시로 대응할 수 있습니다. 보고서만 전달한 것이 아니라 편집 가능한 전자책 소스와 정적 빌드가 포함되어 있습니다.

## 원본 추적

- 패키지 ID: `7690dac9b43698ac`
- 원본 소스 ZIP SHA-256: `71bf27fb05f8d45bd41ec7c528323d7d70202d2a2937a87793ff60dcf002d78c`
- 원본 소스 ZIP 크기: 2,768,535 bytes
- GitHub 전달용 별도 브랜치: `codex/enterprise-ebook-guide`

소스 ZIP의 파일을 그대로 보존하며 이 안내만 외부에 추가했습니다. 원본 소스·설정·번역을 수정하지 않았고 기존 main 및 서비스 배포본도 변경하지 않았습니다. 실제 사이트에 적용하기 전 개발자는 대상 호스트의 경로·외부 글꼴·CSP 및 접근 권한을 확인하세요.
