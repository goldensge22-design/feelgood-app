/**
 * D-CAS 성인 리포트 — 개인화 엔진 (1단계: 이름 + 숫자)
 *
 * ★★★ 스코프 안내 ★★★
 * 이번 1단계는 "이름 하드코딩 제거"와 "정답률 숫자를 실제 점수로 교체"까지만
 * 다룹니다. "논리설계형 실행가" 같은 유형명, 서술형 문단, 역사적 인물 매칭은
 * K-PASS처럼 축 조합(7종) 기반 콘텐츠 뱅크가 별도로 필요합니다 — 성인 커리어
 * 맥락에 맞는 문구를 새로 설계해야 해서 이번 패스에는 포함하지 않았습니다.
 * 지금은 기존 문구(순차처리+계획력 조합 기준 "논리설계형 실행가")가 그대로
 * 남아있으니, 다른 점수 조합의 사용자에게는 유형명이 실제와 안 맞을 수 있다는
 * 점을 감안해 주세요.
 *
 * ===== D-CAS와 K-PASS의 중요한 차이 =====
 * D-CAS는 "또래 대비 백분위"가 아니라 "정답률(%)" 그 자체를 점수로 씁니다.
 * 그래서 K-PASS처럼 정규분포로 백분위를 재계산하는 로직이 없습니다 —
 * PROFILE.scores에 들어오는 값을 그대로 화면에 반영하기만 합니다.
 *
 * ===== PROFILE 계약 =====
 *   const PROFILE = window.__TEST_PROFILE__ || DEFAULT_PROFILE;
 * K-PASS와 동일한 계약이라 verify-personalization.js를 그대로 재사용합니다.
 */
