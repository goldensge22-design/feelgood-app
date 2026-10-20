# FeelGood 결과지 통합 작업공간

main에서 개발을 시작할 때는 [main 작업 인계](MAIN_HANDOFF.md)를 먼저 읽는다. 최신 재직자 패치의 서버 데이터·저장 이벤트 연결은 [성인 직무 선택 지시서](dcas81/work-context/DEVELOPER_HANDOFF.md)를 따른다. 기존 [통합 개발자 인계 지시서](DEVELOPER_HANDOFF.md)는 이전 단계의 기록이므로 현재 범위와 상태는 최신 문서를 우선한다.

이 디렉터리는 K-PASS, D-CAS 청소년, D-CAS 성인의 원본·기준본·후속 패치·최종 후보본을 역할별로 분리한다. 저장소 루트의 ZIP은 원본 증거자료이므로 이동하거나 덮어쓰지 않는다.

## 개발자가 사용할 위치

| 결과지 | 현재 개발 후보본 | 원본 기준 |
|---|---|---|
| K-PASS 아동 | `kpass/candidate/` | 저장소 루트 `KPASS_CHILD_FINAL_2026-09-12.zip` |
| D-CAS 청소년 | `dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/` | `dcas/baseline/teen/` |
| D-CAS 성인 | `dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/` | `dcas/baseline/adult/` |

`dcas81/source/`는 GPT Library에서 복구한 81유형 원본 증거본이며 수정하지 않는다. 개발은 `APPLIED_FULL` 후보본에서만 진행한다.

## 디렉터리 역할

```text
result-reports/
├── README.md
├── reports-manifest.json
├── LANGUAGE_COVERAGE.md
├── integration/                 # 서버가 연결할 단일 데이터 계약과 adapter
├── tools/                       # manifest/언어 노출 검증
├── kpass/
│   ├── candidate/               # 2026-09-12 ZIP 압축 해제 후보본
│   └── references/              # 적용 여부를 따로 판단할 과거 패치
├── dcas/
│   ├── baseline/teen/           # 2026-09-12 D-CAS 기준본
│   ├── baseline/adult/
│   └── references/              # 직무 등 선택적 패치
└── dcas81/                      # 복구 원본, 적용 후보, 테스트, QA 문서
```

## 변경 규칙

1. 루트 ZIP과 `dcas81/source/`는 읽기 전용 증거본이다.
2. `baseline/`은 비교용이며 직접 수정하지 않는다.
3. 실제 수정은 `candidate/` 또는 `dcas81/unpacked/APPLIED_FULL/`에서 한다.
4. `references/`의 패치는 자동 적용하지 않는다. manifest 상태와 검수 조건을 먼저 확인한다.
5. 언어 선택기에는 `fullReportLocales`만 노출한다. `partial` 또는 `layer-only` locale를 사용자에게 노출하지 않는다.
6. 서버는 결과 문장이나 유형명을 만들지 않고 `integration/` 계약의 원점수·신원·locale만 전달한다.
7. `node result-reports/tools/validate-reports.mjs` 통과 후에만 후보본을 전달한다.

## 현재 중요한 제한

- 세 결과지 후보본은 `locales/manifest.json`에 등록된 15개 언어를 지원한다. 크메르어와 몽골어를 포함하며 기존의 한국어 한정/12개 언어 단계 이후 패치가 반영되어 있다.
- 신규 번역은 Google 기계 번역 기준이다. 원어민 수준의 전문 용어 검수 완료를 의미하지 않는다.
- 성인 재직자 모드는 직무 선택과 점수별 지원 방법을 제공하지만, 495개 직무의 신규 PASS 적합도 규준이나 채용 점수는 생성하지 않는다.
- GitHub main의 개발 소스와 실제 운영 서버 배포는 별개다. 실제 데이터·저장 API·운영 화면 연결 후 staging QA가 필요하다.

패치 적용 계보는 `PATCH_CATALOG.md`, 세부 언어 범위는 `LANGUAGE_COVERAGE.md`, 서버 연결은 `integration/RESULT_REPORT_INTEGRATION.md`를 따른다.
