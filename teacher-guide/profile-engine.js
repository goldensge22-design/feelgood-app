(function attachGuideProfileEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.GuideProfileEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGuideProfileEngine() {
  'use strict';

  const ORDER = ['plan', 'attention', 'simultaneous', 'successive'];
  const LEVELS = ['H', 'M', 'L'];
  const LEVEL_LABELS = {H: '상', M: '중', L: '하'};
  const LEVEL_SCORE = {H: 2, M: 1, L: 0};
  const AXES = {
    plan: {
      code: 'P', label: '계획',
      high: '목표 설정·전략 선택·오류 점검을 스스로 확장하는 과제를 제공합니다.',
      support: '목표 한 문장, 첫 행동, 3단계 계획과 중간 점검표를 함께 제공합니다.',
      material: '선택 가능한 전략 카드와 자기점검 질문을 자료 첫 면에 배치합니다.',
      management: '과제 시작 시각과 첫 행동을 함께 정하고, 중간 확인은 한 번만 예고합니다.',
      observe: '과제 시작까지 걸린 시간, 전략 변경과 제출 전 점검 여부를 기록합니다.',
      home: '해야 할 일을 한 문장으로 정한 뒤 첫 행동만 함께 적어 봅니다.',
      question: '시작이 쉬웠던 날에는 무엇을 먼저 했나요?',
      script: '목표를 세우는 방식에는 강점과 도움이 필요한 조건이 함께 있을 수 있습니다.'
    },
    attention: {
      code: 'A', label: '주의',
      high: '핵심 단서 탐색·오류 검토·정확성 비교가 필요한 심화 활동을 제공합니다.',
      support: '한 번에 한 지시, 핵심 표시, 짧은 활동 구간과 복귀 신호를 사용합니다.',
      material: '불필요한 장식을 줄이고 핵심어와 확인 지점을 한눈에 보이게 합니다.',
      management: '좌석은 벌이 아니라 과제에 필요한 자극이 잘 보이는 위치로 조정하고 짧은 휴식을 예고합니다.',
      observe: '집중 지속 시간보다 과제로 돌아온 횟수, 정확도와 도움 사용을 함께 기록합니다.',
      home: '10분 안팎의 짧은 활동 뒤 스스로 돌아온 방법을 한 가지 말해 봅니다.',
      question: '집중이 다시 돌아왔던 순간에는 어떤 도움이 있었나요?',
      script: '집중은 의지 하나가 아니라 과제 길이와 환경, 돌아오는 전략의 영향을 받습니다.'
    },
    simultaneous: {
      code: 'S', label: '동시처리',
      high: '복합 자료의 관계 찾기, 비교·분류·구조화와 개방형 추론을 확장합니다.',
      support: '전체 지도, 관계도, 색상 묶음과 완성 예시를 먼저 보여 줍니다.',
      material: '글·그림·도표의 관계를 연결하고 예시와 비예시를 나란히 제공합니다.',
      management: '새 단원과 활동 전환 전에 오늘의 전체 흐름을 한 화면으로 안내합니다.',
      observe: '부분 정보를 전체 의미로 연결하는지, 시각 자료 뒤 설명 정확도가 달라지는지 기록합니다.',
      home: '하루 활동을 그림이나 간단한 관계도로 묶어 전체 흐름을 설명해 봅니다.',
      question: '그림이나 전체 구조를 먼저 봤을 때 이해가 달라졌나요?',
      script: '전체 관계를 먼저 볼 때와 세부부터 볼 때 이해 속도가 달라질 수 있습니다.'
    },
    successive: {
      code: 'Q', label: '순차처리',
      high: '절차 설명·규칙 발견·다음 단계 예측과 여러 절차의 효율 비교를 확장합니다.',
      support: '긴 지시를 짧게 나누고 순서 카드, 체크리스트와 시범을 제공합니다.',
      material: '단계를 번호와 동사로 표시하고 완료한 순서를 직접 확인하게 합니다.',
      management: '준비물과 제출 절차를 같은 순서로 반복하되 익숙해지면 안내를 조금씩 줄입니다.',
      observe: '지시 재현, 단계 누락, 순서 카드 사용 뒤 독립 수행의 변화를 기록합니다.',
      home: '준비나 정리 과정을 3~5단계로 적고 끝난 단계만 표시합니다.',
      question: '순서를 잊지 않고 해냈던 때에는 어떤 표시를 사용했나요?',
      script: '순서가 보이거나 짧게 나뉘면 수행이 더 안정되는지 함께 확인하겠습니다.'
    }
  };

  const unique = items => [...new Set(items.filter(Boolean))];
  const labels = keys => keys.map(key => AXES[key].label);

  function normalize(levels) {
    const normalized = {};
    ORDER.forEach(key => {
      const value = levels && levels[key];
      if (!LEVELS.includes(value)) throw new Error('지원하지 않는 PASS 수준: ' + key);
      normalized[key] = value;
    });
    return normalized;
  }

  function profileCode(levels) {
    const value = normalize(levels);
    return ORDER.map(key => AXES[key].code + '-' + value[key]).join(' / ');
  }

  function profileName(levels) {
    const value = normalize(levels);
    const high = ORDER.filter(key => value[key] === 'H');
    const low = ORDER.filter(key => value[key] === 'L');
    if (high.length === 4) return '전 영역 고강점 확장형';
    if (low.length === 4) return '전 영역 지원 우선형';
    if (ORDER.every(key => value[key] === 'M')) return '평균 범위 균형형';
    if (high.length && low.length) return labels(high).join('·') + ' 강점 / ' + labels(low).join('·') + ' 지원형';
    if (high.length) return labels(high).join('·') + ' 강점 확장형';
    if (low.length) return labels(low).join('·') + ' 지원 조정형';
    return '과제 조건 탐색형';
  }

  function profileFacts(levels) {
    const value = normalize(levels);
    const high = ORDER.filter(key => value[key] === 'H');
    const mid = ORDER.filter(key => value[key] === 'M');
    const low = ORDER.filter(key => value[key] === 'L');
    const scores = ORDER.map(key => LEVEL_SCORE[value[key]]);
    const spread = Math.max(...scores) - Math.min(...scores);
    const left = LEVEL_SCORE[value.plan] + LEVEL_SCORE[value.attention];
    const right = LEVEL_SCORE[value.simultaneous] + LEVEL_SCORE[value.successive];
    const tiltDifference = left - right;
    const executiveDifference = LEVEL_SCORE[value.plan] - LEVEL_SCORE[value.attention];
    const tags = [];
    if (new Set(scores).size === 1) tags.push(value.plan === 'H' ? '전 영역 상' : value.plan === 'M' ? '균형형' : '전 영역 하');
    high.forEach(key => tags.push(AXES[key].label + ' 강점'));
    low.forEach(key => tags.push(AXES[key].label + ' 지원 필요'));
    if (high.length >= 2) tags.push('복합 강점형');
    if (low.length >= 2) tags.push('복수 영역 지원형');
    if (spread === 2) tags.push('영역 간 편차 큼');
    if (Math.abs(tiltDifference) >= 2) tags.push(tiltDifference > 0 ? 'P·A 상대 강점 경향' : 'S·Q 상대 강점 경향');
    return {value, high, mid, low, spread, tiltDifference, executiveDifference, tags: unique(tags)};
  }

  function patternSummary(facts) {
    if (facts.high.length === 4) return '네 영역 모두 상 구간으로 선택되었습니다. 높은 수행을 하나로 묶지 말고 과제별 전략 선택과 실제 수행자료를 함께 확인합니다.';
    if (facts.low.length === 4) return '네 영역 모두 지원 신호가 있습니다. 검사환경·피로·불안·언어 이해를 먼저 확인하고 작은 성공 조건부터 다시 설계합니다.';
    if (facts.mid.length === 4) return '네 영역이 평균 범위에서 균형을 이룹니다. 과제의 낯섦·복잡성·흥미에 따라 필요한 도움이 달라지는지 관찰합니다.';
    if (facts.high.length && facts.low.length) return labels(facts.high).join('·') + '의 강점을 ' + labels(facts.low).join('·') + ' 지원의 통로로 활용하는 프로필입니다.';
    if (facts.high.length) return labels(facts.high).join('·') + '의 뚜렷한 강점을 다른 처리과정과 연결해 확장하는 프로필입니다.';
    if (facts.low.length) return labels(facts.low).join('·') + '이 필요한 과제 조건을 구체적으로 조정하는 프로필입니다.';
    return '네 영역의 상대적 차이보다 실제 과제 조건과 전략 사용을 중심으로 살피는 프로필입니다.';
  }

  function highPotential(facts) {
    if (!facts.high.length) return ['현재 선택에는 상 구간이 없습니다. 실제 결과지와 수행자료에서 별도의 고강점이 확인되는지 살핍니다.'];
    return facts.high.map(key => AXES[key].label + ' 상 구간: ' + AXES[key].high + ' 상 선택만으로 영재를 확정하지 않고 실제 결과지의 기준 충족 여부와 학생 수행자료를 함께 확인합니다.');
  }

  function balanceNote(facts) {
    if (facts.mid.length === 4) return '네 영역 모두 중 구간으로, 평균 범위 안의 균형과 과제별 변화를 함께 봅니다.';
    if (facts.spread === 0) return '네 영역의 선택 수준이 같아 범주상 편차는 두드러지지 않습니다.';
    return '중 구간은 고정된 평균 능력이 아니라 과제 조건에 따라 강점 또는 지원 필요가 달라질 수 있는 범위로 해석합니다.';
  }

  function tiltNote(facts) {
    if (Math.abs(facts.tiltDifference) < 2) return 'P·A와 S·Q의 선택 범주 차이가 크지 않습니다. 실제 결과지의 점수 차이와 유의성을 확인합니다.';
    const stronger = facts.tiltDifference > 0 ? 'P·A(계획·주의)' : 'S·Q(동시·순차처리)';
    const other = facts.tiltDifference > 0 ? 'S·Q' : 'P·A';
    return stronger + '가 ' + other + '보다 상대적으로 높은 선택 패턴입니다. 이는 정보처리 방식의 상대 차이를 설명할 뿐 뇌 반구 능력을 진단하지 않으며, 실제 점수 차이와 과제 수행으로 재확인합니다.';
  }

  function executiveGapNote(facts) {
    if (facts.executiveDifference === 0) return '계획과 주의가 같은 구간으로 선택되어 실행조절의 범주상 편차는 두드러지지 않습니다.';
    return facts.executiveDifference > 0
      ? '계획이 주의보다 상대적으로 높습니다. 전략을 세운 뒤 집중을 유지하고 오류를 확인하는 과정에 별도 구조가 필요한지 봅니다.'
      : '주의가 계획보다 상대적으로 높습니다. 집중은 가능해도 과제 시작·전략 선택·방법 수정에 시작 틀이 필요한지 봅니다.';
  }

  function lowSupport(facts) {
    if (!facts.low.length) return ['현재 선택에는 하 구간이 없습니다. 시간 압박이나 새로운 과제에서 일시적 지원이 필요한지는 계속 관찰합니다.'];
    const items = facts.low.map(key => AXES[key].label + ': ' + AXES[key].support);
    if (facts.low.length === 4) items.push('수업과 생활의 어려움이 지속되면 보호자와 협의하여 학교 전문인력 또는 전문기관의 종합평가를 검토합니다.');
    return items;
  }

  function teacherAnalysis(levels) {
    const facts = profileFacts(levels);
    const priority = facts.low.length ? facts.low : facts.mid.length ? facts.mid : facts.high;
    const teachingTips = unique([
      ...priority.map(key => AXES[key][facts.value[key] === 'H' ? 'high' : 'support']),
      ...facts.high.map(key => AXES[key].high),
      '공통 학습목표는 유지하고 설명 방식·자료·시간·도움 수준만 한 번에 하나씩 조정합니다.',
      '수업 끝에 학생이 사용한 전략과 다음에 바꿀 한 가지를 짧게 말하게 합니다.'
    ]).slice(0, 6);
    while (teachingTips.length < 4) teachingTips.push(AXES[ORDER[teachingTips.length]].material);
    const materials = unique(ORDER.map(key => facts.value[key] === 'L' ? AXES[key].material : facts.value[key] === 'H' ? AXES[key].high : AXES[key].material)).slice(0, 6);
    const management = unique([
      ...priority.map(key => AXES[key].management),
      '모둠 역할과 기대 수준을 프로필로 고정하지 않고 관심·경험·과제 목표에 따라 교대합니다.',
      '과제 분량, 제출 방식과 도움 사용을 따로 기록하여 한 번의 결과로 판단하지 않습니다.'
    ]).slice(0, 6);
    for (const key of ORDER) {
      if (management.length >= 4) break;
      if (!management.includes(AXES[key].management)) management.push(AXES[key].management);
    }
    const observation = unique(ORDER.map(key => AXES[key].observe));
    return {
      code: profileCode(facts.value), name: profileName(facts.value), tags: facts.tags,
      summary: patternSummary(facts), highPotential: highPotential(facts), balance: balanceNote(facts),
      tilt: tiltNote(facts), executiveGap: executiveGapNote(facts), lowSupport: lowSupport(facts),
      extensions: facts.high.length ? facts.high.map(key => AXES[key].high) : ['상 구간이 없을 때도 관심과 성공 경험을 바탕으로 심화 기회를 열어 둡니다.'],
      materials, management, observation, teachingTips,
      cautions: unique([
        '‘상’은 영재 판정이 아니며 실제 결과지 기준과 수행자료를 함께 확인합니다.',
        '좌·우 기울기는 상대적 정보처리 패턴이며 뇌 반구 능력이나 진로를 직접 진단하지 않습니다.',
        '강점은 심화 기회와 연결하되 특정 과목·진로·모둠 역할을 확정하지 않습니다.',
        ...(facts.low.length === 4 ? ['검사환경·피로·불안·언어 이해를 먼저 확인하고, 어려움이 지속되면 보호자와 협의해 종합평가를 검토합니다.'] : [])
      ])
    };
  }

  function parentAnalysis(levels) {
    const facts = profileFacts(levels);
    const focus = facts.low.length ? facts.low : facts.high.length ? facts.high : ORDER;
    const highText = facts.high.length ? labels(facts.high).join('·') + '에서 강점 가능성이 보이지만 실제 기준과 수행자료를 함께 확인합니다.' : '별도 상 구간이 없어도 관심과 성공 경험에서 강점을 계속 찾습니다.';
    const lowText = facts.low.length ? labels(facts.low).join('·') + '이 필요한 상황에서 도움 조건을 구체적으로 살핍니다.' : '뚜렷한 하 구간이 없어도 낯선 과제와 피로 상황의 변화를 살핍니다.';
    const questions = unique([
      ...focus.map(key => AXES[key].question),
      '가정에서 비교적 편안하게 시작하고 끝내는 활동은 무엇인가요?',
      '도움을 줄였을 때와 늘렸을 때 수행이 어떻게 달라졌나요?'
    ]).slice(0, 6);
    const homeSupports = unique([
      ...focus.map(key => AXES[key].home),
      '한 주에 한 가지 지원만 시도하고 참여·도움 사용·완료 여부를 짧게 기록합니다.',
      '잘된 결과보다 도움이 된 조건과 사용한 전략을 구체적으로 칭찬합니다.'
    ]).slice(0, 6);
    const behaviors = unique(ORDER.map(key => AXES[key].observe.replace('기록합니다.', '가정에서도 확인합니다.')));
    const scripts = unique([
      ...focus.slice(0, 3).map(key => AXES[key].script),
      '이 결과는 학생을 분류하는 결론이 아니라 도움이 되는 조건을 함께 찾기 위한 출발점입니다.',
      facts.high.length && facts.low.length ? labels(facts.high).join('·') + '의 강점을 활용해 ' + labels(facts.low).join('·') + '이 필요한 장면을 지원해 보겠습니다.' : ''
    ]).slice(0, 5);
    const avoid = [
      '노력이나 의지 하나로 원인을 단정하지 않습니다.',
      '상·중·하를 고정된 능력, 성격 또는 진단명으로 바꾸어 말하지 않습니다.',
      '정보처리 기울기를 뇌의 한쪽 발달이나 과목·직업 적합성으로 확대하지 않습니다.',
      '상 구간만으로 영재를, 하 구간만으로 낮은 능력을 확정하지 않습니다.'
    ];
    const jointObservation = unique([
      ...focus.map(key => AXES[key].observe),
      '학교와 가정이 같은 기간 동안 과제 시작, 도움 사용, 전략 변화와 정서 반응을 함께 기록합니다.'
    ]).slice(0, 6);
    if (facts.low.length === 4) jointObservation.push('피로·불안·언어 이해·검사환경을 먼저 확인하고, 어려움이 지속되면 학교 전문인력 또는 전문기관의 종합평가를 함께 검토합니다.');
    return {
      code: profileCode(facts.value), name: profileName(facts.value), tags: facts.tags,
      summary: patternSummary(facts) + ' ' + highText + ' ' + lowText + ' ' + tiltNote(facts),
      keyMessage: '이 결과는 잘하고 못하는 순위가 아니라, 학생이 이해하고 참여하기 쉬운 조건을 학교와 가정이 함께 찾기 위한 자료입니다.',
      behaviors, questions, homeSupports, scripts, avoid, jointObservation
    };
  }

  function allCombinations() {
    const combinations = [];
    LEVELS.forEach(plan => LEVELS.forEach(attention => LEVELS.forEach(simultaneous => LEVELS.forEach(successive => {
      combinations.push({plan, attention, simultaneous, successive});
    }))));
    return combinations;
  }

  return {ORDER, LEVELS, LEVEL_LABELS, AXES, normalize, profileCode, profileName, profileFacts, teacherAnalysis, parentAnalysis, allCombinations};
});
