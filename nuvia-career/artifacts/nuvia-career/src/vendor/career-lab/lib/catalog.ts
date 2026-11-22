// 일반 탐색용 안내입니다. 특정 대학의 교육과정·입시 정보가 아니며, 대학별 정보는 학생이 공식 출처에서 직접 확인해야 합니다.
export type Tier = 'current' | 'expand' | 'future';
export const tierLabel: Record<Tier, string> = { current: '지금 있는 분야', expand: '넓혀 보는 분야', future: '미래 아이디어' };

export interface Role { id: string; name: string; desc: string; tryIt: string }
export interface Field {
  id: string; name: string; tier: Tier; keywords: string[]; summary: string; whoseProblem: string;
  learn: string; majors: string[]; roles: Role[]; tryIt: string;
}
export interface Major {
  id: string; name: string; en: string; fields: string[]; countries: string[]; questions: string;
  study: string[]; projects: string[]; style: string; hsSubjects: string[]; fusion: string; competencies: string[]; tryIt: string;
}

export const COUNTRIES = ['한국', '미국', '영국', '캐나다', '호주', '일본', '독일', '네덜란드', '싱가포르', '기타'];
const ALL = ['한국', '미국', '영국', '캐나다', '호주', '일본', '독일', '네덜란드', '싱가포르'];

