/**
 * D-CAS 청소년 리포트 — 09 미션보드 · 10 성장포인트 축별 콘텐츠 뱅크
 * 성인용 growth 트래커와 같은 원리: 4개 축 각각에 대해 미리 준비된 훈련
 * 콘텐츠를 약점축에 맞춰 골라 보여줍니다.
 * ★ 1차 초안 — 문수백 교수님 감수 권장.
 */
(function (global) {
  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };

  function hasBatchimLocal(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }
  function balPickLocal(tier, variants) { return variants[tier]; }

  // ===== 09 미션보드 =====
  // 약점축 훈련 미션 (축당 1개, 난이도 하/중)
  const TRAIN_MISSION = {
    Q: { diff: 'low', title: '레시피 순서대로 요리 완성하기', desc: '정해진 순서를 지켜야 결과물이 나오는 대표적 순차 활동. 재료 준비 → 조리 → 플레이팅까지 순서를 사진으로 기록해보세요.', xp: 30, skill: '순차처리 훈련' },
    A: { diff: 'mid', title: '25분 몰입 타이머 5회 완주', desc: '몰입 25분 동안 딴짓 없이 집중, 이후 5분은 자유롭게. 짧게 반복하는 게 핵심이에요.', xp: 40, skill: '주의 지속력 훈련' },
    P: { diff: 'mid', title: '이번 주 계획표 세우고 3일 지키기', desc: '월~일 할 일을 미리 적어두고, 그대로 지킨 날에 체크 표시를 해보세요. 계획을 세우는 것과 지키는 것은 다른 힘이에요.', xp: 40, skill: '계획력 훈련' },
    S: { diff: 'mid', title: '복잡한 내용 마인드맵 1장으로 정리', desc: '교과서 한 단원이나 뉴스 기사 하나를 골라, 핵심 내용을 마인드맵 한 장으로 정리해보세요. 전체 구조를 한눈에 보는 연습이에요.', xp: 40, skill: '동시처리 훈련' },
  };
  // 강점축 연결훈련 미션 (top2 조합 전용, 중간 난이도)
  const LINK_MISSION = {
    PQ: { title: '타워 오브 하노이 3단계 클리어', desc: '계획력으로 전체 수순을 먼저 그려본 뒤, 한 단계씩 순서대로 실행해보세요.', xp: 50, skill: '순차처리+계획력 연결훈련' },
    PA: { title: '25분 몰입 + 계획표 결합 챌린지', desc: '오늘의 계획표를 먼저 세우고, 각 항목을 25분 몰입 블록으로 실행해보세요.', xp: 50, skill: '계획력+주의력 연결훈련' },
    PS: { title: '아이디어 스케치 → 실행계획 변환', desc: '떠오른 아이디어를 그림이나 마인드맵으로 먼저 표현한 뒤, 실행 순서를 3단계로 정리해보세요.', xp: 50, skill: '동시처리+계획력 연결훈련' },
    AS: { title: '전체 요약 + 세부 검토 2단계 학습', desc: '글을 통으로 먼저 읽어 전체 맥락을 파악한 뒤, 세부 조건 3가지를 다시 짚어 확인해보세요.', xp: 50, skill: '동시처리+주의력 연결훈련' },
    AQ: { title: '체크리스트 기반 반복 훈련', desc: '반복 작업 하나를 체크리스트로 만들어, 순서를 지키며 정확하게 5회 반복해보세요.', xp: 50, skill: '주의력+순차처리 연결훈련' },
    SQ: { title: '스토리보드로 발표자료 설계', desc: '전체 흐름을 스토리보드로 먼저 그린 뒤, 발표 순서를 논리적으로 배치해보세요.', xp: 50, skill: '동시처리+순차처리 연결훈련' },
    BAL: { title: '역할 바꿔가며 팀 프로젝트 리드', desc: '한 프로젝트 안에서 기획·실행·정리 역할을 번갈아 맡아보세요. 균형 잡힌 능력을 다양하게 써보는 연습이에요.', xp: 50, skill: '균형형 통합훈련' },
  };
  // 통합 미션 (고난이도, 강점 조합 그대로 활용)
  const CAPSTONE_MISSION = {
    title: '3단계 프로젝트 직접 설계·완주하기',
    descTpl: '기획 → 실행계획 수립 → 단계별 실행이라는 큰 그림은 강점({strong})으로, 각 단계를 빠짐없이 순서대로 완수하는 과정에서 {weak}{weakParticle} 자연스럽게 훈련해요. 예: 공모전 작품 하나를 기획부터 제출까지 스스로 완주.',
    xp: 100, skillTpl: '강점 발휘 + {weak} 통합훈련',
  };

  // ===== 10 성장포인트 체크리스트 =====
  const SELFCHECK_ITEM = {
    Q: { text: '오늘 할 일을 순서대로 3가지 적어봤다', scale: '순차처리 훈련' },
    P: { text: '과제를 시작하기 전, 진행 순서를 1줄로 먼저 적어봤다', scale: '계획력 훈련' },
    A: { text: '25분 몰입 후 5분 쉬는 방식으로 공부해봤다', scale: '주의 지속력' },
    S: { text: '복잡한 내용을 그림이나 마인드맵으로 먼저 정리해봤다', scale: '동시처리 훈련' },
  };

  function pickAxisData(scores) {
    const ranked = [
      { k: 'P', v: scores.P }, { k: 'A', v: scores.A },
      { k: 'S', v: scores.S }, { k: 'Q', v: scores.Q },
    ].sort(function (a, b) { return b.v - a.v; });
    const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
    const top2Key = [ranked[0].k, ranked[1].k].sort(function (a, b) { return ORDER[a] - ORDER[b]; }).join('');
    return { ranked: ranked, weakKey: ranked[3].k, top2Key: top2Key, strong2Keys: [ranked[0].k, ranked[1].k] };
  }

  function buildMissions(scores) {
    const d = pickAxisData(scores);
    const trainM = TRAIN_MISSION[d.weakKey];
    const linkM = LINK_MISSION[d.top2Key] || LINK_MISSION.BAL;
    const strongLabel = d.strong2Keys.map(function (k) { return AXIS_LABEL[k]; }).join('·');
    const weakLabel = AXIS_LABEL[d.weakKey];
    const capstoneDesc = CAPSTONE_MISSION.descTpl.replace('{strong}', strongLabel).replace('{weak}', weakLabel).replace('{weakParticle}', hasBatchimLocal(weakLabel) ? '을' : '를');
    const capstoneSkill = CAPSTONE_MISSION.skillTpl.replace('{weak}', weakLabel);
    // 2번째로 약한 축을 3번째 미션으로 사용 (약점축과 중복 방지)
    const secondWeakKey = d.ranked[2].k;
    const secondM = TRAIN_MISSION[secondWeakKey];
    return [
      { diff: trainM.diff, title: trainM.title, desc: trainM.desc, xp: trainM.xp, skill: trainM.skill },
      { diff: 'mid', title: linkM.title, desc: linkM.desc, xp: linkM.xp, skill: linkM.skill },
      { diff: secondM.diff, title: secondM.title, desc: secondM.desc, xp: secondM.xp, skill: secondM.skill },
      { diff: 'high', title: CAPSTONE_MISSION.title, desc: capstoneDesc, xp: CAPSTONE_MISSION.xp, skill: capstoneSkill },
    ];
  }

  function buildSelfcheckItems(scores) {
    const d = pickAxisData(scores);
    const secondWeakKey = d.ranked[2].k;
    const strongLabel = AXIS_LABEL[d.strong2Keys[0]];
    const weakLabel = AXIS_LABEL[d.weakKey];
    const items = [];
    items.push(SELFCHECK_ITEM[d.weakKey]);
    items.push(SELFCHECK_ITEM[secondWeakKey]);
    const covered = [d.weakKey, secondWeakKey];
    if (covered.indexOf('A') === -1) {
      items.push({ text: '25분 몰입 후 5분 쉬는 방식으로 공부해봤다', scale: '주의 지속력' });
    } else {
      items.push({ text: '오늘 배운 내용을 나만의 말로 다시 설명해봤다', scale: '이해도 점검' });
    }
    // 패치: 4·5번이 프로필과 무관하게 항상 같은 문구였던 것을 실제 강점·약점 축 기준으로 동적화
    // (4개 축이 균형형일 때는 특정 강점축을 단정하지 않음)
    const isBalancedSelfcheck = (d.ranked[0].v - d.ranked[3].v) < 20;
    const balTierSelfcheck = (function(){ const avg=(d.ranked[0].v+d.ranked[1].v+d.ranked[2].v+d.ranked[3].v)/4; return avg<=52?'LOW':(avg<75?'MID':'HIGH'); })();
    items.push(isBalancedSelfcheck
      ? { text: balPickLocal(balTierSelfcheck, { LOW:'작은 목표를 하나 정해 짧게 반복하며 끝까지 완료해봤다', MID:'세운 계획이 틀어졌을 때, 그때그때 상황에 맞는 방식으로 다시 조정해봤다', HIGH:'여러 방식을 동시에 활용해야 하는 복합 과제를 끝까지 해냈다' }), scale: '적응성' }
      : { text: strongLabel + ' 강점을 살려 세운 계획이 틀어졌을 때, 스스로 다시 조정해봤다', scale: '적응성' });
    items.push({ text: '미션보드에서 ' + weakLabel + ' 관련 미션을 1개 이상 완료했다', scale: '통합훈련' });
    return items;
  }

  global.DCasTeenMissionBank = { AXIS_LABEL: AXIS_LABEL, pickAxisData: pickAxisData, buildMissions: buildMissions, buildSelfcheckItems: buildSelfcheckItems };
})(typeof window !== 'undefined' ? window : globalThis);