(function (global) {

  const DEFAULT_PROFILE = {
    fullName: '박준서',
    givenName: '준서',
    genderKey: 'M',
    ageYears: 20,
    gradeLabel: '대학교 2학년',
    testDate: { y: 2026, m: 8, d: 23 },
    scores: { P: 84, A: 71, S: 66, Q: 91 } // 정답률(%) 그대로. 규준/백분위 아님.
  };
  const PROFILE = (typeof window !== 'undefined' && window.__TEST_PROFILE__) || DEFAULT_PROFILE;

  const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
  // 레이더 SVG 좌표 계산 — 원본 파일의 실제 좌표(반경 27~95, 중심 150,150)를 역산해 재사용
  const RADAR_CX = 150, RADAR_CY = 150;
  const RADAR_ANGLES = { P: 0, S: 90, Q: 180, A: 270 }; // 상=계획 우=동시 하=순차 좌=주의 (원본 배치 유지)
  function radarPoint(pct, angleDeg) {
    // 원본 91%가 반경(150,68)~(150,171) 즉 82px 만큼 이동 → 91% 대비 약 90px/100 스케일로 역산
    const r = 20 + (pct / 100) * 75; // 20~95 범위, 원본 91%→약 88 근사치와 유사하게 보정
    const rad = (angleDeg * Math.PI) / 180;
    return { x: RADAR_CX + r * Math.sin(rad), y: RADAR_CY - r * Math.cos(rad) };
  }

  function byId(id) { return document.getElementById(id); }
  function setText(id, text) { const el = byId(id); if (el) el.textContent = text; }
  function setHTML(id, html) { const el = byId(id); if (el) el.innerHTML = html; }
  function hasBatchim(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }
  // 패치: 균형형(4축 최고-최저 차이 20 미만)을 평균 점수로 3단계(LOW/MID/HIGH) 세분화하는 공용 헬퍼
  function getBalTier(s) {
    const vals = [s.P, s.A, s.S, s.Q];
    const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    if (max - min >= 20) return null;
    const avg = (s.P + s.A + s.S + s.Q) / 4;
    if (avg <= 52) return 'LOW';
    if (avg < 75) return 'MID';
    return 'HIGH';
  }
  function balPick(tier, variants) { return variants[tier]; }

  function resolveProfile81Lang() {
    const requested = global.__DCAS_LANG__ || document.documentElement.lang || 'ko';
    return (typeof DCasProfile81 !== 'undefined') ? DCasProfile81.normalizeLang(requested) : 'ko';
  }

  function ensureProfile81Note(sectionId, id, label, text, dir, lang) {
    const section = byId(sectionId);
    if (!section) return;
    let note = byId(id);
    if (!note) {
      note = document.createElement('div');
      note.id = id;
      note.className = 'tip-box';
      section.appendChild(note);
    }
    note.dir = dir || 'ltr';
    note.lang = lang || '';
    note.textContent = label + ' · ' + text;
  }

  function processingSummary(processing) {
    if (processing.isBalanced) {
      return '균형형(동시처리·순차처리 균형) · 두 점수 차이 ' + processing.diff + '%p로, 균형 기준인 10점 이하입니다.';
    }
    if (processing.dominant === 'S') {
      return '우뇌우세형(동시처리 우세) · 동시처리가 순차처리보다 ' + processing.diff + '%p 높아, 우세형 기준인 11점 이상입니다.';
    }
    return '좌뇌우세형(순차처리 우세) · 순차처리가 동시처리보다 ' + processing.diff + '%p 높아, 우세형 기준인 11점 이상입니다.';
  }

  function applyProfile81() {
    if (typeof DCasProfile81 === 'undefined') return null;
    const lang = resolveProfile81Lang();
    DCasProfile81.setLang(lang);
    const p81 = DCasProfile81.classify(PROFILE.scores, lang);
    global.__DCAS_PROFILE81__ = p81;

    // 표지와 기질 특성에 4축×3수준의 실제 81유형을 노출한다.
    setText('pf-cover-code', 'NO. ' + p81.code);
    setText('pf-cover-typename', p81.title);
    setText('pf-herotag', p81.labels.profile + ' · ' + p81.code);
    setText('pf-herotype', p81.title);
    ['pf-cover-typename', 'pf-herotag', 'pf-herotype'].forEach(function (id) {
      const el = byId(id);
      if (el) el.lang = p81.lang;
    });

    const temperament = byId('temperament');
    if (temperament) {
      let card = byId('pf-profile81-card');
      if (!card) {
        card = document.createElement('div');
        card.id = 'pf-profile81-card';
        card.className = 'card';
        const hero = temperament.querySelector('.hero-card');
        if (hero && hero.parentNode) hero.parentNode.insertBefore(card, hero.nextSibling);
        else temperament.insertBefore(card, temperament.firstChild);
      }
      card.dir = p81.dir;
      card.lang = p81.lang;
      card.innerHTML = '<h4 style="margin:0 0 8px;font-size:14px;color:var(--navy);">' + p81.labels.profile + ' · ' + p81.code + '</h4>' +
        '<p style="margin:0 0 10px;font-size:13.5px;line-height:1.7;"><b>' + p81.title + '</b> — ' + p81.summary + '</p>' +
        '<div class="two-col">' + p81.fragments.map(function (f) {
          const cls = f.level === 'L' ? 'watch' : 'good';
          return '<div class="temp-block ' + cls + '"><b>' + f.axisLabel + ' · ' + f.levelLabel + '</b><p style="margin:6px 0 0;">' + f.text + '</p></div>';
        }).join('') + '</div>';
    }

    // 81유형은 동일 점수를 직무 점수에 다시 더하지 않고, 지원 강도·추천 이유·환경 조건을 바꾸는 입력으로 사용한다.
    ensureProfile81Note('efficiency', 'pf-profile81-learning-note', p81.labels.learning, p81.recommendations.learning, p81.dir, p81.lang);
    ensureProfile81Note('major', 'pf-profile81-career-note', p81.labels.career, p81.recommendations.career, p81.dir, p81.lang);
    ensureProfile81Note('jobs', 'pf-profile81-job-note', p81.labels.job, p81.recommendations.job, p81.dir, p81.lang);
    ensureProfile81Note('expert', 'pf-expert-processing-note', '두뇌유형', processingSummary(p81.processing), 'ltr', 'ko');
    setText('pf-opinion-summary', p81.title + ' — ' + p81.summary);

    // 전영역 저·중·고 및 동점 균형형은 기존 BAL의 과도한 강점 문구를 상속하지 않는다.
    if (p81.kind === 'ALL_L' || p81.kind === 'ALL_M' || p81.kind === 'ALL_H' || p81.kind === 'BAL') {
      setText('pf-workstyle', p81.recommendations.learning);
      setText('pf-collabstyle', p81.recommendations.job);
      setText('pf-opinion', PROFILE.givenName + ' 님은 ' + p81.summary);
    }
    return p81;
  }

  function setProfile81Language(lang) {
    if (typeof DCasProfile81 === 'undefined') return null;
    global.__DCAS_LANG__ = DCasProfile81.normalizeLang(lang);
    return applyProfile81();
  }
  function josa(word, pair) {
    const map = { '은는': ['은', '는'], '이가': ['이', '가'], '을를': ['을', '를'] };
    const [withB, withoutB] = map[pair];
    return word + (hasBatchim(word) ? withB : withoutB);
  }

  function applyIdentity() {
    // 패치: <select id="majorSelect">의 "컴퓨터공학과" 옵션이 HTML에 selected로 하드코딩돼 있어,
    // PROFILE.majorName을 다르게 넣어도(예: 심리학과) 화면은 항상 컴퓨터공학과로 표시되던 문제 수정.
    // 프로필에 majorName이 있고 select 옵션 목록에 실제로 존재하면 그 값으로 초기 선택을 맞춘다.
    const majorSelectInit = byId('majorSelect');
    if (majorSelectInit && PROFILE.majorName) {
      const hasOption = Array.prototype.some.call(majorSelectInit.options, function (o) { return o.value === PROFILE.majorName; });
      if (hasOption) majorSelectInit.value = PROFILE.majorName;
    }
    // {{FULLNAME}} / {{GIVEN}} 플레이스홀더를 실제 값으로 전역 치환
    // (SECTIONS가 innerHTML로 꽂힌 뒤 실행되어야 하므로 render() 마지막에 호출)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const toFix = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.indexOf('{{FULLNAME}}') !== -1 || node.nodeValue.indexOf('{{GIVEN}}') !== -1) {
        toFix.push(node);
      }
    }
    toFix.forEach(function (n) {
      n.nodeValue = n.nodeValue
        .replace(/\{\{FULLNAME\}\}/g, PROFILE.fullName)
        .replace(/\{\{GIVEN\}\}/g, PROFILE.givenName);
    });
    // title, attribute 등 텍스트노드 밖에 있는 것도 처리
    if (document.title.indexOf('{{FULLNAME}}') !== -1) {
      document.title = document.title.replace(/\{\{FULLNAME\}\}/g, PROFILE.fullName);
    }
    // t-meta (성별·나이·학년·검사일) — HEADER.meta는 정적 문자열이라 별도로 덮어씀
    const genderLabel = PROFILE.genderKey === 'F' ? '여' : '남';
    const dateStr = PROFILE.testDate.y + '.' + String(PROFILE.testDate.m).padStart(2,'0') + '.' + String(PROFILE.testDate.d).padStart(2,'0');
    setText('t-meta', genderLabel + ' · 만 ' + PROFILE.ageYears + '세 (' + PROFILE.gradeLabel + ') · 성인 진로직무 트랙 · ' + dateStr);

    // 패치: 표지(COVER_HTML)는 {{FULLNAME}}만 전역 치환되고 나머지는 완전 고정이었음 —
    // 성별·나이·학과·인지유형(COGNITIVE ID)·해시태그·핵심추천까지 실제 값으로 교체
    const majorSelectEl = byId('majorSelect');
    const coverMajor = (majorSelectEl && majorSelectEl.value && majorSelectEl.value !== '__custom__') ? majorSelectEl.value : (PROFILE.majorName || '희망 학과');
    setText('pf-cover-meta', genderLabel + ' · 만 ' + PROFILE.ageYears + '세 · ' + coverMajor + ' ' + PROFILE.gradeLabel + ' · 검사일 ' + dateStr);
    if (typeof DCasComboBank !== 'undefined') {
      const coverCombo = DCasComboBank.getCombo(PROFILE.scores).combo;
      setText('pf-cover-code', 'NO. ' + coverCombo.code);
      setText('pf-cover-typename', coverCombo.heroType);
      const coverChipsEl = byId('pf-cover-chips');
      if (coverChipsEl) coverChipsEl.innerHTML = coverCombo.chips.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join('');
    }
    // 패치: 첫화면 후크 문항의 "브레인스토밍 불편"·"코드/문서 꼼꼼" 고정 전제를 실제 최고축 기준으로 교체
    const rankedHook = [{k:'P',v:PROFILE.scores.P},{k:'A',v:PROFILE.scores.A},{k:'S',v:PROFILE.scores.S},{k:'Q',v:PROFILE.scores.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedHook = (rankedHook[0].v - rankedHook[3].v) < 20;
    const balTierHook = getBalTier(PROFILE.scores);
    const topHookKey = rankedHook[0].k;
    const HOOK1 = { P:'과제나 프로젝트 순서를 정리하는 건 자신 있는데, 팀원과 아이디어를 자유롭게 주고받는 브레인스토밍은 왠지 불편하다', A:'하나의 작업에 깊게 몰입하는 건 자신 있는데, 여러 사람과 짧게 자주 소통해야 하는 자리는 왠지 피곤하다', S:'전체 그림을 파악하고 아이디어를 연결하는 건 자신 있는데, 그걸 세부 절차로 쪼개서 실행하려면 막막하다', Q:'세부 절차를 순서대로 처리하는 건 자신 있는데, 여러 아이디어를 한 번에 종합해야 하는 브레인스토밍은 왠지 불편하다' };
    const HOOK2 = { P:'세부 자료는 꼼꼼히 검토하는데, 정작 "이 전공으로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다', A:'관심 있는 주제는 끝까지 파고드는데, 정작 "이 전공으로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다', S:'전체 흐름은 금방 파악하는데, 정작 "이 전공으로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다', Q:'세부 자료는 꼼꼼히 검토하는데, 정작 "이 전공으로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다' };
    setText('pf-cover-hook1', isBalancedHook ? balPick(balTierHook, {
      LOW: '이것저것 다 시도는 해보는데, 정작 끝까지 완료한 게 별로 없는 것 같다',
      MID: '상황마다 다른 방식으로 접근하는 편인데, 정작 어떤 방식이 진짜 내 강점인지는 스스로도 헷갈린다',
      HIGH: '여러 가지를 동시에 잘 해내는 편인데, 정작 어디에 제일 집중해야 할지 우선순위를 정하기 어렵다'
    }) : HOOK1[topHookKey]);
    setText('pf-cover-hook2', isBalancedHook ? balPick(balTierHook, {
      LOW: '아직 이렇다 할 강점을 못 찾은 것 같은데, 정작 "이 진로로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다',
      MID: '이것저것 웬만큼 다 하는데, 정작 "이 진로로 뭘 해야 하지"라는 질문엔 답을 못 찾겠다',
      HIGH: '여러 분야를 두루 잘하는데, 정작 "어디에 집중해야 하지"라는 질문엔 답을 못 찾겠다'
    }) : HOOK2[topHookKey]);
  }

  function applyScores() {
    const s = PROFILE.scores;
    // 레이더 SVG 텍스트 + 폴리곤
    ['P', 'A', 'S', 'Q'].forEach(function (k) {
      const el = byId('pf-radar-' + k);
      if (el) el.textContent = AXIS_LABEL[k] + ' ' + s[k] + '%';
    });
    const poly = byId('pf-radarpoly');
    if (poly) {
      const pts = ['P', 'S', 'Q', 'A'].map(function (k) {
        const p = radarPoint(s[k], RADAR_ANGLES[k]);
        return p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }).join(' ');
      poly.setAttribute('points', pts);
    }
    // 4개 하위척도 막대
    ['P', 'A', 'S', 'Q'].forEach(function (k) {
      const bar = byId('pf-bar-' + k);
      if (bar) bar.style.width = s[k] + '%';
      setText('pf-barval-' + k, s[k] + '%');
    });
    // 패치: "강점 키워드 매핑표"가 항상 순차→계획→동시→주의 고정 순서였던 것을,
    // 실제 점수 순위(강점부터) 순서로 재정렬하고 "(보완중)" 표시도 최약축에 정확히 부착
    const RESUME_KW = {
      Q: { keyword: '정확성 · 꼼꼼함 · 문제추적력', example: '"원인을 단계적으로 분석", "재현 절차를 문서화"',
           weakKeyword: '보완 방향 · 체크리스트 습관화', weakExample: '"절차를 체크리스트로 만들어 누락을 방지하는 습관을 훈련 중"' },
      P: { keyword: '일정관리 · 태스크 분해력', example: '"작업을 세부 단위로 분해해 일정 내 완수"',
           weakKeyword: '보완 방향 · 목표 쪼개기 연습', weakExample: '"큰 목표를 작은 단위로 나눠 우선순위를 정하는 연습을 진행 중"' },
      S: { keyword: '구조적 이해력 · 종합적 사고', example: '"흩어진 정보를 하나의 아키텍처로 종합"',
           weakKeyword: '보완 방향 · 전체 구조화 연습', weakExample: '"마인드맵으로 전체 그림을 먼저 그려보는 습관을 훈련 중"' },
      A: { keyword: '몰입 지속력', example: '"장시간 집중이 필요한 작업을 완수"',
           weakKeyword: '보완 방향 · 몰입 루틴 만들기', weakExample: '"짧은 시간 단위로 나눠 집중력을 끌어올리는 루틴을 연습 중"' }
    };
    const rankedForTable = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedTable2 = (rankedForTable[0].v - rankedForTable[3].v) < 20;
    const balTierTable2 = getBalTier(s);
    const balancedKw2 = balPick(balTierTable2, { LOW:'기초역량 다지기 · 전영역', MID:'균형 발달 · 상황별 유연 활용', HIGH:'균형 발달 · 고역량 통합 활용' });
    const balancedEx2 = balPick(balTierTable2, { LOW:'"짧은 과제를 하나씩 끝까지 완료"', MID:'"상황에 맞게 접근 방식을 유연하게 전환"', HIGH:'"복합적인 업무에서 여러 역량을 통합해 활용"' });
    const strengthTable2 = byId('pf-strengthtable2');
    if (strengthTable2) {
      strengthTable2.innerHTML = '<tr><th>인지영역</th><th>이력서 키워드</th><th>서술 예시 단어</th></tr>' +
        rankedForTable.map(function (r, i) {
          if (isBalancedTable2) {
            return '<tr><td>' + AXIS_LABEL[r.k] + ' ' + s[r.k] + '%</td><td>' + balancedKw2 + '</td><td>' + balancedEx2 + '</td></tr>';
          }
          const isWeakest = (i === rankedForTable.length - 1);
          const kw = RESUME_KW[r.k];
          const keywordText = isWeakest ? kw.weakKeyword : kw.keyword;
          const exampleText = isWeakest ? kw.weakExample : kw.example;
          return '<tr><td>' + AXIS_LABEL[r.k] + ' ' + s[r.k] + '%' + (isWeakest ? ' (보완중)' : '') + '</td><td>' + keywordText + '</td><td>' + exampleText + '</td></tr>';
        }).join('');
    }
    // pf-toppct-note는 백분위/응시자 순위 claim을 완전히 제거하고 정답률 기준 범례만 남김 (위 str_replace 참고)
  }

  // 패치: 01번 기질카드 4개 + 02번 인지역량 카드 4개 + 자소서 활용팩 2개가
  // 점수와 무관하게 완전 고정이었던 것을 실제 P/A/S/Q 수준에 맞춰 동적화
  function tcBlock2(strongTitle, growTitle, pair) {
    return '<div class="temp-block good"><b>✓ 강점 · ' + strongTitle + '</b><ul>' + pair[0].map(function(t){return '<li>'+t+'</li>';}).join('') + '</ul></div>' +
           '<div class="temp-block watch"><b>△ 보완 포인트 · ' + growTitle + '</b><ul><li>' + pair[1] + '</li></ul></div>';
  }
  function applyTempCards2(s, given) {
    // 기질적 특징은 P/A/S/Q 네 축을 각각 상·중·하로 판정한다.
    // D-CAS 저장값은 0~100% 정답률이므로 160점 기준(85/120)을 53%/75%로 환산한다.
    function axisLevel(v) { return v >= 75 ? 'high' : (v >= 53 ? 'mid' : 'low'); }
    const pLevel = axisLevel(s.P), aLevel = axisLevel(s.A);
    const sLevel = axisLevel(s.S), qLevel = axisLevel(s.Q);
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedTemp = (ranked[0].v - ranked[3].v) < 20;
    const balTierTemp = getBalTier(s);

    // ── 01번 기질카드 ──
    const TEMP_AXIS = {
      P:{label:'계획력',high:['목표를 구조화하고 실행 순서를 스스로 세운 뒤 시작하는 경향이 뚜렷해요.','상황이 바뀌면 대안 한두 가지를 비교한 뒤 계획을 조정하는 연습이 도움이 돼요.'],mid:['목표와 과제가 구체적이면 계획을 세워 안정적으로 진행하는 편이에요.','첫 행동과 중간 점검 시점을 미리 정하면 실행이 더 안정돼요.'],low:['고정된 계획보다 현재 상황에 맞춰 유연하게 반응하는 편이에요.','세 단계 이내의 짧은 계획을 만들고 하나씩 완료 표시해보세요.']},
      A:{label:'주의력',high:['선택한 활동에 집중을 오래 유지하고 끝까지 이어가는 경향이 뚜렷해요.','과몰입과 피로를 막기 위해 계획된 휴식 시간을 함께 두는 것이 좋아요.'],mid:['목표와 시간이 분명한 활동에서는 비교적 안정적으로 집중을 유지해요.','흥미가 낮은 활동은 짧은 시간 단위와 분명한 종료점을 정하면 좋아요.'],low:['주변 변화와 여러 자극을 빠르게 알아차리고 주의가 쉽게 이동하는 편이에요.','경쟁 자극을 줄이고 짧은 집중과 휴식을 반복하는 구조가 도움이 돼요.']},
      S:{label:'동시처리',high:['여러 정보를 빠르게 하나의 전체 구조나 의미로 통합하는 경향이 뚜렷해요.','전체를 파악한 뒤 세부 항목을 한 번 점검하면 누락을 줄일 수 있어요.'],mid:['과제에 따라 전체 그림과 세부 정보를 비교적 유연하게 오가는 편이에요.','정보가 복잡할 때 먼저 전체 구조를 간단히 그려보면 도움이 돼요.'],low:['정보를 바로 종합하기보다 구체적인 세부 내용부터 신중하게 접근하는 편이에요.','그림·도식·완성 예시로 전체 구조를 먼저 보여주면 이해가 쉬워져요.']},
      Q:{label:'순차처리',high:['순서와 규칙을 정확히 따라 단계적으로 처리하는 경향이 뚜렷해요.','절차 확인에 시간이 길어지지 않도록 검토 시간을 정해두면 좋아요.'],mid:['순서와 규칙이 분명한 활동은 비교적 안정적으로 수행하는 편이에요.','단계가 길어질 때 체크리스트를 사용하면 순서를 유지하는 데 도움이 돼요.'],low:['고정된 절차보다 유연하고 비선형적인 방식으로 접근하는 편이에요.','두세 단계의 짧은 순서부터 시작해 완료 여부를 눈에 보이게 표시해보세요.']}
    };
    const LEVEL_LABEL = {high:'상',mid:'중',low:'하'};
    function renderAxisTemper2(k, level) {
      const d = TEMP_AXIS[k], pair = d[level];
      return '<div class="temp-block good"><b>✓ 특징 · ' + d.label + ' (' + LEVEL_LABEL[level] + ')</b><ul><li>' + pair[0] + '</li></ul></div>' +
        '<div class="temp-block watch"><b>△ 지원 포인트 · ' + d.label + '</b><ul><li>' + pair[1] + '</li></ul></div>';
    }
    setHTML('pf-tc1-react', renderAxisTemper2('P', pLevel));
    setHTML('pf-tc1-adapt', renderAxisTemper2('A', aLevel));
    setHTML('pf-tc1-mood', renderAxisTemper2('S', sLevel));
    setHTML('pf-tc1-think', renderAxisTemper2('Q', qLevel));

    // ── 02번 인지역량 카드 ──
    const ACC = { high:[['정해진 순서와 규칙이 있는 작업을 실수 없이 끝까지 완수해요','문제 원인을 하나씩 추적해 밝혀내는 작업에 강해요'],'여러 옵션을 한 번에 비교해 빠르게 결정해야 하는 상황에서는 시간이 더 필요할 수 있어요'],
               mid:[['정해진 순서와 규칙이 있는 작업을 비교적 정확하게 완수해요'],'복잡한 다단계 작업에서는 중간 점검 체크리스트를 두면 완성도가 더 올라가요'],
               low:[['필요할 땐 세부 절차도 끝까지 챙기려 노력하는 편이에요'],'여러 단계를 거치는 정밀 작업에서는 체크리스트를 만들어 완료 표시하는 습관이 누락을 줄여줘요'] };
    const EXEC = { high:[['큰 과제를 세부 태스크로 쪼개고 일정대로 완수하는 힘이 뛰어나요'],'요구사항이 갑자기 바뀌면 잠시 흔들릴 수 있어요 — "계획은 언제든 수정될 수 있다"는 사고 연습이 도움이 돼요'],
               mid:[['큰 과제를 세부 태스크로 나눠 진행하는 편이에요'],'일정이 타이트해질 때는 우선순위 3가지만 먼저 정하는 습관이 도움이 돼요'],
               low:[['맡은 일을 끝까지 마무리하려는 책임감이 있어요'],'큰 과제를 시작할 때 "가장 먼저 할 일 3가지"부터 메모하면 실행이 한결 쉬워져요'] };
    const COLLAB = { high:[['회의에서 먼저 의견을 꺼내고 논의를 이끄는 데 익숙해요'],'듣는 시간을 의도적으로 늘리면 팀 의견을 더 폭넓게 반영할 수 있어요'],
               mid:[['맡은 파트는 끝까지 책임지고 완성도 있게 마무리해요'],'회의에서 먼저 의견을 꺼내기보다 듣는 편이에요 — 짧게라도 먼저 말해보는 연습이 도움이 돼요'],
               low:[['다른 사람의 의견을 주의 깊게 듣고 받아들이는 편이에요'],'회의 전 미리 할 말을 1~2줄 메모해가면 발언이 한결 수월해져요'] };
    const CONSIST = { high:[['같은 유형의 작업을 여러 번 수행해도 품질 편차가 적어요 — 스타일·포맷이 항상 일관돼요'],'익숙한 방식을 새 방식으로 바꿔야 할 때 적응에 약간의 시간이 걸릴 수 있어요 — 작은 범위부터 시범 적용해보는 게 도움이 돼요'],
               mid:[['비슷한 작업을 반복할 때 대체로 안정적인 결과물을 내는 편이에요'],'전체 상황이 자주 바뀌는 업무에서는 핵심만 먼저 요약해두는 습관이 도움이 돼요'],
               low:[['새로운 정보가 많은 상황에서도 하나씩 정리해가며 적응해요'],'여러 정보를 한 번에 종합해야 할 땐 마인드맵으로 먼저 구조를 그려보면 도움이 돼요'] };
    setHTML('pf-tc2-accuracy', tcBlock2('정밀한 절차 수행', '즉흥적 종합', ACC[qLevel]));
    setHTML('pf-tc2-execution', tcBlock2('계획 기반 실행', '계획 변경 대응', EXEC[pLevel]));
    setHTML('pf-tc2-collab', tcBlock2('책임감 있는 역할 수행', '능동적 의견 제시', COLLAB[aLevel]));
    setHTML('pf-tc2-consistency', tcBlock2('반복 작업의 안정적 재현', '새 방식으로의 전환 속도', CONSIST[sLevel]));

    // ── 02번 자소서/이력서 활용팩 — 실제 최고축 기준으로 STAR 예시문 교체 ──
    const DOC1 = {
      Q: { body: '"[프로젝트명] 진행 중 [문제 상황]을 발견했습니다. 저는 문제를 [N단계]로 나누어 순서대로 원인을 추적했고, 그 결과 [정량적 성과]를 달성했습니다. 이 과정에서 절차를 체계적으로 기록하는 습관 덕분에 재발을 방지할 수 있었습니다."', tip: '"단계별로", "체계적으로"는 ' + given + ' 님의 순차처리 강점을 가장 잘 드러내는 표현이에요.' },
      P: { body: '"[프로젝트명]을 맡았을 때 목표까지 남은 기간 동안 해야 할 일을 [N단계] 마일스톤으로 나눠 일정표를 세웠습니다. 매주 진행률을 스스로 점검했고, 그 결과 [기한] 내 [정량적 성과]를 달성했습니다."', tip: '"마일스톤", "일정 관리"는 ' + given + ' 님의 계획력 강점을 가장 잘 드러내는 표현이에요.' },
      S: { body: '"[프로젝트명]에서 여러 팀·자료에 흩어져 있던 정보를 하나로 모아 전체 그림을 먼저 그렸습니다. 이를 바탕으로 방향을 제안했고, 그 결과 [정량적 성과]를 이끌어냈습니다."', tip: '"전체 그림", "종합"은 ' + given + ' 님의 동시처리 강점을 가장 잘 드러내는 표현이에요.' },
      A: { body: '"[프로젝트명]에서 장시간 이어진 [문제 상황]을 끝까지 파고들어 원인을 찾아냈습니다. 짧게 끝낼 수도 있었지만 몰입을 유지해 [정량적 성과]까지 완주했습니다."', tip: '"끝까지 파고들어", "몰입"은 ' + given + ' 님의 주의력 강점을 가장 잘 드러내는 표현이에요.' },
      BAL_LOW: { body: '"[프로젝트명]을 진행하며 계획 세우기·정보 정리·절차 확인 등 여러 방식을 하나씩 짧게 시도해봤습니다. 그 결과 [작은 성과]를 완료할 수 있었습니다. 짧은 단위로 나누어 꾸준히 반복한 경험이 완료까지 이어질 수 있었던 이유였습니다."', tip: '"하나씩", "꾸준히"는 ' + given + ' 님이 기초 역량을 쌓아가는 모습을 잘 드러내는 표현이에요.' },
      BAL_MID: { body: '"[프로젝트명]을 진행하며 상황에 따라 계획을 세우거나, 전체를 조망하거나, 절차를 점검하는 등 여러 접근 방식을 유연하게 오갔습니다. 그 결과 [정량적 성과]를 달성했습니다. 한 가지 방식에 갇히지 않고 상황에 맞는 방식을 고르는 유연함 덕분에 예상치 못한 변수에도 대응할 수 있었습니다."', tip: '"상황에 맞게", "유연하게"는 ' + given + ' 님의 균형잡힌 강점을 가장 잘 드러내는 표현이에요.' },
      BAL_HIGH: { body: '"[프로젝트명]에서 계획 수립·정보 종합·절차 점검을 상황에 맞게 통합적으로 활용해 여러 이해관계자가 얽힌 복합적인 문제를 해결했습니다. 그 결과 [정량적 성과]를 달성했습니다. 여러 접근을 안정적으로 통합하는 힘 덕분에 예상치 못한 변수가 겹쳐도 흔들림 없이 대응할 수 있었습니다."', tip: '"통합적으로", "안정적으로"는 ' + given + ' 님의 고른 고역량을 가장 잘 드러내는 표현이에요.' }
    };
    const DOC2 = {
      Q: { action: 'Action: "요구사항을 [N개] 작업 단위로 분해하고 절차를 체크리스트로 관리"' , tip: 'Action 항목에 순차처리 강점을 수치와 함께 넣으면 설득력이 커져요.' },
      P: { action: 'Action: "요구사항을 [N개] 작업 단위로 분해하고 일정표를 작성해 관리"', tip: 'Action 항목에 계획력 강점을 수치와 함께 넣으면 설득력이 커져요.' },
      S: { action: 'Action: "흩어진 요구사항을 하나의 아키텍처 문서로 종합해 팀 방향을 제시"', tip: 'Action 항목에 동시처리 강점을 수치와 함께 넣으면 설득력이 커져요.' },
      A: { action: 'Action: "장시간 이어진 이슈를 끝까지 파고들어 근본 원인을 규명"', tip: 'Action 항목에 주의력 강점을 수치와 함께 넣으면 설득력이 커져요.' },
      BAL_LOW: { action: 'Action: "요구사항을 작은 단위로 나눠 하나씩 짧게 완료"', tip: 'Action 항목에 꾸준한 완료 경험을 수치와 함께 넣으면 설득력이 커져요.' },
      BAL_MID: { action: 'Action: "상황에 따라 계획 수립·정보 종합·절차 점검 방식을 유연하게 오가며 대응"', tip: 'Action 항목에 상황별 유연한 대응력을 구체적 사례와 함께 넣으면 설득력이 커져요.' },
      BAL_HIGH: { action: 'Action: "계획 수립·정보 종합·절차 점검을 통합해 복합적인 이해관계를 조율"', tip: 'Action 항목에 여러 역량을 동시에 발휘한 사례를 수치와 함께 넣으면 설득력이 커져요.' }
    };
    const docKey = isBalancedTemp ? ('BAL_' + balTierTemp) : ranked[0].k;
    const d1 = DOC1[docKey], d2 = DOC2[docKey];
    setText('pf-doc1-body', d1.body);
    setHTML('pf-doc1-tip', '<b>Tip.</b> ' + d1.tip);
    setText('pf-doc2-body', 'Situation: [배경] / Task: [내가 맡은 역할] / ' + d2.action + ' / Result: "[기한] 내 [정량 결과]로 완료"');
    setHTML('pf-doc2-tip', '<b>Tip.</b> ' + d2.tip);
  }

  function applyCombo() {
    if (typeof DCasComboBank === 'undefined') return;
    const g = DCasComboBank.getCombo(PROFILE.scores);
    const combo = g.combo;
    const vars = { weak: g.weakAxisLabel, name: PROFILE.givenName };
    setText('pf-herotag', '인지 나침반 · ' + combo.code);
    setText('pf-herotype', combo.heroType);
    setText('pf-oneliner', DCasComboBank.fill(combo.oneliner, vars));
    const chipsEl = byId('pf-chips');
    if (chipsEl) chipsEl.innerHTML = combo.chips.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join('');
    setText('pf-workstyle', combo.workStyle);
    setText('pf-collabstyle', combo.collabStyle);
    applyTempCards2(PROFILE.scores, PROFILE.givenName);
    // opinion 문단: "{이름} 님은 ..." 형태로 직접 조립
    const opinionEl = byId('pf-opinion');
    if (opinionEl) opinionEl.textContent = PROFILE.givenName + ' 님은 ' + DCasComboBank.fill(combo.opinion, vars);
    // 역사적 인물 카드 (균형형 성장/전략탐색 구간에서는 인물 비교를 표시하지 않음)
    const figureCard = byId('pf-figurecard');
    if (figureCard) {
      if (combo.figure) {
        figureCard.style.display = '';
        figureCard.innerHTML = '<h4>🌟 이런 인물과 닮은 점이 있어요</h4><p>' +
          combo.figure.name + (hasBatchim(combo.figure.name) ? '은' : '는') + ' ' + DCasComboBank.fill(combo.figure.why, { name: PROFILE.givenName }) + '</p>';
      } else {
        figureCard.style.display = 'none';
        figureCard.innerHTML = '';
      }
    }
  }

  function applyJobs() {
    if (typeof DCasJobEngine === 'undefined' || typeof window.JOB_POOL === 'undefined') return null;
    const majorSelect = byId('majorSelect');
    const majorName = (majorSelect && majorSelect.value) || '컴퓨터공학과';
    const ranked = DCasJobEngine.rankJobsForMajor(PROFILE.scores, majorName, window.JOB_POOL);
    const container = byId('pf-jobcards');
    if (!ranked) {
      if (container) container.innerHTML = '<div class="tip-box">이 학과는 아직 직무 매칭 데이터가 연결되지 않았어요. (' + majorName + ')</div>';
      setText('pf-jobs-h2', majorName + ' — 직무 매칭 준비 중');
      setText('pf-jobs-combotag', '');
      setText('pf-major-examplename', '"' + majorName + '"');
      setHTML('pf-faq-lowjob', '아니에요. 적합도는 "지금 프로파일 기준 상대적 우선순위"일 뿐, 훈련과 경험으로 얼마든지 보완할 수 있어요. 순위가 낮은 직무도 09번 자신감·성장 트래커를 활용하면 충분히 도전 가능해요.');
      return null;
    }
    const top5 = ranked.slice(0, 5);
    const medalClass = ['r1', 'r2', 'r3', 'r4', 'r5'];
    if (container) {
      container.innerHTML = top5.map(function (item, i) {
        const cautionHtml = (item.job.entry_level === 'retool' && item.job.caution)
          ? '<p style="margin:6px 0 0;font-size:12px;color:#C25E00;">⚠️ ' + item.job.caution + '</p>' : '';
        return '<div class="dept-card">' +
          '<div class="rank" style="display:flex;align-items:center;gap:8px;"><span class="rank-medal ' + medalClass[i] + '">' + (i + 1) + '</span>RANK ' + (i + 1) + ' · 적합도 ' + item.fit + '%</div>' +
          '<h4>' + item.job.label_ko + '</h4>' +
          '<p>' + item.reason + '</p>' +
          cautionHtml +
          '</div>';
      }).join('');
    }
    setText('pf-jobs-h2', majorName + ' 안에서, ' + PROFILE.givenName + ' 님에게 맞는 직무');
    setText('pf-major-examplename', '"' + majorName + '"');
    setHTML('pf-faq-lowjob', '아니에요. 적합도는 "지금 프로파일 기준 상대적 우선순위"일 뿐, 훈련과 경험으로 얼마든지 보완할 수 있어요. ' +
      (ranked && ranked.length >= 5 ? ranked[4].job.label_ko : '순위가 낮은 직무') + '도 09번 자신감·성장 트래커를 활용하면 충분히 도전 가능해요.');
    if (top5.length) {
      const ranked1 = topAxesLabel(top5[0].job.pass_profile);
      setText('pf-jobs-combotag', '🔗 03번 [' + ranked1 + '] 패턴이 TOP 직무 순위의 핵심 근거예요');
    }
    return ranked;
  }
  function topAxesLabel(jobProfile) {
    const map = { planning:'계획력', attention:'주의력', simultaneous:'동시처리', successive:'순차처리' };
    return Object.keys(jobProfile).map(function(k){return {k:k,v:jobProfile[k]};})
      .sort(function(a,b){return b.v-a.v;}).slice(0,2)
      .map(function(x){return map[x.k];}).join('×');
  }

  /* ===== 학과 요구 인지패턴 (06/08번 "need" 회색 막대) =====
   * ★ dcas-major-requirements.js는 1차 추정치입니다 (attr_confidence 0.5).
   *   감수 전에는 화면에 노출하지 않도록 기능 플래그로 잠갔습니다.
   *   감수 완료 후 SHOW_MAJOR_REQUIREMENT를 true로 바꾸면 즉시 활성화됩니다.
   */
  const SHOW_MAJOR_REQUIREMENT = false;

  function applyMajorGauge() {
    const majorSelect = byId('majorSelect');
    const majorName = (majorSelect && majorSelect.value) || '컴퓨터공학과';
    const s = PROFILE.scores;

    // "내 정답률"(주황 막대·있음 마커)은 감수와 무관하게 항상 실데이터로 갱신
    ['Q', 'P', 'S', 'A'].forEach(function (k, i) {
      // 06번 4개 req-row: 순차·계획·동시·주의 순서 고정
    });
    const rows06 = document.querySelectorAll('#major .req-row');
    const order06 = ['Q', 'P', 'S', 'A']; // 원본 마크업 순서: 순차처리·계획력·동시처리·주의력
    rows06.forEach(function (row, i) {
      const k = order06[i]; if (!k) return;
      const have = row.querySelector('.have');
      const label = row.querySelector('b');
      if (have) have.style.left = s[k] + '%';
      if (label) label.textContent = s[k] + '%';
    });

    if (!SHOW_MAJOR_REQUIREMENT || typeof window.DCAS_MAJOR_REQUIREMENTS === 'undefined') {
      // 패치: 학과 요구치 데이터가 아직 감수 전이라 실제 적합도를 계산할 수 없는데,
      // 기존엔 샘플 87%가 마치 실제 개인화 결과처럼 그대로 노출되고 있었음 — 정직한 안내문으로 교체
      const gaugeCircle0 = document.querySelector('#major .gauge-circle');
      const gaugeB0 = gaugeCircle0 && gaugeCircle0.querySelector('b');
      const gaugeH40 = document.querySelector('#major .gauge-txt h4');
      if (gaugeB0) gaugeB0.textContent = '검수 중';
      if (gaugeH40) gaugeH40.textContent = majorName + ' 적합도 (검수 중)';
      const gaugeDescEl0 = byId('pf-major-gaugedesc');
      if (gaugeDescEl0) gaugeDescEl0.textContent = '학과별 요구 인지패턴 데이터는 전문가 감수 후 공개될 예정이에요. 지금은 07번 "추천직무 TOP5"에서 개인 프로파일 기반 직무 적합도를 먼저 확인해보세요.';
      // 패치: 숫자(87%)만 가리고 회색 '학과 요구 수준' 막대·범례는 계속 샘플값을 보여주고 있었음 — 함께 숨김
      rows06.forEach(function (row) {
        const need = row.querySelector('.need');
        if (need) need.style.display = 'none';
      });
      const legend0 = document.querySelector('#major .req-legend');
      if (legend0) legend0.innerHTML = '<span><i style="background:var(--orange)"></i>내 정답률</span>';
      return;
    }
    const req = window.DCAS_MAJOR_REQUIREMENTS[majorName];
    if (!req) return;
    rows06.forEach(function (row, i) {
      const k = order06[i]; if (!k) return;
      const need = row.querySelector('.need');
      if (need) need.style.width = req[k] + '%';
    });
    // 적합도 게이지(87%) — 4축 평균 거리 기반 재계산
    const gaugeFit = DCasJobEngine ? DCasJobEngine.computeFit(
      { P: s.P, A: s.A, S: s.S, Q: s.Q },
      { planning: req.P, attention: req.A, simultaneous: req.S, successive: req.Q }
    ) : null;
    if (gaugeFit !== null) {
      const gaugeCircle = document.querySelector('#major .gauge-circle');
      const gaugeB = gaugeCircle && gaugeCircle.querySelector('b');
      const gaugeH4 = document.querySelector('#major .gauge-txt h4');
      if (gaugeCircle) gaugeCircle.style.setProperty('--pct', gaugeFit);
      if (gaugeB) gaugeB.textContent = gaugeFit + '%';
      if (gaugeH4) gaugeH4.textContent = majorName + ' 적합도 ' + gaugeFit + '%';
      const gaugeDescEl = byId('pf-major-gaugedesc');
      if (gaugeDescEl) {
        const AXIS_LABEL_REQ = { P:'계획력', A:'주의력', S:'동시처리', Q:'순차처리' };
        // 패치: req(DCAS_MAJOR_REQUIREMENTS)는 P/A/S/Q 키인데 reqKeyMap으로
        // planning/attention...을 조회해서 항상 undefined→항상 false가 되던 버그 수정
        const metAxes = ['P','A','S','Q'].filter(function(k){ return s[k] >= req[k]; }).map(function(k){return AXIS_LABEL_REQ[k];});
        const shortAxes = ['P','A','S','Q'].filter(function(k){ return s[k] < req[k]; }).map(function(k){return AXIS_LABEL_REQ[k];});
        if (shortAxes.length === 0) {
          gaugeDescEl.textContent = metAxes.join('·') + '이(가) 모두 학과 요구 수준을 웃돌아요.';
        } else if (metAxes.length === 0) {
          gaugeDescEl.textContent = shortAxes.join('·') + '이(가) 학과 요구 수준보다 낮아요. 미션보드에서 관련 훈련을 시작해보세요.';
        } else {
          gaugeDescEl.textContent = metAxes.join('·') + '이(가) 학과 요구 수준을 웃돌아요. ' + shortAxes.join('·') + '은(는) 요구 수준보다는 낮지만 필요 최저선은 충족해요.';
        }
      }
    }
  }

  function applyJobSkill(ranked) {
    const container = byId('pf-jobskillcards');
    if (!container) return;
    if (!ranked || !ranked.length) {
      container.innerHTML = '<div class="tip-box">이 학과는 아직 직무 매칭 데이터가 연결되지 않아, 역량 비교를 표시할 수 없어요.</div>';
      return;
    }
    const s = PROFILE.scores;
    const top2 = ranked.slice(0, 2);
    container.innerHTML = top2.map(function (item, i) {
      const req = item.job.pass_profile;
      const rows = [
        { label: '계획력', need: req.planning, have: s.P },
        { label: '주의력', need: req.attention, have: s.A },
        { label: '동시처리', need: req.simultaneous, have: s.S },
        { label: '순차처리', need: req.successive, have: s.Q },
      ].sort(function (a, b) { return b.need - a.need; }).slice(0, 3); // 요구도 상위 3개 축만 표시(원본 형식 유지)
      const rowsHtml = rows.map(function (r) {
        return '<div class="req-row"><div class="rlabel">' + r.label + '</div><div class="req-dual">' +
          '<div class="need" style="width:' + r.need + '%"></div><div class="have" style="left:' + r.have + '%"></div></div>' +
          '<b style="font-size:12.5px;color:var(--orange)">' + r.have + '%</b></div>';
      }).join('');
      const meetsAll = rows.every(function (r) { return r.have >= r.need; });
      const gapRow = rows.find(function (r) { return r.have < r.need; });
      const verdict = meetsAll
        ? '<b style="color:#1E8A5F;">✓ 표시된 영역 모두 요구 수준 이상</b> — 신입 기준으로도 바로 실무 적응이 가능한 프로파일이에요.'
        : '<b style="color:#C25E00;">△ ' + josa(gapRow.label, '이가') + ' 요구 수준에 다소 미달</b> — 관련 훈련을 병행하면 좋아요.';
      return '<div class="card">' +
        '<h4 style="margin:0 0 4px;font-size:14.5px;color:var(--navy);">RANK ' + (i + 1) + ' · ' + item.job.label_ko + '</h4>' +
        '<p class="sub" style="margin-bottom:10px;">신입 채용공고 기준 요구 역량 프로파일 (추정치)</p>' +
        rowsHtml +
        '<div class="req-legend"><span><i style="background:#DCE4F6"></i>직무 요구 수준</span><span><i style="background:var(--orange)"></i>내 정답률</span></div>' +
        '<p style="margin:10px 0 0;font-size:13.5px;color:var(--ink);">' + verdict + '</p>' +
        '</div>';
    }).join('');
    if (top2.length) {
      const q = byId('pf-interviewcard');
      if (q) {
        q.querySelector('.q2').textContent = top2[0].job.label_ko + ' 직무, 면접에서 이렇게 어필해보세요';
        /* ===== 패치: 질문(q2)은 1순위 직무로 바뀌는데 답변 예시(a2)는 항상 "순차처리" 고정 문장이던 것을
         * 해당 직무가 가장 중시하는 축(요구도 1위) 기준으로 4종 중 하나를 골라 넣도록 동적화 */
        const INTERVIEW_ANSWER = {
          Q: { text: '저는 문제를 접했을 때 원인을 단계적으로 좁혀가며 추적하는 방식을 선호합니다. [프로젝트 경험]에서도 발생한 오류를 로그 기반으로 순서대로 검증해 재현 조건을 특정했고, 이를 문서화해 팀에 공유했습니다.', axis: '순차처리' },
          P: { text: '저는 새로운 과제를 맡으면 전체 목표를 먼저 그린 뒤 단계별 실행 계획으로 쪼개는 편입니다. [프로젝트 경험]에서도 마일스톤을 미리 설계하고, 일정에 맞춰 진행 상황을 스스로 점검하며 완수했습니다.', axis: '계획력' },
          A: { text: '저는 세부 사항을 놓치지 않고 끝까지 확인하는 데 강점이 있습니다. [프로젝트 경험]에서도 체크리스트를 직접 만들어 반복 검증했고, 그 결과 배포 전 오류를 여러 건 사전에 잡아낼 수 있었습니다.', axis: '주의력' },
          S: { text: '저는 여러 정보를 한번에 통합해 전체 그림을 빠르게 파악하는 편입니다. [프로젝트 경험]에서도 흩어져 있던 요구사항들을 종합해 하나의 방향으로 설계안을 제시했습니다.', axis: '동시처리' },
        };
        const jobKeyToAxis = { planning: 'P', attention: 'A', simultaneous: 'S', successive: 'Q' };
        const req = top2[0].job.pass_profile;
        const topReqKey = Object.keys(req).sort(function (a, b) { return req[b] - req[a]; })[0];
        const answer = INTERVIEW_ANSWER[jobKeyToAxis[topReqKey]] || INTERVIEW_ANSWER.Q;
        const a2El = q.querySelector('.a2');
        if (a2El) a2El.innerHTML = '"' + answer.text + '" — ' + answer.axis + ' 강점을 구체 경험과 함께 제시하는 문장이에요.';
      }
    }
  }

  function applyGrowthAndDocs(ranked) {
    if (typeof DCasAxisContent === 'undefined') return;
    const s = PROFILE.scores;
    const rankedAxes = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const weak2 = rankedAxes.slice(-2).map(function(r){return r.k;});
    const strong2 = rankedAxes.slice(0,2).map(function(r){return r.k;});
    // 패치: 4개 축이 사실상 동점(균형형)일 때도 배열 순서상 상위 2개(계획력·주의력)를
    // "강점"으로 단정해 자소서 STEP1 등에 그대로 쓰이던 것을 수정
    const isBalancedDocs = (rankedAxes[0].v - rankedAxes[3].v) < 20;
    const balTierDocs = getBalTier(s);

    // 09번 growth
    const checklistEl = byId('pf-growthchecklist');
    if (checklistEl) checklistEl.innerHTML = DCasAxisContent.buildChecklistHTML(rankedAxes);
    const missionsEl = byId('pf-missions');
    if (missionsEl) missionsEl.innerHTML = DCasAxisContent.buildMissionsHTML(isBalancedDocs ? ['BAL_' + balTierDocs] : weak2);
    const weakLabel = DCasAxisContent.AXIS_LABEL[weak2[weak2.length-1]];
    setText('pf-growthtip', isBalancedDocs
      ? balPick(balTierDocs, {
          LOW: '💡 4개 영역이 비슷한 수준에서 함께 발달하는 중이에요. 특정 항목보다는 네 영역 모두에서 짧고 반복 가능한 습관을 쌓는 데 집중해보세요.',
          MID: '💡 4개 영역이 고르게 나타나, 특정 항목이 유독 낮기보다는 전반적으로 비슷한 수준일 가능성이 높아요. 관심 있는 영역을 자유롭게 골라 훈련해보세요.',
          HIGH: '💡 4개 영역이 고르게 높아요. 여러 영역을 동시에 요구하는 복합 과제나 관심 분야의 심화 도전으로 한 단계 더 나아가보세요.'
        })
      : '💡 체크가 유독 낮은 항목이 있다면, 이는 프로파일과도 일치해요 — ' + weakLabel + ' 요구가 높은 항목이기 때문이에요. 이런 항목은 "약점"이 아니라 "의식적 훈련이 더 필요한 영역"으로 접근하면 좋아요.');

    // 11번 docs
    const topJobName = (ranked && ranked.length) ? ranked[0].job.label_ko : '지원 직무';
    const step1El = byId('pf-docs-step1');
    if (step1El) {
      if (isBalancedDocs) {
        step1El.innerHTML = '<b>STEP 1 · 핵심 강점 3개 선정</b>' + balPick(balTierDocs, {
          LOW: '02·03번에서 확인했듯 4개 영역이 비슷한 수준에서 함께 발달하는 균형형이에요. 특정 축 점수보다는, 짧은 과제를 꾸준히 완료해온 "기초 실행력"을 자소서 전체를 관통하는 핵심 키워드로 확정해요.',
          MID: '02·03번에서 확인했듯 4개 영역이 고르게 나타나는 균형형이에요. 특정 축 점수보다는, 상황에 맞게 접근 방식을 유연하게 바꾸는 "상황 대응력"을 자소서 전체를 관통하는 핵심 키워드로 확정해요.',
          HIGH: '02·03번에서 확인했듯 4개 영역이 고르게 높은 균형형이에요. 특정 축 점수보다는, 여러 역량을 안정적으로 통합해내는 "통합 실행력"을 자소서 전체를 관통하는 핵심 키워드로 확정해요.'
        });
      } else {
      const s1 = strong2[0], s2 = strong2[1];
      // 패치: 3번째 키워드가 축과 무관하게 "절차적 정밀함"으로 고정돼 있던 것을 실제 3순위 축 기준으로 교체
      const s3 = rankedAxes[2].k;
      const KEYWORD3 = { P: '전략적 실행력', A: '몰입 지속력', S: '통합적 사고', Q: '절차적 정밀함' };
      const kw3 = KEYWORD3[s3];
      step1El.innerHTML = '<b>STEP 1 · 핵심 강점 3개 선정</b>02·03번에서 확인한 ' +
        DCasAxisContent.AXIS_LABEL[s1] + '(' + s[s1] + '%)·' + DCasAxisContent.AXIS_LABEL[s2] + '(' + s[s2] + '%)·' + kw3 + (hasBatchim(kw3)?'을':'를') + ' 자소서 전체를 관통하는 핵심 키워드 3개로 확정해요.';
      }
    }
    // 패치: STEP 3 Action 문구가 축과 무관하게 항상 "순서대로", "단계별로"(순차처리·계획력 전제)로
    // 고정돼 있던 것을 실제 최고축 기준 표현으로 교체
    const step3El = byId('pf-docs-step3');
    if (step3El) {
      const ACTION_WORDS = { P: '"일정에 맞춰", "우선순위를 정해"', A: '"끝까지 파고들어", "집중해서"', S: '"전체를 종합해", "큰 그림을 그려"', Q: '"순서대로", "단계별로"' };
      const topActionKey = isBalancedDocs ? strong2[0] : strong2[0];
      step3El.innerHTML = '<b>STEP 3 · STAR 구조화</b>Situation(상황)-Task(과제)-Action(행동)-Result(결과) 순서로 에피소드를 정리해요. Action에는 반드시 ' + ACTION_WORDS[topActionKey] + ' 같은 {{GIVEN}} 님 강점 언어를 넣어요.'.replace('{{GIVEN}}', PROFILE.givenName);
    }
    // 패치: 제출 전 체크리스트의 "순차처리·계획력 관련 표현" 항목이 실제 강점축과 무관하게 고정돼 있던 것을 수정
    const es3labelText = isBalancedDocs
      ? balPick(balTierDocs, {
          LOW: '강점 키워드(꾸준한 완료·반복 훈련 관련 표현)가 최소 2개 문항에 걸쳐 반복된다',
          MID: '강점 키워드(상황에 맞는 유연한 접근 관련 표현)가 최소 2개 문항에 걸쳐 반복된다',
          HIGH: '강점 키워드(통합적 역량 발휘 관련 표현)가 최소 2개 문항에 걸쳐 반복된다'
        })
      : '강점 키워드(' + DCasAxisContent.AXIS_LABEL[strong2[0]] + '·' + DCasAxisContent.AXIS_LABEL[strong2[1]] + ' 관련 표현)가 최소 2개 문항에 걸쳐 반복된다';
    setText('pf-docs-es3label', es3labelText);
    const docsTableEl = byId('pf-docs-table');
    if (docsTableEl) {
      const REASON = {
        P: '일정·태스크 분해 능력이 실행력의 증거가 돼요', A: '반복 검증 습관을 몰입력의 증거로 제시',
        S: '"보완 방식을 스스로 설계했다"는 성장형 스토리로 강점화', Q: '원인을 단계적으로 추적한 경험이 논리적으로 잘 드러나요',
      };
      const FIELD = { P:'목표달성 경험 / 입사 후 포부', A:'성실성·직무 전문성', S:'협업·갈등 경험', Q:'문제해결 경험 / 지원동기' };
      docsTableEl.innerHTML = '<tr><th>인지 강점</th><th>가장 잘 맞는 문항</th><th>이유</th></tr>' +
        rankedAxes.map(function (r, i) {
          const suffix = (!isBalancedDocs && i === rankedAxes.length - 1) ? ' (보완중)' : '';
          return '<tr><td>' + DCasAxisContent.AXIS_LABEL[r.k] + ' ' + s[r.k] + '%' + suffix + '</td><td>' + FIELD[r.k] + '</td><td>' + REASON[r.k] + '</td></tr>';
        }).join('');
    }
    const docCardsEl = byId('pf-doccards');
    if (docCardsEl) docCardsEl.innerHTML = DCasAxisContent.buildDocCardsHTML(isBalancedDocs ? ['BAL_' + balTierDocs] : strong2, topJobName);
    const es3 = document.querySelector('label[for="es3"]');
    if (es3) es3.textContent = es3labelText;
  }

  /* ===== roadmap 공용 뼈대 — entry_level 기반 톤 조절, 기술스택 세부는 미포함 ===== */
  const ENTRY_LEVEL_COPY = {
    direct: { tag: '신입 직행 가능', note: '이 직무는 신입 채용 비중이 높아요 — 아래 흐름을 따라가면 4학년 때 바로 지원할 수 있어요.' },
    bridge: { tag: '유관 경험 권장', note: '이 직무는 관련 인턴·프로젝트 경험이 있으면 유리해요 — 3학년부터 관련 활동을 의식적으로 쌓아보세요.' },
    retool: { tag: '추가 역량 필요', note: '이 직무는 전공 지식 외에 추가로 익혀야 할 도구·자격이 있을 수 있어요 — 학과 상담센터에서 구체적 요건을 확인해보세요.' },
  };
  function buildRoadmapSkeleton(topJob, gradeLabel) {
    const entryLevel = topJob ? topJob.job.entry_level : 'bridge';
    const copy = ENTRY_LEVEL_COPY[entryLevel] || ENTRY_LEVEL_COPY.bridge;
    const jobName = topJob ? topJob.job.label_ko : '희망 직무';
    // 패치: '2학년(현재)' 고정 라벨을 실제 학년(gradeLabel)에서 추출한 학년으로 교체
    const gradeMatch = (gradeLabel || '').match(/([1-4])\s*학년/);
    const currentYear = gradeMatch ? parseInt(gradeMatch[1], 10) : (/대학원|졸업|취준/.test(gradeLabel || '') ? 4 : 2);
    const yearTags = [1,2,3,4].map(function(y){ return y + '학년' + (y === currentYear ? ' (현재)' : ''); });
    return {
      subtitle: '1순위 직무(' + jobName + ') 기준으로 설계했어요 · ' + copy.tag,
      years: [
        { tag: yearTags[0], title: '기초 체력 쌓기', items: [
          '전공 기초 과목을 탄탄히 다지기', '동아리·소모임에서 협업 도구 익히기', '작은 프로젝트로 "완주 경험" 만들기'
        ]},
        { tag: yearTags[1], title: '전공 심화 + 직무 이해', items: [
          copy.note,
          jobName + ' 관련 과목·프로젝트를 의식적으로 선택하기',
          '06·07번에서 확인한 강점 축을 살릴 수 있는 소규모 프로젝트 시도'
        ]},
        { tag: yearTags[2], title: '실전 스펙 채우기', items: [
          jobName + ' 관련 심화 프로젝트 1개 완성',
          jobName + ' 인턴십 지원 시작 — 06번 학과적합도·07번 직무순위 근거를 자소서에 활용',
          '2·3순위 직무도 함께 살펴보고 겹치는 역량이 있다면 함께 준비'
        ]},
        { tag: yearTags[3], title: '취업 실전', items: [
          '포트폴리오 완성 — "강점을 발휘해 ' + jobName + ' 관련 문제를 해결한 과정"을 문서로 정리',
          jobName + ' 면접 대비: 강점이 드러난 구체 경험 정리',
          jobName + ' 채용공고 요구역량과 11번 자소서 설계 문구 매칭해 지원서 작성'
        ]},
      ],
    };
  }
  function applyRoadmap(ranked) {
    const topJob = ranked && ranked.length ? ranked[0] : null;
    const rm = buildRoadmapSkeleton(topJob, PROFILE.gradeLabel);
    setText('pf-roadmap-sub', rm.subtitle);
    const timeline = byId('pf-roadmap-timeline');
    if (!timeline) return;
    timeline.innerHTML = rm.years.map(function (y) {
      return '<div class="yr-step"><div class="yr-tag">' + y.tag + '</div><h4>' + y.title + '</h4><ul>' +
        y.items.map(function (it) { return '<li>' + it + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  function applyEfficiency(d, ranked) {
    if (typeof DCasComboBank === 'undefined') return;
    const s = PROFILE.scores;
    const top2Keys = d.ranked.slice(0, 2).map(function (r) { return r.k; });
    const isBalancedEff = (d.comboKey === 'BAL');
    const pat1Key = isBalancedEff && d.balTier ? ('BAL_' + d.balTier) : d.comboKey;
    const p1 = DCasComboBank.DIAG_PATTERN1[pat1Key];
    const weakKey = d.ranked[d.ranked.length - 1].k;
    const pat2Key = isBalancedEff && d.balTier ? ('BAL_' + d.balTier) : weakKey;
    const p2 = DCasComboBank.DIAG_PATTERN2[pat2Key];
    const AXIS_LABEL_CLASS = { P: 'p', A: 'a', S: 's', Q: 'q' };
    const AXIS_TO_JOBKEY_EFF = { P: 'planning', A: 'attention', S: 'simultaneous', Q: 'successive' };
    const topJob = (ranked && ranked.length) ? ranked[0] : null;
    if (p1) {
      const isBalCombo = (d.comboKey === 'BAL');
      const isSoloCombo = /_SOLO$/.test(d.comboKey);
      const balLabelKo = isBalCombo ? balPick(d.balTier, {LOW:'균형형(성장)',MID:'균형형',HIGH:'균형형(고역량)'}) : null;
      setText('pf-eff-h2', isBalCombo ? '[' + balLabelKo + '] 조합이 만드는 패턴'
        : isSoloCombo ? '[' + AXIS_LABEL[top2Keys[0]] + ' 단일 강점] 만드는 패턴'
        : '[' + AXIS_LABEL[top2Keys[0]] + '×' + AXIS_LABEL[top2Keys[1]] + '] 조합이 만드는 패턴');
      setHTML('pf-eff-pair1', isBalCombo
        ? ['P','A','S','Q'].map(function (k) { return '<span class="axis-tag ' + AXIS_LABEL_CLASS[k] + '">' + AXIS_LABEL[k] + ' ' + s[k] + '%</span>'; }).join('<span class="vs">·</span>')
        : isSoloCombo
        ? '<span class="axis-tag ' + AXIS_LABEL_CLASS[top2Keys[0]] + '">' + AXIS_LABEL[top2Keys[0]] + ' ' + s[top2Keys[0]] + '%</span>'
        : top2Keys.map(function (k) {
        return '<span class="axis-tag ' + AXIS_LABEL_CLASS[k] + '">' + AXIS_LABEL[k] + ' ' + s[k] + '%</span>';
      }).join('<span class="vs">×</span>'));
      setText('pf-eff-title1', '① ' + p1.title);
      setHTML('pf-eff-sym1', '<b>이런 모습으로 나타나요 —</b> ' + p1.sym);
      /* ===== 패치: 활용법(rx)을 06·07번에서 선택한 학과/직무 기준으로 동적 생성.
       * 학과/직무를 아직 안 고른 상태(topJob 없음)에서는 기존 범용 문구로 폴백. ===== */
      const rx1Text = topJob
        ? (isSoloCombo
           ? ('07번에서 확인한 1순위 직무 <b>' + topJob.job.label_ko + '</b>에서 특히 강점이 돼요 — 이 직무는 ' +
              AXIS_LABEL[top2Keys[0]] + (hasBatchim(AXIS_LABEL[top2Keys[0]])?'을':'를') + ' 핵심으로 요구하는데, ' +
              PROFILE.givenName + ' 님의 ' + AXIS_LABEL[top2Keys[0]] + ' ' + s[top2Keys[0]] + '% 강점과 정확히 맞닿아 있어요(적합도 ' + topJob.fit + '%). 지원 시 이 강점을 구체적 경험과 엮어서 어필해보세요.')
           : ('07번에서 확인한 1순위 직무 <b>' + topJob.job.label_ko + '</b>에서 특히 강점이 돼요 — 이 직무는 ' +
           (function(){ const t = top2Keys.map(function (k) { return AXIS_LABEL[k]; }).join('·'); return t + (hasBatchim(t)?'을':'를'); })() + ' 핵심으로 요구하는데, ' +
           PROFILE.givenName + ' 님의 ' + top2Keys.map(function (k) { return AXIS_LABEL[k] + ' ' + s[k] + '%'; }).join('×') +
           ' 조합과 정확히 맞닿아 있어요(적합도 ' + topJob.fit + '%). 지원 시 이 조합을 구체적 경험과 엮어서 어필해보세요.'))
        : p1.rx;
      setHTML('pf-eff-rx1', '<b>이렇게 활용해보세요 —</b> ' + rx1Text);
    }
    if (p2) {
      const isBalCombo2 = (d.comboKey === 'BAL');
      setHTML('pf-eff-pair2', isBalCombo2
        ? ['P','A','S','Q'].map(function (k) { return '<span class="axis-tag ' + AXIS_LABEL_CLASS[k] + '">' + AXIS_LABEL[k] + ' ' + s[k] + '%</span>'; }).join('<span class="vs">·</span>')
        : '<span class="axis-tag ' + AXIS_LABEL_CLASS[weakKey] + '">' + AXIS_LABEL[weakKey] + ' ' + s[weakKey] + '%</span><span class="vs">↓</span>');
      setText('pf-eff-title2', '② ' + p2.title);
      setHTML('pf-eff-sym2', '<b>이런 모습으로 나타나요 —</b> ' + p2.sym);
      let rx2Text = p2.rx;
      if (topJob && !isBalCombo2) {
        const weakJobKey = AXIS_TO_JOBKEY_EFF[weakKey];
        const need = topJob.job.pass_profile ? topJob.job.pass_profile[weakJobKey] : null;
        const have = s[weakKey];
        if (typeof need === 'number' && have < need) {
          rx2Text = '<b>' + topJob.job.label_ko + '</b> 직무는 ' + josa(AXIS_LABEL[weakKey], '을를') + ' 평균 ' + need +
            '% 정도 요구해요 — 지금(' + have + '%)보다 끌어올려두면 실무 적응이 더 수월해질 거예요. ' + p2.rx;
        } else if (typeof need === 'number') {
          rx2Text = '<b>' + topJob.job.label_ko + '</b> 직무 기준으로는 ' + josa(AXIS_LABEL[weakKey], '이가') + ' 이미 충분한 수준(요구 ' + need +
            '% vs 보유 ' + have + '%)이에요. 다른 직무·상황을 대비해 이렇게 훈련해두면 더 좋아요 — ' + p2.rx;
        }
      }
      setHTML('pf-eff-rx2', '<b>이렇게 훈련해보세요 —</b> ' + rx2Text);
    }
    /* ===== 패치: "{{GIVEN}} 님 vs 컴퓨터공학과 평균 비교" 카드가 학과·축·점수 전부 고정값이었던 것을
     * 실제 최강축/최약축과 사용자 본인의 점수로 재구성 (학과평균 비교는 미검수 데이터라 사용하지 않음)
     * 패치: 균형형(4축 사실상 동점)일 때도 특정 두 축을 골라 "강점 vs 약점"으로 비교하던 것을 수정 */
    const compareTopEl = byId('pf-eff-compare-top');
    if (compareTopEl) {
      const b = compareTopEl.querySelector('b'), sp = compareTopEl.querySelector('span');
      if (b) b.textContent = s[top2Keys[0]] + '%';
      if (sp) sp.textContent = AXIS_LABEL[top2Keys[0]];
    }
    const compareWeakEl = byId('pf-eff-compare-weak');
    if (compareWeakEl) {
      const b = compareWeakEl.querySelector('b'), sp = compareWeakEl.querySelector('span');
      if (b) b.textContent = s[weakKey] + '%';
      if (sp) sp.textContent = AXIS_LABEL[weakKey];
    }
    const gapVal = s[top2Keys[0]] - s[weakKey];
    if (isBalancedEff) {
      setText('pf-eff-compare-h4', '📊 ' + PROFILE.givenName + ' 님의 프로파일 — 균형형');
      setHTML('pf-eff-compare-caption', balPick(d.balTier, {
        LOW: '4개 영역이 비슷한 수준에서 함께 발달하는 중이에요. 특정 영역을 강점으로 내세우기보다, 짧고 반복적인 훈련으로 네 영역의 기초를 고르게 다지는 전략이 효과적이에요.',
        MID: '4개 영역의 정답률이 고르게 나타나, 특정 영역을 강점 삼아 다른 영역을 보완하기보다는 상황에 맞는 접근 방식을 유연하게 골라 쓰는 전략이 효과적이에요.',
        HIGH: '4개 영역이 고르게 높아, 여러 영역을 동시에 안정적으로 활용하고 통합하는 전략이 효과적이에요. 복합적인 업무나 리더십 포지션에서 이 통합력이 강점이 돼요.'
      }));
    } else {
      setText('pf-eff-compare-h4', '📊 ' + PROFILE.givenName + ' 님의 강점 조합 — ' + AXIS_LABEL[top2Keys[0]] + ' vs ' + AXIS_LABEL[weakKey]);
      setHTML('pf-eff-compare-caption', josa(AXIS_LABEL[top2Keys[0]], '이가') + ' ' + AXIS_LABEL[weakKey] + '보다 ' + gapVal + '%p 높아, "' +
        AXIS_LABEL[top2Keys[0]] + ' 중심으로 강점을 발휘하고 ' + josa(AXIS_LABEL[weakKey], '은는') + ' 의식적으로 보완"하는 전략이 효과적이에요.');
    }
    if (ranked && ranked.length) {
      const cpRows = byId('pf-eff-preview');
      if (cpRows) {
        const top1Job = ranked[0], lastJob = ranked[ranked.length - 1];
        const rows = cpRows.querySelectorAll('.cp-row');
        // 패치: cp-row의 두 번째 칸(축%×축% 텍스트)이 "순차처리 91%×계획력 84%"/"동시처리 66%"로
        // 고정돼 있어 실제 top2Keys/weakKey가 반영되지 않던 것을 동적으로 교체
        if (rows[0]) {
          const textDiv = rows[0].children[1];
          if (textDiv) textDiv.innerHTML = AXIS_LABEL[top2Keys[0]] + ' ' + s[top2Keys[0]] + '% <span class="cp-x">×</span> ' + AXIS_LABEL[top2Keys[1]] + ' ' + s[top2Keys[1]] + '%';
          rows[0].querySelector('.cp-desc').textContent = '→ 07번 1순위(' + top1Job.job.label_ko + ') 근거';
        }
        if (rows[1]) {
          const textDiv2 = rows[1].children[1];
          if (textDiv2) textDiv2.textContent = AXIS_LABEL[weakKey] + ' ' + s[weakKey] + '%';
          if (lastJob !== top1Job) rows[1].querySelector('.cp-desc').textContent = '→ 07번 ' + lastJob.job.label_ko + ' 후순위 이유';
        }
      }
    }
  }

  function applyEmotional(d, ranked) {
    const s = PROFILE.scores;
    const topAxisKey = d.ranked[0].k;
    const weakAxisKey = d.ranked[d.ranked.length - 1].k;
    const isBalancedEmo = (d.comboKey === 'BAL');
    const statsEl = byId('pf-emo-stats');
    if (statsEl) {
      const jobCount = ranked ? ranked.length : 0;
      statsEl.innerHTML = (isBalancedEmo
        ? '<div class="stat-chip"><b>' + s.P + '%</b><span>' + balPick(d.balTier, {LOW:'4개 영역 함께 성장',MID:'4개 영역 균형',HIGH:'4개 영역 고른 고역량'}) + '</span></div>'
        : '<div class="stat-chip"><b>' + s[topAxisKey] + '%</b><span>' + AXIS_LABEL[topAxisKey] + ' 최고강점</span></div>') +
        '<div class="stat-chip"><b>' + jobCount + '개</b><span>학과 안 세부 직무</span></div>';
    }
    /* ===== 패치: p1·li2가 "컴퓨터공학과"·"동시처리"로 고정돼 있던 것을
     * 06번에서 선택한 학과명, 실제 최약 축으로 동적화 ===== */
    const majorSelect = byId('majorSelect');
    const majorName = (majorSelect && majorSelect.value && majorSelect.value !== '__custom__') ? majorSelect.value : '희망 학과';
    const p1El = byId('pf-emo-p1');
    if (p1El) {
      p1El.innerHTML = '다음 06번에서 보게 될 "학과 적합도"는 ' + PROFILE.givenName + ' 님이 ' +
        josa(majorName, '을를') + ' 잘 선택했는지 채점하는 점수가 아니에요. 같은 학과 안에서도 사람마다 다른 인지 프로파일을 가지고 있고, 그 차이가 "어떤 세부 직무가 더 잘 맞는지"를 알려줄 뿐이에요. 적합도가 낮게 나오는 영역이 있더라도, 그건 "학과를 잘못 골랐다"는 뜻이 결코 아니에요.';
    }
    const li2El = byId('pf-emo-li2');
    if (li2El) {
      li2El.innerHTML = isBalancedEmo
        ? balPick(d.balTier, {
            LOW: '"동기들보다 점수가 낮으면 뒤처진 건가요" → 아니에요. 지금은 네 영역이 함께 발달하는 출발점일 뿐이에요. 09번 성장 트래커에서 짧고 반복적인 훈련으로 기초를 다져보세요',
            MID: '"동기들보다 점수가 낮으면 뒤처진 건가요" → 아니에요. 4개 영역이 고르게 나타나는 것 자체가 강점이에요. 09번 성장 트래커에서 관심 있는 영역을 더 훈련해볼 수 있어요',
            HIGH: '"동기들보다 점수가 낮으면 뒤처진 건가요" → 전혀요. 4개 영역 모두 고르게 높은 수준이에요. 09번 성장 트래커에서 복합적인 도전 과제로 한 단계 더 나아가보세요'
          })
        : '"동기들보다 점수가 낮으면 뒤처진 건가요" → 아니에요. ' + AXIS_LABEL[weakAxisKey] +
        '처럼 낮게 나온 영역도 훈련으로 충분히 성장해요. 09번 성장 트래커에서 구체적인 훈련법을 확인할 수 있어요';
    }
  }

  function applyExpert(d, ranked) {
    const s = PROFILE.scores;
    // 정답률·판정만 실데이터로 갱신. 원점수·종합지수·SS는 developer 연동 예정이라 손대지 않음.
    const tbody = byId('pf-expert-table');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      const order = ['Q', 'P', 'S', 'A']; // 표 순서: 순차·계획·동시·주의
      rows.forEach(function (row, i) {
        const k = order[i]; if (!k) return;
        const tds = row.querySelectorAll('td');
        if (tds[1]) tds[1].textContent = s[k] + '%'; // 정답률 칸 (원점수 칼럼은 제거함 — 실데이터 없이 "확인필요"로 노출되던 문제 수정)
        const judge = row.querySelector('.judge');
        if (judge) {
          // 판정 상/중/하 경계값: 75/53 (확인된 최종 기준 — 160점 만점 SS구간(하84↓/중85~119/상120↑) 환산 기준 반영)
          const level = s[k] >= 75 ? 'high' : (s[k] >= 53 ? 'mid' : 'low');
          judge.className = 'judge ' + level;
          judge.textContent = level === 'high' ? '상' : (level === 'mid' ? '중' : '하');
        }
      });
    }
    /* ===== 패치: "컴퓨터공학과 재학생 평균 대비" 카드 — h4의 학과명 고정, 두 번째 서클의
     * "학과평균 72%" 숫자가 전혀 갱신되지 않던 것을 실제 최고축·최약축 비교로 재구성
     * (학과평균은 미검수 데이터라 사용하지 않음 — 03번 pf-eff-compare와 동일한 방침)
     * 패치: 균형형일 때도 특정 두 축을 골라 비교하던 것을 수정 */
    const compareEl = byId('pf-expert-compare');
    if (compareEl) {
      const circles = compareEl.querySelectorAll('.ds-circle b');
      const spans = compareEl.querySelectorAll('.ds-circle span');
      const topKey = d.ranked[0].k;
      const weakKey = d.ranked[d.ranked.length - 1].k;
      if (circles[0]) circles[0].textContent = s[topKey] + '%';
      if (circles[1]) circles[1].textContent = s[weakKey] + '%';
      if (d.comboKey === 'BAL') {
        if (spans[0]) spans[0].textContent = AXIS_LABEL[topKey] + '·' + PROFILE.givenName;
        if (spans[1]) spans[1].textContent = AXIS_LABEL[weakKey] + '·' + PROFILE.givenName;
        setText('pf-expert-compare-h4', PROFILE.givenName + ' 님의 프로파일 — 균형형(4개 영역 고르게 발달)');
      } else {
        if (spans[0]) spans[0].textContent = AXIS_LABEL[topKey] + '·' + PROFILE.givenName;
        if (spans[1]) spans[1].textContent = AXIS_LABEL[weakKey] + '·' + PROFILE.givenName;
        setText('pf-expert-compare-h4', PROFILE.givenName + ' 님의 강점 조합 — ' + AXIS_LABEL[topKey] + ' vs ' + AXIS_LABEL[weakKey]);
      }
    }
  }

  function render() {
    applyIdentity();
    applyScores();
    applyCombo();
    const rankedJobs = applyJobs();
    if (rankedJobs && rankedJobs.length) {
      const topJob = rankedJobs[0];
      const majorSelectEl2 = byId('majorSelect');
      const majorNameForTeaser = (majorSelectEl2 && majorSelectEl2.value && majorSelectEl2.value !== '__custom__') ? majorSelectEl2.value : '전공';
      setHTML('pf-cover-teaser', majorNameForTeaser + ' 안에서도 ' + PROFILE.givenName + ' 님의 프로파일은 <b>' + topJob.job.label_ko + '</b>에 가장 강하게 맞아요. 06·07번에서 학과 선택 로직과, 같은 학과 동기들과는 다른 나만의 직무 순위를 확인하세요.');
    } else {
      setText('pf-cover-teaser', '06·07번에서 학과 선택 로직과, 나에게 맞는 직무 순위를 확인하세요.');
    }
    applyJobSkill(rankedJobs);
    applyMajorGauge();
    applyGrowthAndDocs(rankedJobs);
    applyRoadmap(rankedJobs);
    if (typeof DCasComboBank !== 'undefined') {
      const d = DCasComboBank.getCombo(PROFILE.scores);
      applyEfficiency(d, rankedJobs);
      applyEmotional(d, rankedJobs);
      applyExpert(d, rankedJobs);
    }
    applyProfile81();
  }

  // SECTIONS가 이미 DOM에 꽂힌 뒤(render() 호출 후) 실행되도록,
  // 리포트의 기존 render() 호출부 바로 다음에 이 스크립트가 실행되게 배치합니다.
  global.DCasAdultEngine = { render: render, applyProfile81: applyProfile81, setProfile81Language: setProfile81Language, PROFILE: PROFILE };

})(typeof window !== 'undefined' ? window : globalThis);