export const FIELDS: Field[] = [
  { id: 'f-health', name: '건강과 돌봄', tier: 'current', keywords: ['돌봄', '사람', '공감', '생명', '건강', '의학', '봉사', '운동'],
    summary: '아프거나 불편한 사람이 일상을 되찾도록 돕는 분야', whoseProblem: '환자, 보호자, 고령자, 몸이 불편한 이웃', learn: '인체와 질병, 의사소통, 근거를 따져 보는 법',
    majors: ['m-nursing', 'm-biomed', 'm-sport'], tryIt: '가족 한 명의 하루 수면·물 마시기를 1주 관찰하고 바꿀 수 있는 점 한 가지 찾기',
    roles: [{ id: 'r-nurse', name: '간호사', desc: '환자 곁에서 상태를 살피고 치료를 이어 줌', tryIt: '응급처치 영상 1편 보고 순서를 카드로 정리하기' }, { id: 'r-pt', name: '물리치료사', desc: '움직임을 회복하도록 운동을 설계', tryIt: '스트레칭 루틴을 만들고 1주 실천 기록' }] },
  { id: 'f-env', name: '기후와 환경', tier: 'current', keywords: ['환경', '기후', '자연', '동물', '식물', '지구', '과학', '탐구'],
    summary: '사람과 자연이 함께 지속될 방법을 찾는 분야', whoseProblem: '폭염·홍수를 겪는 지역 주민, 미래 세대, 생태계', learn: '데이터 측정, 지구 시스템, 정책과 생활의 연결',
    majors: ['m-envsci', 'm-civil', 'm-econ'], tryIt: '우리 집 일주일 쓰레기 종류를 기록하고 줄일 수 있는 것 하나 실험하기',
    roles: [{ id: 'r-envres', name: '환경 연구원', desc: '대기·물·토양을 측정하고 원인을 분석', tryIt: '동네 세 곳의 그늘 온도를 같은 시각에 재 보기' }, { id: 'r-esg', name: '지속가능경영 담당', desc: '기업 활동의 환경 영향을 줄이는 계획', tryIt: '자주 쓰는 제품 하나의 포장 재질 조사하기' }] },
  { id: 'f-ai', name: '데이터와 인공지능', tier: 'expand', keywords: ['컴퓨터', '코딩', '수학', '논리', '데이터', '게임', '분석', '문제 해결'],
    summary: '데이터에서 패턴을 찾아 사람의 판단과 일을 돕는 분야', whoseProblem: '정보가 너무 많아 결정이 어려운 사람과 조직', learn: '프로그래밍, 통계, 데이터 윤리',
    majors: ['m-cs', 'm-stats', 'm-cogsci'], tryIt: '내 하루 휴대폰 사용 시간을 1주 기록해 표와 그래프로 만들기',
    roles: [{ id: 'r-ds', name: '데이터 분석가', desc: '숫자 뒤의 이야기를 찾아 설명', tryIt: '학급 설문 하나를 만들고 결과를 그래프로 정리' }, { id: 'r-swe', name: '소프트웨어 개발자', desc: '필요한 기능을 코드로 구현', tryIt: '블록 코딩으로 간단한 퀴즈 프로그램 만들기' }, { id: 'r-aiethic', name: 'AI 정책·윤리 연구', desc: 'AI가 공정하게 쓰이도록 규칙을 고민', tryIt: '추천 알고리즘 기사 하나 읽고 찬반 정리' }] },
  { id: 'f-design', name: '디자인과 경험', tier: 'current', keywords: ['그림', '미술', '디자인', '만들기', '색', '앱', '꾸미기', '관찰'],
    summary: '사람이 더 쉽고 즐겁게 쓰도록 물건·화면·공간을 설계하는 분야', whoseProblem: '불편한 앱·간판·제품 때문에 헤매는 사용자', learn: '관찰, 스케치, 시제품, 사용자 인터뷰',
    majors: ['m-design', 'm-arch', 'm-hci'], tryIt: '학교에서 불편한 표지판 하나를 찾아 다시 디자인해 보기',
    roles: [{ id: 'r-ux', name: 'UX 디자이너', desc: '사용자의 불편을 관찰해 화면 흐름을 설계', tryIt: '자주 쓰는 앱의 불편한 점 3가지 캡처·메모' }, { id: 'r-product', name: '제품 디자이너', desc: '손에 쥐는 물건의 형태와 쓰임을 설계', tryIt: '종이로 필통 시제품 만들기' }] },
  { id: 'f-media', name: '이야기와 미디어', tier: 'current', keywords: ['글쓰기', '책', '영상', '이야기', '사진', '음악', '표현', '말하기'],
    summary: '경험과 정보를 이야기로 엮어 사람에게 전하는 분야', whoseProblem: '정확한 정보나 위로가 필요한 독자·시청자', learn: '취재, 글쓰기, 영상 편집, 미디어 윤리',
    majors: ['m-media', 'm-korean', 'm-film'], tryIt: '관심 주제로 1분 영상 또는 300자 글 하나 만들기',
    roles: [{ id: 'r-journalist', name: '기자·에디터', desc: '사실을 확인하고 이해하기 쉽게 전달', tryIt: '학교 소식 하나를 기사 형식으로 써 보기' }, { id: 'r-pd', name: 'PD·콘텐츠 기획자', desc: '주제를 정하고 제작 과정을 이끔', tryIt: '3컷 스토리보드 그리기' }] },
  { id: 'f-society', name: '사회와 공정', tier: 'current', keywords: ['사회', '토론', '법', '정의', '역사', '봉사', '리더', '사람'],
    summary: '공동체의 규칙과 제도를 더 공정하게 만드는 분야', whoseProblem: '차별이나 제도의 빈틈 때문에 불이익을 받는 사람', learn: '법과 정책, 토론, 자료 비교, 다양한 관점 듣기',
    majors: ['m-law', 'm-polsci', 'm-socwel'], tryIt: '학교 규칙 하나를 골라 다른 학교 사례와 비교해 보기',
    roles: [{ id: 'r-lawyer', name: '변호사·법률가', desc: '권리를 지키도록 법을 해석하고 대변', tryIt: '청소년 관련 법 하나를 찾아 쉬운 말로 요약' }, { id: 'r-sw', name: '사회복지사', desc: '도움이 필요한 사람을 자원과 연결', tryIt: '동네 복지관 프로그램 조사하기' }] },
  { id: 'f-edu', name: '배움과 성장', tier: 'expand', keywords: ['가르치기', '설명', '아이', '친구', '공감', '상담', '심리'],
    summary: '사람이 배우고 자라는 과정을 돕는 분야', whoseProblem: '공부가 막막하거나 마음이 힘든 학생', learn: '학습 원리, 심리, 상담과 수업 설계',
    majors: ['m-edu', 'm-psych', 'm-cogsci'], tryIt: '친구에게 어려운 개념 하나를 5분 동안 설명하고 반응 기록하기',
    roles: [{ id: 'r-teacher', name: '교사', desc: '수업을 설계하고 학생의 성장을 지켜봄', tryIt: '10분 미니 수업 계획서 쓰기' }, { id: 'r-counselor', name: '상담 심리사', desc: '이야기를 들으며 스스로 답을 찾게 도움', tryIt: '경청 연습: 친구 이야기 듣고 요약해 확인받기' }, { id: 'r-edtech', name: '에듀테크 기획자', desc: '배움을 돕는 디지털 도구를 기획', tryIt: '단어 암기 앱 3개를 비교해 보기' }] },
  { id: 'f-biz', name: '시장과 창업', tier: 'expand', keywords: ['장사', '돈', '기획', '리더', '아이디어', '협상', '마케팅'],
    summary: '사람의 필요를 발견해 상품·서비스로 연결하는 분야', whoseProblem: '필요하지만 아직 해결책이 없는 고객', learn: '고객 인터뷰, 경제 원리, 숫자로 판단하기',
    majors: ['m-biz', 'm-econ', 'm-stats'], tryIt: '친구 5명에게 같은 불편 질문을 하고 답을 비교하기',
    roles: [{ id: 'r-pm', name: '서비스 기획자(PM)', desc: '문제를 정의하고 팀이 같은 방향을 보게 함', tryIt: '학교 매점 개선안을 한 장으로 정리' }, { id: 'r-founder', name: '창업가', desc: '작은 실험으로 아이디어를 검증', tryIt: '아이디어를 포스터 한 장으로 만들어 반응 듣기' }, { id: 'r-marketer', name: '마케터', desc: '가치를 필요한 사람에게 알림', tryIt: '좋아하는 브랜드 광고 3개 비교 분석' }] },
  { id: 'f-space', name: '도시와 공간', tier: 'expand', keywords: ['건축', '공간', '도시', '지도', '만들기', '교통', '여행'],
    summary: '사람이 살고 움직이는 공간을 계획하는 분야', whoseProblem: '통학·이동이 불편하거나 쉴 곳 없는 주민', learn: '공간 감각, 구조, 도시 데이터, 주민 의견 듣기',
    majors: ['m-arch', 'm-civil', 'm-envsci'], tryIt: '등굣길 지도를 그려 위험하거나 불편한 지점 표시하기',
    roles: [{ id: 'r-architect', name: '건축가', desc: '쓰임과 아름다움을 함께 고려해 건물을 설계', tryIt: '내 방 평면도를 그리고 배치 바꿔 보기' }, { id: 'r-planner', name: '도시 계획가', desc: '교통·주거·녹지를 함께 계획', tryIt: '동네 버스 정류장 이용객 관찰 기록' }] },
  { id: 'f-bio', name: '생명과 바이오', tier: 'expand', keywords: ['생물', '실험', '과학', '탐구', '동물', '식물', '생명', '화학'],
    summary: '생명의 원리를 이해해 의료·식량·환경에 활용하는 분야', whoseProblem: '질병, 식량 부족, 오염을 겪는 사람들', learn: '실험 설계, 생명과학, 연구 윤리',
    majors: ['m-biomed', 'm-envsci', 'm-chem'], tryIt: '콩나물을 두 조건으로 길러 1주간 길이 비교 기록하기',
    roles: [{ id: 'r-bioresearch', name: '생명과학 연구원', desc: '가설을 세우고 실험으로 확인', tryIt: '과학 기사 하나에서 가설과 결과 찾아 정리' }, { id: 'r-food', name: '식품 개발자', desc: '맛과 영양, 안전을 고려해 식품을 개발', tryIt: '같은 요리를 재료 한 가지만 바꿔 비교하기' }] },
  { id: 'f-space-future', name: '우주와 미래 이동', tier: 'future', keywords: ['우주', '로봇', '자동차', '기계', '과학', '물리', '만들기'],
    summary: '아직 만들어지는 중인 이동·탐사 기술을 상상하고 실험하는 분야', whoseProblem: '이동이 어려운 사람, 먼 곳을 탐사해야 하는 연구자', learn: '물리, 기계 원리, 시스템 사고',
    majors: ['m-mech', 'm-cs', 'm-civil'], tryIt: '페트병 로켓 또는 종이 비행기로 조건 하나 바꿔 비교하기',
    roles: [{ id: 'r-robot', name: '로봇 엔지니어', desc: '감지·판단·움직임을 결합한 기계를 만듦', tryIt: '생활 속 자동화 기계 5개 찾아 원리 추측하기' }, { id: 'r-mobility', name: '모빌리티 서비스 기획', desc: '새 이동 수단이 쓰일 장면을 설계', tryIt: '할머니 할아버지의 이동 불편 인터뷰하기' }] },
  { id: 'f-culture', name: '문화와 세계', tier: 'future', keywords: ['외국어', '여행', '문화', '역사', '음악', '세계', '번역'],
    summary: '서로 다른 문화가 이해하고 협력하도록 잇는 분야', whoseProblem: '언어·문화 차이로 오해를 겪는 사람, 이주민', learn: '언어, 지역 이해, 국제 관계',
    majors: ['m-intl', 'm-korean', 'm-media'], tryIt: '다른 나라의 같은 날 뉴스 1면 비교하기',
    roles: [{ id: 'r-translator', name: '번역가·통역사', desc: '말과 맥락을 함께 옮김', tryIt: '좋아하는 노래 가사 한 소절을 두 가지로 번역' }, { id: 'r-intlorg', name: '국제기구·NGO 활동가', desc: '국경을 넘는 문제를 함께 해결', tryIt: '국제기구 한 곳의 최근 보고서 요약 읽기' }] },
];

