/**
 * K-PASS 결과지 — 통합 개인화 엔진
 *
 * 이 파일 하나가 다음 두 가지를 전부 담당합니다.
 *   (1) 점수 4개 → 숫자·그래프·표 전부 자동 계산 (콘텐츠 저작 아님, 순수 계산)
 *   (2) 점수 4개 → 상위 2축 조합(7가지) 기준 문장 선택 (모듈형 콘텐츠, 1차 초안)
 *
 * ★★★ 반드시 읽어주세요 ★★★
 * "우리 아이만의 인지특성 프로파일" 섹션은 4축×3티어(상/중/하) 조합으로 실제
 * 81가지 서로 다른 문장을 만듭니다. 다만 히어로타입(전략 실행가형 등) 7종은
 * 여전히 "상위 2축 조합" 기준이라 같은 조합이면 같은 캐릭터가 나갑니다.
 * 정식 서비스 적용 전 아래를 확인하세요.
 *   - 문장 내용의 정확성 (문수백 교수님 감수)
 *   - BALANCE_THRESHOLD 임계값 (기존 kpass-score-engine.js와 동일 경고) — CRITICAL_VALUES는
 *     순위 기반 판정으로 교체되어 더 이상 임의 기준값에 의존하지 않음
 *   - 저학년(5~7세) 대상 어휘 난이도
 *
 * ===== 검수 프로그램과의 연결 =====
 * verify-personalization.js가 이 파일을 테스트하려면, 리포트가 아래 "PROFILE 계약"을
 * 지켜야 합니다.
 *
 *   const PROFILE = window.__TEST_PROFILE__ || DEFAULT_PROFILE;
 *
 * 즉 window.__TEST_PROFILE__ 이 있으면 그걸 쓰고, 없으면(=사람이 그냥 열어본 경우)
 * 기존 예시(송서우) 값을 씁니다. 검수 프로그램은 이 값을 바꿔가며 여러 번 로드해서
 * 결과가 실제로 달라지는지 확인합니다. 앞으로 D-CAS 등 다른 리포트를 동적화할 때도
 * 이 계약(window.__TEST_PROFILE__)을 동일하게 지켜주세요 — 그래야 검수 프로그램을
 * 그대로 재사용할 수 있습니다.
 */

(function (global) {

/* 한국어 조사 처리 — 받침 유무에 따라 은/는, 이/가 자동 선택 */
function hasBatchim(str){
  const ch = str.charCodeAt(str.length-1);
  if (ch < 0xAC00 || ch > 0xD7A3) return false; // 한글 아니면 무시(받침 없음 취급)
  return (ch - 0xAC00) % 28 !== 0;
}
function josa(word, pair){ // pair: '은는' | '이가' | '을를' | '와과'
  const map = { '은는':['은','는'], '이가':['이','가'], '을를':['을','를'], '와과':['와','과'] };
  const [withB, withoutB] = map[pair];
  return word + (hasBatchim(word) ? withB : withoutB);
}

/* =====================================================================
   1) 점수 → 숫자 계산 (kpass-score-engine.js와 동일 로직, 통합본이라 재수록)
   ===================================================================== */
function erf(x) {
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const sign = x<0?-1:1; x=Math.abs(x);
  const t=1/(1+p*x);
  const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign*y;
}
function scoreToPercentileTop(score){ // "또래 상위 X%" 표기용 (100-백분위)
  const z=(score-100)/15;
  const pct = (0.5*(1+erf(z/Math.SQRT2)))*100;
  return Math.max(0.1, Math.round((100-pct)*10)/10);
}
function scoreToPercentileRank(score){ // "또래 상위 X%ile" 그 자체(순차처리 37%ile류)
  const z=(score-100)/15;
  return Math.round((0.5*(1+erf(z/Math.SQRT2)))*100);
}
function barWidthPct(score){ return Math.max(0,Math.min(100,(score-40)/120*100)); }
function classifyLevel(score){ if(score>=120) return 'H'; if(score<=85) return 'L'; return 'M'; }
function isNormativeStrong(score){ return score>115; }

/* 개인내적(자기 자신 대비) 강/약 — 기존엔 CRITICAL_VALUES(축별 임의 점수차 기준값)로 판정했으나,
   이 값이 송서우 한 명의 예시 데이터를 그대로 가져온 임시값이라 실제 배포에 쓸 수 없었음.
   대신 4개 축의 순위를 매겨 1등(최고축)=가장 큰 강점, 2등(다음축)=강점,
   4등(최하위축)=보완 포인트로 판정하고, 가운데 순위(3등)는 평균과 비슷한 것으로 처리.
   임의 기준값이 필요 없어 실 데이터 없이도 안전하게 쓸 수 있음. */
function personalDelta(scores){
  const mean = (scores.P+scores.A+scores.S+scores.Q)/4;
  const ranked = ['P','A','S','Q'].map(function(k){ return {k:k, v:scores[k]}; })
    .sort(function(a,b){ return b.v-a.v; });
  const isBalanced = ranked[0].v - ranked[3].v < BALANCE_THRESHOLD;
  const rankOf = {};
  ranked.forEach(function(r, i){ rankOf[r.k] = i; });
  const out = {};
  ['P','A','S','Q'].forEach(function(k){
    const diff = scores[k]-mean;
    const rank = rankOf[k];
    // 균형형에서는 배열 순서 때문에 임의의 강점·약점이 생기지 않도록 모두 FLAT 처리한다.
    const status = isBalanced ? 'FLAT' : ((rank===0 || rank===1) ? 'PS' : (rank===3 ? 'PW' : 'FLAT'));
    out[k] = { diff: Math.round(diff), abs: Math.round(Math.abs(diff)), status: status, rank: rank };
  });
  return { mean: Math.round(mean), byAxis: out };
}


/* ===== 인지 나침반 SVG 좌표 (viewBox 0 0 300 300, 중심 150,150) ===== */
function compassPoint(score, angleDeg){
  const norm = Math.max(0, Math.min(1, (score-40)/120));
  const r = 20 + norm*80;
  const rad = angleDeg*Math.PI/180;
  return { x: 150 + r*Math.sin(rad), y: 150 - r*Math.cos(rad) };
}
const COMPASS_ANGLES = { P:0, S:90, Q:180, A:270 }; // 상=계획 우=동시 하=순차 좌=주의 (원본 레이아웃 유지)
function compassPolygon(scores){
  return ['P','S','Q','A'].map(function(k){
    const p = compassPoint(scores[k], COMPASS_ANGLES[k]);
    return p.x.toFixed(1)+','+p.y.toFixed(1);
  }).join(' ');
}

/* =====================================================================
   2) 상위 2축 조합 판정 (kpass-figure-render.js와 동일 규칙 재사용)
   ===================================================================== */
const BALANCE_THRESHOLD = 15; // ★ 임시값. 실 데이터 분포로 재확인 필요.
function pickComboKey(scores){
  const ranked = [
    {k:'P',v:scores.P},{k:'A',v:scores.A},{k:'S',v:scores.S},{k:'Q',v:scores.Q}
  ].sort(function(a,b){ return b.v-a.v; });
  if (ranked[0].v - ranked[3].v < BALANCE_THRESHOLD) return 'BAL';
  const ORDER = {P:0,A:1,S:2,Q:3};
  const top2 = [ranked[0].k, ranked[1].k].sort(function(a,b){ return ORDER[a]-ORDER[b]; });
  return top2.join('');
}
const AXIS_LABEL = { P:'계획력', A:'주의력', S:'동시처리', Q:'순차처리' };

/* =====================================================================
   3) 조합별 콘텐츠 뱅크 — ★ 1차 초안. 문수백 교수 감수 전 배포 금지 ★
   =====================================================================
   각 조합은 두 강점 축을 중심으로 쓰여 있습니다. 낮은 축(들)에 대한 서술은
   조합과 무관하게 별도 함수(weakAxisBlock)에서 공통 처리합니다 — 특정
   조합에 "너는 이게 약해"라는 문장을 고정으로 붙이지 않기 위해서입니다.
*/
const COMBO_CONTENT = {
  PA: {
    heroType: '전략 실행가형',
    heroSub: '끝까지 가는 힘',
    heroTags: ['#강한계획력', '#몰입주의력', '#끝까지완수'],
    oneliner: '목표를 스스로 세우고, 그 목표에서 눈을 떼지 않는 끈질긴 실행가예요.',
    homeai: '오늘도 세운 계획을 끝까지 밀어붙일 준비가 됐네요! 작은 목표 하나부터 시작해볼까요?',
    temperament: '계획을 세우는 힘과 한번 집중하면 끝까지 파고드는 힘이 함께 강해요. "생각만 하는 아이"가 아니라 "계획하고 끝까지 실행하는 아이"에 가깝습니다.',
    opinionLead: '{name} 님은 계획력과 주의력이 또래 대비 최상위권으로 나타나, 목표를 세우고 몰입해서 실행하는 능력이 매우 뛰어난 아동입니다.',
    figureAnchor: '이순신', // 역사적 인물 섹션과 통일 (kpass-historical-figures.json 참고)
    careerTags: ['프로젝트 매니저', '연구원', '스포츠 감독·코치', '변호사', '엔지니어'],
    careerDesc: '목표를 세우고 끝까지 몰입해서 완수하는 힘이 필요한 분야에서 특히 두각을 나타낼 수 있어요.'
  },
  PS: {
    heroType: '비전 설계가형',
    heroSub: '큰 그림의 설계자',
    heroTags: ['#강한계획력', '#직관적사고', '#구조설계'],
    oneliner: '전체 그림을 한눈에 그리고, 그걸 실현할 순서를 세우는 균형 잡힌 설계자예요.',
    homeai: '머릿속에 그려둔 큰 그림이 있나요? 오늘은 그걸 작은 단계로 나눠볼까요?',
    temperament: '동시처리 능력이 또래보다 우수해, 부분보다 전체의 분위기와 의미를 먼저 파악하는 경향이 있어요. 여기에 계획력까지 강해, 떠오른 아이디어를 실행 단계로 옮기는 힘까지 갖추고 있습니다.',
    opinionLead: '{name} 님은 계획력과 동시처리 능력이 또래 대비 우수하게 나타나, 전체 상황을 파악하고 이를 구체적인 계획으로 옮기는 힘이 뛰어난 아동입니다.',
    figureAnchor: '장영실',
    careerTags: ['크리에이티브 디렉터', '공간·건축 디자이너', '콘텐츠 기획 PD', '스타트업 창업가', '제품 디자이너'],
    careerDesc: '직관적 창의성과 강한 계획력이 결합된 유형은, 창의적 기획을 실제 결과물로 완성해내는 분야에서 특히 두각을 나타낼 수 있어요.'
  },
  PQ: {
    heroType: '체계적 완성가형',
    heroSub: '차근차근 완성',
    heroTags: ['#강한계획력', '#꾸준한실행', '#차근차근'],
    oneliner: '큰 목표를 작은 단계로 쪼개고, 순서대로 끝까지 쌓아 올리는 뚝심 있는 완성가예요.',
    homeai: '오늘 할 일을 순서대로 하나씩 적어볼까요? {name}는 그 순서를 끝까지 지킬 수 있어요!',
    temperament: '전체 계획을 먼저 세우고, 정해진 순서를 흐트러뜨리지 않고 끝까지 밀고 나가는 힘이 강해요. 시작한 일을 중간에 놓지 않는 꾸준함이 돋보입니다.',
    opinionLead: '{name} 님은 계획력과 순차처리 능력이 또래 대비 우수하게 나타나, 목표를 세우고 순서에 따라 꾸준히 완성해내는 힘이 뛰어난 아동입니다.',
    figureAnchor: '정약용',
    careerTags: ['회계사·세무사', '연구원', '건축 시공관리', '데이터 분석가', '출판 편집자'],
    careerDesc: '정해진 절차를 정확히 지키면서 큰 목표를 향해 꾸준히 나아가는 분야에서 강점이 발휘돼요.'
  },
  AS: {
    heroType: '몰입 탐구가형',
    heroSub: '깊은 몰입의 눈',
    heroTags: ['#몰입주의력', '#직관적사고', '#세밀한관찰'],
    oneliner: '전체 분위기를 빠르게 읽으면서도, 관심 있는 대상은 깊이 파고드는 탐구가예요.',
    homeai: '오늘 유독 궁금한 게 있나요? {name}는 한번 빠지면 끝까지 파고드는 힘이 있어요!',
    temperament: '동시처리 능력이 또래보다 우수해 전체 상황을 빠르게 파악하고, 여기에 몰입력까지 더해져 관심 있는 것에는 깊이 파고드는 집중력을 보여요.',
    opinionLead: '{name} 님은 주의력과 동시처리 능력이 또래 대비 우수하게 나타나, 상황을 빠르게 파악하고 관심 분야에 깊이 몰입하는 힘이 뛰어난 아동입니다.',
    figureAnchor: '신사임당',
    careerTags: ['일러스트레이터·화가', '수의사', '요리사·파티시에', '큐레이터', '탐사보도 기자'],
    careerDesc: '전체를 보는 눈과 깊은 몰입이 함께 필요한, 관찰과 표현이 만나는 분야에서 강점이 발휘돼요.'
  },
  AQ: {
    heroType: '정밀 반복가형',
    heroSub: '집중의 화살',
    heroTags: ['#몰입주의력', '#정확한순서', '#꾸준한반복'],
    oneliner: '정해진 순서를 정확하게 지키며, 지치지 않고 반복해내는 성실한 실행가예요.',
    homeai: '오늘의 순서표를 하나씩 지켜볼까요? {name}는 끝까지 집중해서 해낼 수 있어요!',
    temperament: '순서를 정확히 따르는 힘과, 지루할 수 있는 반복을 오래 견디는 몰입력이 함께 강해요. 정확성과 꾸준함이 필요한 활동에서 진가가 나옵니다.',
    opinionLead: '{name} 님은 주의력과 순차처리 능력이 또래 대비 우수하게 나타나, 정해진 절차를 정확하고 꾸준하게 수행하는 힘이 뛰어난 아동입니다.',
    figureAnchor: '한석봉',
    careerTags: ['약사', '항공기 정비사', '프로그래머', '의료기사', '공예가'],
    careerDesc: '정확한 순서와 오랜 집중이 함께 필요한, 정밀함이 요구되는 분야에서 강점이 발휘돼요.'
  },
  SQ: {
    heroType: '이야기 구성가형',
    heroSub: '앞뒤가 맞는 이야기꾼',
    heroTags: ['#직관적사고', '#체계적구성', '#균형잡힌사고'],
    oneliner: '전체 그림을 떠올리고, 그걸 앞뒤가 맞는 순서로 풀어내는 이야기꾼이에요.',
    homeai: '머릿속에 떠오른 이야기가 있나요? {name}는 그걸 순서대로 잘 풀어낼 수 있어요!',
    temperament: '동시처리와 순차처리가 함께 강해, 전체 그림을 한눈에 그리면서도 그걸 논리적인 순서로 풀어내는 균형이 돋보여요.',
    opinionLead: '{name} 님은 동시처리와 순차처리 능력이 또래 대비 우수하게 나타나, 전체를 조망하면서도 논리적으로 풀어내는 힘이 뛰어난 아동입니다.',
    figureAnchor: '방정환',
    careerTags: ['작가·시나리오 작가', '영상 편집자', '애니메이터', '다큐멘터리 PD', '게임 기획자'],
    careerDesc: '전체 구상과 순서 있는 전개가 함께 필요한, 이야기를 만들어내는 분야에서 강점이 발휘돼요.'
  },
  BAL: {
    heroType: '균형 잡힌 만능형',
    heroSub: '두루 고른 균형감',
    heroTags: ['#고른능력', '#다재다능', '#유연한사고'],
    oneliner: '어느 한쪽에 치우치지 않고, 상황에 맞게 여러 방식을 두루 쓸 수 있는 균형가예요.',
    homeai: '오늘은 뭘 해도 골고루 잘 해낼 수 있어요! {name}는 어떤 미션이든 도전해볼까요?',
    temperament: '네 가지 인지 능력이 고르게 발달해 있어, 어느 한 가지 방식에 갇히지 않고 상황에 맞는 방법을 유연하게 골라 쓸 수 있어요.',
    opinionLead: '{name} 님은 네 가지 인지 영역이 또래 대비 고르게 나타나, 다양한 상황에 유연하게 대응할 수 있는 아동입니다.',
    figureAnchor: '세종대왕',
    careerTags: ['제너럴리스트 매니저', '컨설턴트', '교사', '기획자', 'PD'],
    careerDesc: '한 가지 방식에 치우치지 않고 여러 역할을 두루 소화해야 하는 분야에서 강점이 발휘돼요.'
  }
};

/* 균형형은 '영역 간 차이가 작다'는 뜻일 뿐, 모든 능력이 높다는 뜻은 아니다.
   전체점수 수준에 따라 발달지원형·안정형·고역량형으로 분리해 과장 표현을 방지한다. */
const BALANCED_CONTENT = {
  L: {
    heroType: '균형형(발달지원형)', heroSub: '고르게 자라는 중',
    heroTags: ['#고른프로파일', '#기초역량지원', '#작은성공부터'],
    oneliner: '네 영역이 비슷한 수준으로 나타났으며, 전반적인 기초 능력을 함께 키워가는 지원이 필요한 유형이에요.',
    homeai: '{name}에게는 어려운 미션보다 짧고 쉬운 활동부터 성공 경험을 쌓아가는 것이 좋아요.',
    temperament: '네 가지 인지 능력 사이의 차이는 크지 않지만 전반적인 수행 수준은 낮게 나타났어요. 특정 영역만 강조하기보다 아이의 속도에 맞춰 네 영역을 함께 지원해주는 것이 중요해요.',
    opinionLead: '{name} 님은 네 가지 인지 영역이 서로 비슷하게 나타난 균형형 프로파일입니다. 다만 전반적인 수행 수준이 낮게 나타나, 현재의 어려움과 지원 필요성을 추가로 확인하는 것이 좋습니다.',
    figureAnchor: '세종대왕',
    careerTags: ['다양한 놀이 경험', '기초학습 탐색', '흥미 발견 활동'],
    careerDesc: '진로를 일찍 정하기보다 다양한 놀이와 체험을 통해 흥미와 잠재 강점을 천천히 발견하는 과정이 우선이에요.'
  },
  M: {
    heroType: '균형형(안정형)', heroSub: '두루 고른 균형감',
    heroTags: ['#고른능력', '#안정적발달', '#유연한사고'],
    oneliner: '네 영역이 비교적 고르게 발달하여 상황에 따라 여러 인지전략을 유연하게 활용할 수 있어요.',
    homeai: '{name}는 여러 방식으로 배우고 도전할 수 있어요. 다양한 활동을 경험하며 좋아하는 것을 찾아볼까요?',
    temperament: '네 가지 인지 능력이 또래 범위에서 고르게 나타나, 어느 한 가지 방식에 치우치지 않고 상황에 맞는 방법을 활용할 수 있어요.',
    opinionLead: '{name} 님은 네 가지 인지 영역이 또래 범위에서 비교적 고르게 나타나, 다양한 상황에 안정적으로 대응할 수 있는 아동입니다.',
    figureAnchor: '세종대왕',
    careerTags: ['다양한 분야 탐색', '협동 프로젝트', '창의 체험 활동'],
    careerDesc: '한 분야를 서둘러 정하기보다 여러 활동을 경험하면서 관심과 강점이 구체화되는 과정을 지켜보는 것이 좋아요.'
  },
  H: {
    heroType: '균형형(고역량형)', heroSub: '높고 고른 인지 역량',
    heroTags: ['#고른강점', '#높은인지역량', '#유연한문제해결'],
    oneliner: '네 영역이 모두 높은 수준에서 고르게 발달하여 다양한 과제에 유연하게 대응할 수 있어요.',
    homeai: '{name}는 여러 인지 능력을 고르게 활용할 수 있어요. 조금 더 깊고 새로운 미션에 도전해볼까요?',
    temperament: '네 가지 인지 능력이 모두 높은 수준에서 고르게 발달해, 계획하고 집중하며 정보를 통합하고 순서대로 처리하는 힘을 폭넓게 활용할 수 있어요.',
    opinionLead: '{name} 님은 네 가지 인지 영역이 모두 높은 수준에서 고르게 나타난 고역량 균형형 프로파일입니다. 다양한 과제에 유연하게 대응할 잠재력이 돋보입니다.',
    figureAnchor: '세종대왕',
    careerTags: ['심화 탐구', '융합 프로젝트', '창의적 문제해결', '리더십 활동'],
    careerDesc: '여러 능력을 함께 활용하는 심화 탐구와 융합 프로젝트에서 잠재 역량을 폭넓게 발휘할 수 있어요.'
  }
};

/* 낮은 축(들) 공통 처리 — 조합과 무관, 어떤 축이든 같은 톤으로 서술 */
const WEAK_AXIS_BLOCK = {
  P: { name:'계획력', tip:'큰 일을 시작하기 전에 "어떤 순서로 할지" 한 줄로 먼저 적어보는 연습이 도움이 돼요.' },
  A: { name:'주의력', tip:'긴 활동은 짧게 끊어서, 중간에 작은 성취감을 자주 느끼게 해주는 방식이 잘 맞아요.' },
  S: { name:'동시처리', tip:'전체 그림을 먼저 보여주고 시작하면, 부분을 이해하는 데도 도움이 돼요.' },
  Q: { name:'순차처리', tip:'요리 레시피처럼 순서가 분명한 활동을 놀이처럼 반복해보면 좋아요.' }
};
function pickWeakAxis(scores){
  const ranked = [{k:'P',v:scores.P},{k:'A',v:scores.A},{k:'S',v:scores.S},{k:'Q',v:scores.Q}]
    .sort(function(a,b){ return a.v-b.v; });
  // 패치: 4개 축이 사실상 동점(균형)이면 "이게 약점"이라고 배열 순서(P)로 임의 지정하던 버그 수정.
  // 최저-최고 차이가 BALANCE_THRESHOLD 미만이면 특정 축을 약점으로 단정하지 않음(null 반환).
  if (ranked[3].v - ranked[0].v < BALANCE_THRESHOLD) return null;
  return ranked[0].k;
}

/* =====================================================================
   4) PROFILE → 화면에 필요한 모든 값 조립
   ===================================================================== */
function buildDerived(profile){
  const s = profile.scores; // {P,A,S,Q}
  const comboKey = pickComboKey(s);
  // 서버가 공식 전체척도 점수를 제공하면 그 값을 우선 사용한다.
  // 미리보기·검수 데이터에 전체척도가 없을 때만 4개 영역 평균을 임시 대체값으로 사용한다.
  const fullScaleScore = (typeof profile.fullScaleScore === 'number')
    ? profile.fullScaleScore
    : Math.round((s.P+s.A+s.S+s.Q)/4);
  const balancedTier = fullScaleScore <= 85 ? 'L' : (fullScaleScore >= 120 ? 'H' : 'M');
  const combo = comboKey === 'BAL' ? BALANCED_CONTENT[balancedTier] : COMBO_CONTENT[comboKey];
  const weakKey = pickWeakAxis(s);
  const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}]
    .sort(function(a,b){ return b.v-a.v; });
  // 패치: weakKey가 null(4축이 사실상 동점/균형)이면, 화면 렌더링용으로는 순위상 최저축을
  // 구조적 기본값으로 쓰되 isBalanced 플래그를 켜서 "이게 약점"이라는 단정적 문구 대신
  // 균형형 문구를 쓰도록 각 렌더 지점에서 분기한다.
  const isBalanced = weakKey === null;
  const effectiveWeakKey = weakKey || ranked[3].k;
  const weak = WEAK_AXIS_BLOCK[effectiveWeakKey];
  const pDelta = personalDelta(s);

  return {
    comboKey: comboKey,
    combo: combo,
    fullScaleScore: fullScaleScore,
    balancedTier: balancedTier,
    weakAxis: weak,
    weakAxisKey: effectiveWeakKey,
    isBalanced: isBalanced,
    ranked: ranked,
    personal: pDelta,
    perAxis: ['P','A','S','Q'].reduce(function(acc,k){
      acc[k] = {
        score: s[k],
        level: classifyLevel(s[k]),
        topPct: scoreToPercentileTop(s[k]),
        rankPct: scoreToPercentileRank(s[k]),
        barWidth: barWidthPct(s[k]),
        normStrong: isNormativeStrong(s[k]),
        personalStatus: pDelta.byAxis[k].status,
        personalDiff: pDelta.byAxis[k].diff
      };
      return acc;
    }, {}),
    compassPolygon: compassPolygon(s),
    strongCount: ['P','A','S','Q'].filter(function(k){ return isNormativeStrong(s[k]); }).length
  };
}

