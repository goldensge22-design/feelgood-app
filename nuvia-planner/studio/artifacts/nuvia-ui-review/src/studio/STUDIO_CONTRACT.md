# 내 하루 작업대 — UI 연결 계약

기존 personal 폴더와 이전 주소는 보존한다. 신규 studio 폴더만 수정한다.
메인 에이전트는 studio-model.ts/studio-logic.ts/roadmap.ts/domain/persistence/store 및 검수를 담당한다.
디자인 담당은 StudioApp.tsx, StudioPage.tsx, RoadmapPage.tsx, studio.css만 만든다.
기존 복사한 personal.css와 CardDetail/RunPanel/Activity/MonthPage/ReportPage/GrowthPage/AssessmentPanel/PersonalGuide/ReviewPanel을 재사용하되 원본 personal 폴더는 수정하지 않는다.

## 데이터와 동작
usePersonal() from ./store 반환 {state,student,act,message,error,clearMessage,backup,restore,report,copyPrevious}.
act(Action) -> boolean, 변경은 검증 후 브라우저 저장. state.studio는 선택적이므로 studioOf(state)로 접근.
studioOf(state), placement(state,cardId), studioCapacity(state,day?), noticeCards(state), scheduleProposal(state,day,start) from ./studio-logic.
placement {place:shelf|desk|archive|collection|excluded,tone:blue|purple|orange|sky,archivedAt?,nextDate?,kept?...}
studioOf {selectedId,deskId,archiveReminders,appearance:ivory|navy,sources,experiences,draft?}
studioCapacity -> {done,pending,free,over,total,available}. 완료 계획 분량은 done에 유지. 보관은 예정 포함, 제외는 제외, 월간 분모는 불변.
noticeCards -> Card[]: 현재 앱 접속에서 통지된 보관건. 새로운 통지는 로드 시 한 번 studio.visit로 처리되며 새로고침은 반복하지 않는다.
scheduleProposal -> {cardId,title,startTime,minutes,fixed:boolean}[]; 적용은 studio.schedule 명시적 승인.

액션:
- create {title,subject?,minutes?,date?,kind?} 기존. 신규 기본 진입은 중학생/고등학생/대학·성인 선택 후 과제 한 줄. 새 초등 경로 만들지 않음.
- studio.select {cardId}: 네임택 선택만, 타이머 시작 안 함.
- studio.place {cardId}: 작업대로 이동만, 시작 안 함. 다른 미종료 실행 있으면 거부.
- studio.archive {cardId,flag?,nextDate?}: 실행 중이면 일시정지 후 보관. 깃발은 선택. 목표·범위·단계·타이머 보존.
- studio.take {cardId}: 보관함에서 작업대로. 자동 시작 안 함.
- studio.exclude / studio.restore {cardId}: 되돌릴 수 있는 제외 서랍. 실행 있으면 종료 먼저 요구.
- studio.keep {cardId}: 계속 보관, 같은 보관건 재촉 안 함.
- studio.color {cardId,tone}: 자유 색상.
- studio.settings {archiveReminders?,appearance?}
- legacy 명령은 기존과 동일. run.close completion yes이면 컬렉션, 아니면 미완료 처리 그대로. run.start는 작업대에 올린 카드만 가능. 한 실행만.
- legacy card.move {cardId,direction:-1|1}, card.update {cardId,changes:{startTime,minutes,date,...}}, card.repeat 등 유지.
- studio.schedule {day,start}: 시간 제안 명시적 적용, 이미 지정된 시각은 유지.

목록의 모든 네임택에 실제 과목·과제명·상태, 동일 제목은 과목/시간 또는 짧은 식별로 구분. 겹침/읽기불가 금지. 다수 과제 전체 목록은 details로도 접근. UI 일반 사용자에 내부 QA/번역/build 정보 금지. 검토 관리만 명시적 ?review=1에서.

## 로드맵 (from ./roadmap)
roadSources(state,month?) -> RoadSource[] (자동 수집, 중복 없음)
experienceState(state,e) -> 'ready'|'unconfirmed'|'changed'|'missing'
sourceFacts(source) -> string[] (근거 목록)
roadmapExport(state) -> {text,html} (선택+확인+유효 출처인 문장만, 없으면 throw)
fieldNames Record<ExperienceField,string>
- roadmap.create {sourceId}: 원본에 연결된 경험카드 생성, 중복 클릭으로 복제 안 함
- roadmap.edit {id,fields:{situation?,difficulty?,action?,adjustment?,result?,learning?}}: 사용자 작성/확인; 빈 근거 추정 금지.
- roadmap.refresh {id}: 원본 변경을 명시적 확인, 본인 작성 내용은 보존. 그 뒤 다시 확인 필요.
- roadmap.confirm {id}: 자기 확인이며 외부 수행 검증 아님.
- roadmap.select {id,selected}: 확인한 경험만 초안에 사용.
- roadmap.draft: 선택/확인한 경험의 내용만 문장화. AI 서버 없음, 기록 정리형 초안. 자동 점수/능력 주장 없음.
- roadmap.sentence {id,text?,selected?,confirmed?}: 수정하면 재확인 필요. 선택과 확인이 모두 된 문장만 복사/HTML 내보내기. source 카드/월/field별 근거 링크 표시.

월별 네임택 파일철, 출처 사실/경험 필드/선택 초안/공유 전 미리보기 UI. 민감 메모/생각 보관함 자동 수집 없음. 원본 변경/연결 소실이면 내보내기 차단·재확인 안내. 빈 항목은 '추가할 내용'이지 임의 완성하지 않음.

## 시각·탐색
사용자가 이번에 새 디자인을 명시적 승인했다. 아이보리+네이비 개인 스튜디오, 얕은 무광 받침/노출 네임택, 작은 FeelGood 큰 NUVIA. 색만 아닌 아이콘/제목/상태, 실데이터만, 빈 장식파일/이모지 금지.
탐색 계획/지금/돌아보기/리포트 보존 + 나의 로드맵 별도 메뉴. 기존 이번 달/방법·목표 접근 유지. 모바일 5탭 억지 압축하지 말고 메인 3~4개와 더보기/별도메뉴. 모든 입력·글자 정면, 44px, 포커스, reduced motion, 150~200ms 이하·실행중 반복모션 없음.