const M = (m: Major) => m;
export const MAJORS: Major[] = [
  M({ id: 'm-open', name: '전공을 열어 두고 탐색하기', en: 'Open discipline exploration', fields: [], countries: ALL, questions: '이 학과에서 무엇을 배우며 나의 관심과 어떻게 연결될까?', study: ['공식 학과 소개 읽기', '확인한 내용과 아직 모르는 내용 구분하기'], projects: ['공식 자료에서 나의 질문과 다음 확인할 내용을 정리하기'], style: '원문 읽기·질문·비교를 통한 열린 탐색', hsSubjects: ['현재 관심 있는 고교 교과목'], fusion: '전공 선택과 결합 방법은 대학 공식 자료에서 확인해요.', competencies: ['질문 구성', '자료 확인'], tryIt: '학과 공식 자료를 읽고 나의 강점·관심사와 연결되는 질문을 적기' }),
  M({ id: 'm-sociology', name: '사회학', en: 'Sociology', fields: ['f-society'], countries: ALL, questions: '익숙한 일상과 사회 제도는 어떻게 연결될까?', study: ['사회이론', '사회조사', '불평등 연구'], projects: ['공공 통계로 지역 문제 살펴보기'], style: '읽기·토론·조사와 자료 해석', hsSubjects: ['사회', '수학', '국어'], fusion: '통계·정치·복지와 연결하는 일반 학문 안내', competencies: ['질문 구성', '자료 해석'], tryIt: '공개된 지역 인구 통계에서 변화 하나를 찾아 이유를 질문으로 적기' }),
  M({ id: 'm-history', name: '역사학·고고학', en: 'History / Archaeology', fields: ['f-society', 'f-culture'], countries: ALL, questions: '남겨진 자료로 과거를 어떻게 이해할까?', study: ['역사 자료 읽기', '시대별 역사', '유물과 문화유산'], projects: ['서로 다른 사료의 관점 비교'], style: '사료 비판·읽기·쓰기와 현장 관찰', hsSubjects: ['역사', '사회', '국어'], fusion: '언어·박물관·디지털 기록과 연결하는 일반 학문 안내', competencies: ['근거 비교', '맥락 이해'], tryIt: '박물관 공개 자료에서 유물 하나를 골라 설명과 궁금한 점 정리하기' }),
  M({ id: 'm-philosophy', name: '철학·종교학', en: 'Philosophy / Religious Studies', fields: ['f-society', 'f-culture'], countries: ALL, questions: '내 판단의 이유와 다른 사람의 관점을 어떻게 검토할까?', study: ['논리와 논증', '윤리', '사상과 종교의 역사'], projects: ['하나의 질문에 대한 서로 다른 주장 비교'], style: '원전 읽기·논증·토론', hsSubjects: ['윤리', '국어', '사회'], fusion: '법·과학·문화와 연결하는 일반 학문 안내', competencies: ['논증 검토', '관점 비교'], tryIt: '일상에서 생긴 윤리적 질문 하나에 찬반 근거를 각각 두 가지 적기' }),
  M({ id: 'm-math', name: '수학', en: 'Mathematics', fields: ['f-ai', 'f-edu'], countries: ALL, questions: '규칙이 언제나 성립한다는 것을 어떻게 설명할까?', study: ['해석학', '선형대수', '추상대수'], projects: ['수학적 규칙의 증명과 반례 찾기'], style: '정의·증명·문제 해결', hsSubjects: ['수학', '정보'], fusion: '물리·통계·컴퓨터과학과 연결하는 일반 학문 안내', competencies: ['엄밀한 추론', '추상화'], tryIt: '수열에서 규칙 하나를 찾고 항상 맞는지 반례를 찾아보기' }),
  M({ id: 'm-physics', name: '물리학', en: 'Physics', fields: ['f-space-future', 'f-ai'], countries: ALL, questions: '자연 현상을 측정과 모형으로 어떻게 설명할까?', study: ['역학', '전자기학', '양자물리 기초'], projects: ['안전한 일상 현상의 측정과 오차 분석'], style: '수학적 모형·실험·계산', hsSubjects: ['물리학', '수학', '정보'], fusion: '재료·우주·전자기술과 연결하는 일반 학문 안내', competencies: ['모형 구성', '측정 해석'], tryIt: '휴대전화 타이머로 진자의 길이와 주기 관계를 안전하게 관찰하기' }),
  M({ id: 'm-music', name: '음악', en: 'Music', fields: ['f-media', 'f-culture'], countries: ALL, questions: '소리를 어떻게 구성하고 듣고 표현할까?', study: ['음악이론', '음악사', '연주·창작'], projects: ['짧은 곡 창작 또는 감상 기록'], style: '듣기·연습·분석·발표', hsSubjects: ['음악', '역사', '국어'], fusion: '교육·공연·음향기술과 연결하는 일반 학문 안내', competencies: ['청각적 관찰', '표현과 반복 연습'], tryIt: '직접 만든 짧은 리듬을 녹음하고 바꿔 보고 싶은 점 기록하기' }),
  M({ id: 'm-art', name: '미술·조형예술', en: 'Fine Arts', fields: ['f-design', 'f-culture'], countries: ALL, questions: '관찰과 생각을 어떤 재료와 형태로 표현할까?', study: ['시각 표현', '재료 실험', '미술사와 비평'], projects: ['과정 기록을 포함한 작은 작품 만들기'], style: '스튜디오 작업·감상·합평', hsSubjects: ['미술', '역사', '국어'], fusion: '디자인·전시·디지털 매체와 연결하는 일반 학문 안내', competencies: ['시각적 관찰', '재료 탐구'], tryIt: '같은 물건을 서로 다른 두 재료로 표현하고 느낌의 차이 기록하기' }),
  M({ id: 'm-languages', name: '언어·외국문학', en: 'Languages / Literature', fields: ['f-media', 'f-culture'], countries: ALL, questions: '언어와 문학은 사람들의 생각과 문화를 어떻게 담을까?', study: ['언어 구조', '문학 읽기', '문화와 번역'], projects: ['짧은 원문과 번역의 표현 비교'], style: '원문 읽기·쓰기·토론', hsSubjects: ['국어', '영어', '제2외국어'], fusion: '교육·출판·국제교류와 연결하는 일반 학문 안내', competencies: ['맥락 읽기', '표현 비교'], tryIt: '공개된 짧은 글의 원문과 번역에서 표현이 달라진 곳 한 군데 찾아보기' }),
  M({ id: 'm-cs', name: '컴퓨터공학', en: 'Computer Science', fields: ['f-ai', 'f-space-future'], countries: ALL, questions: '컴퓨터로 문제를 어떻게 정확하고 빠르게 풀 수 있을까?', study: ['프로그래밍', '자료구조와 알고리즘', '운영체제', '네트워크', '인공지능 기초'], projects: ['학교 행사 예약 웹 만들기', '간단한 게임 엔진 구현'], style: '과제 중심 코딩, 팀 프로젝트, 디버깅의 반복', hsSubjects: ['수학', '정보', '물리학'], fusion: '디자인·의료·금융 등과 결합한 복수전공 사례가 많음', competencies: ['논리적 사고', '문제 분해', '끈기 있는 디버깅', '협업'], tryIt: '파이썬으로 내 시간표를 출력하는 프로그램 만들기' }),
  M({ id: 'm-stats', name: '통계학·데이터과학', en: 'Statistics / Data Science', fields: ['f-ai', 'f-biz'], countries: ALL, questions: '불확실한 데이터에서 무엇을 믿을 수 있을까?', study: ['확률', '회귀분석', '실험 설계', '데이터 시각화'], projects: ['지역 대기질 데이터 분석', '설문 결과 해석 보고서'], style: '계산과 해석을 오가는 문제 풀이, 소프트웨어 실습', hsSubjects: ['수학', '확률과 통계', '정보'], fusion: '의학·사회과학·경영 어디에나 연결', competencies: ['수리적 사고', '비판적 해석', '시각화 전달'], tryIt: '반 친구들의 통학 시간을 모아 평균과 분포 비교하기' }),
  M({ id: 'm-cogsci', name: '인지과학', en: 'Cognitive Science', fields: ['f-ai', 'f-edu'], countries: ['미국', '영국', '캐나다', '네덜란드', '한국'], questions: '사람은 어떻게 생각하고 배우며, 기계는 그걸 흉내 낼 수 있을까?', study: ['심리학', '언어학', '신경과학', '컴퓨터 모델링'], projects: ['기억 실험 설계', '챗봇 대화 분석'], style: '여러 학문을 엮는 융합 수업, 실험과 토론', hsSubjects: ['생명과학', '정보', '국어'], fusion: '대부분 학제 간 프로그램으로 운영됨', competencies: ['융합적 사고', '실험 설계', '질문하는 힘'], tryIt: '친구 5명에게 단어 기억 실험을 해 보고 결과 비교' }),
  M({ id: 'm-hci', name: 'HCI·인터랙션디자인', en: 'Human-Computer Interaction', fields: ['f-design', 'f-ai'], countries: ['미국', '영국', '네덜란드', '한국', '독일'], questions: '사람과 기술이 만나는 순간을 어떻게 더 좋게 만들까?', study: ['사용자 조사', '프로토타이핑', '인터페이스 설계', '사용성 평가'], projects: ['앱 개선 시제품과 사용성 테스트'], style: '스튜디오 수업, 관찰과 반복 수정', hsSubjects: ['미술', '정보', '심리 관련 교양'], fusion: '디자인·컴퓨터공학·심리학을 넘나듦', competencies: ['공감 관찰', '시각화', '반복 개선'], tryIt: '부모님이 앱을 쓰는 모습을 관찰하고 막히는 지점 기록' }),
  M({ id: 'm-design', name: '시각·산업디자인', en: 'Design', fields: ['f-design'], countries: ALL, questions: '형태와 이미지로 어떻게 사람의 경험을 바꿀까?', study: ['조형', '타이포그래피', '제품 설계', '디자인 리서치'], projects: ['브랜드 아이덴티티 제작', '생활용품 재디자인'], style: '실기 스튜디오, 크리틱(작품 피드백) 중심', hsSubjects: ['미술', '기술·가정'], fusion: '경영·공학과의 협업 프로젝트', competencies: ['관찰력', '표현력', '비판 수용'], tryIt: '동아리 포스터 두 가지 버전 만들어 반응 비교' }),
  M({ id: 'm-arch', name: '건축학', en: 'Architecture', fields: ['f-space', 'f-design'], countries: ALL, questions: '사람이 머무는 공간은 어떻게 삶을 바꿀까?', study: ['건축 설계', '구조', '건축사', '환경 설계'], projects: ['소규모 도서관 설계안', '모형 제작'], style: '긴 호흡의 설계 스튜디오, 모형과 도면', hsSubjects: ['수학', '물리학', '미술'], fusion: '도시·환경·인테리어로 확장', competencies: ['공간 사고', '종합 판단', '끈기'], tryIt: '좋아하는 장소를 사진 찍고 왜 편한지 세 가지 적기' }),
  M({ id: 'm-civil', name: '도시·토목공학', en: 'Civil & Urban Engineering', fields: ['f-space', 'f-env'], countries: ALL, questions: '도시의 길·물·다리는 어떻게 안전하게 작동할까?', study: ['구조역학', '수자원', '교통공학', '도시계획'], projects: ['홍수 대비 배수 계획', '보행 안전 분석'], style: '계산·실험·현장 답사', hsSubjects: ['수학', '물리학', '지구과학'], fusion: '환경·데이터와 결합한 스마트시티 연구', competencies: ['시스템 사고', '안전 감수성', '수리적 사고'], tryIt: '비 오는 날 학교 주변 물이 고이는 곳 기록하기' }),
  M({ id: 'm-mech', name: '기계공학', en: 'Mechanical Engineering', fields: ['f-space-future'], countries: ALL, questions: '힘과 움직임을 어떻게 설계해 쓸모 있게 만들까?', study: ['역학', '열유체', '설계·제작', '제어'], projects: ['소형 로봇 팔 제작', '자전거 기어 분석'], style: '실험실 실습과 팀 제작 프로젝트', hsSubjects: ['수학', '물리학'], fusion: '로봇·에너지·의공학', competencies: ['원리 이해', '손으로 만들기', '협업'], tryIt: '고장 난 장난감 하나를 분해해 구조 그리기' }),
  M({ id: 'm-envsci', name: '환경과학', en: 'Environmental Science', fields: ['f-env', 'f-bio'], countries: ALL, questions: '지구 환경의 변화는 왜 일어나고 어떻게 대응할까?', study: ['생태학', '대기·수질 분석', '기후 과학', '환경 정책'], projects: ['하천 수질 측정', '탄소 발자국 조사'], style: '현장 조사와 실험, 데이터 분석', hsSubjects: ['지구과학', '생명과학', '화학'], fusion: '정책·경제·공학과 연결', competencies: ['측정과 기록', '장기적 관점', '근거 기반 주장'], tryIt: '일주일 동안 날씨와 내 기분을 함께 기록해 보기' }),
  M({ id: 'm-biomed', name: '생명과학·의생명', en: 'Life & Biomedical Sciences', fields: ['f-bio', 'f-health'], countries: ALL, questions: '생명은 어떻게 작동하고, 병은 왜 생길까?', study: ['세포생물학', '유전학', '생화학', '실험 기법'], projects: ['미생물 배양 실험', '논문 읽기 발표'], style: '이론 강의와 실험 실습 병행', hsSubjects: ['생명과학', '화학'], fusion: '데이터·공학과 결합한 바이오 분야', competencies: ['가설 검증', '정밀함', '연구 윤리'], tryIt: '손 씻기 전후 배지 관찰 실험 계획 세우기' }),
  M({ id: 'm-chem', name: '화학·화학공학', en: 'Chemistry', fields: ['f-bio', 'f-env'], countries: ALL, questions: '물질은 어떻게 변하고, 새로운 물질은 어떻게 만들까?', study: ['일반화학', '유기화학', '분석화학', '공정 설계'], projects: ['천연 지시약 만들기', '배터리 소재 탐구'], style: '실험 보고서 중심', hsSubjects: ['화학', '수학'], fusion: '에너지·의약·환경 소재', competencies: ['정확한 실험', '관찰', '안전 의식'], tryIt: '적양배추 지시약으로 집 안 물질 산성도 비교' }),
  M({ id: 'm-nursing', name: '간호학', en: 'Nursing', fields: ['f-health'], countries: ALL, questions: '아픈 사람을 어떻게 전인적으로 돌볼까?', study: ['기본 간호', '해부생리', '지역사회 간호', '임상 실습'], projects: ['건강 교육 자료 만들기', '사례 기반 간호 계획'], style: '이론과 병원 실습, 국가시험 준비(국가마다 다름)', hsSubjects: ['생명과학', '화학', '국어'], fusion: '보건정책·의료정보로 확장', competencies: ['공감', '책임감', '관찰'], tryIt: '가족 건강 수칙 포스터 만들기' }),
  M({ id: 'm-sport', name: '스포츠과학·재활', en: 'Sport & Exercise Science', fields: ['f-health'], countries: ALL, questions: '몸은 어떻게 움직이고, 어떻게 더 건강해질까?', study: ['운동생리학', '운동역학', '재활', '스포츠 심리'], projects: ['운동 프로그램 설계', '동작 영상 분석'], style: '실기와 측정 실험', hsSubjects: ['체육', '생명과학', '물리학'], fusion: '데이터·의학과 결합', competencies: ['몸의 감각', '꾸준함', '코칭'], tryIt: '줄넘기 기록을 2주간 재고 변화 그래프 그리기' }),
  M({ id: 'm-psych', name: '심리학', en: 'Psychology', fields: ['f-edu', 'f-health'], countries: ALL, questions: '사람의 마음과 행동은 왜 그렇게 나타날까?', study: ['발달심리', '사회심리', '연구방법', '상담 기초'], projects: ['설문 연구 설계', '행동 관찰 보고서'], style: '실험·통계·토론', hsSubjects: ['생명과학', '수학', '사회'], fusion: '경영·디자인·AI와 연결', competencies: ['공감', '객관적 관찰', '통계 이해'], tryIt: '나의 집중이 잘 되는 시간대를 1주 기록하기' }),
  M({ id: 'm-edu', name: '교육학·사범계열', en: 'Education', fields: ['f-edu'], countries: ALL, questions: '사람은 어떻게 배우고, 좋은 배움은 어떻게 설계할까?', study: ['교육심리', '교육과정', '수업 설계', '교육 실습'], projects: ['모의 수업', '학습 자료 개발'], style: '이론과 실습, 토론', hsSubjects: ['국어', '사회', '희망 교과'], fusion: '에듀테크·상담으로 확장', competencies: ['설명력', '인내', '관찰'], tryIt: '동생이나 친구에게 개념 하나 가르치고 피드백 받기' }),
  M({ id: 'm-media', name: '미디어커뮤니케이션', en: 'Media & Communication', fields: ['f-media', 'f-culture'], countries: ALL, questions: '정보와 이야기는 사회에 어떻게 영향을 줄까?', study: ['저널리즘', '미디어 이론', '영상 제작', '데이터 저널리즘'], projects: ['학교 뉴스레터 제작', '미디어 리터러시 캠페인'], style: '취재·제작 실습과 비평', hsSubjects: ['국어', '사회', '정보'], fusion: '데이터·디자인·정치와 연결', competencies: ['전달력', '사실 확인', '기획'], tryIt: '같은 사건을 다룬 기사 3개 비교하기' }),
  M({ id: 'm-film', name: '영상·콘텐츠', en: 'Film & Digital Content', fields: ['f-media'], countries: ALL, questions: '장면과 소리로 어떻게 마음을 움직일까?', study: ['연출', '촬영·편집', '시나리오', '사운드'], projects: ['단편 영상 제작'], style: '제작 중심 팀 작업', hsSubjects: ['국어', '미술', '음악'], fusion: '게임·광고·교육 콘텐츠', competencies: ['상상력', '협업', '마감 관리'], tryIt: '휴대폰으로 30초 장면 하나 찍고 편집' }),
  M({ id: 'm-korean', name: '국어국문·언어학', en: 'Korean Language & Linguistics', fields: ['f-media', 'f-culture'], countries: ['한국', '미국', '영국', '일본', '독일', '호주'], questions: '언어와 문학은 사람과 사회를 어떻게 비출까?', study: ['문학 비평', '국어학', '언어학 개론', '창작'], projects: ['신조어 조사 보고서', '단편 소설 창작'], style: '읽기·쓰기·토론', hsSubjects: ['국어', '외국어'], fusion: '언어 AI·출판·교육', competencies: ['깊이 읽기', '표현력', '분석'], tryIt: '좋아하는 소설 한 장면을 다른 시점으로 다시 쓰기' }),
  M({ id: 'm-law', name: '법학', en: 'Law', fields: ['f-society'], countries: ALL, questions: '공정한 규칙은 무엇이고, 어떻게 지킬까?', study: ['헌법', '민법', '형법', '법철학'], projects: ['모의재판', '판례 분석'], style: '판례 읽기와 논증 (나라마다 학부/전문대학원 구조가 다름)', hsSubjects: ['국어', '사회', '윤리'], fusion: 'IT법·환경법·인권', competencies: ['논증', '꼼꼼함', '공정 감각'], tryIt: '청소년 근로 권리를 조사해 한 장 안내문 만들기' }),
  M({ id: 'm-polsci', name: '정치외교학', en: 'Political Science', fields: ['f-society', 'f-culture'], countries: ALL, questions: '함께 사는 결정은 어떻게 내려질까?', study: ['정치이론', '비교정치', '국제관계', '공공정책'], projects: ['정책 제안서', '모의 UN'], style: '읽기·토론·보고서', hsSubjects: ['사회', '역사', '영어'], fusion: '경제·데이터·언론과 연결', competencies: ['토론', '다양한 관점', '글쓰기'], tryIt: '우리 지역 정책 하나를 찾아 장단점 정리' }),
  M({ id: 'm-intl', name: '국제학·지역학', en: 'International Studies', fields: ['f-culture'], countries: ALL, questions: '국경을 넘는 문제는 어떻게 함께 풀까?', study: ['지역 연구', '외국어', '국제 개발', '국제 경제'], projects: ['특정 국가 사례 연구', '해외 기관 보고서 요약'], style: '언어와 토론, 교환 프로그램 기회', hsSubjects: ['영어', '제2외국어', '사회'], fusion: '경영·정치·문화 콘텐츠', competencies: ['문화 감수성', '언어', '조정력'], tryIt: '외국 친구 문화 하나를 인터뷰해 소개 글 쓰기' }),
  M({ id: 'm-socwel', name: '사회복지학', en: 'Social Work', fields: ['f-society', 'f-health'], countries: ALL, questions: '어려움에 처한 사람을 어떻게 사회가 지원할까?', study: ['사회복지 정책', '상담 기법', '지역사회 실천', '현장 실습'], projects: ['지역 자원 지도 만들기'], style: '이론과 현장 실습', hsSubjects: ['사회', '윤리', '국어'], fusion: '공공행정·심리·데이터', competencies: ['경청', '연결', '책임감'], tryIt: '동네 공공시설 지도를 만들어 보기' }),
  M({ id: 'm-biz', name: '경영학', en: 'Business', fields: ['f-biz'], countries: ALL, questions: '사람과 자원을 모아 어떻게 가치를 만들까?', study: ['마케팅', '회계', '조직', '창업'], projects: ['사례 분석 발표', '창업 아이디어 피칭'], style: '케이스 토론과 팀 프로젝트', hsSubjects: ['수학', '사회', '경제'], fusion: 'IT·디자인·데이터와 융합 전공', competencies: ['기획', '소통', '숫자 감각'], tryIt: '학교 축제 부스 예산표 짜 보기' }),
  M({ id: 'm-econ', name: '경제학', en: 'Economics', fields: ['f-biz', 'f-env'], countries: ALL, questions: '사람들은 왜 그런 선택을 하고, 자원은 어떻게 나뉠까?', study: ['미시·거시경제', '계량경제', '행동경제', '환경경제'], projects: ['물가 데이터 분석', '정책 효과 토론'], style: '수리 모델과 데이터 분석', hsSubjects: ['수학', '경제', '사회'], fusion: '정책·데이터·환경', competencies: ['모델링', '논리', '사회적 관점'], tryIt: '한 달 용돈 사용 기록을 분석해 보기' }),
];

export const fieldById = (id: string) => FIELDS.find(f => f.id === id);
export const majorById = (id: string) => MAJORS.find(m => m.id === id);
export const roleById = (id: string) => { for (const f of FIELDS) { const r = f.roles.find(x => x.id === id); if (r) return { role: r, field: f }; } return undefined; };

export const ACTIVITY_QUESTIONS = [
  { id: 'q1', q: '시간 가는 줄 모르고 했던 일은 무엇인가요?' },
  { id: 'q2', q: '친구들이 자주 나에게 부탁하는 일은?' },
  { id: 'q3', q: '최근 "왜 이렇게 되어 있지?" 하고 궁금했던 장면은?' },
  { id: 'q4', q: '누군가를 도와주고 싶었던 순간은?' },
];
export const ACTIVITY_KINDS = ['수업', '독서', '취미', '동아리', '관찰', '인터뷰', '작은 프로젝트', '체험', '기타'];