/* =====================================================================
   6) v2.0 — 축×티어(4×3=12) 조합형 개인화 레이어
   =====================================================================
   기존 COMBO_CONTENT(상위 2축 조합 7가지)는 그대로 두고, 그 위에 4개 축
   각각의 실제 티어(H/M/L)를 반영하는 "Modifier" 레이어를 추가한다.
   같은 top2 조합이라도 나머지 두 축의 티어, weak축의 정도, weak축을
   보완해줄 다른 축의 강도에 따라 학습법·성장포인트·진로 뉘앙스가
   실제로 달라지도록 만드는 것이 목적. (81개를 손으로 다 쓰는 대신
   4×3=12개 조각을 조합해 81가지 프로필을 자동으로 커버) */

// 축별 3단계(H/M/L) 학습법 카드 — 강점(H)이면 "활용법", 약점(L)이면 "보완법", 중간(M)이면 균형 프레이밍
// ===== 81가지 인지특성 프로파일 =====
// 4축(P/A/S/Q) 각각을 상(H,120+)/중(M,86~119)/하(L,85-) 3단계로 나누고,
// 각 조합마다 독립적인 문장 조각을 붙여 실제 점수 순위대로 엮는다.
// 3×3×3×3 = 81가지 조합이 전부 서로 다른 문단을 만들어낸다(축 이름만 바꾸는 게 아님).
const TRAIT_FRAGMENT = {
  P: {
    H: '계획을 세우고 실행하는 힘이 또래보다 뚜렷하게 강해서, 목표를 정하면 끝까지 구조화해서 밀고 나가는 편이에요.',
    M: '계획을 세우는 힘은 또래와 비슷한 수준으로, 상황에 따라 계획을 잘 활용하기도 하고 즉흥적으로 움직이기도 해요.',
    L: '계획을 세우고 순서를 정하는 데는 아직 도움이 필요한 편이라, 큰 목표를 작은 단계로 쪼개주는 지원이 도움이 돼요.',
  },
  A: {
    H: '한번 집중하면 방해받지 않고 오래 몰입하는 힘이 또래보다 뛰어나서, 관심 있는 일에는 깊이 파고들어요.',
    M: '집중력은 또래와 비슷한 수준으로, 흥미로운 활동에는 잘 몰입하지만 지루한 활동에서는 집중이 흐트러질 수 있어요.',
    L: '집중을 오래 유지하는 데는 아직 도움이 필요한 편이라, 짧고 반복적인 몰입 훈련이 도움이 돼요.',
  },
  S: {
    H: '여러 정보를 한 번에 종합해서 전체 그림을 그리는 힘이 또래보다 뛰어나서, 직관적으로 상황을 빠르게 파악해요.',
    M: '전체를 종합해서 보는 힘은 또래와 비슷한 수준으로, 필요할 때는 큰 그림을 그릴 수 있어요.',
    L: '여러 정보를 한 번에 통합해서 보는 데는 아직 도움이 필요한 편이라, 전체 그림을 먼저 보여주는 방식이 도움이 돼요.',
  },
  Q: {
    H: '정해진 순서를 정확하게 따라가는 힘이 또래보다 뛰어나서, 절차가 복잡한 과제도 차근차근 잘 해내요.',
    M: '순서를 지키는 힘은 또래와 비슷한 수준으로, 대체로 절차를 무리 없이 잘 따라가요.',
    L: '순서를 지키고 단계를 밟아가는 데는 아직 도움이 필요한 편이라, 절차를 눈에 보이게 쪼개주는 체크리스트가 도움이 돼요.',
  },
};
function buildProfile81(d, name) {
  const levelLabel = { H:'상', M:'중', L:'하' };
  const code = ['P','A','S','Q'].map(function(k){ return AXIS_LABEL[k]+levelLabel[d.perAxis[k].level]; }).join(' · ');
  // 실제 점수 순위(강점→약점) 순서로 4개 조각을 엮음 — 같은 조합이라도 축 순서·티어가 다르면 문장 전체가 달라짐
  const text = name + '는 ' + d.ranked.map(function(r, i){
    const frag = TRAIT_FRAGMENT[r.k][d.perAxis[r.k].level];
    return (i===0 ? '' : (i===3 ? '마지막으로, ' : '또한, ')) + frag;
  }).join(' ');
  return { code: code, text: text };
}

