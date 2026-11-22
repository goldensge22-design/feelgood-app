# 수업용 AI 보강 신규 검증 기록 — 2026-11-15

**최신 추가분:** 다중 서버 공유 PostgreSQL 경로의 결과는 ZIP `qa/shared-qa.json`, `qa/shared-targeted-retest.json`, `qa/shared-browser.json`, `qa-summary.json`이다. 아래 기존 메모리 큐·실제 모델 소수 호출은 앞 단계의 역사적 기록이며 이번 공유 경로 QA로 합산하지 않는다. 이번 추가분 실제 AI 호출은 0회다.

## 코드와 범위

이 보고서는 최신 Replit 작업본의 대기·중복 비용 방지·원문 보존·오류 구분 보강을 대상으로 한다. 최종 커밋/작업트리와 실행 소스 지문은 인계 ZIP `manifest.json`, 파일별 무결성은 `ALL_FILES_SHA256.txt`에 기록한다. 마지막 수정 뒤 API/웹 타입검사·빌드를 확인한다. 이전 45화면/22개 한국어 QA는 이번 부하 시험 증거로 재사용하지 않는다.

## 실제 AI와 모의 공급자 구분

- 실제 관리형 `gpt-5.6-luna`는 합성 기록만 사용했다. 처음 질문 성공·문장 JSON 형식 실패 뒤 엄격한 JSON Schema 응답을 적용했다. 문장 1회, 질문 1회만 추가 검사하여 총 공급자 시도 4회다. 실패 기록은 `qa/live-model.json`, 개선 후는 `qa/live-model-retest.json`, `qa/live-model-coach-final.json`에 남겼다.
- 최종 질문·짧은 문장 후보는 각각 성공했고 같은 계정/내용 재요청은 캐시로 성공했다. 이 호출은 운영 BYOK나 `/career` 배포 검증이 아니다.
- 이후 사용자 지시에 따라 명시적 BYOK 설정/모델 오류 분기를 추가했다. 기존 관리형의 모델·선택 자료·엄격한 출력 형식·토큰 상한은 그대로다. 이 추가 분기는 단위/모의 검사로 검증했으며 **추가 실제 공급자 호출은 하지 않았다**. BYOK 모델 실제 성공을 주장하지 않는다.
- 모의 부하 시험은 비용 없는 공급자 함수로 실행하며, 55개의 서비스 소유자 식별자를 사용한다. 실제 Clerk 사용자 55명/브라우저 55개/운영 API 트래픽을 만든 검사가 아니다.

## 재현 명령

프로젝트 루트에서:

```sh
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/api-server/src/lib/career-ai-queue.test.ts
pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/src/lib/career-ai-classroom-load.ts
pnpm --filter @workspace/scripts exec tsx --test ../artifacts/nuvia-career/src/lib/ai-capacity-messages.test.ts
pnpm --filter @workspace/scripts exec tsx --tsconfig ../artifacts/nuvia-career/tsconfig.json src/nuvia-ai-contract-check.ts
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/nuvia-career run typecheck
pnpm --filter @workspace/api-server run build
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career run build
python scripts/src/package-nuvia-classroom.py
```

`career-ai-live-check.ts --live`는 실제 비용이 발생하므로 위 재현 명령에 넣지 않는다. 별도 승인이 있을 때만 실행한다.

## 모의 부하/경계 결과

