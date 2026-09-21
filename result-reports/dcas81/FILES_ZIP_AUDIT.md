# `files.zip` 검토 기록

검토일: 2026-09-21  
검토 대상: 저장소 루트의 `files.zip`  
크기: 13,382 bytes  
SHA-256: `F5D17FF5129D77A5E5B827462396FCAFD1033DBABECF8D772B0E05AFC3067DBE`

## 결론

`files.zip`은 D-CAS 청소년/성인 전체 결과지 파일이 아니다. 성인 결과지의 **항공보안학과 직무 10개를 추가·교체하는 런타임 패치**이며, 현재 상태 그대로는 캄보디아어 전체 결과지를 만들 수 없다.

또한 이 패치의 `pass_profile`은 `attr_source: "estimated"`, `attr_confidence: 0.5`인 1차 추정치다. 전문가 검수 전 운영 점수 판정 근거로 확정하면 안 된다.

## ZIP 내부 파일

| 파일 | 크기 | SHA-256 | 역할 |
|---|---:|---|---|
| `PATCH-README.md` | 6,338 | `F5E34332C1BDA6749C594AC2EA8952C8B23EF4C72FFA776E9C42F3E0B1E8B856` | 적용 순서와 제한사항 |
| `dcas-jobs-extra.v2.patch.js` | 14,786 | `F4F67FEF640FD75B8530CA1703CAFAF3019E05B0455B4953D0FC24B2F14E22F5` | 기존 항공보안 직무 4개를 10개로 교체 |
| `dcas-job-i18n-bank.js` | 10,001 | `80DD5F857C6CACE0F728DC2068C01C4251834C6149641C7951E470ABA0C0F8BF` | 직무명 10개와 학과명 1개의 11개 언어 라벨 |
| `dcas-job-engine.v2.patch.js` | 2,860 | `D231D45908A5A6ACB9D2A91FCFECD191B885BB6A447137F808107A05CABBA795` | 직무 엔진 호환 패치 |

## 다국어 범위

직무명/학과명에만 `ko`, `en`, `ja`, `zh`, `es`, `ru`, `vi`, `th`, `ar`, `it`, `az`가 있다. `km`은 없다. 직무 추천 이유문과 결과지 본문은 여전히 한국어 하드코딩이다.

따라서 다음을 구분해야 한다.

- 재사용 가능: 직무 라벨 getter와 `setLang(lang)` 패턴
- 별도 추가 필요: `km` 직무명/학과명, 직무 추천 이유, 화면 제목·설명·접근성 문구, 인쇄/PDF 문구
- 별도 검수 필요: 추정 직무 프로파일 10건

## 현재 최종 후보본과의 관계

이 ZIP은 원본 증거자료로 유지한다. 이번 81유형 최종 후보본에 자동 병합하지 않는다. 적용할 경우에는 별도 개발 브랜치에서 다음 순서를 지킨다.

1. 전문가가 10개 직무의 `pass_profile`과 근거를 검수한다.
2. `dcas-job-i18n-bank.js`에 `km`을 추가하고 현지어 검수를 기록한다.
3. 직무 추천 이유를 stable translation key와 named placeholder로 분리한다.
4. 성인 실제 결과지에만 스크립트를 연결한다.
5. 기존 학과 및 직무 회귀 테스트 후 반영한다.

## 함께 발견된 다른 ZIP

저장소 루트의 `files (21).zip`과 `files (26).zip`에는 `report-i18n.json`이 있으나, 전체 결과지 번역이 아니다. `page05`, `page07`, `page08`, PASS 축 및 흥미유형 일부만 `ko/en/ja/zh-CN` 네 언어로 제공하는 부분 자료다. 이를 전체 결과지 locale로 오인하면 안 된다.
