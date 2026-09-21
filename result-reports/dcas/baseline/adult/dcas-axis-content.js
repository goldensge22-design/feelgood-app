/**
 * D-CAS 축(P/A/S/Q) 단위 범용 콘텐츠 뱅크 — growth·docs 섹션용
 *
 * ===== 왜 이렇게 만들었나 =====
 * growth(09번)·docs(11번)의 원래 문항들이 "백엔드 개발", "QA", "코딩 세션"처럼
 * 특정 직무 용어로 쓰여 있었습니다. 그런데 실제 내용을 보면 전부 "이 축을
 * 실무에서 얼마나 자신 있게 쓰는지"를 묻는 것이라, 축 4개 단위로 일반화할 수
 * 있었습니다. roadmap(10번)의 기술스택 추천과는 성격이 다릅니다 — 그건 직무마다
 * 완전히 달라서 일반화가 안 됩니다.
 *
 * ★ 1차 초안입니다. 문구 톤은 검토 필요.
 */
(function (global) {

  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };

  /* ===== growth 체크리스트 — 축당 1.5개 문항 (총 6개, 기존 구조 유지) ===== */
  const CHECKLIST = {
    P: ['목표를 세우면 세부 일정으로 나누어 관리할 자신이 있다'],
    A: ['중요한 작업 하나에 오래 몰입해서 끝까지 완수할 수 있다', '마감이 있는 반복 작업을 꾸준히 따를 수 있다'],
    S: ['여러 이해관계자 의견을 실시간으로 조율할 자신이 있다', '방향이 불명확한 상태에서도 먼저 아이디어를 제안할 수 있다'],
    Q: ['정해진 절차를 순서대로 정확히 따를 수 있다', '문제가 생기면 원인을 단계적으로 추적할 수 있다'],
  };

  function buildChecklistHTML(rankedAxes) {
    // 강점 축부터 순서대로 문항을 채워 6개를 만듦 (원본 6문항 구조 유지)
    const items = [];
    rankedAxes.forEach(function (r) {
      (CHECKLIST[r.k] || []).forEach(function (text) {
        items.push({ text: text, axis: AXIS_LABEL[r.k] });
      });
    });
    return items.slice(0, 6).map(function (item, i) {
      const id = 'cf' + (i + 1);
      return '<div class="check-item"><input type="checkbox" id="' + id + '"><label for="' + id + '">' +
        item.text + '<span class="scale">' + item.axis + '</span></label></div>';
    }).join('');
  }

  /* ===== 성장 미션 — 축당 1개, 코딩/직무 용어 없이 범용화 ===== */
  const MISSION = {
    P: { period: '이번 학기', title: '계획력 보완 미션', text: '세운 계획을 실제로 지킨 횟수', unit: '/ 4회 목표' },
    A: { period: '이번 달', title: '주의력 보완 미션', text: '중단 없이 몰입한 작업 세션', unit: '/ 주 3회 목표' },
    S: { period: '이번 학기', title: '동시처리 보완 미션', text: '회의·토론에서 먼저 의견을 제시한 횟수', unit: '/ 4회 목표' },
    Q: { period: '이번 달', title: '순차처리 보완 미션', text: '체크리스트로 순서를 지키며 완료한 작업', unit: '/ 주 3회 목표' },
    BAL_LOW: { period: '이번 달', title: '기초역량 다지기 미션', text: '짧은 과제를 처음부터 끝까지 완료한 횟수', unit: '/ 주 3회 목표' },
    BAL_MID: { period: '이번 학기', title: '상황 대응력 훈련 미션', text: '평소와 다른 방식으로 접근해 완료한 작업', unit: '/ 4회 목표' },
    BAL_HIGH: { period: '이번 학기', title: '통합 역량 훈련 미션', text: '여러 방식을 동시에 활용해 완료한 복합 과제', unit: '/ 4회 목표' },
  };

  function buildMissionsHTML(weakAxisKeys) {
    // 패치: 4개 축이 균형형일 때도 마지막 2개(순차처리 등)를 "보완 미션" 대상으로 단정하던 것을 수정
    const keys = weakAxisKeys;
    return keys.map(function (k) {
      const m = MISSION[k];
      return '<div class="self-mission"><span class="sm-tag">' + m.title + '</span><h4>' + m.period + ' 목표</h4>' +
        '<p>' + m.text + ': <span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;</span> ' + m.unit + '</p></div>';
    }).join('');
  }

  /* ===== 자소서 4종 템플릿 — 직무명은 변수로만 삽입, 본문은 축 기반 ===== */
  const DOC_TEMPLATE = {
    P: {
      tag: '목표달성 경험 · 계획력',
      body: 'Situation: [배경/과제 개요] / Task: [내가 맡은 역할] / Action: "요구사항을 [N개] 작업 단위로 분해하고 일정표를 작성해 매주 진행률을 점검" / Result: "[기한] 내 [정량 결과]로 완료"',
      tip: 'Action 항목에 계획력 강점을 수치와 함께 넣으면 설득력이 커져요.',
    },
    Q: {
      tag: '지원동기 · {job}',
      body: '"저는 복잡한 문제일수록 단계를 나누어 하나씩 검증할 때 가장 큰 성취감을 느낍니다. [학과 프로젝트/인턴 경험]에서 [문제]를 [N단계]로 분해해 해결한 경험을 통해, {job}가 이런 제 강점을 가장 잘 발휘할 수 있는 직무라고 확신했습니다."',
      tip: '"확신했다"의 근거로 실제 프로젝트 1개를 반드시 뒤에 붙이세요.',
    },
    S: {
      tag: '협업 경험 · 동시처리 보완형',
      body: '"저는 회의에서 즉흥적으로 아이디어를 내기보다, 미리 자료를 정리해가서 명확한 근거로 의견을 제시하는 편입니다. [팀 프로젝트]에서도 사전에 [준비한 자료]를 공유해 논의 시간을 [정량 효과]만큼 단축했습니다."',
      tip: '동시처리 보완 포인트를 "약점"이 아니라 "나만의 준비 방식"으로 재구성한 문장이에요.',
    },
    A: {
      tag: '직무 전문성 · {job}',
      body: '"저는 반복적이고 규칙 기반인 작업에서 실수를 만들지 않는 것에 강점이 있습니다. [경험]에서 체크리스트를 직접 만들어 [N건]의 케이스를 빠짐없이 검증한 경험이 있습니다."',
      tip: '숫자(케이스 수, 시간 단축 등)를 꼭 넣어야 설득력이 생겨요.',
    },
    BAL_LOW: {
      tag: '기초 역량 경험 · {job}',
      body: '"저는 아직 저만의 방식을 찾아가는 중이라, 계획 세우기·정보 정리·절차 확인 등 여러 방법을 짧게 시도해보며 문제를 하나씩 해결하는 편입니다. [경험]에서 작은 단위로 나누어 꾸준히 반복한 끝에 [작은 성과]를 완료했습니다."',
      tip: '"하나씩", "꾸준히"는 짧은 반복을 통해 기초를 쌓아가는 모습을 잘 드러내는 표현이에요.',
    },
    BAL_MID: {
      tag: '상황 대응 경험 · {job}',
      body: '"저는 상황에 따라 계획을 세우거나, 정보를 종합하거나, 절차를 점검하는 등 필요한 방식을 유연하게 바꿔가며 문제를 해결하는 편입니다. [경험]에서 이런 방식으로 [문제 상황]에 대응해 [정량적 성과]를 냈습니다."',
      tip: '"상황에 맞게", "유연하게 대응"은 특정 방식에 갇히지 않는 강점을 잘 드러내는 표현이에요.',
    },
    BAL_HIGH: {
      tag: '통합 역량 경험 · {job}',
      body: '"저는 계획 수립·정보 종합·절차 점검을 상황에 맞게 통합적으로 활용해 복합적인 문제를 해결하는 편입니다. [경험]에서 여러 이해관계가 얽힌 [문제 상황]에 통합적으로 대응해 [정량적 성과]를 냈습니다."',
      tip: '"통합적으로", "안정적으로"는 여러 역량을 동시에 발휘하는 고른 고역량을 잘 드러내는 표현이에요.',
    },
  };
  const DOC_FUTURE = {
    tag: '입사 후 포부',
    body: '"입사 후에는 [직무]에서 [내 강점]을 살려 [1년차 목표]를 달성하고, 이후 [3년차 목표]로 성장하겠습니다. 특히 [보완 중인 역량]은 [구체적 학습 계획]을 통해 꾸준히 채워가겠습니다."',
    tip: '강점만 나열하지 말고 보완 계획까지 넣으면 자기인식이 있는 지원자로 보여요.',
  };

  function buildDocCardsHTML(topAxisKeys, jobName) {
    // 패치: 4개 축이 균형형일 때도 top2(계획력·주의력 등)를 그대로 자소서 예시 축으로 쓰던 것을 수정
    const keys = topAxisKeys;
    const cards = keys.map(function (k) {
      const t = DOC_TEMPLATE[k];
      const tag = t.tag.replace('{job}', jobName);
      const body = t.body.replace('{job}', jobName);
      return '<div class="doc-card"><span class="doc-tag">' + tag + '</span><p class="body">' + body + '</p><p class="tip"><b>Tip.</b> ' + t.tip + '</p></div>';
    });
    cards.push('<div class="doc-card"><span class="doc-tag">' + DOC_FUTURE.tag + '</span><p class="body">' + DOC_FUTURE.body + '</p><p class="tip"><b>Tip.</b> ' + DOC_FUTURE.tip + '</p></div>');
    return cards.join('');
  }

  global.DCasAxisContent = {
    AXIS_LABEL: AXIS_LABEL,
    buildChecklistHTML: buildChecklistHTML,
    buildMissionsHTML: buildMissionsHTML,
    buildDocCardsHTML: buildDocCardsHTML,
  };

})(typeof window !== 'undefined' ? window : globalThis);