- `mock-load-byok-final.tap`: 16개 검사. 55개 계정 서로 다른 요청, 중복 클릭/진행 중 병합/성공 캐시, 계정 격리, 결과 객체 변경의 캐시 오염 방지, 로컬 제한/큐 포화/공급자 일시 제한/명시 quota/시간초과/취소/전체 시도 상한/목적별 자료 최소화/관리형과 BYOK 설정 분리/모델 오류 분류.
- `realistic-load.json`: 실제 시계로 요청당 **12.5초** 모의 생성. 같은 계정 동일 요청 55건 병합과 서로 다른 계정/자료 55건을 분리한다. 큐 대기/전체 경과 각각 p95·최대·합계, 실패수·공급자 호출수·병합수·시험 환경을 기록한다. 실제 생성 성공 소수에서 관찰한 약 6~13초를 참고한 보수적 모의 지연이며 공급자 성능 보장이 아니다.
- 같은 파일의 OS 프로세스 3개 시험은 **중복 방지/전체 상한이 프로세스·재시작을 넘어서 유지되지 않음**을 확인하는 운영 제약 검사다. 공유 큐/영속 idempotency가 없으므로 다중 서버 보장 통과로 표시하지 않는다. 계정별 격리는 단일 프로세스에서도 유지되며 공유 계정 캐시는 만들지 않았다.
- 15개 언어 신규 오류/개인정보 안내의 비어 있지 않음·한국어 대체 없음은 `locales.tap`에서 확인한다. 화면 검증/원어민 검수와 다른 검사다.

## 브라우저

실제 Clerk 합성 테스트 계정의 작성 화면에서 모든 AI POST를 모의 응답/지연으로 가로채 **추가 실제 AI 전송 없이** 확인했다. PC1440·태블릿768·360px에서 오류 시 본문 유지, 자동 재요청 없음, 취소, 대기 표시, 편집/저장/새로고침의 AI 호출 0, 언어 전환/RTL, 버전 저장·TXT 내보내기를 확인했다.

첫 검사에서 대기열 포화와 공급자 혼잡 안내가 같았고 비일시적 입력/로컬 제한에도 재시도 버튼이 노출됐다. 둘 다 수정하고 같은 테스트 브라우저에서 해당 부분만 재검사한다. 최초 실패 보고서도 삭제하지 않는다. 최종 구체 결과·미실행은 `qa/browser/`와 `qa-summary.json`을 본다. 본문이 바뀌면 이미 진행 중 요청을 취소하며, 늦은 응답이 다른 초안에 적용되는 것은 기존 소스 지문 검사를 유지한다.

## 별도 미검증·운영 차단

이전 단계의 이 문서 상단 결과는 메모리 큐 버전의 과거 근거다. 공유 조정 추가분의 최신 실행 결과는 인계 ZIP `qa/shared-qa.json`과 `qa/shared-browser.json`을 확인한다. 기존 실패를 최신 통과로 재포장하지 않는다.

이번 Agent의 실제 운영 BYOK 호출/모델·정확한 달러 단가와 청구, `/career` 프록시 원본/배포 버전, 운영 게이트웨이, 운영 SSO·결과지·플래너·LAB·계정별 영구 저장, Word/한컴 직접 열기, 원어민 검수는 미검증이다. 공유 DB 조정은 이번 개발 PostgreSQL에서 실제 독립 프로세스와 모의 공급자로 새로 검사한다. 운영 URL에 재배포하지 않았다.

사용자가 운영 키 조직 Personal, 승인된 5달러 충전 뒤 질문 1회·문장 후보 1회·검토 후 V2 저장 성공을 확인했다(2026-11-15). 이전 잔액 0/조직 미확인 관찰은 현재 상태 설명이 아니며, Agent가 직접 운영 호출을 검사한 결과와 구분한다.

## 공유 조정 추가분 재현

```sh
# 기존 개발 DB에 Drizzle 소스의 추가 테이블 3개만 적용. 운영 DB에 실행하지 않음.
pnpm --filter @workspace/db run push
# 기존 scripts 패키지의 tsx 사용: api-server 패키지에는 tsx 실행 파일이 없음.
pnpm --filter @workspace/scripts exec tsx ../artifacts/api-server/src/lib/career-ai-shared-qa.ts
```

시험은 무작위 `qa-shared-*` 범위에 합성 원장만 만든 뒤 해당 범위만 삭제한다. 원래 사용자/경험/버전 테이블은 건드리지 않는다. 실제 AI 호출은 0회다. 55개 동일 계정 요청과 55개 서로 다른 계정·내용 요청은 별도 시나리오다. 후자는 독립 OS 프로세스 3개, 호출당 12.5초 실제 시간 지연, 실제 PostgreSQL을 사용하며 55개 운영 브라우저/운영 OpenAI 부하가 아니다.
