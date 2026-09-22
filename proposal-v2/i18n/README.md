# FeelGood 제안서 다국어 관리

`proposal-v2 (1).html`의 화면 문구는 이 폴더에서 언어별로 관리합니다. HTML 안에 번역 사전을 다시 넣지 않습니다.

## 기존 번역 수정

1. 수정할 언어 파일을 엽니다. 예: 캄보디아어는 `km.js`, 영어는 `en.js`입니다.
2. 키 이름은 변경하지 않고 오른쪽 번역 값만 수정합니다.
3. `manifest.js`의 `assetVersion` 값을 올립니다. 브라우저 캐시에 이전 번역이 남는 것을 방지합니다.
4. 저장 후 저장소 루트에서 `node scripts/check-proposal-i18n.mjs`를 실행합니다.

## 새 언어 추가

1. `manifest.js`의 `languages` 목록에 코드, 표시명, 글자 방향, 외부 결과지 언어와 대시보드 언어를 추가합니다.
2. 아래 동기화 도구로 누락 key를 확인합니다.
3. 승인된 번역 초안을 만들 때만 `--translate-missing`을 사용합니다.
4. `assetVersion`을 올리고 QA 명령을 실행합니다.

```powershell
node proposal-v2/scripts/sync-locales.mjs --locales=ko,en,ja,zh,mn,th,vi,ar,ru,km,zh-TW,es,fr,it,az
node proposal-v2/scripts/sync-locales.mjs --locales=es,fr --translate-missing
```

동기화 도구의 기본 원칙은 **누락 key만 추가**하는 것입니다. 기존 검수 번역은 다시 생성하거나 덮어쓰지 않습니다. 한국어 원문 또는 key 의미가 실제로 바뀐 경우에만 영향을 받는 key를 명시합니다.

```powershell
node proposal-v2/scripts/sync-locales.mjs --locales=es,fr --translate-missing --overwrite=case_title,case_desc
```

자동 번역 결과는 초안이며 배포 전 교육 용어와 자연스러움에 대한 사람 검수가 필요합니다. 제품명과 PASS 영역명은 스크립트에서 보호합니다.

`reportCode`는 연결된 기존 결과지가 지원하는 언어 코드이고, `dashboardCode`는 학교 데이터 대시보드 언어 코드입니다. 지원하지 않는 기존 결과지는 `en`을 사용합니다. 아랍어처럼 오른쪽에서 왼쪽으로 쓰는 언어만 `dir`을 `rtl`로 지정합니다.

## 화면에 새 문구 추가

HTML 요소에 `data-i18n="새_키"`를 지정하고 모든 언어 파일에 같은 키를 추가합니다. 속성은 `data-i18n-aria-label`, `data-i18n-title`, `data-i18n-alt`, `data-i18n-placeholder`를 사용합니다.

K-PASS, D-CAS, PASS, NUVIA 제품명은 번역하지 않습니다. 배포 전 `?i18nqa=1`을 주소에 붙이면 브라우저에서도 누락·잔존 한국어를 검사할 수 있습니다.
