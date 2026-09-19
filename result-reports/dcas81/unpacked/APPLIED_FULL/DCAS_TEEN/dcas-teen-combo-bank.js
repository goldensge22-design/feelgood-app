/**
 * D-CAS 청소년 리포트 — 7조합 콘텐츠 뱅크 (한국어)
 * 성인용(dcas-combo-bank.js)과 같은 원리, 학습·진로 맥락으로 문구만 조정.
 * ★ 1차 초안 — 문수백 교수님 감수 필요. 영어판은 아직 미러링 전입니다.
 */
(function (global) {
  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
  const BALANCE_THRESHOLD = 20;

  function pickComboKey(scores) {
    // 81유형 예외: 네 축이 모두 같은 절대수준(H/M/L)이면 작은 내부 순위로 강·약축을 만들지 않는다.
    const levels = [scores.P, scores.A, scores.S, scores.Q].map(function (v) { return v >= 75 ? 'H' : (v <= 52 ? 'L' : 'M'); });
    if (levels.every(function (lv) { return lv === levels[0]; })) return 'BAL';
    const ranked = [
      { k: 'P', v: scores.P }, { k: 'A', v: scores.A },
      { k: 'S', v: scores.S }, { k: 'Q', v: scores.Q },
    ].sort(function (a, b) { return b.v - a.v; });
    if (ranked[0].v - ranked[3].v < BALANCE_THRESHOLD) return 'BAL';
    // 패치: 2번째로 높은 축이 '상'(75 이상) 수준이 아니면 "함께 높다"는 조합(PA/PS 등)으로
    // 묶지 않고 단일 강점형으로 분리 — 예: P98·A41·S58·Q63을 "순차처리와 계획력이 함께 높다"로
    // 잘못 표현하던 문제 수정
    if (ranked[1].v < 75) return ranked[0].k + '_SOLO';
    const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
    const top2 = [ranked[0].k, ranked[1].k].sort(function (a, b) { return ORDER[a] - ORDER[b]; });
    return top2.join('');
  }

  const COMBO = {
    PQ: {
      code: '좌뇌우세 2-P', heroType: '논리설계형 학습가',
      oneliner: '순차처리와 계획력이 함께 높아, 학습 계획을 순서대로 정확히 실행하는 힘이 강해요. {weak}는 상대적으로 낮아, 여러 아이디어를 한 번에 종합하는 활동에서는 조금 더 의식적인 노력이 필요해요.',
      chips: ['#순차처리우세', '#강한계획력', '#절차적정밀함', '#종합사고보완필요'],
      figure: { name: '리누스 토르발스', why: '복잡한 시스템을 수천 개의 규칙과 절차로 정교하게 관리해낸 것으로 유명해요. {name} 님처럼 "순서를 지키며 정밀하게 완성하는" 힘은 큰 과제를 끝까지 완주하는 핵심 재능이에요.' },
      strengthKw: { P: '전략적 실행력·주도성', Q: '절차적 정교함·꼼꼼함' },
    },
    PA: {
      code: 'COGNITIVE ID · P-A', heroType: '목표관리형 학습가',
      oneliner: '계획력과 주의력이 함께 높아, 목표를 세우면 흔들리지 않고 몰입해서 끝까지 해내는 힘이 강해요. {weak}는 상대적으로 낮아, 여러 정보를 한 번에 종합하는 상황에서는 시간이 조금 더 필요해요.',
      chips: ['#강한계획력', '#몰입지속력', '#목표지향적', '#종합사고보완필요'],
      figure: { name: '마리 퀴리', why: '몇 년 동안 같은 방법으로 실험을 반복하며 목표에서 눈을 떼지 않은 것으로 유명해요. {name} 님처럼 "계획을 세우고 끝까지 몰입하는" 힘은 장기 과제를 완주하는 핵심 재능이에요.' },
      strengthKw: { P: '전략적 실행력·주도성', A: '몰입 지속력' },
    },
    PS: {
      code: '우뇌우세 3-C', heroType: '몰입형 아이디어 설계자',
      oneliner: '동시처리와 계획력이 함께 높아, 전체 그림을 빠르게 그려내고 그걸 실행 계획으로 옮기는 힘이 강해요. {weak}는 상대적으로 낮아 세부 절차를 지킬 때 조금 더 의식적인 노력이 필요해요.',
      chips: ['#직관적판단', '#강한계획력', '#창의적문제해결', '#절차보완필요'],
      figure: { name: '토머스 에디슨', why: '수천 번의 실패 속에서도 계획을 수정해가며 끝까지 몰입해 결과물을 완성했어요. {name} 님처럼 "전체 그림을 먼저 그리고, 계획을 세워 실행하는" 힘은 어떤 분야에서든 아이디어를 실제 결과로 만들어내는 핵심 재능이에요.' },
      strengthKw: { P: '전략적 실행력·주도성', S: '통합적 사고·시스템 이해' },
    },
    AS: {
      code: 'COGNITIVE ID · A-S', heroType: '몰입탐구형 학습가',
      oneliner: '주의력과 동시처리가 함께 높아, 전체 상황을 빠르게 파악하면서도 관심 있는 주제는 깊이 파고드는 힘이 강해요. {weak}는 상대적으로 낮아, 정해진 절차를 순서대로 따라야 하는 활동에서는 조금 더 신경 써야 해요.',
      chips: ['#몰입지속력', '#직관적사고', '#상황판단빠름', '#절차보완필요'],
      figure: { name: '장 앙리 파브르', why: '곤충 한 마리를 몇 년씩 관찰하면서도 그 곤충이 사는 환경 전체를 함께 기록했어요. {name} 님처럼 "깊이 파고들면서 전체도 놓치지 않는" 힘은 탐구 활동의 핵심 재능이에요.' },
      strengthKw: { A: '몰입 지속력', S: '통합적 사고·시스템 이해' },
    },
    AQ: {
      code: 'COGNITIVE ID · A-Q', heroType: '정밀반복형 학습가',
      oneliner: '주의력과 순차처리가 함께 높아, 정해진 절차를 정확히 지키며 지치지 않고 반복하는 힘이 강해요. {weak}는 상대적으로 낮아, 여러 아이디어를 한 번에 종합해야 하는 활동에서는 시간이 조금 더 필요할 수 있어요.',
      chips: ['#몰입지속력', '#절차적정밀함', '#꾸준한반복', '#종합사고보완필요'],
      figure: { name: '한석봉', why: '글씨 획을 쓰는 정해진 순서를 흐트러뜨리지 않고 수없이 반복해서 최고의 경지에 올랐어요. {name} 님처럼 "순서를 정확히 지키며 오래 반복하는" 힘은 정밀함이 필요한 과목의 핵심 재능이에요.' },
      strengthKw: { A: '몰입 지속력', Q: '절차적 정교함·꼼꼼함' },
    },
    SQ: {
      code: 'COGNITIVE ID · S-Q', heroType: '구조적 스토리텔러',
      oneliner: '동시처리와 순차처리가 함께 높아, 전체 그림을 떠올리고 그걸 논리적인 순서로 풀어내는 힘이 강해요. {weak}는 상대적으로 낮아, 목표를 끝까지 밀어붙이는 지구력 면에서는 의식적인 관리가 필요해요.',
      chips: ['#직관적사고', '#체계적구성', '#논리적전개', '#지속력보완필요'],
      figure: { name: '월트 디즈니', why: '장면 그림을 벽에 붙여 전체를 한눈에 본 다음, 순서를 바꿔가며 이야기를 완성하는 방법을 만들었어요. {name} 님처럼 "전체를 펼쳐놓고 순서를 짜는" 힘은 복잡한 내용을 설득력 있게 전달하는 핵심 재능이에요.' },
      strengthKw: { S: '통합적 사고·시스템 이해', Q: '절차적 정교함·꼼꼼함' },
    },
    BAL: {
      code: 'COGNITIVE ID · BAL', heroType: '균형잡힌 올라운더',
      oneliner: '네 가지 인지 능력이 고르게 발달해 있어, 어느 한 가지 방식에 갇히지 않고 상황에 맞게 유연하게 대응하는 힘이 강해요.',
      chips: ['#고른능력', '#다재다능', '#유연한사고', '#상황대응력'],
      figure: { name: '레오나르도 다 빈치', why: '그림, 해부학 관찰, 기계 설계를 한 사람이 동시에 해낸 것으로 유명해요. 특정 한 가지에 갇히지 않는 힘은 여러 분야를 넘나드는 학생의 핵심 재능이에요.' },
      strengthKw: { P: '전략적 실행력', A: '몰입 지속력', S: '통합적 사고', Q: '절차적 정교함' },
    },
    // 패치: 두 번째로 높은 축이 '상'(75 이상) 수준이 아닐 때 "함께 높다"로 잘못 묶이던 것을
    // 단일 강점형으로 분리 — 상대적으로 두드러진 축 1개만 강조하는 문구로 구성
    P_SOLO: {
      code: 'COGNITIVE ID · P-SOLO', heroType: '계획주도형 학습가',
      oneliner: '계획력이 다른 세 영역보다 상대적으로 두드러져요. 목표를 세우고 그 계획대로 실행해나가는 힘이 강점이에요. 나머지 영역은 아직 이렇다 할 강점으로 굳어지지 않아, 상황에 따라 조금씩 다르게 나타날 수 있어요.',
      chips: ['#계획력우세', '#목표지향적', '#단일강점형'],
      figure: { name: '벤저민 프랭클린', why: '하루 일과를 촘촘한 시간표로 짜서 평생 실천한 것으로 유명해요. {name} 님처럼 "계획을 세우고 그대로 실행하는" 힘은 목표를 현실로 만드는 핵심 재능이에요.' },
      strengthKw: { P: '전략적 실행력·주도성' },
    },
    A_SOLO: {
      code: 'COGNITIVE ID · A-SOLO', heroType: '몰입주도형 학습가',
      oneliner: '주의력이 다른 세 영역보다 상대적으로 두드러져요. 하나의 과제에 깊이 몰입해 끝까지 파고드는 힘이 강점이에요. 나머지 영역은 아직 이렇다 할 강점으로 굳어지지 않아, 상황에 따라 조금씩 다르게 나타날 수 있어요.',
      chips: ['#주의력우세', '#몰입지속력', '#단일강점형'],
      figure: { name: '장 앙리 파브르', why: '곤충 한 마리를 몇 년씩 관찰한 것으로 유명해요. {name} 님처럼 "하나에 깊이 몰입하는" 힘은 탐구 활동의 핵심 재능이에요.' },
      strengthKw: { A: '몰입 지속력' },
    },
    S_SOLO: {
      code: 'COGNITIVE ID · S-SOLO', heroType: '직관주도형 학습가',
      oneliner: '동시처리가 다른 세 영역보다 상대적으로 두드러져요. 흩어진 정보를 빠르게 하나의 그림으로 종합하는 힘이 강점이에요. 나머지 영역은 아직 이렇다 할 강점으로 굳어지지 않아, 상황에 따라 조금씩 다르게 나타날 수 있어요.',
      chips: ['#동시처리우세', '#직관적판단', '#단일강점형'],
      figure: { name: '스티브 잡스', why: '흩어진 아이디어를 빠르게 하나의 그림으로 종합해낸 것으로 유명해요. {name} 님처럼 "전체를 빠르게 파악하는" 힘은 방향을 제시하는 핵심 재능이에요.' },
      strengthKw: { S: '통합적 사고·시스템 이해' },
    },
    Q_SOLO: {
      code: 'COGNITIVE ID · Q-SOLO', heroType: '절차주도형 학습가',
      oneliner: '순차처리가 다른 세 영역보다 상대적으로 두드러져요. 정해진 절차를 순서대로 정확히 따라가는 힘이 강점이에요. 나머지 영역은 아직 이렇다 할 강점으로 굳어지지 않아, 상황에 따라 조금씩 다르게 나타날 수 있어요.',
      chips: ['#순차처리우세', '#절차적정밀함', '#단일강점형'],
      figure: { name: '한석봉', why: '정해진 순서를 흐트러뜨리지 않고 수없이 반복해 최고의 경지에 올랐어요. {name} 님처럼 "순서를 정확히 지키는" 힘은 정밀함이 필요한 과제의 핵심 재능이에요.' },
      strengthKw: { Q: '절차적 정교함·꼼꼼함' },
    },
  };

  const WEAK_KW = {
    P: '전략적 계획으로 성장', A: '몰입 지속력으로 성장',
    S: '통합적 사고로 성장', Q: '절차적 정교함으로 성장',
  };

  /* 패치: 02번 강점표 3번째 열("서술 예시 단어")이 항상 "-"로만 나오던 것을
   * 축별·강점/보완 상태별 실제 예시 문구로 채움 */
  const EXAMPLE_PHRASE = {
    P: { strong: '"목표를 설정하고 체계적으로 실행", "프로젝트를 기획하고 완수"', weak: '"단계를 하나씩 정하며 계획 세우는 연습을 하는 중"' },
    A: { strong: '"긴 시간 집중력을 유지하며 몰입", "꾸준한 반복 훈련으로 완성도를 높임"', weak: '"짧은 몰입 루틴으로 집중력을 훈련"' },
    S: { strong: '"복잡한 정보를 종합", "전체 구조를 먼저 파악"', weak: '"전체 그림을 그려보는 연습을 스스로 시도"' },
    Q: { strong: '"순서를 지켜 정확하게 절차를 수행", "단계별로 꼼꼼하게 검증"', weak: '"단계별 점검 습관을 스스로 개발"' },
  };

  function pickWeakAxis(scores) {
    return [{k:'P',v:scores.P},{k:'A',v:scores.A},{k:'S',v:scores.S},{k:'Q',v:scores.Q}]
      .sort(function(a,b){return a.v-b.v;})[0].k;
  }
  function hasBatchim(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }
  function fill(str, vars) {
    let out = str;
    Object.keys(vars).forEach(function (k) {
      const val = String(vars[k]);
      const b = hasBatchim(val);
      out = out.replace(new RegExp('\\{' + k + '\\}는', 'g'), val + (b ? '은' : '는'));
      out = out.replace(new RegExp('\\{' + k + '\\}은', 'g'), val + (b ? '은' : '는'));
      out = out.replace(new RegExp('\\{' + k + '\\}가', 'g'), val + (b ? '이' : '가'));
      out = out.replace(new RegExp('\\{' + k + '\\}이', 'g'), val + (b ? '이' : '가'));
      out = out.replace(new RegExp('\\{' + k + '\\}', 'g'), val);
    });
    return out;
  }
  function getCombo(scores) {
    const key = pickComboKey(scores);
    let combo = COMBO[key];
    let balTier = null;
    // 패치: 균형형(BAL)일 때 평균 점수 수준(저/중/고)에 따라 유형명·서술·인물비교 유무를 분기
    if (key === 'BAL') {
      const avg = (scores.P + scores.A + scores.S + scores.Q) / 4;
      if (avg >= 75) {
        balTier = 'HIGH';
        combo = Object.assign({}, combo, {
          code: 'COGNITIVE ID · BAL-H', heroType: '균형형 올라운더(고역량)',
          oneliner: '네 가지 인지 능력을 모두 안정적으로 활용하고 통합할 수 있어, 복합적인 과제에서도 흔들림 없이 힘을 발휘해요.',
          chips: ['#고른고역량', '#안정적통합력', '#복합과제강점', '#전문성확장'],
        });
      } else if (avg > 52) {
        balTier = 'MID';
        combo = Object.assign({}, combo, {
          code: 'COGNITIVE ID · BAL-M', heroType: '균형형 전략 탐색가',
          oneliner: '네 가지 인지 능력이 고르게 나타나는 시기예요. 특정 방식을 강점으로 굳히기보다, 여러 접근을 비교해보며 나에게 맞는 전략을 찾아가는 단계예요.',
          chips: ['#고른잠재력', '#전략탐색중', '#다양한시도', '#효과검증단계'],
          figure: null,
        });
      } else {
        balTier = 'LOW';
        combo = Object.assign({}, combo, {
          code: 'COGNITIVE ID · BAL-L', heroType: '균형형 성장 구간',
          oneliner: '네 가지 인지 능력이 특정 영역에 치우치지 않고 고르게 나타나요. 지금은 네 영역의 기초 역량을 함께 다지며, 짧은 반복 루틴과 완료 경험을 쌓아가는 시기예요.',
          chips: ['#고른출발선', '#기초역량다지기', '#짧은반복루틴', '#완료경험쌓기'],
          figure: null,
        });
      }
      if (balTier !== 'HIGH') combo.figure = null;
    }
    return { key: key, combo: combo, balTier: balTier, weakAxisKey: pickWeakAxis(scores), weakAxisLabel: AXIS_LABEL[pickWeakAxis(scores)] };
  }

  global.DCasTeenComboBank = { COMBO: COMBO, WEAK_KW: WEAK_KW, EXAMPLE_PHRASE: EXAMPLE_PHRASE, pickComboKey: pickComboKey, getCombo: getCombo, fill: fill, AXIS_LABEL: AXIS_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
