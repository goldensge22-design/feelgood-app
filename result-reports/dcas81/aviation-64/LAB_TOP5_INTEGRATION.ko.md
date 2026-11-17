# 결과지 TOP5 → 기업LAB → 플래너 연결 계약

## 결과지에서 완료된 부분

`../unpacked/APPLIED_FULL/DCAS_ADULT/dcas-lab-top5-bridge.js`는 실제 결과지 TOP5 순서를 `{label}` 최대 5개와 원본 직무 ID 목록으로 만든다. 점수·이름·학생 ID·로그인 토큰은 URL에 넣지 않는다. 한국어 문구는 독립 locale 파일 `dcas-lab-top5.locales.js`에 있다. 서버가 `window.FeelGoodLabBridge.saveTop5(envelope)`를 제공하지 않으면 화면에 **전송되지 않았음**을 명시하며 성공 버튼을 만들지 않는다. 현재 연결된 GitHub에 운영 `reportV2` 원본이 없으므로 이 파일만으로 실제 서비스 전송이 시작되지 않는다.

`saveTop5` 호출의 입력 예시는 다음과 같다. `topJobs` 배열 순서가 개인 순서이며 `sourceJobIds`는 D-CAS 원본 추적용이다. 이것을 LAB `jobId`로 그대로 보내면 안 된다.

```json
{
  "version": "dcas-lab-top5/2026-11-17.1",
  "testName": "D-CAS",
  "testDate": "2026-08-23",
  "sourceMajor": "항공보안학과",
  "topJobs": [{"label":"항공보안검색요원"}],
  "sourceJobIds": ["9103"]
}
```

## 운영 서버에서 연결할 부분

1. 기존 인증으로 결과지 소유자와 LAB의 동일 사용자·수업을 서버에서 확인한다. 브라우저가 보낸 사용자 ID·수업 ID를 권한 근거로 삼지 않는다.
2. LAB의 현재 공개 직무 카탈로그에서 각 원본 직무명을 **정확한 이름/검증된 alias**로 대조한다. 일치할 때만 LAB `jobId`를 붙인다. 숫자형 D-CAS `sourceJobIds`는 LAB 직무 ID가 아니다. 미연결 항목도 원문 `label`과 순서를 보존한다.
3. LAB `GET /api/lab/results`의 기존 `areas`, `temperament`, `preferences` 등을 읽고 보존한다. LAB `PUT /api/lab/results`는 레코드 전체를 교체하므로 `topJobs`만 담아 PUT하면 기존 학생 정보가 사라진다. 기존 TOP5가 학생 수정본이면 차이를 보여주고 명시적 교체 확인을 받는다.
4. 같은 사용자·수업 권한으로 `PUT /api/lab/results`에 완전한 `SaveMyResultsBody`를 저장한 뒤 `GET /api/lab/results`로 배열 순서·이름을 재확인한다. 성공일 때만 `{ok:true, labUrl:"https://lab.feel-good.io/"}`를 결과지에 돌려준다. 실패는 `ok:false`로 반환하고 결과지 화면을 유지한다.
5. 기업LAB `/api/lab/recommendations`는 등록된 LAB `jobId`가 있는 항목만 회사 관계를 보여준다. 미등록 항목은 원문 이름을 남기고 ‘직무 카탈로그와 연결 안 됨’으로 표시하는 현재 계약을 유지한다.
6. 플래너는 LAB에서 학생이 관심 방향/직무를 **선택·확인한 뒤** 기존 `direction-handoff/1.0`이나 검증된 카드 등록 계약을 통해 연결한다. TOP5 전송만으로 플래너 활동·성취·경험을 자동 생성하지 않는다.

## 수용 검사

- 다른 사용자의 결과지·LAB 수업을 섞지 않는다. 미인증, 수업 권한 없음, 세션 만료는 전송 실패다.
- TOP5 순서와 직무명 5개를 정확히 유지한다. LAB 미등록 직무는 가짜 ID/기업 추천으로 보충하지 않는다.
- 기존 LAB 점수·기질·관심·학생 메모가 TOP5 동기화로 삭제되지 않는다.
- 재전송은 중복 레코드를 만들지 않는다. 실패/타임아웃에서는 성공 표시와 LAB 이동을 하지 않는다.
- LAB에서 학생이 직무를 선택한 뒤 플래너의 승인된 방향/카드로 전달한 경우에만 플래너 기록이 생긴다.
- 운영 서버·기업LAB·플래너의 실제 URL, 인증, 저장, 이동을 한 사용자로 끝까지 확인한다. GitHub 정적 브라우저 QA는 이 통합 검사를 대신하지 않는다.