const AXIS_METHOD_CARD = {

  P: {
    H: { title:'목표 시각화 학습 플래너', body:'계획력이 강점이므로, 스스로 학습 목표를 세우고 체크하게 하면 몰입도가 훨씬 높아져요.', how:'주간 목표를 아이가 직접 적고, 완료 시 스스로 색칠하는 "나만의 미션보드" 활용' },
    M: { title:'짧은 목표 세우기 연습', body:'계획을 세우는 힘이 평균 수준이라, 너무 긴 계획보다 하루 단위의 작은 목표부터 연습하면 자신감이 붙어요.', how:'"오늘 할 일 3가지"를 아침에 함께 정해보고, 저녁에 체크하는 습관 들이기' },
    L: { title:'계획 세우기 보완 훈련', body:'계획력 보완을 위해, 스스로 계획을 짜기보다 짧고 구체적인 다음 할 일을 하나씩 제시해주는 방식이 도움이 돼요.', how:'"먼저 이것부터 하자" 카드를 만들어 한 번에 한 단계씩만 보여주기' },
  },
  A: {
    H: { title:'몰입 학습 블록제', body:'주의력이 매우 높은 편이라, 짧고 잦은 휴식보다 25~30분 몰입 후 확실히 쉬는 방식이 더 잘 맞아요.', how:'타이머로 "몰입 25분 → 자유 5분"을 반복하는 미니 뽀모도로 적용' },
    M: { title:'짧은 몰입 반복 연습', body:'집중을 유지하는 힘이 평균 수준이라, 처음엔 짧게(10~15분) 몰입하고 점점 늘려가는 방식이 잘 맞아요.', how:'타이머로 "몰입 10분 → 자유 5분"부터 시작해서 익숙해지면 시간을 늘리기' },
    L: { title:'몰입 지속력 보완 훈련', body:'주의력 보완을 위해, 한 번에 오래 붙잡기보다 짧은 구간으로 잘게 나누고 완료할 때마다 바로 인정해주는 방식이 효과적이에요.', how:'"5분만 해보자" 타이머 + 완료 시 바로 스티커 붙이기' },
  },
  S: {
    H: { title:'전체 그림 활용 학습법', body:'동시처리가 강점이므로, 세부 규칙보다 전체 구조·맥락을 먼저 보여주면 이해가 훨씬 빨라요.', how:'새 단원을 시작할 때 목차·마인드맵·그림으로 전체 구조를 먼저 보여주기' },
    M: { title:'그림으로 정리해보기', body:'전체를 통합해서 보는 힘이 평균 수준이라, 배운 내용을 그림이나 표로 한번 정리해보는 연습이 도움이 돼요.', how:'배운 내용을 마인드맵 한 장으로 그려보는 "오늘의 정리 그림" 활동' },
    L: { title:'전체 구조 보완 훈련', body:'동시처리 보완을 위해, 세부부터 시작하기보다 "전체가 몇 조각으로 나뉘는지"를 먼저 손으로 짚어가며 알려주는 게 도움이 돼요.', how:'퍼즐 조각을 미리 세어보고 맞추듯, 목차를 손가락으로 짚으며 "총 3부분이야" 알려주기' },
  },
  Q: {
    H: { title:'순서형 절차 활용법', body:'순차처리가 강점이므로, 여러 단계를 거치는 복잡한 과제도 순서만 정해주면 스스로 잘 해내요.', how:'긴 과제를 "①→②→③" 순서 카드로 미리 정리해서 스스로 진행하게 하기' },
    M: { title:'순서 정리 연습', body:'순서를 지키는 힘이 평균 수준이라, 복잡한 과제 전에 순서를 함께 한 번 말로 정리해보는 연습이 도움이 돼요.', how:'시작 전 "첫 번째는 뭘 할까?" 질문으로 순서를 소리 내어 말해보기' },
    L: { title:'순서형 과제 체크리스트화', body:'순차처리 보완을 위해, 수학 연산이나 받아쓰기처럼 순서가 중요한 과제는 단계를 눈에 보이게 쪼개주세요.', how:'"①문제 읽기 ②식 세우기 ③계산 ④검산" 4단계 체크카드를 옆에 두고 하나씩 체크' },
  },
};

// 성장포인트 Modifier — weak축 자체의 티어 + "보완해줄 수 있는" 차상위축의 티어 조합에 따라 다른 훈련법 제시
function buildSupportModifier(d) {
  const weakKey = d.weakAxisKey;
  const weakScore = d.perAxis[weakKey].score;
  const secondKey = d.ranked[0].k === weakKey ? d.ranked[1].k : d.ranked[0].k; // weak축이 아닌 최고축
  const secondLevel = d.perAxis[secondKey].level;
  const secondLabel = AXIS_LABEL[secondKey];
  const weakIsVeryLow = weakScore <= 70;
  const MODIFIER = {
    P: { boostHigh:'목표를 직접 정하기보다, '+secondLabel+' 강점을 살려 이미 강한 방식(예: 몰입해서 끝까지 하기)으로 접근한 뒤 "그다음엔 뭘 할까"를 함께 정리해주는 방식이 잘 맞아요.', boostLow:'아직 도와줄 다른 강한 축이 뚜렷하지 않은 편이라, 아주 작은 단위(한 가지 할 일)부터 어른이 먼저 제시해주고 점차 스스로 정하는 범위를 넓혀가는 게 좋아요.' },
    A: { boostHigh:secondLabel+' 강점이 있어서, 관심 있는 주제·놀이 형태로 접근하면 몰입 지속 시간이 자연스럽게 늘어나요.', boostLow:'짧은 시간부터 시작해서 성취 경험을 자주 쌓아주는 것이 가장 중요하고, 다른 강점 축과 연결하기보다는 반복 자체에 집중하는 게 좋아요.' },
    S: { boostHigh:secondLabel+' 강점을 활용해서, 순서대로 하나씩 짚어가다 보면 자연스럽게 전체 그림이 그려지도록 유도할 수 있어요.', boostLow:'아직 순서형 접근으로도 전체 통합이 쉽지 않을 수 있어, 그림·사진처럼 시각적으로 "완성된 모습"을 먼저 보여주고 시작하는 게 도움이 돼요.' },
    Q: { boostHigh:secondLabel+' 강점 덕분에, 전체 그림을 먼저 보여준 뒤 "이제 순서를 나눠볼까"로 이어가면 순서 감각도 자연스럽게 늘어요.', boostLow:'전체 그림으로 접근해도 순서 유지가 쉽지 않을 수 있어, 아주 짧은 2~3단계짜리 순서부터 반복 연습하며 성공 경험을 쌓는 게 우선이에요.' },
  };
  const m = MODIFIER[weakKey];
  return (secondLevel === 'H' && !weakIsVeryLow) ? m.boostHigh : m.boostLow;
}


// 기질카드 4개 — 축별 3티어(H/M/L) 강점/보완 문구 (GPT 지적사항: 4카드 전부 완전고정이던 것 수정)
const TEMP_CARD = {
  react: { // 반응강도 → 주의력(A) 기준
    H: { strongTitle:'빠른 상황 대처', strongLi:['새로운 환경 변화를 즐기고, 낯선 상황에도 적극적으로 도전해요','관심 있는 것에는 오래도록 몰입해서 파고들어요'], weakTitle:'세부 끈기', weakLi:['순서가 정해진 반복 과제에서는 다소 쉽게 흥미를 잃을 수 있어요','다만 주의력이 매우 높아 관심 있는 주제에서는 이 부분이 크게 상쇄돼요'] },
    M: { strongTitle:'적당한 호기심', strongLi:['새로운 것에 흥미를 보이고 곧잘 시도해봐요'], weakTitle:'몰입 지속', weakLi:['흥미가 옅은 활동에서는 집중이 오래가지 않을 수 있어요','짧게 자주 반복하는 방식이 잘 맞아요'] },
    L: { strongTitle:'솔직한 반응', strongLi:['좋고 싫음을 분명하게 표현해요'], weakTitle:'몰입 지속력 보완', weakLi:['한 가지 활동에 오래 머무르기 어려울 수 있어요','짧은 시간부터 시작해서 성취 경험을 자주 쌓아주면 좋아요'] },
  },
  adapt: { // 적응성 → 계획력(P) 기준
    H: { strongTitle:'목표 지향적 적응', strongLi:['새 환경에서도 스스로 목표를 세우고 빠르게 자리를 잡아요','계획력이 강해 변화 속에서도 나름의 질서를 만들어내요'], weakTitle:'계획 밖 변수', weakLi:['세워둔 계획이 갑자기 틀어지면 잠시 당황할 수 있어요','"계획이 바뀌어도 괜찮다"는 경험을 자주 만들어주면 좋아요'] },
    M: { strongTitle:'무난한 적응', strongLi:['낯선 환경에도 큰 무리 없이 적응해가요'], weakTitle:'계획 세우기', weakLi:['스스로 계획을 세우는 건 아직 낯설 수 있어요','짧고 구체적인 다음 할 일부터 하나씩 제시해주면 도움이 돼요'] },
    L: { strongTitle:'유연한 즉흥성', strongLi:['정해진 계획 없이도 상황에 맞춰 자연스럽게 움직여요'], weakTitle:'계획 세우기 보완', weakLi:['스스로 순서를 정하는 것을 어려워할 수 있어요','"먼저 이것부터 하자" 카드로 한 번에 한 단계씩 안내해주세요'] },
  },
  mood: { // 기분의 질 → 최고축 수준(H/M) × 최약축 수준(M/L) 조합별로 문장 자체가 달라짐
    render: function(topLabel, topLevel, weakLabel, weakLevel){
      const strong = (topLevel === 'H')
        ? { title:'성취 기반의 강한 안정감', li:['목표를 달성했을 때 크고 분명한 성취감과 자신감을 느껴요','몰입 후의 만족감이 다음 도전으로 강하게 이어지는 선순환이 있어요'] }
        : { title:'꾸준한 성취감', li:['작은 목표를 이뤄갈 때마다 차분하지만 분명한 만족감을 느껴요','성취 경험이 쌓일수록 자신감이 서서히 단단해지는 편이에요'] };
      const weak = (weakLevel === 'L')
        ? { title:'완벽 기준에 대한 부담', li:[weakLabel+'처럼 아직 낯선 영역에서 스스로 세운 기준에 못 미치면 기분이 크게 가라앉을 수 있어요','"70%만 해도 충분하다"는 기준을 자주, 구체적으로 이야기해주세요'] }
        : { title:'적당한 완벽 기준', li:[weakLabel+'에서 뜻대로 안 될 때 약간 아쉬워할 수 있지만, 크게 흔들리지는 않는 편이에요','"이 정도면 잘했다"는 말로 가볍게 인정해주는 정도면 충분해요'] };
      return { strongTitle: strong.title, strongLi: strong.li, weakTitle: weak.title, weakLi: weak.li };
    }
  },
  think: { // 사고양식 → 동시처리(S) vs 순차처리(Q) 비교
    S: { strongTitle:'직관적 종합 사고', strongLi:['여러 정보를 빠르게 하나의 그림으로 묶어서 이해해요'], weakTitle:'순서 검증', weakLi:['결론까지 가는 과정을 하나씩 짚어보는 습관을 붙이면 실수가 줄어요'] },
    Q: { strongTitle:'차근차근 문제해결', strongLi:['순서를 하나씩 밟아가며 꼼꼼하게 풀어가요'], weakTitle:'전체 그림 보기', weakLi:['결론부터 먼저 큰 그림을 그려보는 연습을 더하면 이 강점이 한층 완성돼요'] },
    BAL: { strongTitle:'균형 잡힌 문제해결', strongLi:['직관과 논리 중 한쪽에 치우치지 않고 상황에 맞게 오갈 수 있어요','복잡한 문제도 나름의 순서를 세워 차근히 풀어가요'], weakTitle:'결정 속도', weakLi:['여러 방법을 다 검토하느라 결정이 다소 늦어질 수 있어요','"3분 안에 하나만 고르기" 같은 짧은 결정 연습이 도움돼요'] },
  },
};
function renderTempCard(strongTitle, strongLi, weakTitle, weakLi){
  return '<div class="sw-box strong"><div class="lbl">✓ 강점 · '+strongTitle+'</div><ul>'+strongLi.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>'+
         '<div class="sw-box weak"><div class="lbl">△ 보완 포인트 · '+weakTitle+'</div><ul>'+weakLi.map(function(t){return '<li>'+t+'</li>';}).join('')+'</ul></div>';
}

