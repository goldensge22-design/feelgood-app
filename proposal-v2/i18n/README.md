# FeelGood 제안서 다국어 관리

`proposal-v2 (1).html`의 화면 문구는 이 폴더에서 언어별로 관리합니다. HTML 안에 번역 사전을 다시 넣지 않습니다.

## 기존 번역 수정

1. 수정할 언어 파일을 엽니다. 예: 캄보디아어는 `km.js`, 영어는 `en.js`입니다.
2. 키 이름은 변경하지 않고 오른쪽 번역 값만 수정합니다.
3. `manifest.js`의 `assetVersion` 값을 올립니다. 브라우저 캐시에 이전 번역이 남는 것을 방지합니다.
4. 저장 후 저장소 루트에서 `node scripts/check-proposal-i18n.mjs`를 실행합니다.

## 새 언어 추가

1. `en.js`를 `<언어코드>.js`로 복사합니다.
2. `window.LANG.en`을 `window.LANG.<언어코드>`로 변경하고 789개 값을 번역합니다.
3. `manifest.js`의 `languages` 목록에 코드, 표시명, 글자 방향, 외부 결과지 언어를 한 줄 추가합니다.
4. `assetVersion`을 올리고 QA 명령을 실행합니다.

`reportCode`는 연결된 결과지·대시보드가 지원하는 언어 코드입니다. 지원하지 않으면 `en`을 사용합니다. 아랍어처럼 오른쪽에서 왼쪽으로 쓰는 언어만 `dir`을 `rtl`로 지정합니다.

## 화면에 새 문구 추가

HTML 요소에 `data-i18n="새_키"`를 지정하고 모든 언어 파일에 같은 키를 추가합니다. 속성은 `data-i18n-aria-label`, `data-i18n-title`, `data-i18n-alt`, `data-i18n-placeholder`를 사용합니다.

K-PASS, D-CAS, PASS, NUVIA 제품명은 번역하지 않습니다. 배포 전 `?i18nqa=1`을 주소에 붙이면 브라우저에서도 누락·잔존 한국어를 검사할 수 있습니다.
