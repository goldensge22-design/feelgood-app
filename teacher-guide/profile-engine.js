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
    const patternKey = ORDER.map(key => value[key]).join('');
    const classification = high.length === 4 ? '전 영역 상' : low.length === 4 ? '전 영역 하' : mid.length === 4 ? '중간 수준 중심의 균형형'
      : high.length && low.length ? '상·하가 함께 있는 큰 편차형'
        : high.length ? high.length + '영역 강점형' : low.length ? low.length + '영역 지원형' : '과제 조건 탐색형';
    return {value, high, mid, low, spread, tiltDifference, executiveDifference, patternKey, classification, tags: unique(tags)};
  }

  const PA_RULES = {
    HH:{teacher:'목표를 세우고 핵심 자극을 유지하며 수행 중 전략을 점검할 가능성이 큽니다.',home:'스스로 계획하고 집중하는 모습이 보여도 과제 난도와 피로에 따라 점검 방식은 달라질 수 있습니다.',first:'학생이 목표와 점검 기준을 직접 정하게 합니다.',fade:'교사의 확인 횟수를 줄이고 자기점검 근거를 말하게 합니다.',risk:'자기조절이 좋아 보인다는 이유로 모든 학습내용을 혼자 이해할 것이라 단정하지 않습니다.'},
    HM:{teacher:'방법을 세우는 힘은 뚜렷하지만 수행 중 집중과 오류 확인은 과제 조건에 따라 흔들릴 수 있습니다.',home:'계획은 잘 세우지만 길거나 반복적인 숙제에서 집중 유지가 달라지는지 살핍니다.',first:'학생의 계획 안에 짧은 확인 지점을 넣습니다.',fade:'확인표를 학생이 선택하게 한 뒤 사용 횟수를 줄입니다.',risk:'좋은 계획이 곧 안정적인 실행을 보장한다고 보지 않습니다.'},
    HL:{teacher:'방법은 세울 수 있지만 수행 중 핵심 자극 유지와 오류 확인에서 어려움이 생길 수 있습니다.',home:'해야 할 일은 알면서도 중간에 다른 자극으로 옮겨가거나 마무리 확인을 놓칠 수 있습니다.',first:'학생이 목표와 집중 구간을 정하고 계획 안에 복귀 신호를 넣게 합니다.',fade:'교사 신호에서 학생이 정한 타이머·표시로 옮긴 뒤 외부 신호를 줄입니다.',risk:'계획을 말할 수 있다는 이유로 집중 이탈을 의지 문제로 해석하지 않습니다.'},
    MH:{teacher:'제시된 목표에는 안정적으로 집중하지만 새 과제의 전략을 스스로 정할 때 선택지가 필요할 수 있습니다.',home:'정해진 숙제에는 집중해도 시작 방법을 고르거나 방법을 바꾸는 순간에 멈출 수 있습니다.',first:'두 가지 시작 방법을 제시하고 학생이 하나를 고르게 합니다.',fade:'교사가 주던 선택지를 학생이 직접 만들게 합니다.',risk:'집중하는 모습을 보고 계획과 전환도 항상 독립적이라고 단정하지 않습니다.'},
    MM:{teacher:'익숙한 과제에서는 계획과 집중이 균형을 이루지만 낯섦·시간 압박·흥미에 따라 실행조절이 달라질 수 있습니다.',home:'숙제 종류와 시간대에 따라 시작과 집중이 달라지는지 비교 관찰합니다.',first:'목표 한 문장과 중간 확인 한 번을 공통 구조로 제공합니다.',fade:'안정된 과제부터 확인 질문을 생략합니다.',risk:'평균 범위를 특징 없음으로 해석하지 않습니다.'},
    ML:{teacher:'과제의 방향은 이해해도 지속적인 집중과 오류 확인이 약해져 계획을 끝까지 실행하지 못할 수 있습니다.',home:'처음에는 시작하지만 긴 활동에서 빠뜨리거나 마무리가 늦어지는지 확인합니다.',first:'계획을 8~12분 실행 구간으로 나누고 구간마다 복귀 신호를 둡니다.',fade:'집중 구간을 조금씩 늘리되 정확도와 피로를 함께 봅니다.',risk:'완료하지 못한 결과만 보고 계획 능력까지 낮다고 단정하지 않습니다.'},
    LH:{teacher:'제시된 과제에는 집중할 수 있지만 목표 설정·시작·전략 전환에는 구조가 필요할 수 있습니다.',home:'해야 할 일이 분명하면 몰입하지만 무엇부터 할지 정해야 할 때 도움을 찾을 수 있습니다.',first:'명확한 목표와 첫 단계를 제공하고 집중력을 이용해 계획표를 한 단계씩 완성하게 합니다.',fade:'첫 단계 제공에서 빈 계획표, 자기 계획으로 순서대로 옮깁니다.',risk:'집중력이 좋다는 이유로 과제 시작의 어려움을 게으름으로 보지 않습니다.'},
    LM:{teacher:'집중은 과제에 따라 가능하지만 시작 목표와 전략 선택이 불분명하면 참여가 늦어질 수 있습니다.',home:'익숙한 일은 해도 새 숙제의 첫 행동을 정하는 데 시간이 걸리는지 봅니다.',first:'완성 예시와 첫 행동을 제시한 뒤 다음 행동은 학생이 고르게 합니다.',fade:'완성 예시를 부분 예시로 줄이고 첫 행동을 질문으로 바꿉니다.',risk:'시작이 늦다는 사실을 이해 부족이나 태도의 문제로 확대하지 않습니다.'},
    LL:{teacher:'목표 설정과 집중 유지가 함께 부담되어 이해한 내용보다 실제 수행이 낮게 나타날 수 있습니다.',home:'숙제 시작, 지속, 마무리에서 반복 안내가 필요한지와 피로·정서를 함께 확인합니다.',first:'한 문장 목표·한 번의 지시·짧은 실행 구간으로 성공 단위를 줄입니다.',fade:'첫 행동 도움을 줄인 뒤 집중 구간을 늘리고, 두 지원을 동시에 제거하지 않습니다.',risk:'실행조절의 어려움을 전반적 능력이나 의지 부족으로 해석하지 않습니다.'}
  };

  const SQ_RULES = {
    HH:{teacher:'전체 관계와 단계 절차를 모두 활용해 복합 정보를 여러 방식으로 재구성할 수 있습니다.',home:'그림으로 설명할 때와 순서대로 설명할 때 모두 이해가 안정적인지 확인합니다.',first:'전체 지도와 절차를 함께 주고 더 효율적인 표현을 선택하게 합니다.',fade:'교사 자료를 줄이고 학생이 관계도와 절차표를 직접 만들게 합니다.',risk:'두 처리 강점이 모든 교과 성취나 진로를 자동 보장한다고 보지 않습니다.'},
    HM:{teacher:'전체 구조를 빠르게 잡는 편이지만 긴 절차는 길이와 익숙함에 따라 확인이 필요할 수 있습니다.',home:'전체 이야기는 잘 설명해도 준비물·순서가 길어질 때 빠뜨리는지 봅니다.',first:'전체 지도를 먼저 보여주고 핵심 단계만 번호로 연결합니다.',fade:'번호 수를 줄이고 학생이 빠진 단계를 채우게 합니다.',risk:'맥락 이해가 좋다는 이유로 순서 기억도 항상 안정적이라 보지 않습니다.'},
    HL:{teacher:'전체 구조와 관계를 이해하는 힘을 활용해, 긴 절차를 눈에 보이는 짧은 순서로 변환해야 합니다.',home:'무엇을 해야 하는지는 알지만 순서를 건너뛰거나 말 지시를 일부 놓치는지 확인합니다.',first:'전체 지도와 관계도를 먼저 보여주고 학생이 이해한 구조를 짧은 순서 카드로 바꾸게 합니다.',fade:'완성된 순서 카드에서 빈 카드, 자기 생성 절차로 줄여 갑니다.',risk:'전체를 이해했다는 이유로 단계 누락을 부주의로만 해석하지 않습니다.'},
    MH:{teacher:'단계 수행은 안정적이지만 세부 단계가 전체 개념에서 어떤 역할을 하는지 연결하는 질문이 필요할 수 있습니다.',home:'순서는 잘 지켜도 새로운 상황에서 왜 그 순서인지 설명하기 어려운지 살핍니다.',first:'절차를 수행한 뒤 각 단계가 전체 목표에 기여하는 이유를 연결합니다.',fade:'관계 질문 수를 줄이고 학생이 핵심 연결을 직접 표시하게 합니다.',risk:'절차 수행의 정확성을 전체 개념 이해와 동일하게 보지 않습니다.'},
    MM:{teacher:'전체 관계와 순서 처리가 과제 조건에 따라 달라지므로 자료 형식에 따른 수행 변화를 관찰해야 합니다.',home:'그림·말·글·순서표 중 어떤 방식에서 이해와 기억이 안정적인지 비교합니다.',first:'전체 개요와 짧은 단계표를 함께 제공해 유리한 출발점을 찾습니다.',fade:'더 효과적인 자료 하나만 남기고 독립 수행을 확인합니다.',risk:'중간 범위를 뚜렷한 특징이 없는 상태로 보지 않습니다.'},
    ML:{teacher:'전체 맥락은 잡을 수 있어도 긴 지시와 절차 재현에서 단계가 누락될 수 있습니다.',home:'이야기의 뜻은 알지만 준비·정리 순서를 일부 건너뛰는지 확인합니다.',first:'완성 장면을 먼저 보여주고 3~5개 단계 카드로 실행을 연결합니다.',fade:'카드의 그림을 줄인 뒤 핵심 동사만 남깁니다.',risk:'절차 누락을 전체 이해 부족으로 확대하지 않습니다.'},
    LH:{teacher:'단계와 순서를 강점으로 활용해 접근한 뒤, 각 단계가 전체 개념에서 맡는 역할을 관계도로 연결해야 합니다.',home:'순서대로는 잘하지만 낯선 문제에서 부분들을 한꺼번에 연결하기 어려운지 봅니다.',first:'단계별 절차로 시작하고 완료한 단계들을 전체 관계도에 하나씩 붙입니다.',fade:'관계도의 연결선을 학생이 직접 그리게 한 뒤 틀을 줄입니다.',risk:'순서를 잘 따른다는 이유로 새로운 전체 구조도 스스로 파악할 것이라 단정하지 않습니다.'},
    LM:{teacher:'짧은 절차는 따라가지만 정보가 많아질 때 전체 구조를 놓칠 수 있어 개요가 먼저 필요합니다.',home:'단계는 지키면서도 활동 전체의 목적을 반복해서 묻는지 살핍니다.',first:'한 화면 개요를 먼저 제시하고 각 단계가 개요의 어디인지 표시합니다.',fade:'개요의 표식을 줄이고 학생이 현재 위치를 말하게 합니다.',risk:'부분 수행의 성공을 전체 관계 이해로 곧바로 일반화하지 않습니다.'},
    LL:{teacher:'전체 관계와 순서 처리가 함께 부담되어 정보량이 많거나 지시가 길면 이해와 실행이 동시에 흔들릴 수 있습니다.',home:'새로운 문제와 여러 단계의 일에서 도움 요청이 늦거나 포기 반응이 나타나는지 살핍니다.',first:'완성 예시 한 장과 한 번에 한 단계만 제시해 정보량을 줄입니다.',fade:'단계 수를 늘리기 전에 전체 개요를 스스로 설명할 수 있는지 확인합니다.',risk:'정보처리 부담을 노력 부족이나 전반적 능력 저하로 단정하지 않습니다.'}
  };

  const BRIDGES = {
    'plan>attention':'학생이 세운 목표 안에 집중 구간·복귀 신호·오류 확인 시점을 직접 넣게 합니다.',
    'plan>simultaneous':'학생이 세운 목표를 개념 지도와 완성 예시로 바꾸어 전체 관계를 보이게 합니다.',
    'plan>successive':'학생의 계획을 짧은 동사형 단계와 체크 순서로 변환합니다.',
    'attention>plan':'현재 집중하고 있는 과제에서 첫 행동과 다음 선택을 하나씩 계획표에 채우게 합니다.',
    'attention>simultaneous':'집중해 찾은 핵심 단서를 색·선·묶음으로 연결해 전체 구조를 만들게 합니다.',
    'attention>successive':'집중이 유지되는 짧은 구간마다 완료 순서를 표시해 절차를 고정합니다.',
    'simultaneous>plan':'전체 구조에서 오늘의 목표와 첫 행동을 학생이 골라 계획으로 바꾸게 합니다.',
    'simultaneous>attention':'전체 지도에서 지금 볼 부분만 강조하고, 완료 뒤 다음 부분으로 시선을 옮기게 합니다.',
    'simultaneous>successive':'이해한 전체 구조를 3~5개의 순서 카드로 바꾸고 빠진 단계를 확인하게 합니다.',
    'successive>plan':'익숙한 단계표의 첫 칸에 목표를 쓰고, 끝난 뒤 더 나은 순서를 선택하게 합니다.',
    'successive>attention':'짧은 단계마다 볼 핵심 단서를 하나씩 정해 집중 범위를 좁힙니다.',
    'successive>simultaneous':'완료한 단계들을 관계도에 붙여 각 부분이 전체에서 하는 역할을 연결합니다.'
  };

  const SPECIAL_PATTERNS = {
    HHHL:{teacher:'전체 구조를 이해하고 스스로 방법을 세우며 핵심에 집중할 수 있지만, 긴 절차를 말이나 기억만으로 유지할 때 단계 누락이 생길 수 있습니다.',parent:'해야 할 일과 전체 방향은 잘 파악해도 준비·정리·긴 지시의 순서를 눈에 보이게 해야 안정될 수 있습니다.',priority:'학생이 이해한 전체 구조와 자기계획을 짧은 순서 카드로 바꾸는 지원을 먼저 제공합니다.'},
    LHHL:{teacher:'전체 구조를 파악하고 제시된 과제에 집중할 수 있지만, 목표 설정과 긴 절차를 동시에 스스로 구성해야 하면 시작이 늦어질 수 있습니다.',parent:'무엇을 보는지는 잘 알지만 무엇부터 시작해 어떤 순서로 끝낼지는 구체적인 틀이 필요할 수 있습니다.',priority:'목표와 첫 단계를 먼저 제공한 뒤, 동시처리 강점을 활용해 전체 구조를 잡고 마지막에 순서표를 완성합니다.'},
    HLHL:{teacher:'전체 구조와 전략을 세우는 힘은 분명하지만, 집중 유지와 순서 실행이 함께 부담되어 이해한 만큼 산출하지 못할 수 있습니다.',parent:'해야 할 일의 뜻과 방법은 잘 말해도 오래 집중하거나 순서대로 마치는 과정에서는 도움이 필요할 수 있습니다.',priority:'학생이 세운 계획과 전체 지도를 짧은 집중 구간·시각적 단계표와 결합합니다.'},
    LHLH:{teacher:'제시된 단계에는 집중해 정확히 수행할 수 있지만, 새 과제의 목표와 전체 구조가 보이지 않으면 익숙한 절차만 반복할 수 있습니다.',parent:'정해진 순서는 잘 따르지만 새로운 숙제의 방향과 큰 그림을 스스로 잡는 데 시간이 걸릴 수 있습니다.',priority:'목표·완성 예시·전체 구조를 먼저 제공한 뒤 주의·순차 강점으로 단계 실행을 맡깁니다.'},
    LLHH:{teacher:'정보의 전체 관계와 순서는 잘 이해할 수 있지만 계획·주의 실행조절이 낮아, 이해능력과 실제 과제 시작·완료 사이에 차이가 생길 수 있습니다.',parent:'설명하면 잘 이해하고 순서도 기억하지만 숙제를 시작하거나 집중을 이어 가는 모습은 다르게 보일 수 있습니다.',priority:'이해를 다시 가르치기보다 한 문장 목표와 짧은 집중 구간을 먼저 제공해 강한 정보처리를 실제 수행으로 연결합니다.'},
    HHLL:{teacher:'목표를 세우고 집중해 자기관리를 할 수 있지만, 새로운 정보의 전체 관계나 긴 순서를 처리하는 부담 때문에 학습내용 이해가 늦어질 수 있습니다.',parent:'스스로 앉아 끝까지 하려는 모습이 있어도 복잡한 내용의 관계와 절차는 별도 설명이 필요할 수 있습니다.',priority:'자기관리 강점을 활용하되 완성 예시와 관계도, 짧은 단계표로 학습내용 자체를 먼저 이해시킵니다.'},
    MMMM:{teacher:'네 영역이 중간 범위에서 균형을 이루며 특정 강점이나 약점보다 과제의 낯섦·복잡성·흥미·시간 압박에 따라 수행이 달라질 수 있습니다.',parent:'특징이 없는 결과가 아니라, 활동 종류와 환경에 따라 시작·집중·이해·순서 수행이 달라지는지 살펴야 하는 패턴입니다.',priority:'설명 방식 한 가지를 바꾸고 2~4주 동안 참여·도움 사용·완료 여부의 변화를 비교합니다.'},
    LLLL:{teacher:'네 처리영역 모두에서 지원 신호가 있어, 정보량과 실행 요구를 동시에 줄인 작은 성공부터 시작해야 합니다.',parent:'한 번의 결과로 능력을 단정하지 않고 검사환경·피로·불안·언어 이해를 먼저 확인해야 합니다.',priority:'검사조건을 재확인한 뒤 한 문장 목표·완성 예시·한 단계 지시·짧은 집중 구간을 순서대로 제공합니다.'}
  };

  const levelDescription = facts => ORDER.map(key => AXES[key].label + ' ' + LEVEL_LABELS[facts.value[key]]).join('·');
  const pairRule = (facts, pair) => pair === 'pa' ? PA_RULES[facts.value.plan + facts.value.attention] : SQ_RULES[facts.value.simultaneous + facts.value.successive];

  function bridgePath(facts) {
    if (!facts.low.length) return facts.high.length ? labels(facts.high).join('·') + ' 강점을 여러 표현 방식과 심화 과제로 확장합니다.' : '과제마다 더 안정적인 처리 방식을 찾아 다음 과제의 전략으로 이름 붙입니다.';
    const sources = facts.high.length ? facts.high : facts.mid;
    return unique(facts.low.map((lowKey, index) => {
      const source = sources[index % sources.length];
      return BRIDGES[source + '>' + lowKey] || AXES[lowKey].support;
    })).join(' ');
  }

  function integratedSummary(facts, audience) {
    const pa = pairRule(facts, 'pa');
    const sq = pairRule(facts, 'sq');
    const special = SPECIAL_PATTERNS[facts.patternKey];
    const opening = special ? special[audience] : facts.classification + '으로, ' + (facts.high.length ? labels(facts.high).join('·') + '의 강점을 ' : '현재 가능한 전략을 ') + (facts.low.length ? labels(facts.low).join('·') + ' 지원에 연결해야 합니다.' : '과제 조건에 맞게 확장해야 합니다.');
    const bridge = special ? special.priority : bridgePath(facts);
    return [opening, audience === 'teacher' ? pa.teacher : pa.home, audience === 'teacher' ? sq.teacher : sq.home, bridge].join(' ');
  }

  function supportPriorities(facts) {
    const pa = pairRule(facts, 'pa');
    const sq = pairRule(facts, 'sq');
    const special = SPECIAL_PATTERNS[facts.patternKey];
    const first = special ? special.priority : facts.low.some(key => key === 'plan' || key === 'attention') ? pa.first : sq.first;
    return [
      '1순위 — ' + levelDescription(facts) + ': ' + first,
      '2순위 — 강점 활용 경로: ' + bridgePath(facts),
      '3순위 — 지원 줄이기: ' + (facts.low.some(key => key === 'plan' || key === 'attention') ? pa.fade : sq.fade)
    ];
  }

  function strengthUses(facts) {
    const sources = facts.high.length ? facts.high : facts.mid.length ? facts.mid : ORDER;
    const uses = {
      plan:'문제 해결과 프로젝트에서 목표·전략·점검 기준을 세우는 역할로 활용합니다.',
      attention:'핵심 단서 찾기, 오류 점검, 토론 중 근거 확인에 활용합니다.',
      simultaneous:'개념 이해, 관계 비교, 발표의 전체 구조 구성에 활용합니다.',
      successive:'절차 수행, 단계 설명, 제출 전 순서 확인에 활용합니다.'
    };
    return unique(sources.map(key => AXES[key].label + ' 활용 — ' + uses[key]));
  }

  function bottlenecks(facts) {
    const pa = pairRule(facts, 'pa');
    const sq = pairRule(facts, 'sq');
    const items = [pa.risk, sq.risk];
    if (facts.low.length) items.unshift(labels(facts.low).join('·') + '이 필요한 순간에는 ' + labels(facts.high.length ? facts.high : facts.mid).join('·') + '의 강점이 실제 수행으로 이어지도록 연결 장치가 필요합니다.');
    else items.unshift('뚜렷한 하 구간이 없어도 낯선 과제·시간 압박·피로에서 평소 전략이 유지되는지 확인합니다.');
    return unique(items);
  }

  function lessonDesign(facts) {
    const pa = pairRule(facts, 'pa');
    const sq = pairRule(facts, 'sq');
    const supportTask = facts.low.length ? labels(facts.low).join('·') + ' 지원 과제' : labels(facts.high.length ? facts.high : facts.mid).join('·') + ' 확장 과제';
    return [
      '도입 — ' + (facts.value.simultaneous === 'L' ? '오늘 목표와 완성 예시를 먼저 보여주고 전체 위치를 표시합니다.' : '전체 지도와 오늘 목표를 함께 제시해 아는 것과 새로 배울 것을 연결합니다.'),
      '설명 순서 — ' + sq.first,
      '사용할 자료 — ' + (facts.value.successive === 'L' ? '관계도 옆에 3~5개 순서 카드를 둡니다.' : facts.value.simultaneous === 'L' ? '단계표 옆에 각 단계의 전체 역할을 보이는 관계도를 둡니다.' : '전체 개요와 짧은 단계표를 함께 제공합니다.'),
      '과제 제시 — ' + pa.first,
      '시간 분할 — ' + (facts.value.attention === 'L' ? '8~12분 실행과 1분 확인으로 나누고 복귀 신호를 정합니다.' : '한 활동이 끝날 때 전략과 정확도를 짧게 확인합니다.'),
      '중간 확인 — 정답보다 목표 유지, 도움 사용, 전략 변경과 현재 단계 설명을 확인합니다.',
      '마무리와 피드백 — 학생이 활용한 강점과 다음에 줄일 도움 한 가지를 직접 말하게 합니다.',
      '심화·지원 과제 — ' + supportTask + '를 제공하되 공통 학습목표와 기대 수준은 유지합니다.'
    ];
  }

  function managementPlan(facts) {
    const pa = pairRule(facts, 'pa');
    const sq = pairRule(facts, 'sq');
    return [
      '자리와 자극 환경 — ' + (facts.value.attention === 'L' ? '핵심 자료와 교사 신호가 잘 보이고 불필요한 자극이 적은 위치를 학생과 정합니다.' : '프로필로 자리를 고정하지 않고 과제에 필요한 자료가 잘 보이는지 확인합니다.'),
      '과제 시작 지원 — ' + pa.first,
      '활동 전환 — 다음 활동의 전체 위치와 첫 단계를 전환 전에 미리 보여줍니다.',
      '모둠 활동 — ' + labels(facts.high.length ? facts.high : facts.mid).join('·') + ' 강점을 활용할 기회를 주되 역할은 활동마다 교대합니다.',
      '제출과 마무리 — ' + (facts.value.successive === 'L' ? '제출 절차를 보이는 체크카드로 확인합니다.' : '학생이 완료 순서와 오류 점검 근거를 설명하게 합니다.'),
      '교사 개입 시점 — 시작 지연, 복귀 실패, 단계 누락 또는 전체 목표 상실이 두 번 반복될 때 한 가지 지원만 추가합니다.',
      '도움 줄이기 — ' + (facts.low.some(key => key === 'plan' || key === 'attention') ? pa.fade : sq.fade),
      '2~4주 관찰 — 과제 시작 시간, 복귀 횟수, 관계 설명, 단계 누락, 도움 후 독립 수행을 같은 기준으로 기록합니다.'
    ];
  }

  function teacherScripts(facts) {
    const strong = labels(facts.high.length ? facts.high : facts.mid).join('·');
    const need = labels(facts.low.length ? facts.low : facts.mid).join('·');
    return [
      '“' + strong + '에서 네가 사용한 방법을 ' + need + '이 필요한 부분에도 연결해 보자.”',
      '“지금은 답보다 어디서 멈췄는지, 어떤 표시가 다음 행동을 도왔는지 확인해 보자.”',
      '“도움 하나를 줄여도 같은 전략을 사용할 수 있는지 네가 먼저 선택해 보자.”'
    ];
  }

  function teacherAnalysis(levels) {
    const facts = profileFacts(levels);
    const priorities = supportPriorities(facts);
    const lesson = lessonDesign(facts);
    const management = managementPlan(facts);
    const risks = unique([
      pairRule(facts, 'pa').risk, pairRule(facts, 'sq').risk,
      '상 선택만으로 영재를 확정하지 않고 실제 결과지 기준과 수행자료를 함께 확인합니다.',
      '유형으로 모둠 역할·과목·진로·기대 수준을 고정하지 않습니다.',
      ...(facts.low.length === 4 ? ['검사환경·피로·불안·언어 이해를 먼저 확인하고 실제 어려움이 지속되면 보호자와 협의해 전문기관의 종합평가를 검토합니다.'] : [])
    ]);
    return {
      code:profileCode(facts.value), name:profileName(facts.value), tags:facts.tags,
      classification:facts.classification, summary:integratedSummary(facts, 'teacher'), priorities,
      coreLearning:integratedSummary(facts, 'teacher'), strengthUses:strengthUses(facts), bottlenecks:bottlenecks(facts),
      lessonDesign:lesson, management, teacherScripts:teacherScripts(facts), risks,
      expectedBehaviors:unique([AXES.plan.observe, AXES.attention.observe, AXES.simultaneous.observe, AXES.successive.observe]),
      bridge:bridgePath(facts), tilt:pairRule(facts, 'sq').teacher, executiveGap:pairRule(facts, 'pa').teacher,
      teachingTips:lesson.slice(0, 6), observation:management.slice(-2), cautions:risks
    };
  }

  function parentQuestions(facts) {
    const focus = unique([...facts.low, ...facts.high, ...facts.mid]);
    return unique([
      ...focus.slice(0, 3).map(key => AXES[key].question),
      facts.value.plan === 'L' ? '목표와 첫 단계를 정해 주었을 때 숙제 시작 시간이 얼마나 달라지나요?' : '스스로 세운 계획을 끝까지 실행한 날에는 어떤 조건이 있었나요?',
      facts.value.simultaneous === facts.value.successive ? '그림·말·순서표 중 어떤 설명에서 이해와 기억이 가장 안정적인가요?' : '전체 그림을 먼저 볼 때와 순서대로 들을 때 반응이 어떻게 다른가요?'
    ]).slice(0, 5);
  }

  function parentBehaviors(facts) {
    const items = [];
    if (facts.value.plan !== 'H') items.push('숙제 시작 — 해야 할 일을 알아도 첫 행동을 정하거나 방법을 바꾸는 데 시간이 걸리는지 봅니다.');
    if (facts.value.attention !== 'H') items.push('집중 유지 — 중간 이탈 뒤 어떤 말·표시·휴식이 복귀를 돕는지 봅니다.');
    if (facts.value.successive !== 'H') items.push('순서 수행과 준비물 — 긴 지시, 준비·정리, 제출 순서에서 빠뜨림이 반복되는지 봅니다.');
    if (facts.value.simultaneous !== 'H') items.push('새로운 문제 해결 — 부분은 알지만 전체 관계와 문제의 목적을 연결하기 어려운지 봅니다.');
    if (facts.high.length) items.push('강점 장면 — ' + labels(facts.high).join('·') + '을 사용할 때 설명, 도움 요청과 자신감이 어떻게 달라지는지 봅니다.');
    items.push('감정과 피로 — 이해와 수행의 차이가 커지는 시간대, 과제 길이와 정서 반응을 함께 기록합니다.');
    return unique(items).slice(0, 6);
  }

  function parentSupports(facts) {
    const priorities = supportPriorities(facts);
    return [
      priorities[0].replace('1순위 — ' + levelDescription(facts) + ': ', '먼저 — '),
      '다음 — ' + bridgePath(facts),
      priorities[2].replace('3순위 — 지원 줄이기: ', '익숙해지면 — ')
    ];
  }

  function parentScripts(facts) {
    const strong = labels(facts.high.length ? facts.high : facts.mid).join('·');
    const need = labels(facts.low.length ? facts.low : facts.mid).join('·');
    return [
      '“이 결과는 ' + strong + '을 활용하면 ' + need + '이 필요한 장면을 더 편하게 지원할 수 있다는 뜻으로 보겠습니다.”',
      '“가정에서는 한 번에 한 가지 도움만 적용하고, 시작·집중·완료가 어떻게 달라지는지 함께 확인해 주세요.”',
      '“잘된 결과보다 아이가 사용한 방법과 도움이 되었던 조건을 구체적으로 이야기해 주세요.”'
    ];
  }

  function parentAvoid(facts) {
    const items = [
      pairRule(facts, 'pa').risk,
      pairRule(facts, 'sq').risk,
      '상·중·하를 고정된 능력·성격·진단명으로 바꾸어 말하지 않습니다.',
      '정보처리 차이를 뇌의 한쪽 발달이나 특정 과목·직업 적합성으로 확대하지 않습니다.'
    ];
    if (facts.low.length === 4) items.push('모두 하라는 이유로 능력이 낮다고 단정하지 않고 검사조건과 실제 생활의 반복 양상을 먼저 확인합니다.');
    return unique(items);
  }

  function parentAnalysis(levels) {
    const facts = profileFacts(levels);
    const summary = integratedSummary(facts, 'parent');
    const behaviors = parentBehaviors(facts);
    const questions = parentQuestions(facts);
    const homeSupports = parentSupports(facts);
    const scripts = parentScripts(facts);
    const avoid = parentAvoid(facts);
    const jointObservation = unique([
      '학교와 가정이 2~4주 동안 과제 시작, 도움 사용, 전략 변화, 완료와 정서 반응을 같은 기준으로 기록합니다.',
      ...facts.low.map(key => AXES[key].observe),
      ...(facts.low.length === 4 ? ['피로·불안·언어 이해·검사환경을 먼저 확인하고 실제 어려움이 지속되면 학교 전문인력 또는 전문기관의 종합평가를 함께 검토합니다.'] : [])
    ]);
    return {
      code:profileCode(facts.value), name:profileName(facts.value), tags:facts.tags,
      classification:facts.classification, summary, parentCore:summary, keyMessage:summary,
      behaviors, questions, homeSupports, scripts, avoid, jointObservation,
      priorities:supportPriorities(facts), bridge:bridgePath(facts)
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