// 놀이법 카테고리 — 축별 놀이 (강점강화=top1축, 강점발휘=top2축, 보완훈련=weak축)
const PLAY_BY_AXIS = {
  P: { chip:'계획력', color:'primary', title:'계획력을 발휘하는 놀이', items:[['전략 보드게임','체스, 카탄 주니어 등 계획을 세워 진행하는 게임'],['나만의 가게 놀이','예산 정하기 → 물건 준비 → 운영까지 직접 기획'],['장기 프로젝트 만들기','로봇 조립, 종이접기 연작처럼 여러 날에 걸쳐 완성하는 활동'],['일과 계획표 만들기','다음날 할 일을 순서대로 계획해보는 놀이']] },
  A: { chip:'몰입력', color:'primary', title:'몰입력을 발휘하는 놀이', items:[['미로·퍼즐 챌린지','시간을 정해두고 몰입해서 끝까지 풀어보기'],['한 가지 주제 깊이 파기','좋아하는 주제(공룡, 우주 등)를 도감처럼 깊게 탐구하기'],['조립형 장난감','레고·프라모델처럼 오래 몰입해서 완성하는 활동'],['긴 이야기책 읽기 챌린지','한 챕터씩 몰입해서 끝까지 읽어내기']] },
  S: { chip:'직관·창의력', color:'good', title:'직관·창의력을 키우는 놀이', items:[['딕시(Dixit)','애매한 그림 카드로 이야기 상상하기 — 직관적 해석력 강화'],['자유 그리기 · 만들기','주제만 던져주고 표현 방식은 아이에게 맡기기'],['레고 자유조립','설명서 없이 상상한 것을 직접 구현해보기'],['스토리텔링 카드놀이','그림카드 3장으로 즉석 이야기 만들기']] },
  Q: { chip:'순서 감각', color:'accent', title:'순서 감각을 기르는 놀이', items:[['도미노 줄세우기','정해진 순서로 배치해야 완성되는 놀이'],['레시피 따라 요리하기','순서를 지켜야 결과물이 나오는 대표적 순차 활동'],['타워 오브 하노이','단계별 규칙을 지켜야 풀리는 순서 퍼즐'],['순서카드 배열게임','그림카드를 이야기 순서대로 배열하기']] },
};
const CHIP_BG = { primary:'var(--primary-soft)', good:'var(--good-bg)', accent:'var(--accent-soft)' };
const CHIP_INK = { primary:'var(--primary-deep)', good:'var(--good-ink)', accent:'var(--accent)' };
function renderPlayCat(axisKey, tagLabel){
  const p = PLAY_BY_AXIS[axisKey];
  return '<div class="play-cat"><h4><span class="tagchip" style="background:'+CHIP_BG[p.color]+';color:'+CHIP_INK[p.color]+';">'+tagLabel+'</span>'+p.title+'</h4>'+
    '<div class="play-grid">'+p.items.map(function(it){return '<div class="play-item"><b>'+it[0]+'</b><span>'+it[1]+'</span></div>';}).join('')+'</div></div>';
}

// 습관들이기 카드 — 4축 각각의 습관 1개씩, 실제 순위(강점부터) 순서로 배치
const HABIT_BY_AXIS = {
  P: { ico:'🎯', title:'주간 목표 스티커 보드', body:'일요일 저녁, 이번 주 목표 1~2개를 정하고 완료할 때마다 스티커를 붙이는 습관. 계획력 강점을 강화해요.', freq:'주 1회 설정 · 매일 체크' },
  A: { ico:'⏱️', title:'몰입 타이머 학습', body:'숙제 시작 전 타이머를 맞추고 "이 시간엔 딴짓 없이 몰입" 규칙을 정해요. 높은 주의력을 학습에 그대로 연결해요.', freq:'학습 시마다' },
  S: { ico:'🌙', title:'저녁 5분 · 오늘 이야기', body:'자기 전, "오늘 제일 재밌었던 것 하나"를 자유롭게 설명해보게 하기. 전체를 하나로 묶어 표현하는 힘을 키워요.', freq:'매일 저녁' },
  Q: { ico:'🌅', title:'아침 3분 · 오늘의 순서표', body:'등교 전, 오늘 할 일 3가지를 순서대로 적어보는 습관. 순차처리를 자연스럽게 훈련해요.', freq:'매일 아침' },
};

// 과목별 학습법 — top1 축 기준으로 4과목 팁 전환
const SUBJECT_TIPS = {
  P: { kor:'목차를 먼저 훑고 전체 계획을 세운 뒤 정독하는 순서가 잘 맞아요. 추천 도서 — 위인전(계획·실행형 인물 이야기)', math:'문제 풀이 "전략 세우기"는 강점이에요. 문제 풀기 전 "어떤 순서로 풀지" 1줄로 먼저 적어보기', eng:'목표 단어 수를 스스로 정하고 계획대로 채워가는 방식이 잘 맞아요.', art:'기획-실행이 필요한 활동(작품 완성, 공연 준비)에서 강점이 크게 드러나요. 발표회·전시 등 "완성해서 보여주는" 형태의 활동 추천' },
  A: { kor:'좋아하는 주제의 책을 골라 깊이 몰입해서 읽는 방식이 잘 맞아요. 추천 도서 — 몰입도 높은 장편 이야기', math:'한 유형에 깊게 파고드는 방식이 잘 맞아요. 어려운 심화 문제 1개를 오래 붙잡는 것도 좋아요.', eng:'몰입도가 높아 한 번에 집중해서 익히는 몰입형 학습(하루 20분 집중)이 짧고 자주보다 효과적이에요.', art:'관심 있는 하나의 활동에 깊이 몰입하는 방식에서 강점이 크게 드러나요.' },
  S: { kor:'전체 줄거리를 먼저 파악한 뒤 세부 내용을 읽는 순서가 잘 맞아요. 추천 도서 — 추리소설·미스터리(퍼즐형 서사)', math:'여러 개념을 하나의 그림으로 묶어보는 연습이 도움돼요.', eng:'이야기를 통으로 먼저 듣고 전체 맥락을 파악한 뒤 세부를 확인하는 방식이 잘 맞아요.', art:'전체 구상을 떠올리고 표현하는 활동(그림, 공연 기획)에서 강점이 크게 드러나요.' },
  Q: { kor:'문단을 순서대로 하나씩 정독하는 방식이 잘 맞아요. 추천 도서 — 순차적 전개가 뚜렷한 성장 이야기', math:'계산 순서를 지키는 검산 습관이 강점으로 이어져요.', eng:'단어·문장을 순서대로 반복하며 익히는 방식이 잘 맞아요.', art:'순서가 정해진 절차형 활동(악기 연습, 단계별 만들기)에서 강점이 크게 드러나요.' },
};

// 부모 대화 스크립트 — weak축 기준으로 2개 상황 전환
const PARENT_SCRIPT = {
  P: [['계획대로 안 됐을 때','"계획이 틀어진 것도 하나의 정보야. 다시 세워보자" 라고 실패가 아닌 조정의 언어로 말해주세요'], ['목표를 못 정할 때','"오늘 딱 하나만 정해볼까?" 라고 작은 단위부터 스스로 정하게 도와주세요']],
  A: [['금방 흥미를 잃을 때','"조금만 더 해보고 쉴까?" 라고 짧은 목표를 제시해주세요'], ['몰입이 안 될 때','"5분만 집중해볼까?" 라고 부담을 줄여서 제안해주세요']],
  S: [['생각이 뒤죽박죽일 때','"하나씩 순서대로 말해줄래?" 라고 정리를 도와주세요'], ['전체를 못 볼 때','"그래서 결론은 뭐야?" 라고 핵심부터 물어봐주세요']],
  Q: [['순서를 건너뛰었을 때','"어떤 순서로 했는지 나한테 설명해줄래?" 라고 물어 스스로 순서를 되짚게 해주세요'], ['절차가 헷갈릴 때','"처음부터 하나씩 다시 해볼까?" 라고 차근차근 안내해주세요']],
};

/* =====================================================================
   5) DOM 적용 — id 기반. 실제 배포 파일의 id 네이밍에 맞춰 조정하세요.
   ===================================================================== */
