(function () {
  'use strict';

  const levelLabels = {H: '상', M: '중', L: '하'};
  const domains = {
    planning: {
      code: 'P', label: '계획',
      H: {feature: '목표를 세우고 여러 전략을 비교하며 수행을 점검·수정하는 경향이 두드러집니다.', strength: '목표 설정, 전략 선택, 문제 해결 순서 설계, 자기점검과 오류 수정', classroom: '개방형 과제에서 방법을 제안하거나 풀이 과정을 설명하고 프로젝트의 진행을 구조화할 수 있습니다.', support: '계획을 오래 세우느라 시작이 늦거나 자신의 전략을 고집하지 않는지 함께 살핍니다.', teaching: '여러 해결 방법을 비교하고 학습 계획표를 만들며 전략 설계 역할을 경험하게 합니다.', assignment: '정답만 요구하기보다 목표·전략·중간 점검·회고가 포함된 과제를 제시합니다.', feedback: '목표를 세우고 중간에 방법을 점검해 바꾼 과정이 효과적이었어.', nuvia: '목표 세우기, 전략 비교, 실행 점검과 오류 수정 활동을 추천할 수 있습니다.'},
      M: {feature: '익숙한 과제에서는 계획을 세우지만 새롭거나 복잡한 상황에서는 외부 구조의 도움을 활용합니다.', strength: '주어진 목표와 예시를 바탕으로 적절한 전략을 선택하는 안정성', classroom: '익숙한 절차에서는 스스로 시작하고 복잡한 과제에서는 확인 질문을 사용할 수 있습니다.', support: '과제가 모호할 때 첫 행동과 완료 기준을 짧게 확인하면 도움이 됩니다.', teaching: '목표 한 문장과 선택 가능한 전략 두세 가지를 제공하고 중간 점검을 요청합니다.', assignment: '완료 기준과 중간 확인 시점이 명확한 과제를 제시합니다.', feedback: '예시를 확인한 뒤 너에게 맞는 방법을 선택한 점이 좋았어.', nuvia: '짧은 계획표와 중간 점검 활동으로 전략 사용을 안정화합니다.'},
      L: {feature: '목표 설정, 과제 시작, 전략 선택과 자기점검에 더 분명한 외부 구조가 필요할 수 있습니다.', strength: '구체적인 시범과 단계가 제공될 때 과제 수행을 이어갈 가능성', classroom: '시작을 미루거나 같은 방법을 반복하고 오류를 발견해도 수정 시점을 놓칠 수 있습니다.', support: '피로·긴장·지시 이해를 먼저 확인하고 첫 행동과 점검 시점을 작게 나눕니다.', teaching: '목표 한 문장, 할 일 3단계, 중간 확인, 마무리 회고의 반복 가능한 틀을 제공합니다.', assignment: '긴 프로젝트보다 짧은 단계와 체크칸이 있는 과제를 제시합니다.', feedback: '첫 단계부터 시작했고, 중간 확인에서 방법을 바꾼 점이 중요한 진전이야.', nuvia: '과제 착수, 순서 계획, 중간 점검을 짧게 반복하는 활동부터 시작합니다.'}
    },
    attention: {
      code: 'A', label: '주의',
      H: {feature: '핵심 자극을 선택하고 방해를 조절하며 집중을 유지하는 경향이 두드러집니다.', strength: '선택적 주의, 지속적 집중, 정확성, 세부 확인, 규칙 탐지와 오류 발견', classroom: '관찰·검토·교정, 핵심 정보 찾기와 세부 차이 비교 과제에서 안정적 수행이 기대됩니다.', support: '완벽하게 확인하려다 속도가 느려지거나 작은 오류에 과도하게 머물지 않는지 살핍니다.', teaching: '검토자 역할, 핵심 정보 찾기, 시간과 정확성을 함께 요구하는 과제를 제공합니다.', assignment: '방해 정보 속 핵심 찾기와 오류 교정 기준이 분명한 과제를 제시합니다.', feedback: '중요한 정보를 끝까지 확인하고 오류를 찾아 고친 점이 강점으로 보였어.', nuvia: '핵심 자극 선택, 방해 조절, 정확성 확인과 집중 회복 활동을 추천할 수 있습니다.'},
      M: {feature: '흥미와 과제 구조에 따라 집중이 달라지며 핵심 표시와 짧은 구간을 활용하면 안정됩니다.', strength: '분명한 목표와 적절한 시간 구조가 있을 때 집중을 유지하는 능력', classroom: '과제의 의미가 분명하면 집중하고 긴 활동에서는 중간 확인을 필요로 할 수 있습니다.', support: '핵심 정보와 종료 시점을 눈에 보이게 제시하면 도움이 됩니다.', teaching: '활동을 짧은 구간으로 나누고 핵심어 표시와 확인 질문을 제공합니다.', assignment: '우선순위와 예상 시간이 표시된 과제를 제시합니다.', feedback: '핵심 표시를 활용해서 중요한 부분으로 다시 돌아온 점이 좋았어.', nuvia: '짧은 집중 구간과 회복 신호를 연습하는 활동으로 연결합니다.'},
      L: {feature: '필요한 자극을 선택하고 집중을 유지하거나 방해 후 돌아오는 데 더 많은 지원이 필요할 수 있습니다.', strength: '환경과 활동 길이가 조정되면 핵심 과제에 다시 참여할 가능성', classroom: '지시 일부를 놓치거나 세부 오류가 늘고, 방해 자극 후 과제로 돌아오기 어려울 수 있습니다.', support: '수면·불안·동기·감각 환경을 확인하고 행동 관찰과 함께 해석합니다.', teaching: '한 번에 한 지시, 핵심 표시, 짧은 작업 구간, 명확한 휴식과 복귀 신호를 제공합니다.', assignment: '짧은 문항 묶음과 완료 표시, 방해 요소가 적은 제시 방식을 사용합니다.', feedback: '집중이 흐트러진 뒤 표시를 보고 과제로 돌아온 것이 중요한 전략이야.', nuvia: '짧은 선택적 주의 활동과 집중 회복 루틴부터 부담 없이 연습합니다.'}
    },
    simultaneous: {
      code: 'S', label: '동시처리',
      H: {feature: '여러 정보의 관계와 전체 구조를 통합해 핵심 의미를 파악하는 경향이 두드러집니다.', strength: '전체 구조, 시각·공간 정보, 도형과 패턴, 문맥, 개념 연결과 종합적 사고', classroom: '그림·도식·마인드맵, 자료 관계 찾기, 공간·디자인·구조화 과제에서 강점이 나타날 수 있습니다.', support: '전체를 빠르게 이해해 세부 조건이나 순서를 생략하지 않는지 살핍니다.', teaching: '전체 개념을 먼저 제시하고 여러 자료의 관계와 핵심 구조를 설명하게 합니다.', assignment: '개념도, 비교표, 공간 구성과 자료 통합이 필요한 과제를 제시합니다.', feedback: '여러 자료의 관계를 찾아 하나의 구조로 설명한 점이 돋보였어.', nuvia: '패턴 통합, 관계 찾기, 전체 구조 구성 활동을 추천할 수 있습니다.'},
      M: {feature: '익숙한 맥락에서는 전체 구조를 파악하며 복잡한 관계는 시각 자료의 도움으로 안정됩니다.', strength: '예시와 도식이 있을 때 정보의 관계를 연결하는 능력', classroom: '내용이 구조화되어 있으면 핵심을 이해하고 낯선 자료에서는 전체 지도를 찾을 수 있습니다.', support: '정보가 흩어져 있을 때 관계도나 완성 예시를 제공하면 도움이 됩니다.', teaching: '전체 개요와 세부 내용을 번갈아 보여 주고 비교·분류 활동을 제공합니다.', assignment: '표, 그림, 개념 연결 질문을 포함한 과제를 제시합니다.', feedback: '전체 그림을 확인한 뒤 세부 내용을 연결한 방법이 효과적이었어.', nuvia: '관계도와 완성 예시를 활용한 통합 활동으로 연결합니다.'},
      L: {feature: '부분 정보의 관계와 전체 맥락을 한 번에 통합하는 데 더 명시적인 구조가 필요할 수 있습니다.', strength: '완성 예시와 시각적 조직자가 있을 때 관계를 단계적으로 연결할 가능성', classroom: '세부 정보는 기억하지만 핵심 관계나 문맥을 놓치고 복잡한 도형·표에서 방향을 잃을 수 있습니다.', support: '시각·언어 이해와 과제 친숙도를 확인하고 전체 구조를 먼저 제시합니다.', teaching: '완성 예시, 전체 지도, 그래픽 조직자와 예시·비예시 비교를 제공합니다.', assignment: '한 화면에 정보량을 줄이고 관계선을 표시한 자료를 사용합니다.', feedback: '전체 지도를 먼저 본 뒤 각 부분을 연결해서 이해한 점이 좋아.', nuvia: '단순한 패턴과 관계 찾기부터 시작해 정보 수를 점진적으로 늘립니다.'}
    },
    successive: {
      code: 'Q', label: '순차처리',
      H: {feature: '정보의 순서와 절차, 언어적 계열을 안정적으로 유지하며 처리하는 경향이 두드러집니다.', strength: '순서 기억, 단계적 처리, 절차 수행, 음운·언어 계열, 규칙적 연산과 시간 순서', classroom: '단계별 설명, 절차표, 읽기·쓰기의 순서, 순차적 문제 해결에서 강점이 나타날 수 있습니다.', support: '정해진 순서를 잘 따르지만 상황 변화에 따라 절차를 유연하게 바꾸는지도 살핍니다.', teaching: '단계별 지시와 체크리스트를 활용하고 절차의 이유와 예외도 설명하게 합니다.', assignment: '순서 배열, 절차 설명, 단계별 계산과 이야기 재구성 과제를 제시합니다.', feedback: '순서를 유지하면서 각 단계를 정확히 설명한 점이 강점으로 보였어.', nuvia: '순서 기억, 절차 수행, 계열화와 단계 설명 활동을 추천할 수 있습니다.'},
      M: {feature: '짧고 익숙한 순서는 안정적으로 처리하며 긴 절차는 외부 기록과 반복으로 보완합니다.', strength: '명확한 단계와 충분한 연습이 있을 때 절차를 유지하는 능력', classroom: '짧은 지시는 잘 따르고 긴 설명에서는 메모나 번호 표지를 찾을 수 있습니다.', support: '단계가 많을 때 체크리스트와 중간 확인을 제공하면 도움이 됩니다.', teaching: '지시를 의미 단위로 나누고 말로 다시 설명하거나 체크하게 합니다.', assignment: '단계 번호와 완료 칸이 있는 과제를 제시합니다.', feedback: '단계를 표시하고 순서대로 확인해서 과제를 마친 방법이 좋았어.', nuvia: '짧은 순서 기억과 절차표 사용 활동으로 안정화합니다.'},
      L: {feature: '긴 지시, 절차, 음운과 계열 정보를 유지하는 데 더 분명한 단계 지원이 필요할 수 있습니다.', strength: '지시가 짧게 나뉘고 시범과 반복이 제공되면 절차를 익힐 가능성', classroom: '단계 순서를 바꾸거나 긴 지시의 일부를 놓치고 말·글의 배열에서 어려움을 보일 수 있습니다.', support: '청각·언어 이해, 읽기 경험과 검사 환경을 확인하고 실제 학업 자료와 교차 확인합니다.', teaching: '한 번에 한두 단계, 번호 카드, 시범→함께→혼자 수행과 복창을 제공합니다.', assignment: '짧은 단계, 절차표, 체크리스트와 완료 예시가 있는 과제를 제시합니다.', feedback: '순서 카드를 확인하면서 한 단계씩 마친 것이 효과적인 방법이었어.', nuvia: '짧은 계열과 절차부터 반복하고 성공이 안정되면 단계 수를 늘립니다.'}
    }
  };

  function joinLabels(keys) {
    return keys.map(key => domains[key].label).join('·');
  }

  function buildProfile(levels) {
    const keys = Object.keys(domains);
    const high = keys.filter(key => levels[key] === 'H');
    const low = keys.filter(key => levels[key] === 'L');
    const code = keys.map(key => domains[key].code + '-' + levels[key]).join(' / ');
    const notices = [];
    if (high.length === 4) notices.push('모두 상: 네 영역의 높은 수행을 곧바로 전반적 능력이나 영재성으로 확정하지 않습니다. 도전 수준, 실제 성취, 흥미와 과제 경험을 함께 확인합니다.');
    if (keys.every(key => levels[key] === 'M')) notices.push('모두 중: 규준상 균형적인 범위입니다. 과제 종류와 환경에 따라 달라지는 전략 사용을 관찰해 개인 내 강점을 찾습니다.');
    if (low.length === 4) notices.push('모두 하: 네 영역 모두에서 지속적으로 낮은 수행이 확인된다면 검사 당시의 피로, 긴장, 언어 이해, 검사 환경과 참여 상태를 먼저 확인해야 합니다. 수업 관찰과 상담에서도 어려움이 반복될 경우, 학생을 단정하기보다 보호자와 협의하여 전문기관의 종합적인 평가와 지원을 받아보는 것이 좋습니다.');
    if (high.length === 1) notices.push('한 영역만 상: ' + joinLabels(high) + ' 강점을 다양한 과제에서 확인하되 한 점수만으로 재능이나 진로를 확정하지 않습니다.');
    if (low.length === 1) notices.push('한 영역만 하: ' + joinLabels(low) + ' 영역에 필요한 과제 조건을 조정하고 실제 수업에서 지원 효과를 관찰합니다.');
    if (high.length && low.length) notices.push('영역 간 차이가 큰 조합: 평균이나 한 영역만 보지 말고 강점을 활용하면서 낮은 영역의 부담을 줄이는 이중 지원을 설계합니다.');
    if (levels.planning === 'L' && levels.attention === 'L') notices.push('계획·주의가 낮은 조합: 과제 시작, 목표 유지, 자기점검에 공통 어려움이 있는지 관찰합니다. ADHD를 의미하지 않으며 수면·불안·동기·환경과 행동평정을 함께 확인합니다.');
    if ((levels.simultaneous === 'H' && levels.successive === 'L') || (levels.simultaneous === 'L' && levels.successive === 'H')) notices.push('동시처리·순차처리 차이가 큰 조합: 전체 구조와 단계 정보를 함께 제공하고 학생이 더 편한 경로로 이해한 뒤 다른 경로를 보조합니다.');

    const summaries = keys.map(key => domains[key][levels[key]].feature);
    const medium = keys.filter(key => levels[key] === 'M');
    const strengths = high.length
      ? high.map(key => domains[key][levels[key]].strength).join(' / ')
      : medium.length
        ? medium.map(key => domains[key].M.strength).join(' / ')
        : '구체적인 시범, 짧은 단계, 충분한 반응 시간과 안정적인 환경이 제공될 때 보이는 참여와 작은 성공을 강점의 출발점으로 기록합니다.';
    const classroom = keys.map(key => '<li><b>' + domains[key].label + '</b> ' + domains[key][levels[key]].classroom + '</li>').join('');
    const support = low.length ? low.map(key => domains[key][levels[key]].support).join(' ') : '현재 낮은 영역이 없더라도 과제 난이도, 피로, 흥미와 환경에 따라 지원 요구가 달라질 수 있습니다.';
    const teaching = keys.map(key => '<li><b>' + domains[key].label + '</b> ' + domains[key][levels[key]].teaching + '</li>').join('');
    const assignment = keys.map(key => '<li><b>' + domains[key].label + '</b> ' + domains[key][levels[key]].assignment + '</li>').join('');
    const feedback = keys.map(key => '“' + domains[key][levels[key]].feedback + '”').join('<br>');
    const nuvia = keys.filter(key => levels[key] !== 'H').map(key => domains[key][levels[key]].nuvia).join(' ') || '강점 확장 활동을 선택하되 과도한 반복을 피하고 실제 학습에서의 전략 사용을 확인합니다.';
    return {
      id: code.replaceAll(' / ', '-'), code,
      levels: Object.fromEntries(keys.map(key => [domains[key].label, levelLabels[levels[key]]])),
      summary: summaries.join(' '), strengths, classroom, support, teaching, assignment, feedback, nuvia,
      cautions: notices.length ? notices : ['이 조합은 관찰 가설입니다. 검사 조건, 학생의 설명, 실제 수행과 교육적 맥락을 함께 확인합니다.']
    };
  }

  const profiles = [];
  ['H', 'M', 'L'].forEach(planning => ['H', 'M', 'L'].forEach(attention => ['H', 'M', 'L'].forEach(simultaneous => ['H', 'M', 'L'].forEach(successive => {
    profiles.push(buildProfile({planning, attention, simultaneous, successive}));
  }))));

  window.FEELGOOD_PROFILE_DATA = {profiles, buildProfile, domains, levelLabels};
})();