function applyPersonalization(profile){
  const d = buildDerived(profile);
  const name = profile.name;
  function byId(id){ return (typeof document!=='undefined') ? document.getElementById(id) : null; }
  function setText(id, text){ const el=byId(id); if(el) el.textContent = text; }
  function setHTML(id, html){ const el=byId(id); if(el) el.innerHTML = html; }

  // --- 신원 ---
  if (typeof document!=='undefined') document.title = name+' 님의 K-PASS 결과지';
  setHTML('pf-childchip', '<b>'+name+'</b> <span>· '+profile.gender+' · '+profile.age+' · '+profile.testDate+'</span>');
  setText('pf-avatar', name ? name.charAt(name.length-1) : '');
  setText('pf-heroname', name+' · '+profile.gender+' · '+profile.age);
  setText('pf-summarydesc', name+'의 검사 결과를 한눈에 볼 수 있는 요약 화면입니다.');

  // --- 히어로 카드 ---
  setText('pf-herotype', d.combo.heroType);
  setText('pf-cover-type', d.combo.heroType);

  // 81가지 인지특성 프로파일 — 4축×3티어 실제 조합
  const p81 = buildProfile81(d, name);
  setHTML('pf-profile81-code', ['P','A','S','Q'].map(function(k){
    const lv = d.perAxis[k].level;
    const cls = lv==='H' ? 'strength' : (lv==='L' ? 'growth' : '');
    return '<span class="'+cls+'">'+AXIS_LABEL[k]+' '+(lv==='H'?'상':lv==='M'?'중':'하')+'</span>';
  }).join(''));
  setText('pf-profile81-text', p81.text);
  // 항목1: 표지 인지ID 코드 — 실제 4축(P/A/S/Q) 티어(H/M/L) 조합으로 생성, 부제는 콤보별 짧은 태그라인
  const tierCode = d.perAxis.P.level + d.perAxis.A.level + d.perAxis.S.level + d.perAxis.Q.level;
  setText('pf-cover-code', 'NO. ' + d.comboKey + '-' + tierCode);
  setText('pf-herosub', d.combo.heroSub);
  setText('pf-herosub2', d.combo.heroSub);
  setText('pf-herooneliner', d.combo.oneliner);
  setHTML('heroTags', d.combo.heroTags.map(function(t){return '<span>'+t+'</span>';}).join(''));
  setHTML('coverTags', d.combo.heroTags.map(function(t){return '<span>'+t+'</span>';}).join(''));
  setText('coverTitle', name+' 프로파일');
  setText('coverMeta', profile.gender+' · '+profile.age+' · 검사일 '+profile.testDate);

  // --- 인지 나침반 ---
  const poly = byId('pf-compasspoly');
  if (poly) poly.setAttribute('points', d.compassPolygon);
  ['P','A','S','Q'].forEach(function(k){
    const a = d.perAxis[k];
    const sub = a.normStrong ? '또래 상위 '+a.topPct+'%' : '또래 평균 수준';
    setHTML('pf-legend-'+k, '<b>'+AXIS_LABEL[k]+' '+a.score+'</b>'+sub);
  });

  // 항목3: 강점·보완점 배지 3개 — 실제 축 순위 반영, 균형형은 임의 지정 안 함
  const STRENGTH_DESC = {
    P: '스스로 방법을 고안하고 끝까지 실행하는 힘이 또래보다 매우 뛰어나요',
    A: '한번 집중하면 방해받지 않고 끝까지 파고들어요',
    S: '여러 정보를 빠르게 종합해 전체 그림을 잘 그려내요',
    Q: '정해진 순서와 절차를 정확하게 잘 따라가요',
  };
  const badge1El = byId('pf-badge1'), badge2El = byId('pf-badge2'), badge3El = byId('pf-badge3');
  if (d.isBalanced) {
    const balancedBadge = d.balancedTier === 'L'
      ? '<b>고르게 나타난 인지 프로파일</b><span>영역 간 차이는 작지만, 네 영역의 기초 능력을 함께 지원해주는 것이 필요해요</span>'
      : (d.balancedTier === 'H' ? '<b>높고 고르게 발달한 인지 능력</b><span>네 가지 영역이 모두 높은 수준에서 균형 있게 발달했어요</span>' : '<b>안정적으로 고른 인지 능력</b><span>네 가지 영역이 또래 범위에서 비교적 고르게 나타났어요</span>');
    if (badge1El) badge1El.querySelector('.txt').innerHTML = balancedBadge;
    if (badge2El) { badge2El.style.display = 'none'; }
    if (badge3El) { badge3El.querySelector('.ico').textContent='＋'; badge3El.querySelector('.txt').innerHTML = d.balancedTier === 'L' ? '<b>추천 — 고른 기초 지원</b><span>짧고 쉬운 활동부터 네 영역의 성공 경험을 함께 쌓아주세요</span>' : '<b>추천 — 폭넓은 경험</b><span>특정 영역 보완보다 다양한 활동을 골고루 경험하는 게 도움이 돼요</span>'; badge3El.classList.remove('growth'); badge3El.classList.add('strength'); }
  } else {
    if (badge2El) badge2El.style.display = '';
    if (badge3El) { badge3El.classList.add('growth'); badge3El.classList.remove('strength'); badge3El.querySelector('.ico').textContent='＋'; }
    const top1k = d.ranked[0].k, top2k = d.ranked[1].k;
    if (badge1El) badge1El.querySelector('.txt').innerHTML = '<b>가장 빛나는 강점 — '+AXIS_LABEL[top1k]+'</b><span>'+STRENGTH_DESC[top1k]+'</span>';
    if (badge2El) badge2El.querySelector('.txt').innerHTML = '<b>두 번째 강점 — '+AXIS_LABEL[top2k]+'</b><span>'+STRENGTH_DESC[top2k]+'</span>';
    if (badge3El) badge3El.querySelector('.txt').innerHTML = '<b>함께 키워가면 좋은 부분 — '+d.weakAxis.name+'</b><span>'+d.weakAxis.tip+'</span>';
  }

  // 항목2: 나침반 각주 — 상대비교(학습유형, 연령별 공식기준) vs 절대구간(81유형 캐릭터) 실제 값으로 생성
  (function(){
    const sSc = d.perAxis.S.score, qSc = d.perAxis.Q.score;
    const ageForNote = (typeof profile.ageYears === 'number') ? profile.ageYears : 6;
    const noteThreshold = (ageForNote <= 5) ? 11 : 10;
    const noteDiff = qSc - sSc; // >0 이면 순차처리가 더 높음
    const relBalanced = Math.abs(noteDiff) <= noteThreshold;
    const relDominant = relBalanced ? null : (noteDiff < 0 ? '동시처리' : '순차처리');
    const sLv = d.perAxis.S.level, qLv = d.perAxis.Q.level;
    const absSame = sLv === qLv; // 절대구간(H/M/L)이 같으면 캐릭터 분류상 밸런스
    const noteEl = byId('pf-compass-footnote');
    if (noteEl) {
      if (relBalanced && absSame) {
        noteEl.textContent = '';
      } else if (!relBalanced && absSame) {
        noteEl.textContent = '※ 학습 스타일상으로는 동시처리(' + sSc + ')가 순차처리(' + qSc + ')보다 ' + (noteDiff < 0 ? '높아' : '낮아') + ' "' + relDominant + ' 우세형 학습자"이지만, 81유형 캐릭터 분류는 절대 점수 구간(상 120↑) 기준이라 두 영역 모두 \'' + (sLv==='H'?'상':(sLv==='M'?'중':'하')) + '\' 구간에 속해 밸런스형 캐릭터로 분류돼요. 두 기준 모두 유효하며 목적이 다릅니다 — 학습법은 상대 비교, 캐릭터/카드는 절대 구간을 씁니다.';
      } else if (relBalanced && !absSame) {
        noteEl.textContent = '※ 동시처리(' + sSc + ')와 순차처리(' + qSc + ')는 상대 비교 기준으로는 균형(학습유형: 균형형)이지만, 절대 점수 구간은 서로 달라 81유형 캐릭터 분류에서는 다른 구간으로 나뉘어요. 두 기준 모두 유효하며 목적이 다릅니다 — 학습법은 상대 비교, 캐릭터/카드는 절대 구간을 씁니다.';
      } else {
        noteEl.textContent = '※ 동시처리(' + sSc + ')와 순차처리(' + qSc + ') 모두 상대 비교와 절대 구간 기준이 일치해요 — "' + relDominant + ' 우세형 학습자"이자, 81유형 캐릭터 분류에서도 같은 방향으로 반영됩니다.';
      }
    }
  })();

  // --- homeAI 한마디 ---
  setText('pf-homeai', d.combo.homeai.replace(/\{name\}(는|은)/g, function(m,p1){ return josa(name,'은는'); }).replace(/\{name\}/g, name));

  // --- 기질특성 ---
  setText('pf-temperament', d.combo.temperament);
  const TEMP_SECDESC = {
    P: '스스로 계획을 세우고, 끝까지 실행하는 아이', A: '한번 집중하면, 깊이 파고드는 아이',
    S: '직관적으로 판단하고, 전체를 먼저 보는 아이', Q: '순서를 지키며, 차근차근 완성하는 아이',
  };
  setText('pf-temp-secdesc', d.isBalanced
    ? (d.balancedTier === 'L' ? '네 영역을 함께 천천히 키워가는 아이' : (d.balancedTier === 'H' ? '여러 인지 능력을 높고 고르게 활용하는 아이' : '여러 인지 방식을 고르게 활용하는 아이'))
    : TEMP_SECDESC[d.ranked[0].k]);
  setHTML('pf-temp-tags', d.combo.heroTags.map(function(t){return '<span>'+t+'</span>';}).join(''));

  // 항목6: 재능강점 도입문 — 규준적(또래 대비) × 개인내(자기 자신 대비) 강점 여부 조합
  const top1IsNormStrong = d.perAxis[d.ranked[0].k].normStrong;
  if (top1IsNormStrong && !d.isBalanced) {
    setText('pf-strength-intro', '또래 대비, 자기 자신 대비 모두 뚜렷한 강점 영역이에요.');
  } else if (top1IsNormStrong && d.isBalanced) {
    setText('pf-strength-intro', '또래 대비로는 강점이 뚜렷하지만, 본인 안에서는 네 영역이 고르게 발달했어요.');
  } else if (!top1IsNormStrong && !d.isBalanced) {
    setText('pf-strength-intro', '또래 대비로는 평균 수준이지만, 본인 안에서는 상대적으로 두드러진 강점 영역이에요.');
  } else {
    setText('pf-strength-intro', d.balancedTier === 'L' ? '본인 안에서 네 영역의 차이는 작지만, 또래 기준으로는 전반적인 지원이 필요한 수준이에요.' : '또래 대비로도, 본인 안에서도 특별히 두드러지는 영역보다는 고르게 나타난 프로파일이에요.');
  }

  // --- 역사적 인물 (kpass-figure-render.js + kpass-historical-figures.json 연동 지점) ---
  if (typeof global.renderFigureSection === 'function' && global.FIGURE_DATA) {
    setHTML('pf-figuresection', global.renderFigureSection(
      { P:s_(profile,'P'), A:s_(profile,'A'), S:s_(profile,'S'), Seq:s_(profile,'Q') },
      global.FIGURE_DATA
    ));
  }

  // --- 재능 매트릭스 (또래 대비) ---
  ['P','A','S','Q'].forEach(function(k){
    const a = d.perAxis[k];
    const fill = byId('pf-matrixfill-'+k);
    if (fill){ fill.style.width = a.barWidth+'%'; fill.querySelector('span') && (fill.querySelector('span').textContent = a.score); }
    setHTML('pf-matrixstatus-'+k,
      a.normStrong
        ? (a.personalStatus==='PS' ? '<b class="up">이중강점</b>상위 '+a.topPct+'%' : '<b class="up">규준강점</b>상위 '+a.topPct+'%')
        : '<b class="midc">평균권</b>상위 '+a.topPct+'%');
  });
  setText('pf-strongcount', d.strongCount+'/4');
  setHTML('pf-strongcountdesc', '4개 인지 영역 중 <b style="color:var(--ink);">'+d.strongCount+'개 영역('+Math.round(d.strongCount/4*100)+'%)</b>이 또래 대비 강점 구간이에요.');

  // --- 13번 전문가 페이지: 하위척도별 지수 ---
  // ★ 95%CI는 하위척도별 신뢰도 계수(SEM)가 있어야 정확히 계산됩니다.
  //   그 값이 없어 지금은 "확인필요"로 표시합니다 — 기술 매뉴얼 원본 수치로 교체 필요.
  const EVAL_TEXT = {
    H: ['매우 우수합니다.', '우수합니다.'],   // [강한 H(>=130), 일반 H]
    M: '평균적인 수준입니다.',
    L: '보완이 필요한 수준입니다.'
  };
  ['P','A','S','Q'].forEach(function(k){
    const a = d.perAxis[k];
    setText('pf-exp-num-'+k, String(a.score));
    setText('pf-exp-sub-'+k, '또래 백분위 '+a.rankPct.toFixed(1)+' (95%CI는 전문가 감수 후 공개 예정)');
    const marker = byId('pf-exp-marker-'+k);
    if (marker){ marker.style.left = a.barWidth+'%'; marker.textContent = String(a.score); }
    const catEl = byId('pf-exp-cat-'+k);
    if (catEl){
      catEl.className = 'cat ' + (a.level==='H'?'ns':a.level==='L'?'weak':'mid');
      catEl.textContent = a.level==='H'?'규준적 강':a.level==='L'?'규준적 약':'평균 수준';
    }
    let evalStr;
    if (a.level==='H') evalStr = '또래 대비 '+(a.score>=130?EVAL_TEXT.H[0]:EVAL_TEXT.H[1]);
    else if (a.level==='L') evalStr = '또래 대비 '+EVAL_TEXT.L;
    else evalStr = '또래와 비교해 '+EVAL_TEXT.M;
    setText('pf-exp-eval-'+k, evalStr);
  });

  // 항목10: 전체 지능지수(Full Scale) — 4축 평균 기반 실제 계산(기존엔 134 고정값)
  const fullScaleScore = d.fullScaleScore;
  const fullScalePct = scoreToPercentileRank(fullScaleScore);
  const fullScaleLevel = fullScaleScore >= 130 ? '매우 높음' : (fullScaleScore >= 120 ? '높음' : (fullScaleScore >= 110 ? '평균 상' : (fullScaleScore >= 90 ? '평균' : (fullScaleScore >= 80 ? '평균 하' : '낮음'))));
  setText('pf-fullscale-score', String(fullScaleScore));
  setText('pf-fullscale-oneliner', '또래 아동 대비 백분위 ' + fullScalePct + ' — ' + fullScaleLevel + ' 수준입니다. 표준점수 평균 100, 표준편차 15를 기준으로 산출되었습니다. (계획력·주의력·동시처리·순차처리 4개 영역 평균)');
  setHTML('pf-fullscale-tags', '<span>95%CI는 전문가 감수 후 공개 예정</span><span>백분위 ' + fullScalePct + '</span><span>' + fullScaleLevel + '</span>');
  setText('pf-side-fullscale', String(fullScaleScore));
  ['P','A','S','Q'].forEach(function(k){ setText('pf-side-'+k, String(d.perAxis[k].score)); });

  // 전체점수·주의력 저점수 안내 — K-PASS 아동용 문구만 사용한다.
  // '신뢰할 수 없음'으로 단정하지 않고, 수행이 과소평가됐을 가능성과 추가 평가 필요성을 안내한다.
  const noticeEl = byId('pf-clinicalnotice');
  if (noticeEl) {
    if (fullScaleScore <= 85 && d.perAxis.A.score <= 85) {
      noticeEl.style.display = 'block';
      noticeEl.innerHTML = '<b style="color:#A44B16;">주의력 영향을 고려한 신중한 해석이 필요합니다.</b><br>전체점수와 주의력 점수가 모두 85점 이하로 나타났습니다. 검사 과정에서 주의 집중의 어려움이 다른 영역의 수행에도 영향을 주어 실제 능력보다 낮게 측정되었을 가능성이 있으므로, 이번 결과만으로 아동의 전반적인 능력 수준을 단정하기 어렵습니다. 보호자와 담임교사가 관찰한 일상생활 및 학습 상황에서의 주의 집중 양상도 함께 확인해 주세요. 정확한 상태를 파악하기 위해 아동 심리·교육 또는 의료 전문기관을 방문하여 주의력과 인지기능에 대한 정밀평가를 받아보시기를 권고합니다.<br><span style="font-size:11.5px;color:var(--ink-faint);">※ 본 검사는 현재의 인지적 특성과 수행 경향을 이해하기 위한 자료이며, 단독으로 의학적·심리적 진단을 내리는 검사가 아닙니다.</span>';
    } else if (fullScaleScore <= 85 && d.perAxis.A.score > 85) {
      noticeEl.style.display = 'block';
      noticeEl.innerHTML = '<b style="color:#A44B16;">전반적인 수행 수준에 대한 추가 확인을 권고합니다.</b><br>주의력 점수는 85점을 초과했으나 전체점수가 85점 이하로 나타났습니다. 특정 인지 영역의 어려움이나 학습 경험, 정서 상태, 검사 환경 등이 결과에 영향을 주었는지 추가로 확인할 필요가 있습니다. 이번 결과만으로 원인을 단정하지 말고, 아동 심리·교육 또는 의료 전문기관을 방문하여 인지·학습·정서 영역을 포함한 정밀평가를 받아보시기를 권고합니다.<br><span style="font-size:11.5px;color:var(--ink-faint);">※ 본 검사는 현재의 인지적 특성과 수행 경향을 이해하기 위한 자료이며, 단독으로 의학적·심리적 진단을 내리는 검사가 아닙니다.</span>';
    } else {
      noticeEl.style.display = 'none';
      noticeEl.textContent = '';
    }
  }

  if (d.isBalanced) {
    setText('pf-interpret-guide1', '네 영역의 점수 차이가 균형 기준 이내로 나타났습니다. 균형형은 영역 간 차이가 작다는 뜻이며, 전반적인 능력 수준은 전체점수 구간과 함께 해석해야 합니다.');
    setText('pf-interpret-guide2', d.balancedTier === 'L'
      ? '현재는 특정 영역을 강점이나 약점으로 나누기보다 네 영역의 기초 능력을 함께 지원하고, 전문적인 추가평가를 통해 필요한 도움을 확인하는 것이 적절합니다.'
      : (d.balancedTier === 'H' ? '네 영역이 모두 높은 수준에서 고르게 나타나므로, 다양한 심화 경험을 통해 잠재 역량을 폭넓게 발휘하도록 도와주세요.' : '네 영역이 또래 범위에서 고르게 나타나므로, 여러 학습 방식과 활동을 두루 경험하며 관심 분야를 찾아가는 것이 좋습니다.'));
  } else {
    setText('pf-interpret-guide1', '4개 하위척도 지수 중 최댓값과 최솟값의 차이가 균형 기준을 초과하여, 전체점수 하나보다 영역별 점수와 개인 내 강약을 함께 살펴보는 것이 적절합니다.');
    setText('pf-interpret-guide2', '그래서 이 리포트는 전체점수와 함께 계획력·주의력·동시처리·순차처리 4개 영역별 결과를 중심으로 설명합니다.');
  }

  // --- 규준적 강/약 표 ---
  const normRows = ['P','A','S','Q'].map(function(k){
    const a = d.perAxis[k];
    const diff = a.score-100;
    const badgeClass = a.level==='H'?'ns':a.level==='L'?'weak':'flat';
    const badgeText = a.level==='H'?'규준적 강 (NS)':a.level==='L'?'규준적 약 (NW)':'평균 범위';
    return '<tr><td style="font-weight:700;">'+AXIS_LABEL[k]+'</td><td style="font-family:var(--font-mono)">'+a.score+
      '</td><td style="color:var(--ink-faint)">평균 대비 '+(diff>=0?'+':'')+diff+
      '</td><td><span class="badge '+badgeClass+'">'+badgeText+'</span></td></tr>';
  }).join('');
  setHTML('pf-normtable', normRows);
  const strongAxes = d.ranked.filter(function(r){ return d.perAxis[r.k].level==='H'; }).map(function(r){ return AXIS_LABEL[r.k]; });
  const flatAxes = d.ranked.filter(function(r){ return d.perAxis[r.k].level==='M'; }).map(function(r){ return AXIS_LABEL[r.k]; });
  const weakAxes = d.ranked.filter(function(r){ return d.perAxis[r.k].level==='L'; }).map(function(r){ return AXIS_LABEL[r.k]; });
  let normSummary = '';
  if (strongAxes.length) normSummary += strongAxes.join('·')+' '+(strongAxes.length>1?'영역이':'영역이')+' 또래 아동 전체 집단 대비 상대적으로 높은 집단(규준적 강)에 속하는 것으로 나타났습니다. ';
  if (flatAxes.length) normSummary += flatAxes.join('·')+'는 또래와 비슷한 평균적 수준입니다. ';
  if (weakAxes.length) normSummary += weakAxes.join('·')+'는 또래 대비 상대적으로 낮은 집단(규준적 약)에 속합니다.';
  setText('pf-normsummary', normSummary.trim());

  // --- 개인내적 강약분석 ---
  setText('pf-personalmean', String(d.personal.mean));
  setText('pf-internalintro-lead', '아동 자신의 4개 인지기능 평균(' + d.personal.mean + ')을 기준으로, 어떤 영역이 상대적으로 강하고 약한지를 통계적 유의성(p<.05)과 함께 판정합니다.');
  setText('pf-meanlegend', name+'의 4개 능력 평균('+d.personal.mean+'점)');
  setText('pf-meanline-label', name+'의 4개 영역 평균');
  setText('pf-internalintro-name1', name);

  // v2.0: 사회성 문단 — "계획력이 강한 아이들은..." + 이름 고정을 실제 최고축 기준으로 교체
  const SOCIAL_DESC = {
    P: { desc: '계획력이 강한 아이들은 놀이나 모둠 활동에서 자연스럽게 "이끄는 역할"을 맡는 경우가 많아요. '+name+'도 친구들과의 놀이에서 규칙을 정하거나 순서를 짜는 역할을 즐길 가능성이 높습니다. 다만 계획대로 되지 않을 때 친구와 의견 차이가 생길 수 있어, "다른 친구의 방법도 들어보기"를 자연스럽게 연습시켜주면 관계가 더 편안해져요.', tags:['#자연스러운리더십','#규칙만들기선호','#타협연습필요'] },
    A: { desc: '몰입력이 강한 아이들은 함께하는 놀이보다 자신이 좋아하는 활동에 깊이 빠져드는 편이에요. '+name+'도 관심 있는 놀이가 생기면 친구들에게 그걸 열정적으로 소개하고 함께 파고드는 모습을 보일 수 있어요. 다만 관심 없는 활동에서는 흥미를 유지하기 어려울 수 있어, 친구가 좋아하는 활동에도 잠깐씩 관심을 가져보는 연습이 도움이 돼요.', tags:['#열정적몰입','#관심사공유선호','#관심전환연습필요'] },
    S: { desc: '동시처리가 강한 아이들은 전체 분위기를 빠르게 읽고 상황에 맞게 행동하는 편이에요. '+name+'도 친구들 사이의 분위기를 빠르게 파악하고 눈치 있게 어울리는 모습을 보일 가능성이 높습니다. 다만 세부적인 약속(시간, 규칙)을 놓치기 쉬워, "약속은 한 번 더 확인하기"를 연습시켜주면 관계가 더 안정적이 돼요.', tags:['#눈치빠른어울림','#분위기메이커','#세부약속확인필요'] },
    Q: { desc: '순차처리가 강한 아이들은 정해진 규칙과 순서를 잘 지키는 편이라 또래 사이에서 신뢰를 얻기 쉬워요. '+name+'도 놀이 규칙을 성실히 지키고 차례를 기다리는 모습을 자연스럽게 보일 가능성이 높습니다. 다만 갑자기 규칙이 바뀌는 상황에서는 당황할 수 있어, "규칙은 바뀔 수도 있다"는 걸 미리 알려주면 도움이 돼요.', tags:['#신뢰받는성실함','#규칙준수','#변화유연성연습필요'] },
  };
  const socialPick = d.isBalanced
    ? { desc: name+'는 네 가지 인지 영역이 고르게 나타나, 놀이와 모둠 활동에서 상황에 맞게 여러 역할을 경험할 수 있어요. 특정한 관계 방식으로 단정하기보다 다양한 친구·활동 속에서 어떤 역할을 편안해하는지 관찰해 주세요.', tags:['#고른상호작용','#다양한역할경험','#관찰중심지원'] }
    : SOCIAL_DESC[d.ranked[0].k];
  setText('pf-social-desc', socialPick.desc);
  setHTML('pf-social-tags', socialPick.tags.map(function(t){return '<span>'+t+'</span>';}).join(''));

  // v2.0: 기질카드 4개 렌더링
  const aLv = d.perAxis.A.level, pLv = d.perAxis.P.level;
  const reactC = TEMP_CARD.react[aLv], adaptC = TEMP_CARD.adapt[pLv];
  setHTML('pf-temp-react', renderTempCard(reactC.strongTitle, reactC.strongLi, reactC.weakTitle, reactC.weakLi));
  setHTML('pf-temp-adapt', renderTempCard(adaptC.strongTitle, adaptC.strongLi, adaptC.weakTitle, adaptC.weakLi));
  const moodC = d.isBalanced
    ? { strongTitle:'고른 성취 경험', strongLi:['여러 종류의 활동을 고르게 경험하며 자신에게 맞는 방식을 찾아갈 수 있어요'], weakTitle:'수준에 맞는 도전', weakLi:[d.balancedTier==='L'?'짧고 쉬운 활동부터 성공 경험을 쌓아 자신감을 키워주세요':'너무 쉽거나 어려운 과제보다 조금씩 도전 수준을 높여주세요'] }
    : TEMP_CARD.mood.render(AXIS_LABEL[d.ranked[0].k], d.perAxis[d.ranked[0].k].level, AXIS_LABEL[d.weakAxisKey], d.perAxis[d.weakAxisKey].level);
  setHTML('pf-temp-mood', renderTempCard(moodC.strongTitle, moodC.strongLi, moodC.weakTitle, moodC.weakLi));
  const thinkKey = d.isBalanced ? 'BAL' : (d.perAxis.S.score >= d.perAxis.Q.score ? 'S' : 'Q');
  const thinkC = TEMP_CARD.think[thinkKey];
  setHTML('pf-temp-think', renderTempCard(thinkC.strongTitle, thinkC.strongLi, thinkC.weakTitle, thinkC.weakLi));

  // v2.0: 놀이법 3카테고리 — top1(강점강화)/top2(강점발휘)/weak(보완훈련) 축 기준
  const playHtml = d.isBalanced
    ? ['P','A','S','Q'].map(function(k){ return renderPlayCat(k, '고른 경험'); }).join('')
    : renderPlayCat(d.ranked[0].k, '강점 강화') + renderPlayCat(d.ranked[1].k, '강점 발휘') + renderPlayCat(d.weakAxisKey, '보완 훈련');
  setHTML('pf-play-categories', playHtml);

  // v2.0: 습관 4카드 — 실제 순위(강점부터) 순서로 배치
  const habitHtml = d.ranked.map(function(r){
    const h = HABIT_BY_AXIS[r.k];
    return '<div class="habit-card"><div class="ico">'+h.ico+'</div><div class="body"><b>'+h.title+'</b><p>'+h.body+'</p><span class="freq">'+h.freq+'</span></div></div>';
  }).join('');
  setHTML('pf-habit-grid', habitHtml);

  // v2.0: 과목별 학습법 — top1 축 기준 4과목 팁
  const topKeyForSubject = d.ranked[0].k;
  const sub = SUBJECT_TIPS[topKeyForSubject];
  setText('pf-subject-intro', d.isBalanced ? '특정 영역 하나를 강점으로 정하지 않고, 네 가지 처리 방식을 과목별로 고르게 활용하는 방법을 정리했어요.' : AXIS_LABEL[topKeyForSubject]+' 강점을 과목별로 어떻게 살릴지 구체적으로 정리했어요.');
  setHTML('pf-subject-grid',
    '<div class="method-card"><div class="mh"><div class="num">국</div><b>국어 · 독서</b></div><p>'+sub.kor+'</p></div>'+
    '<div class="method-card"><div class="mh"><div class="num">수</div><b>수학</b></div><p>'+sub.math+'</p></div>'+
    '<div class="method-card"><div class="mh"><div class="num">영</div><b>영어</b></div><p>'+sub.eng+'</p></div>'+
    '<div class="method-card"><div class="mh"><div class="num">예체능</div><b>예체능</b></div><p>'+sub.art+'</p></div>');

  // v2.0: 부모 대화 스크립트 — weak축 기준 2개 상황
  const ps = d.isBalanced ? [
    ['어떤 방법이 맞을지 고민할 때','"그림으로 볼까, 순서대로 해볼까?"라고 여러 방법 중 아이가 편한 방식을 고르게 해주세요'],
    ['과제가 어렵게 느껴질 때','"한 번에 하나씩 해보자"라고 과제를 짧게 나누고 작은 성공부터 인정해주세요']
  ] : PARENT_SCRIPT[d.weakAxisKey];
  setHTML('pf-parentscript', ps.map(function(item){
    return '<div class="sw-box strong"><div class="lbl">💬 '+item[0]+'</div><ul><li>'+item[1]+'</li></ul></div>';
  }).join(''));

  // v2.0: 이럴 때 빛나요 / 재능로드맵 / 진로체험활동 / FAQ / 성장추적 / 실수3 / 체크리스트
  const SHINE_DESC = {
    P: '· 새 놀이나 프로젝트를 스스로 기획하고 끝까지 완성할 때<br>· 목표를 세우고 그걸 하나씩 지켜나갈 때<br>· 여러 단계로 이루어진 일을 순서대로 계획할 때',
    A: '· 관심 있는 활동에 깊이 몰입할 때<br>· 하나의 주제를 끝까지 파고들 때<br>· 오랜 시간 집중력이 필요한 활동을 할 때',
    S: '· 여러 정보를 종합해 순간적으로 "감"을 잡아야 하는 상황일 때<br>· 전체 그림을 빠르게 파악해야 할 때<br>· 창의적인 아이디어를 자유롭게 떠올릴 때',
    Q: '· 정해진 순서와 규칙을 하나씩 따라야 하는 활동을 할 때<br>· 차근차근 단계를 밟아가며 완성하는 일을 할 때<br>· 꼼꼼하게 절차를 지켜야 하는 상황일 때',
  };
  setHTML('pf-shine-desc', d.isBalanced ? '· 여러 방법을 바꾸어 사용해야 하는 활동을 할 때<br>· 친구들과 다양한 역할을 나누어 협력할 때<br>· 계획·집중·전체 보기·순서 지키기를 함께 활용할 때' : SHINE_DESC[topKeyForSubject]);
  const TALENT_STEP2 = {
    P:'계획력을 발휘할 수 있는 새 영역(요리, 방 꾸미기 기획 등)에 도전',
    A:'몰입할 수 있는 새 영역(한 가지 주제 깊이 탐구하기 등)에 도전',
    S:'전체를 그리고 표현하는 새 영역(그림, 이야기 만들기 등)에 도전',
    Q:'순서가 뚜렷한 새 영역(요리 레시피, 조립 설명서 따라하기 등)에 도전',
  };
  setHTML('pf-talent-roadmap', d.isBalanced
    ? '<div class="sw-box strong"><div class="lbl">1단계 · 편안한 활동 찾기 (지금~1개월)</div><ul><li>네 영역의 활동을 골고루 경험하며 아이가 즐거워하고 편안해하는 활동을 관찰해주세요</li></ul></div><div class="sw-box strong"><div class="lbl">2단계 · 관심 확장하기 (1~3개월)</div><ul><li>아이의 수준에 맞는 다양한 놀이·학습 활동으로 관심의 폭을 넓혀주세요</li></ul></div>'
    : '<div class="sw-box strong"><div class="lbl">1단계 · 강점 확인하기 (지금~1개월)</div><ul><li>이미 잘하는 '+AXIS_LABEL[topKeyForSubject]+' 관련 활동을 더 자주 칭찬하고 언어화해주세요</li></ul></div><div class="sw-box strong"><div class="lbl">2단계 · 강점 확장하기 (1~3개월)</div><ul><li>'+TALENT_STEP2[topKeyForSubject]+'</li></ul></div>');
  const CAREER_ACT = {
    P: ['어린이 창업·경제 체험','발명·아이디어 공모전','학생 기획단·서포터즈','메이커톤(만들기 대회)','진로체험 부스 기획 활동'],
    A: ['영재원·심화탐구 캠프','과학전람회·연구발표대회','도서관 독서동아리','장기 프로젝트형 봉사활동','관심분야 멘토링 프로그램'],
    S: ['미술·디자인 캠프','아이디어 공모전','스토리텔링·글쓰기 대회','메이커톤(만들기 대회)','창작 동아리 활동'],
    Q: ['코딩·로봇 캠프','과학실험 체험교실','규칙기반 보드게임 대회','도서관 사서 체험','절차형 자격증 준비반(주니어)'],
  };
  const balancedCareerActivities = ['과학·창의 체험교실','미술·만들기 활동','어린이 독서·이야기 활동','기초 코딩·로봇 체험','협동 프로젝트'];
  setHTML('pf-career-activities', (d.isBalanced ? balancedCareerActivities : CAREER_ACT[topKeyForSubject]).map(function(t){return '<span>'+t+'</span>';}).join(''));

  const weakLbl = d.weakAxis.name;
  setText('pf-faq1-q', d.isBalanced ? 'Q. 균형형이면 특별히 살펴볼 영역이 없나요?' : 'Q. '+weakLbl+(hasBatchim(weakLbl)?'이':'가')+' 낮게 나온 게 걱정돼요. 계속 낮은 채로 남을까요?');
  setText('pf-faq1-a', d.isBalanced
    ? '균형형은 네 영역 사이의 차이가 작다는 뜻이지, 모든 능력 수준이 같다는 의미는 아니에요. 전체점수 수준을 함께 확인하고, 다양한 활동에서 아이가 편안해하거나 어려워하는 모습을 관찰하는 것이 중요합니다.'
    : '아니에요. '+weakLbl+'는 성장 과정의 충분한 훈련과 반복 경험, 적절한 교육적 지원을 통해 향상될 가능성이 있어요. 현재의 특성을 아는 것은 아이에게 맞는 지원 방법을 찾는 중요한 출발점입니다.');
  setText('pf-faq2-a', d.isBalanced ? '일반적으로 12~18개월 주기를 권장해요. 다음 검사에서는 네 영역의 전체적인 변화와 새롭게 나타나는 강점·지원점을 함께 확인해보세요.' : '일반적으로 12~18개월 주기를 권장해요. 성장기에는 인지 프로파일이 계속 발달하므로, 다음 검사에서 '+weakLbl+' 영역의 변화를 함께 확인해보시길 추천드립니다.');
  const topCardTitle = AXIS_METHOD_CARD[d.ranked[0].k][d.perAxis[d.ranked[0].k].level].title;
  const weakCardTitle = AXIS_METHOD_CARD[d.weakAxisKey][d.perAxis[d.weakAxisKey].level].title;
  setText('pf-faq3-a', d.isBalanced ? '네, 권장드려요. 네 영역이 고르게 나타났다는 점과 전체점수 수준에 맞춘 학습방안을 담임 선생님과 공유하면 수업 중 관찰과 지도에 참고가 될 수 있어요.' : '네, 권장드려요. 특히 학습방안 챕터의 "'+topCardTitle+'", "'+weakCardTitle+'" 부분은 담임 선생님과 공유하시면 수업 중 지도에 참고가 될 수 있어요.');
  setHTML('pf-growthtrack', d.isBalanced ? '우리 아이 인지훈련 홈에서 꾸준히 활동을 기록하면, 다음 검사 시점에 <b>이번 검사 대비 네 영역의 변화 그래프</b>를 확인하실 수 있어요.' : '우리 아이 인지훈련 홈에서 꾸준히 활동을 기록하면, 다음 검사 시점에 <b>이번 검사 대비 변화 그래프</b>를 확인하실 수 있어요. 특히 '+weakLbl+' 영역의 성장 추이를 지켜보는 것을 추천드립니다.');
  setText('pf-mistake3', d.isBalanced ? '인지 능력은 계속 발달해요. 균형형도 다양한 경험과 훈련을 통해 네 영역이 함께 성장하고 새로운 강점이 나타날 수 있어요.' : '인지 능력은 계속 발달해요. 특히 '+weakLbl+'처럼 훈련과 적절한 지원을 통해 향상될 가능성이 있는 영역은 다음 검사에서 달라질 수 있어요.');

  setHTML('pf-checklist-grid', d.isBalanced
    ? '<div class="sw-box strong"><div class="lbl">✓ 매일 실천</div><ul><li>짧은 목표 하나 정하고 완료하기</li><li>오늘 배운 내용을 그림이나 순서로 표현하기</li></ul></div><div class="sw-box strong"><div class="lbl">✓ 주간 실천</div><ul><li>네 영역의 놀이를 번갈아 경험하기</li><li>아이가 즐거워한 활동과 어려워한 활동 기록하기</li></ul></div>'
    : '<div class="sw-box strong"><div class="lbl">✓ 매일 실천</div><ul><li>'+HABIT_BY_AXIS[d.ranked[3].k].title+'</li><li>'+HABIT_BY_AXIS[d.ranked[0].k].title+'</li></ul></div><div class="sw-box strong"><div class="lbl">✓ 주간 실천</div><ul><li>주간 목표 스티커 보드 점검</li><li>'+PLAY_BY_AXIS[d.weakAxisKey].items[0][0]+' 1회 이상</li></ul></div>');

  setHTML('pf-internalintro', '막대가 길수록, '+name+' <b style="color:var(--ink)">자신의 다른 능력들과 비교했을 때</b> 더 두드러진 영역이에요. 점선은 "한 축만의 평균"이 아니라, <b style="color:var(--ink)">계획력·주의력·동시처리·순차처리 4개 점수를 합쳐 나눈 '+name+' 개인의 평균('+d.personal.mean+'점)</b>이며, 4개 막대 모두 이 하나의 기준선과 비교합니다.');
  const meanBarPos = barWidthPct(d.personal.mean); // 평균점을 막대 스케일(40~160) 위 위치로 환산
  ['P','A','S','Q'].forEach(function(k){
    const a = d.perAxis[k];
    setHTML('pf-internalfill-'+k, '<span class="fill-score" id="pf-internalscore-'+k+'">'+a.score+'</span>');
    byId('pf-internalfill-'+k).style.width = a.barWidth+'%';
    byId('pf-internalfill-'+k).style.background = a.personalStatus==='PS' ? 'var(--'+({P:'p',A:'a',S:'s',Q:'su'})[k]+'-color)' : (a.personalStatus==='PW' ? 'var(--accent)' : 'var(--ink-faint)');
    const meanLine = byId('pf-meanline-'+k);
    if (meanLine) meanLine.style.left = meanBarPos+'%';
    setText('pf-internalmeanval-'+k, String(d.personal.mean));
    const rankInGroup = d.ranked.findIndex(function(r){ return r.k===k; });
    const statusMap = { PS: rankInGroup===0 ? '▲ 가장 큰 강점' : '▲ 강점', PW:'▼ 보완 포인트', FLAT:'● 평균과 비슷' };
    const subText = a.personalStatus==='FLAT' ? (a.personalDiff===0 ? '개인 평균과 같아요' : '평균보다 '+(a.personalDiff>0?'+':'')+a.personalDiff+'점, 차이 적음') : (a.personalDiff>=0 ? '평균보다 +'+a.personalDiff+'점 높아요' : '평균보다 '+a.personalDiff+'점 낮아요');
    setHTML('pf-internalstatus-'+k, '<span class="stat-lbl '+(a.personalStatus==='PS'?'up':a.personalStatus==='PW'?'down':'mid')+'">'+statusMap[a.personalStatus]+'</span><span class="stat-sub">'+subText+'</span>');
  });
  const topTwoNames = d.ranked.slice(0,2).map(function(r){ return AXIS_LABEL[r.k]; }).join('·');
  const flatOnes = d.ranked.filter(function(r){ return d.personal.byAxis[r.k].status==='FLAT'; }).map(function(r){ return AXIS_LABEL[r.k]; });
  const isFullyFlat = flatOnes.length===4;
  let internalSummaryText;
  if (isFullyFlat) {
    internalSummaryText = josa(name,'은는')+' 4개 인지 영역이 자기 자신 안에서도 서로 뚜렷한 차이 없이 고르게 나타나요. 특별히 두드러지는 축 없이 상황에 맞게 골고루 쓸 수 있는 프로파일이에요.';
  } else {
    const flatWord = flatOnes.join('·');
    internalSummaryText = '정리하면, '+josa(name,'은는')+' <b style="color:var(--ink)">'+topTwoNames+'</b>'+(hasBatchim(topTwoNames)?'이':'가')+' 자기 안에서 가장 두드러진 강점이고, <b style="color:var(--ink)">'+d.weakAxis.name+'</b>'+(hasBatchim(d.weakAxis.name)?'은':'는')+' 상대적으로 보완이 필요한 영역이에요.'+(flatOnes.length?' '+flatWord+(hasBatchim(flatWord)?'은':'는')+' 평균과 비슷한 수준으로, 특별히 강하지도 약하지도 않아요.':'');
  }
  setHTML('pf-internalsummary', internalSummaryText);

  // --- 학습유형 판정 (동시처리 vs 순차처리, 우뇌/좌뇌 프레이밍) ---
  // 패치: 공식 판정 기준표 적용. D = 순차처리(Q) - 동시처리(S).
  // 4~5세: |D| > 11이면 우세형 판정, |D| ≤ 11이면 균형형(순차처리=동시처리)
  // 6세 이상: |D| > 10이면 우세형 판정, |D| ≤ 10이면 균형형
  const sScore = d.perAxis.S.score, qScore = d.perAxis.Q.score;
  const ageForThreshold = (typeof profile.ageYears === 'number') ? profile.ageYears : 6;
  const learntypeThreshold = (ageForThreshold <= 5) ? 11 : 10;
  const learnD = qScore - sScore; // D = 순차처리 - 동시처리
  const learnDiff = Math.abs(learnD);
  const isBalancedLearntype = learnDiff <= learntypeThreshold;
  const sIsHigher = learnD < 0; // D<0 → 동시처리가 더 높음
  const learnDominantLabel = sIsHigher ? '동시처리' : '순차처리';
  setText('pf-learntype-qscore', String(qScore));
  setText('pf-learntype-sscore', String(sScore));
  setText('pf-learntype-name', isBalancedLearntype ? '균형형 학습자' : (learnDominantLabel + ' 우세형 학습자'));
  if (isBalancedLearntype) {
    setText('pf-learntype-diff', '차이 ' + learnDiff + '점 · 균형 기준(만 '+profile.ageYears+'세 기준 '+learntypeThreshold+'점) 이내');
  } else {
    setText('pf-learntype-diff', '차이 ' + learnDiff + '점 · 균형 기준(만 '+profile.ageYears+'세 기준 '+learntypeThreshold+'점) 초과로 우세형 판정');
  }
  if (isBalancedLearntype) {
    setHTML('pf-learntype-desc1', '동시처리와 순차처리 능력이 비슷한 수준으로 나타나 <b style="color:var(--ink)">균형형 학습자</b>로 판단됩니다. 상황에 따라 전체를 직관적으로 파악하는 방식과 순서대로 차근차근 처리하는 방식을 고루 쓸 수 있어요.');
    setText('pf-learntype-desc2', '한쪽 방식에 치우치지 않고 유연하게 접근할 수 있다는 뜻이라, 다양한 학습 자료·방식에 골고루 적응하는 힘이 있어요.');
  } else if (sIsHigher) {
    setHTML('pf-learntype-desc1', '동시처리 능력이 순차처리보다 판정 기준 이상으로 높아 <b style="color:var(--ink)">동시처리(우뇌) 우세형 학습자</b>로 판단됩니다. 직관적이고 시각적이며, 전체적인 흐름과 의미를 빠르게 파악하는 데 강점을 보입니다.');
    setText('pf-learntype-desc2', '언어적 설명보다 그림·도형 등 시각 자료에 더 잘 반응하며, 순차적으로 제시되는 정보에는 상대적으로 낮은 지속력을 보일 수 있으나 ' + (d.perAxis.A.score >= 115 ? '주의력이 매우 높아 이 부분이 상당 부분 보완됩니다.' : '반복·단계별 훈련으로 점차 보완할 수 있어요.'));
  } else {
    setHTML('pf-learntype-desc1', '순차처리 능력이 동시처리보다 판정 기준 이상으로 높아 <b style="color:var(--ink)">순차처리(좌뇌) 우세형 학습자</b>로 판단됩니다. 체계적이고 논리적이며, 정해진 순서와 절차를 정확히 따라가는 데 강점을 보입니다.');
    setText('pf-learntype-desc2', '전체를 한눈에 통합해서 보기보다 하나씩 순서대로 확인하는 편이 더 편안하며, 정보가 한꺼번에 쏟아지는 상황에서는 상대적으로 부담을 느낄 수 있으나 ' + (d.perAxis.A.score >= 115 ? '주의력이 매우 높아 이 부분이 상당 부분 보완됩니다.' : '핵심을 먼저 요약해서 접근하는 훈련으로 점차 보완할 수 있어요.'));
  }

  // --- 진로 적성 (기존엔 '동시처리 우세형' 전제로 고정) ---
  const careersDominantLabel = isBalancedLearntype ? '균형형' : (learnDominantLabel + ' 우세형');
  setText('pf-careers-intro', careersDominantLabel + ' 인지 프로파일을 기반으로 한 분야별 추천 직업군입니다. 27개 세부 유형 대신 인지 특성 대분류 중심으로 제시하여 판단의 정확도와 진로 선택의 유연성을 함께 확보합니다.');

  // --- 검사자 총평 ---
  // 패치: top2 조합 강도 표현("최상위권"/"우수하게")이 실제 티어와 무관하게 고정이었던 버그 수정.
  // top2 중 더 낮은 쪽 점수를 기준으로 실제 강도에 맞는 표현으로 교체.
  const top2LowerScore = Math.min(d.perAxis[d.ranked[0].k].score, d.perAxis[d.ranked[1].k].score);
  const strengthWord = top2LowerScore >= 120 ? '최상위권' : (top2LowerScore >= 108 ? '상위권' : '평균 이상');
  let opinionLeadText = d.combo.opinionLead.replace(/\{name\}/g, name);
  if (d.comboKey !== 'BAL') {
    opinionLeadText = opinionLeadText.replace('또래 대비 최상위권', '또래 대비 ' + strengthWord).replace('또래 대비 우수하게', top2LowerScore >= 120 ? '또래 대비 우수하게' : '또래 대비 ' + strengthWord + '으로');
  }
  setText('pf-opinionlead', opinionLeadText);
  const balancedOpinionTail = d.balancedTier === 'L'
    ? '특정 영역만을 약점으로 단정하기보다 네 영역의 기초 능력을 함께 살펴보는 것이 적절합니다. 현재의 어려움을 구체적으로 확인하고 알맞은 지원 계획을 세우기 위해 전문기관의 추가평가를 권고합니다.'
    : (d.balancedTier === 'H'
      ? '네 영역이 모두 높은 수준에서 고르게 발달한 것으로 나타났습니다. 높은 역량을 실제 성취로 연결할 수 있도록 다양한 심화 경험과 도전 기회를 제공해주시길 바랍니다.'
      : '네 영역이 또래 범위에서 비교적 고르게 나타났습니다. 특정 영역의 보완보다 다양한 경험을 제공하면서 아동의 관심과 강점이 구체화되는 과정을 지켜보는 것이 좋습니다.');
  setText('pf-opiniontail', d.isBalanced
    ? balancedOpinionTail
    : '다만 '+josa(d.weakAxis.name,'은는')+' 다른 영역 대비 상대적으로 낮게 나타나, 관련 활동에서 다소 인내심이 필요할 수 있습니다. 이는 훈련을 통해 충분히 향상될 수 있는 영역이므로, 가정과 기관에서 꾸준히 관련 활동을 병행해주실 것을 권장합니다. 전반적으로 강점이 뚜렷한 아동으로, 강점을 발휘할 수 있는 경험을 자주 제공해주시길 바랍니다.');

  // --- 진로 적성 ---
  setText('pf-careerdesc', d.combo.careerDesc);
  setHTML('pf-careertags', d.combo.careerTags.map(function(t){return '<span>'+t+'</span>';}).join(''));
  // v2.0: 진로 세분화 Modifier — 같은 top2 조합이라도 3·4번째 축 티어에 따라 방향성 힌트 추가 (GPT #4 대응)
  const CAREER_NUANCE = {
    P: '다만 계획을 세우고 관리하는 역할(팀 리더, 프로젝트 매니저형 포지션)로 갈수록 강점이 더 크게 발휘돼요.',
    A: '다만 하나의 주제에 깊이 몰입해야 하는 전문·연구직 방향으로 갈수록 강점이 더 크게 발휘돼요.',
    S: '다만 전체를 통합해서 큰 그림을 그리는 기획·디자인 방향으로 갈수록 강점이 더 크게 발휘돼요.',
    Q: '다만 정해진 절차·규정을 정확히 다루는 전문·기술직 방향으로 갈수록 강점이 더 크게 발휘돼요.',
  };
  const secondStrongKey = d.ranked[1].k;
  setText('pf-careermodifier', d.isBalanced
    ? (d.balancedTier === 'H' ? '네 영역을 함께 활용하는 융합형 활동과 심화 프로젝트를 통해 관심 분야를 구체화해보세요.' : '특정 직업을 서둘러 정하기보다 다양한 놀이와 체험을 통해 흥미와 잠재 강점을 발견하는 과정이 중요해요.')
    : (d.perAxis[secondStrongKey].level === 'H' ? CAREER_NUANCE[secondStrongKey] : '아직 뚜렷한 두 번째 강점 축이 없어, 여러 분야를 두루 경험해보며 적성을 찾아가는 탐색형 접근이 잘 맞을 수 있어요.'));

  // --- 성장포인트 (약점축 공통 처리) ---
  if (d.isBalanced) {
    setText('pf-growthdesc', d.balancedTier === 'L'
      ? name+'의 4개 인지 영역은 서로 뚜렷한 차이 없이 고르게 나타났지만, 전반적인 수행 수준은 낮게 나타났어요. 특정 영역만 보완하기보다 아이의 속도에 맞춰 네 영역의 기초 능력을 함께 지원해 주세요.'
      : name+'의 4개 인지 영역이 서로 뚜렷한 차이 없이 고르게 나타났어요. 특정 영역을 보완하기보다, 다양한 활동을 골고루 경험하며 관심 분야를 넓혀가는 것을 추천해요.');
    setText('pf-growthtitle', d.balancedTier === 'L' ? '고른 지원 — 네 영역의 기초 능력을 함께 키워주세요.' : '고른 발달 — 특정 보완점보다 폭넓은 경험이 도움이 돼요.');
  } else {
    setText('pf-growthdesc', josa(d.weakAxis.name,'은는')+' 또래 평균 수준('+d.perAxis[d.weakAxisKey].rankPct+'%ile)으로, 다른 강점 영역에 비해 상대적으로 낮게 나타났어요. 이는 부족함이 아니라, '+name+'의 다른 강점을 더 완성도 있게 만들어줄 다음 성장 지점이에요.');
    setText('pf-growthtitle', d.weakAxis.name+' — 약점이 아니라 "다음 성장 지점"이에요.');
  }
  // v2.0: 성장포인트 Modifier — weak축 티어 + 보완축 티어 조합에 따라 다른 지원방식 제시 (GPT #1·#3 대응)
  setText('pf-growthmodifier', d.isBalanced ? '' : buildSupportModifier(d));
  const GROWTH_ACTIVITY = {
    P: { home:['오늘 할 일 3가지를 아이가 직접 순서대로 정해보기','장난감 정리 계획을 스스로 세우고 실행해보기'], inst:['목표 설정·체크 훈련이 포함된 자기주도학습 프로그램 병행','작은 프로젝트를 끝까지 완수하는 활동형 수업 참여'] },
    A: { home:['좋아하는 활동을 5분 타이머로 몰입해보는 연습','완료할 때마다 바로 칭찬 스티커 주기'], inst:['짧은 집중-보상 사이클이 있는 몰입 훈련 프로그램 병행','흥미 기반 개별 활동으로 몰입 시간 늘리기'] },
    S: { home:['배운 내용을 그림 한 장으로 정리해보기','이야기의 전체 줄거리를 먼저 말해보고 세부 내용 채우기'], inst:['마인드맵·도식화 중심의 통합적 사고 훈련 프로그램 병행','전체 구조를 먼저 제시하는 수업 방식 활용'] },
    Q: { home:['요리 레시피를 순서대로 따라 만들어보기','하루 일과를 아이 스스로 순서 카드로 배열해보기'], inst:['단계별 체크리스트가 있는 순차 훈련 프로그램 병행','수학 연산 등 순서 중심 과제는 짧고 반복적으로 제공'] },
  };
  const ga = d.isBalanced
    ? (d.balancedTier === 'L'
      ? { home:['하루에 한 가지 짧은 과제를 정해 끝까지 해보기','그림 보기·순서 말하기·집중 놀이를 짧게 번갈아 경험하기'], inst:['아동의 현재 수준과 학습 어려움을 확인하는 전문적인 추가평가','작은 성공을 반복할 수 있는 개별화 인지·학습 지원'] }
      : { home:['계획·집중·전체 보기·순서 활동을 한 주 동안 골고루 해보기','아이가 특히 즐거워한 활동을 기록하고 다음 활동으로 확장하기'], inst:['여러 인지기능을 함께 쓰는 통합형 놀이·프로젝트 참여','다양한 활동 속에서 새롭게 나타나는 관심과 강점 관찰'] })
    : GROWTH_ACTIVITY[d.weakAxisKey];
  setHTML('pf-growth-home', ga.home.map(function(t){return '<li>'+t+'</li>';}).join(''));
  setHTML('pf-growth-inst', ga.inst.map(function(t){return '<li>'+t+'</li>';}).join(''));

  // v2.0: 학습법 4카드 — 축별 실제 순위(강점부터) + 티어(H/M/L) 기준으로 재구성 (GPT #2 대응)
  setText('pf-method-intro', d.isBalanced ? '한 가지 방식에 치우치지 않고, 그림·순서·집중·계획 방법을 아이의 수준에 맞게 골고루 활용해보세요.' : (d.ranked[0].k==='S' || d.ranked[0].k==='P'
    ? '전체 그림 → 세부 순서, 이 순서로 알려주면 이해가 훨씬 빨라요.'
    : (d.ranked[0].k==='A' ? '관심 있는 것에 몰입하는 힘을 살려서 접근하면 이해가 훨씬 빨라요.' : '순서를 하나씩 밟아가는 방식으로 안내하면 이해가 훨씬 빨라요.')));
  const methodHtml = d.ranked.map(function(r){
    const card = AXIS_METHOD_CARD[r.k][d.perAxis[r.k].level];
    return card;
  }).map(function(card, i){
    return '<div class="method-card"><div class="mh"><div class="num">'+(i+1)+'</div><b>'+card.title+'</b></div>'+
      '<p>'+card.body+'</p><div class="how"><b>이렇게 해보세요</b> — '+card.how+'</div></div>';
  }).join('');
  setHTML('pf-method-grid', methodHtml);

  // --- 뇌과학 근거 문단 ---
  // 항목8: 기존엔 "전전두엽" 설명이 계획력 전용인데 축 이름만 바뀌어 다른 축에도 그대로 나가던 문제 수정.
  // 4축 각각 실제 관련 뇌영역·기능 설명을 따로 작성하고, 문단 전체를 축 조합에 맞게 생성.
  const BRAINSCI = {
    P: { region:'전전두엽(prefrontal cortex)', func:'결정 내리기, 자기 조절, 시간 관리 등을 담당하며, 경험과 훈련을 통해 꾸준히 발달합니다.', useTip:'"실제로 계획을 세우고 실행해보는 경험"을 자주 제공할수록 더 단단해져요.' },
    A: { region:'전두엽·그물체활성계(reticular activating system)', func:'관련 있는 자극에 선택적으로 집중하고 방해 자극을 걸러내는 역할을 하며, 짧은 몰입을 반복할수록 지속 시간이 늘어납니다.', useTip:'"몰입할 수 있는 짧은 시간을 자주 확보해주는 것"이 이 힘을 더 단단하게 만들어줘요.' },
    S: { region:'두정-후두 연합영역(occipito-parietal association cortex)', func:'흩어진 정보를 하나의 전체 그림으로 통합하는 역할을 하며, 마인드맵처럼 전체 구조를 그려보는 활동을 통해 발달합니다.', useTip:'"전체 그림을 먼저 그려보고 설명해보는 경험"을 자주 제공할수록 더 단단해져요.' },
    Q: { region:'언어영역과 연결된 작업기억(working memory)', func:'언어·청각 정보를 순서대로 기억하고 처리하는 역할을 하며, 이 기능은 성장 과정의 학습과 훈련을 통해 꾸준히 발달할 수 있습니다.', useTip:'"순서를 하나씩 직접 말해보고 확인하는 경험"을 자주 제공할수록 더 단단해져요.' },
  };
  const topAxisKeyBS = d.ranked[0].k, weakAxisKeyBS = d.weakAxisKey;
  const topAxisName = AXIS_LABEL[topAxisKeyBS];
  const topBS = BRAINSCI[topAxisKeyBS], weakBS = BRAINSCI[weakAxisKeyBS];
  setHTML('pf-brainsci-para', d.isBalanced
    ? '계획력·주의력·동시처리·순차처리는 과제를 해결하는 과정에서 함께 사용돼요. '+name+'처럼 네 영역이 고르게 나타난 경우에는 특정 뇌기능 하나만 강조하기보다 계획하기, 집중하기, 전체 보기, 순서 지키기 활동을 균형 있게 경험하도록 돕는 것이 좋아요. 인지기능은 성장 과정의 충분한 훈련과 반복 경험, 적절한 교육적 지원을 통해 발달할 수 있습니다.'
    : '<b style="color:var(--ink);">'+josa(topAxisName,'은는')+'</b> 뇌의 <b style="color:var(--ink);">'+topBS.region+'</b>과 밀접하게 연관돼요. 이 영역은 '+topBS.func+' <span class="pf-name">'+name+'</span>처럼 '+josa(topAxisName,'이가')+' 이미 강점인 아이는, '+topBS.useTip+' 반대로 <b style="color:var(--ink);">'+josa(d.weakAxis.name,'은는')+'</b> 뇌의 <b style="color:var(--ink);">'+weakBS.region+'</b>과 관련이 깊은데, '+weakBS.func+' 즉 지금부터 꾸준히 채워가면 향상될 가능성이 있는 영역이에요.');
  document.querySelectorAll('.pf-name').forEach(function(el){ el.textContent = name; });

  // 항목9: 부모가이드 예시 — 실제 강점축·약점축 반영, 균형형은 억지 지정 안 함
  const PRAISE_PHRASE = { P:'너는 계획 세우는 게 진짜 천재야!', A:'너는 한번 빠지면 끝까지 파고드는 게 진짜 대단해!', S:'너는 전체를 한눈에 딱 보는 게 진짜 천재야!', Q:'너는 순서대로 차근차근 하는 게 진짜 야무져!' };
  const MISSION_PHRASE = { P:'이번엔 계획 세우기 미션도 한번 깨볼까?', A:'이번엔 몰입 타이머 미션도 한번 깨볼까?', S:'이번엔 전체 그림 그리기 미션도 한번 깨볼까?', Q:'이번엔 순서 지키기 미션도 한번 깨볼까?' };
  if (d.isBalanced) {
    setText('pf-parentguide-example', d.balancedTier === 'L'
      ? '균형형은 네 영역 사이의 차이가 작다는 뜻이에요. "왜 이것도 못해?"라고 비교하기보다, "오늘은 여기까지 해냈구나. 다음 한 단계도 같이 해보자"처럼 작은 성공을 구체적으로 인정해주세요.'
      : '균형형인 아이에게는 특정 영역을 강점과 약점으로 억지로 나누기보다, "여러 방법을 골고루 써볼 수 있구나"라고 인정하고 다양한 미션을 경험하게 해주는 게 좋아요.');
  } else {
    setHTML('pf-parentguide-example', '"약점부터 말하면 아이가 위축돼요"라는 이야기가 가장 많아요. <b style="color:var(--ink);">강점 → 재미있게 표현한 보완점</b> 순서를 추천드려요. 예: "'+PRAISE_PHRASE[d.ranked[0].k]+' '+MISSION_PHRASE[d.weakAxisKey]+'"처럼 점수보다 "미션"으로 표현하면 아이가 훨씬 편하게 받아들여요.');
  }

  // --- 담임 선생님께 전달 메시지 ---
  const top2Str = AXIS_LABEL[d.ranked[0].k]+'·'+AXIS_LABEL[d.ranked[1].k];
  setText('pf-teachermsg', d.isBalanced
    ? '"안녕하세요 선생님, '+name+' K-PASS 검사 결과를 공유드려요. 네 가지 인지 영역이 서로 뚜렷한 차이 없이 고르게 나타났습니다. 특정 방식으로 단정하기보다 여러 학습 방법을 경험하게 하고, 수업 중 편안해하거나 어려워하는 활동을 관찰해주시면 도움이 될 것 같습니다. 감사합니다!"'
    : '"안녕하세요 선생님, '+name+' K-PASS 검사 결과를 공유드려요. '+top2Str+(hasBatchim(top2Str)?'이':'가')+' 상대적으로 두드러지고, '+d.weakAxis.name+' 관련 활동에는 추가적인 안내가 도움이 될 수 있다고 해요. 참고해주시면 감사하겠습니다."');

  return d; // 검수 도구가 계산값을 직접 검증할 수 있도록 반환
}

function s_(profile,key){ return profile.scores[key]; }

/* kpass-figure-render.js가 전역 classifyLevel()을 그대로 호출하므로 호환용으로 노출 */
global.classifyLevel = classifyLevel;

/* export */
global.KPassEngine = {
  buildDerived: buildDerived,
  applyPersonalization: applyPersonalization,
  pickComboKey: pickComboKey,
  classifyLevel: classifyLevel,
  AXIS_LABEL: AXIS_LABEL,
  COMBO_CONTENT: COMBO_CONTENT
};

})(typeof window !== 'undefined' ? window : globalThis);
