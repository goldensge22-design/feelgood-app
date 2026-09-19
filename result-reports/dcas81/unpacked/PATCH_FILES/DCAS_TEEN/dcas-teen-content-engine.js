/**
 * D-CAS 청소년 리포트 — 개인화 엔진 (한국어 temperament+strength만, 1차)
 *
 * ★★★ 스코프 안내 ★★★
 * - 한국어(ko) temperament·strength 섹션만 다룹니다.
 * - 영어(en) 미러링은 아직 안 했습니다 — 같은 패턴을 그대로 복제하면 되지만
 *   이번 패스에는 포함하지 않았습니다.
 * - dept·credit·jobs·maturity·learning·mission·selfcheck·parent·admissions·
 *   expert 등 나머지 12개 섹션은 미착수입니다.
 */
(function (global) {

  function byId(id) { return document.getElementById(id); }
  function setText(id, text) { const el = byId(id); if (el) el.textContent = text; }
  function setHTML(id, html) { const el = byId(id); if (el) el.innerHTML = html; }
  function hasBatchim(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }
  // 패치: 균형형(4축 최고-최저 차이 20 미만)을 평균 점수로 3단계(LOW/MID/HIGH) 세분화하는 공용 헬퍼.
  // LOW(평균 52 이하)/MID(52 초과~75 미만)/HIGH(75 이상). 비균형형이면 null.
  function getBalTier(s) {
    const vals = [s.P, s.A, s.S, s.Q];
    const max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    if (max - min >= 20) return null;
    const avg = (s.P + s.A + s.S + s.Q) / 4;
    if (avg <= 52) return 'LOW';
    if (avg < 75) return 'MID';
    return 'HIGH';
  }
  // tier별로 다른 문구를 고르는 공용 헬퍼 — variants = { LOW: ..., MID: ..., HIGH: ... }
  function balPick(tier, variants) { return variants[tier]; }

  function resolveProfile81Lang() {
    const requested = global.__DCAS_LANG__ || (typeof currentLang !== 'undefined' && currentLang) || document.documentElement.lang || 'ko';
    return (typeof DCasProfile81 !== 'undefined') ? DCasProfile81.normalizeLang(requested) : 'ko';
  }

  function ensureProfile81Note(sectionId, id, label, text, dir) {
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
    note.textContent = label + ' · ' + text;
  }

  function applyProfile81(PROFILE) {
    if (typeof DCasProfile81 === 'undefined') return null;
    const lang = resolveProfile81Lang();
    DCasProfile81.setLang(lang);
    const p81 = DCasProfile81.classify(PROFILE.scores, lang);
    global.__DCAS_PROFILE81__ = p81;
    const shellLang = (typeof currentLang !== 'undefined' && currentLang) || 'ko';
    const sfx = shellLang === 'en' ? '-en' : '';

    // 표지: 기존 상위 2축 조합 코드를 4축×3수준의 실제 81유형 코드로 교체한다.
    setText('pf-cover-code' + sfx, 'NO. ' + p81.code);
    setText('pf-cover-typename' + sfx, p81.title);

    // 기질 특성: 81유형 코드·예외 유형명·4축별 정적 문장을 모두 노출한다.
    setText('pf-herotag' + sfx, p81.labels.profile + ' · ' + p81.code);
    setText('pf-herotype' + sfx, p81.title);
    const temperament = byId('temperament');
    if (temperament) {
      let card = byId('pf-profile81-card' + sfx);
      if (!card) {
        card = document.createElement('div');
        card.id = 'pf-profile81-card' + sfx;
        card.className = 'card';
        const hero = temperament.querySelector('.hero-card');
        if (hero && hero.parentNode) hero.parentNode.insertBefore(card, hero.nextSibling);
        else temperament.insertBefore(card, temperament.firstChild);
      }
      card.dir = p81.dir;
      card.innerHTML = '<h4 style="margin:0 0 8px;font-size:14px;color:var(--navy);">' + p81.labels.profile + ' · ' + p81.code + '</h4>' +
        '<p style="margin:0 0 10px;font-size:13.5px;line-height:1.7;"><b>' + p81.title + '</b> — ' + p81.summary + '</p>' +
        '<div class="two-col">' + p81.fragments.map(function (f) {
          const cls = f.level === 'L' ? 'watch' : 'good';
          return '<div class="temp-block ' + cls + '"><b>' + f.axisLabel + ' · ' + f.levelLabel + '</b><p style="margin:6px 0 0;">' + f.text + '</p></div>';
        }).join('') + '</div>';
    }

    // 같은 점수를 추천식에 다시 가중하지 않고, 81유형을 지원 강도와 추천 이유에 추가 입력으로 사용한다.
    ensureProfile81Note('learning', 'pf-profile81-learning-note' + sfx, p81.labels.learning, p81.recommendations.learning, p81.dir);
    ensureProfile81Note('dept', 'pf-profile81-career-note' + sfx, p81.labels.career, p81.recommendations.career, p81.dir);
    ensureProfile81Note('jobs', 'pf-profile81-job-note' + sfx, p81.labels.job, p81.recommendations.job, p81.dir);
    return p81;
  }

  function setProfile81Language(lang, PROFILE) {
    if (typeof DCasProfile81 === 'undefined') return null;
    global.__DCAS_LANG__ = DCasProfile81.normalizeLang(lang);
    return applyProfile81(PROFILE);
  }

  function applyIdentity(PROFILE) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const toFix = [];
    let node;
    while ((node = walker.nextNode())) {
      if (/\{\{(GIVEN|FULLNAME_EN|GIVEN_EN)\}\}/.test(node.nodeValue)) toFix.push(node);
    }
    toFix.forEach(function (n) {
      n.nodeValue = n.nodeValue
        .replace(/\{\{GIVEN\}\}/g, PROFILE.fullName) // 청소년 리포트는 항상 "풀네임 님" 표기(성인용과 다름)
        .replace(/\{\{FULLNAME_EN\}\}/g, PROFILE.fullNameEn || PROFILE.fullName)
        .replace(/\{\{GIVEN_EN\}\}/g, PROFILE.fullNameEn || PROFILE.fullName);
    });
    if (/\{\{(GIVEN|FULLNAME_EN|GIVEN_EN)\}\}/.test(document.title)) {
      document.title = document.title
        .replace(/\{\{GIVEN\}\}/g, PROFILE.fullName)
        .replace(/\{\{FULLNAME_EN\}\}/g, PROFILE.fullNameEn || PROFILE.fullName)
        .replace(/\{\{GIVEN_EN\}\}/g, PROFILE.fullNameEn || PROFILE.fullName);
    }
    // t-meta — 언어별로 형식이 다름
    const genderLabel = PROFILE.genderKey === 'F' ? '여' : '남';
    const dateStr = PROFILE.testDate.y + '.' + String(PROFILE.testDate.m).padStart(2, '0') + '.' + String(PROFILE.testDate.d).padStart(2, '0');
    if (typeof currentLang !== 'undefined' && currentLang === 'ko') {
      setText('t-meta', genderLabel + ' · 만 ' + PROFILE.ageYears + '세 (' + PROFILE.gradeLabel + ') · 청소년 진로적성 트랙 · ' + dateStr);
      setText('pf-cover-meta', genderLabel + ' · 만 ' + PROFILE.ageYears + '세 · 검사일 ' + dateStr);
      if (typeof DCasTeenComboBank !== 'undefined') {
        const coverCombo = DCasTeenComboBank.getCombo(PROFILE.scores).combo;
        setText('pf-cover-code', 'NO. ' + coverCombo.code);
        setText('pf-cover-typename', coverCombo.heroType);
        const chipsEl0 = byId('pf-cover-chips');
        if (chipsEl0) chipsEl0.innerHTML = coverCombo.chips.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join('');
      }
    } else if (typeof currentLang !== 'undefined' && currentLang === 'en') {
      const genderEn = PROFILE.genderKey === 'F' ? 'Female' : 'Male';
      const dateEn = String(PROFILE.testDate.m).padStart(2,'0') + '/' + String(PROFILE.testDate.d).padStart(2,'0') + '/' + PROFILE.testDate.y;
      setText('t-meta', genderEn + ' · Age ' + PROFILE.ageYears + ' (' + (PROFILE.gradeLabelEn || PROFILE.gradeLabel) + ') · Teen Career-Aptitude Track · ' + dateEn);
      setText('pf-cover-meta-en', genderEn + ' · Age ' + PROFILE.ageYears + ' · Tested ' + dateEn);
      if (typeof global.DCasTeenComboBankEn !== 'undefined') {
        const coverComboEn = global.DCasTeenComboBankEn.getCombo(PROFILE.scores).combo;
        setText('pf-cover-code-en', 'NO. ' + coverComboEn.code);
        setText('pf-cover-typename-en', coverComboEn.heroType);
        const chipsEl0en = byId('pf-cover-chips-en');
        if (chipsEl0en) chipsEl0en.innerHTML = coverComboEn.chips.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join('');
      }
    }
  }

  function applyScores(PROFILE) {
    const s = PROFILE.scores;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const sfx = isEn ? '-en' : '';
    const AXIS_LABEL = isEn
      ? { P: 'Planning', A: 'Attention', S: 'Simultaneous', Q: 'Successive' }
      : { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
    ['P', 'A', 'S', 'Q'].forEach(function (k) {
      const el = byId('pf-radar-' + k + sfx);
      if (el) el.textContent = AXIS_LABEL[k] + ' ' + s[k] + '%';
      const bar = byId('pf-bar-' + k + sfx);
      if (bar) bar.style.width = s[k] + '%';
      setText('pf-barval-' + k + sfx, s[k] + '%');
    });
    const poly = byId('pf-radarpoly' + sfx);
    if (poly) {
      const RADAR_ANGLES = { P: 0, S: 90, Q: 180, A: 270 };
      const pts = ['P', 'S', 'Q', 'A'].map(function (k) {
        const norm = Math.max(0, Math.min(1, (s[k]) / 100));
        const r = 20 + norm * 75;
        const rad = (RADAR_ANGLES[k] * Math.PI) / 180;
        const x = 150 + r * Math.sin(rad), y = 150 - r * Math.cos(rad);
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      poly.setAttribute('points', pts);
    }

    // 패치(리팩터링): 언어별 isEn 삼항연산자 대신 DCasI18n 뱅크 조회로 전환.
    // 언어를 추가해도 이 함수는 한 글자도 안 바뀜 — dcas-i18n-bank.js에 언어 블록만 추가하면 됨.
    const lang = isEn ? 'en' : 'ko';
    const T = (typeof DCasI18n !== 'undefined') ? DCasI18n.get(lang) : null;
    if (T) {
      // 기질적 특징은 P/A/S/Q 네 축을 각각 상·중·하로 판정한다.
      // D-CAS 저장값은 0~100% 정답률이므로 160점 기준(85/120)을 53%/75%로 환산한다.
      function axisLevel(v) { return v >= 75 ? 'high' : (v >= 53 ? 'mid' : 'low'); }
      const pLevel = axisLevel(s.P), aLevel = axisLevel(s.A);
      const sLevel = axisLevel(s.S), qLevel = axisLevel(s.Q);
      const ranked4 = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
      const levelLabel = isEn ? {high:'High',mid:'Mid',low:'Low'} : {high:'상',mid:'중',low:'하'};
      const TEMP_AXIS = isEn ? {
        P:{label:'Planning',high:['Naturally structures goals and builds an action sequence before starting.','When conditions change, compare one or two alternatives before revising the plan.'],mid:['Can organize a goal and follow a clear plan when the task is concrete.','Defining the first action and a checkpoint makes execution more consistent.'],low:['Responds flexibly in the moment rather than relying on a fixed plan.','Use a short three-step plan and check off one completed step at a time.']},
        A:{label:'Attention',high:['Sustains concentration and stays with a chosen task until completion.','Planned breaks help prevent over-focus and fatigue.'],mid:['Maintains steady focus when the goal and duration are clear.','Short time blocks and visible finish points help on low-interest tasks.'],low:['Notices surrounding changes quickly and shifts attention readily.','Reduce competing stimuli and repeat short focus-and-break cycles.']},
        S:{label:'Simultaneous Processing',high:['Quickly integrates separate pieces of information into a whole pattern or meaning.','A brief detail check after grasping the whole helps reduce omissions.'],mid:['Moves between the whole picture and individual details depending on the task.','Sketching the overall structure first helps when information becomes complex.'],low:['Approaches information cautiously through concrete details rather than immediate synthesis.','Use diagrams, examples, or a completed model to make the whole structure visible first.']},
        Q:{label:'Successive Processing',high:['Comfortably follows order, rules, and step-by-step procedures with precision.','Set a time limit when reviewing steps so accuracy does not slow decisions too much.'],mid:['Handles tasks reliably when the sequence and rules are clearly presented.','A checklist helps maintain order in longer or more complex procedures.'],low:['Prefers flexible or nonlinear approaches over fixed procedural order.','Begin with two or three short steps and mark each completion visibly.']}
      } : {
        P:{label:'계획력',high:['목표를 구조화하고 실행 순서를 스스로 세운 뒤 시작하는 경향이 뚜렷해요.','상황이 바뀌면 대안 한두 가지를 비교한 뒤 계획을 조정하는 연습이 도움이 돼요.'],mid:['목표와 과제가 구체적이면 계획을 세워 안정적으로 진행하는 편이에요.','첫 행동과 중간 점검 시점을 미리 정하면 실행이 더 안정돼요.'],low:['고정된 계획보다 현재 상황에 맞춰 유연하게 반응하는 편이에요.','세 단계 이내의 짧은 계획을 만들고 하나씩 완료 표시해보세요.']},
        A:{label:'주의력',high:['선택한 활동에 집중을 오래 유지하고 끝까지 이어가는 경향이 뚜렷해요.','과몰입과 피로를 막기 위해 계획된 휴식 시간을 함께 두는 것이 좋아요.'],mid:['목표와 시간이 분명한 활동에서는 비교적 안정적으로 집중을 유지해요.','흥미가 낮은 활동은 짧은 시간 단위와 분명한 종료점을 정하면 좋아요.'],low:['주변 변화와 여러 자극을 빠르게 알아차리고 주의가 쉽게 이동하는 편이에요.','경쟁 자극을 줄이고 짧은 집중과 휴식을 반복하는 구조가 도움이 돼요.']},
        S:{label:'동시처리',high:['여러 정보를 빠르게 하나의 전체 구조나 의미로 통합하는 경향이 뚜렷해요.','전체를 파악한 뒤 세부 항목을 한 번 점검하면 누락을 줄일 수 있어요.'],mid:['과제에 따라 전체 그림과 세부 정보를 비교적 유연하게 오가는 편이에요.','정보가 복잡할 때 먼저 전체 구조를 간단히 그려보면 도움이 돼요.'],low:['정보를 바로 종합하기보다 구체적인 세부 내용부터 신중하게 접근하는 편이에요.','그림·도식·완성 예시로 전체 구조를 먼저 보여주면 이해가 쉬워져요.']},
        Q:{label:'순차처리',high:['순서와 규칙을 정확히 따라 단계적으로 처리하는 경향이 뚜렷해요.','절차 확인에 시간이 길어지지 않도록 검토 시간을 정해두면 좋아요.'],mid:['순서와 규칙이 분명한 활동은 비교적 안정적으로 수행하는 편이에요.','단계가 길어질 때 체크리스트를 사용하면 순서를 유지하는 데 도움이 돼요.'],low:['고정된 절차보다 유연하고 비선형적인 방식으로 접근하는 편이에요.','두세 단계의 짧은 순서부터 시작해 완료 여부를 눈에 보이게 표시해보세요.']}
      };
      function renderAxisTemper(k, level) {
        const d = TEMP_AXIS[k], pair = d[level];
        const feature = isEn ? 'Profile · ' : '특징 · ';
        const support = isEn ? 'Support point · ' : '지원 포인트 · ';
        return '<div class="temp-block good"><b>✓ ' + feature + d.label + ' (' + levelLabel[level] + ')</b><ul><li>' + pair[0] + '</li></ul></div>' +
          '<div class="temp-block watch"><b>△ ' + support + d.label + '</b><ul><li>' + pair[1] + '</li></ul></div>';
      }
      setText('pf-temp-adapt' + sfx, isEn
        ? 'Planning is ' + levelLabel[pLevel] + ' and Attention is ' + levelLabel[aLevel] + '; the descriptions below reflect both scores independently.'
        : '계획력은 ' + levelLabel[pLevel] + ', 주의력은 ' + levelLabel[aLevel] + ' 수준으로 각각의 특징을 나누어 해석했어요.');
      setText('pf-temp-mood' + sfx, isEn
        ? 'Simultaneous Processing is ' + levelLabel[sLevel] + ' and Successive Processing is ' + levelLabel[qLevel] + '; neither score is replaced by the other.'
        : '동시처리는 ' + levelLabel[sLevel] + ', 순차처리는 ' + levelLabel[qLevel] + ' 수준이며 두 축을 서로 대체하지 않고 각각 해석했어요.');
      setHTML('pf-tc-react' + sfx, renderAxisTemper('P', pLevel));
      setHTML('pf-tc-adapt' + sfx, renderAxisTemper('A', aLevel));
      setHTML('pf-tc-mood' + sfx, renderAxisTemper('S', sLevel));
      setHTML('pf-tc-think' + sfx, renderAxisTemper('Q', qLevel));

      // 패치: 11번 학습방안 과목별 전략 — 실제 최고축 기준으로 4과목 전부 교체
      // (4개 축이 균형형일 때는 특정 축을 단정하지 않고 균형형 전용 문구 사용)
      const isBalancedLearnSubj = (ranked4[0].v - ranked4[3].v) < 20;
      const balTierLearnSubj = getBalTier(s);
      const topKeyLearn = isBalancedLearnSubj ? ('BAL_' + balTierLearnSubj) : ranked4[0].k;
      setHTML('pf-learn-kor' + sfx, T.learningSubject.kor[topKeyLearn]);
      setHTML('pf-learn-math' + sfx, T.learningSubject.math[topKeyLearn]);
      setHTML('pf-learn-eng' + sfx, T.learningSubject.eng[topKeyLearn]);
      setHTML('pf-learn-sci' + sfx, T.learningSubject.sci[topKeyLearn]);

      // 패치: 14번 부모님가이드 — "계획" 전제 고정 문구를 실제 약점축 기준으로 교체
      // (균형형일 때는 weakKeyLearn도 'BAL'로 통일)
      const weakKeyLearn = isBalancedLearnSubj ? ('BAL_' + balTierLearnSubj) : ranked4[3].k;
      setText('pf-parent-doctag2' + sfx, T.parentGuide.planTag[weakKeyLearn]);
      setText('pf-parent-docbody2' + sfx, T.parentGuide.planBody[weakKeyLearn]);
      setHTML('pf-parent-doctip2' + sfx, '<b>' + (isEn?'Tip':'사용팁') + '</b> ' + T.parentGuide.planTip[weakKeyLearn]);
      setText('pf-parent-mistake3' + sfx, T.parentGuide.mistake3[weakKeyLearn]);
      setText('pf-parent-homehelp' + sfx, T.parentGuide.homeHelp[topKeyLearn]);

      // 패치: 01번 첫화면 후크 문항 — 1번은 최고축(강점), 2번은 최약축(보완영역)으로 분리해
      // 같은 최고축에 둘 다 매핑돼 서로 모순되던 문제(예: "계획 완벽" + "계획 막막") 해결
      setText('pf-hook1' + sfx, T.hook[1][topKeyLearn]);
      setText('pf-hook2' + sfx, T.hook[2][weakKeyLearn]);
    }
  }

  function applyCombo(PROFILE) {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const bank = isEn ? global.DCasTeenComboBankEn : global.DCasTeenComboBank;
    if (typeof bank === 'undefined') return;
    const g = bank.getCombo(PROFILE.scores);
    const combo = g.combo;
    const nameForVars = isEn ? (PROFILE.fullNameEn || PROFILE.fullName) : PROFILE.fullName;
    const vars = { weak: g.weakAxisLabel, name: nameForVars };
    const sfx = isEn ? '-en' : '';
    setText('pf-herotag' + sfx, (isEn ? 'Cognitive Compass · ' : '인지 나침반 · ') + combo.code);
    setText('pf-herotype' + sfx, combo.heroType);
    setText('pf-oneliner' + sfx, bank.fill(combo.oneliner, vars));
    setHTML('pf-chips' + sfx, combo.chips.map(function (c) { return '<span class="chip">' + c + '</span>'; }).join(''));
    const figureCard = byId('pf-figurecard' + sfx);
    if (figureCard) {
      if (combo.figure) {
        figureCard.style.display = '';
        const josaKo = hasBatchim(combo.figure.name) ? '은' : '는';
        const heading = isEn ? '🌟 A Kindred Spirit' : '🌟 이런 인물과 닮은 점이 있어요';
        const body = isEn
          ? combo.figure.name + ' ' + bank.fill(combo.figure.why, { name: nameForVars })
          : combo.figure.name + josaKo + ' ' + bank.fill(combo.figure.why, { name: nameForVars });
        figureCard.innerHTML = '<h4>' + heading + '</h4><p>' + body + '</p>';
      } else {
        // 패치: 균형형(성장/전략탐색 구간)에서는 인물 비교를 아예 표시하지 않음 — 기존 기본 문구가 남지 않도록 완전히 비움
        figureCard.style.display = 'none';
        figureCard.innerHTML = '';
      }
    }
    // 강점 키워드 매핑표 — 4축 전체를 강점축 우선 정렬로 재구성
    const s = PROFILE.scores;
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const AXIS_LABEL = bank.AXIS_LABEL;
    const strengthTable = byId('pf-strengthtable' + sfx);
    if (strengthTable) {
      const KW_STRONG = isEn
        ? { P:'Strategic execution · Initiative', A:'Sustained focus', S:'Integrative thinking · Systems view', Q:'Procedural rigor · Attention to detail' }
        : { P:'전략적 실행력·주도성', A:'몰입 지속력', S:'통합적 사고·시스템 이해', Q:'절차적 정교함·꼼꼼함' };
      const growLabel = isEn ? ' (growing)' : ' (보완중)';
      // 패치: 4개 축이 사실상 동점(균형형)일 때도 배열 순서상 상위 2개(계획력·주의력)를 "강점"으로,
      // 마지막(순차처리)을 "보완중"으로 단정하던 것을 수정 — 균형형에서는 특정 축을 강점/약점으로 가르지 않음
      const isBalancedTable = (ranked[0].v - ranked[3].v) < 20;
      const balTierTable = getBalTier(s);
      const balancedKw = isEn
        ? balPick(balTierTable, { LOW:'Foundation-building · all areas', MID:'Balanced across all areas', HIGH:'Balanced · high, integrated ability' })
        : balPick(balTierTable, { LOW:'기초역량 다지기 · 전영역', MID:'균형 발달 · 상황별 유연 활용', HIGH:'균형 발달 · 고역량 통합 활용' });
      const balancedExample = isEn
        ? balPick(balTierTable, { LOW:'"completed a short routine step by step"', MID:'"adapts approach to fit the situation"', HIGH:'"integrates multiple approaches for complex tasks"' })
        : balPick(balTierTable, { LOW:'"짧은 루틴을 하나씩 끝까지 완료"', MID:'"상황에 맞게 접근 방식을 유연하게 전환"', HIGH:'"복합적인 과제에서 여러 접근을 통합해 활용"' });
      strengthTable.innerHTML = ranked.map(function (r, i) {
        if (isBalancedTable) {
          return '<tr><td>' + AXIS_LABEL[r.k] + ' ' + r.v + '%</td><td>' + balancedKw + '</td><td>' + balancedExample + '</td></tr>';
        }
        const suffix = (i === ranked.length - 1) ? growLabel : '';
        const isStrong = (i <= 1);
        const kw = isStrong ? KW_STRONG[r.k] : bank.WEAK_KW[r.k];
        // 패치: 3번째 열("서술 예시 단어")이 항상 "-"였던 것을 실제 강점/보완 상태에 맞는 예시 문구로 대체
        const example = bank.EXAMPLE_PHRASE ? bank.EXAMPLE_PHRASE[r.k][isStrong ? 'strong' : 'weak'] : '-';
        return '<tr><td>' + AXIS_LABEL[r.k] + ' ' + r.v + '%' + suffix + '</td><td>' + kw + '</td><td>' + example + '</td></tr>';
      }).join('');
    }

    // 패치: "지원서류 활용팩"(세특/자율진로활동/Common App/교사추천서/활동기록요약) 5개 카드가
    // 이름만 치환되고 본문은 항상 "동시처리+계획력(S+P)" 전제로 고정돼 있던 문제를 실제 최고축 기준으로 교체
    // (4개 축이 사실상 동점인 균형형 프로파일에서는 특정 축을 임의로 고르지 않고 별도 균형형 문구 사용)
    const isBalancedForDocs = (ranked[0].v - ranked[3].v) < 20;
    const balTierDocs = getBalTier(s);
    applyDocCardsTeen(isBalancedForDocs ? ('BAL_' + balTierDocs) : ranked[0].k, nameForVars, isEn);
  }

  function applyDocCardsTeen(topKey, name, isEn) {
    const sfx = isEn ? '-en' : '';

    const TEUK_KO = {
      P: '"[활동/과제명]에서 목표까지 남은 기간을 여러 단계로 나누어 계획을 세움(S). 이를 바탕으로 [구체적 실행계획]을 스스로 수립하여(T) 매 단계마다 진행 상황을 점검하며 팀을 주도적으로 이끎(A). 계획과 실제 진행의 차이를 스스로 파악해 일정을 조정하는 성장을 보임(R).'  + '"',
      A: '"[활동/과제명]에서 하나의 문제를 오랜 시간 집중력을 잃지 않고 끝까지 파고들어 원인을 규명함(S). 이를 바탕으로 [구체적 실행계획]을 스스로 수립하여(T) 팀의 논의가 흐트러질 때도 몰입을 유지하며 완수함(A). 짧은 휴식과 몰입을 번갈아 활용하는 방법을 스스로 개발하는 성장을 보임(R)."',
      S: '"[활동/과제명]에서 문제 상황을 전체적으로 조망하여 핵심을 빠르게 파악함(S). 이를 바탕으로 [구체적 실행계획]을 스스로 수립하여(T) 팀을 주도적으로 이끌며 각 단계를 순서대로 점검해 완수함(A). 결과물의 완성도를 높이기 위해 [절차 확인 방법]을 스스로 개발하는 성장을 보임(R)."',
      Q: '"[활동/과제명]에서 문제 상황을 순서대로 하나씩 짚어가며 놓치는 부분 없이 확인함(S). 이를 바탕으로 [구체적 실행계획]을 스스로 수립하여(T) 각 단계를 차례로 점검해 완수함(A). 결과물의 완성도를 높이기 위해 [절차 확인 방법]을 스스로 개발하는 성장을 보임(R)."',
      BAL_LOW: '"[활동/과제명]에서 계획 세우기·정보 정리·순서 확인 등 여러 방식을 하나씩 짧게 시도해봄(S). [구체적 실행계획]을 선생님·선배의 도움을 받아 함께 수립하여(T) 작은 단위로 나누어 꾸준히 완수해감(A). 짧은 단계를 하나씩 완료하는 경험을 반복하며 기초 역량을 쌓는 성장을 보임(R)."',
      BAL_MID: '"[활동/과제명]에서 상황에 따라 계획을 세우거나(S), 정보를 종합하거나, 순서를 지키는 등 여러 방식을 유연하게 오가며 접근함(S). 이를 바탕으로 [구체적 실행계획]을 스스로 수립하여(T) 팀 상황에 맞춰 역할을 조정해가며 완수함(A). 매번 다른 접근이 필요한 과제에서도 적응력 있게 대응하는 성장을 보임(R)."',
      BAL_HIGH: '"[활동/과제명]에서 계획 수립·정보 종합·절차 점검 등 여러 방식을 상황에 맞게 통합적으로 활용함(S). [구체적 실행계획]을 스스로 수립하여(T) 팀 전체를 이끌며 여러 단계가 얽힌 복합적인 과제를 완수함(A). 서로 다른 접근 방식을 유기적으로 연결해 결과물의 완성도를 높이는 심화된 성장을 보임(R)."'
    };
    const JINRO_KO = {
      P: '"저는 새로운 문제를 마주했을 때 목표까지의 과정을 단계별로 계획해 하나씩 실행해나가는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 [구체적 행동]을 했고, 계획이 흔들릴 때도 다시 일정을 조정하는 법을 익혀 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      A: '"저는 새로운 문제를 마주했을 때 하나에 오래 몰입해 끝까지 파고드는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 [구체적 행동]을 했고, 그 과정에서 짧은 휴식을 끼워 넣는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      S: '"저는 새로운 문제를 마주했을 때 전체 흐름을 먼저 파악한 뒤 구체적인 실행 계획을 세우는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 [구체적 행동]을 했고, 그 과정에서 순서를 지키는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      Q: '"저는 새로운 문제를 마주했을 때 순서를 하나씩 짚어가며 차근차근 풀어나가는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 [구체적 행동]을 했고, 그 과정에서 전체 흐름을 먼저 그려보는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      BAL_LOW: '"저는 새로운 문제를 마주했을 때 아직 저만의 방식을 찾아가는 중이라, 계획 세우기·정보 정리·순서 확인 등 여러 방법을 하나씩 시도해보는 편입니다. [활동명]에서도 짧은 단위로 나누어 하나씩 완료해봤고, 그 과정에서 꾸준히 반복하는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      BAL_MID: '"저는 새로운 문제를 마주했을 때 상황에 맞게 계획을 세우거나, 몰입하거나, 전체를 조망하거나, 순서를 지키는 등 여러 방식을 유연하게 활용하는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 [구체적 행동]을 했고, 그 과정에서 한 가지 방식만 고집하지 않는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."',
      BAL_HIGH: '"저는 새로운 문제를 마주했을 때 계획 수립·정보 종합·절차 점검 등 여러 방식을 상황에 맞게 통합적으로 활용하는 것을 좋아합니다. [활동명]에서 이러한 강점을 발휘해 복합적인 [구체적 행동]을 이끌었고, 그 과정에서 여러 접근을 유기적으로 연결하는 것의 중요성을 깨달아 [보완 노력]을 통해 완성도를 높였습니다. 이 경험은 저에게 [배운 점 한 문장]을 알려주었습니다."'
    };
    const COMMONAPP_EN = {
      P: '"I\'ve always been drawn to breaking a big goal into a clear sequence of steps before I start. When I led [activity], I mapped out a timeline, checked my progress against it regularly, and adjusted the plan when things didn\'t go as expected. Along the way, I learned that a plan is only useful if you\'re willing to revise it — a discipline that has made my ideas not just ambitious, but achievable."',
      A: '"I\'ve always been drawn to staying with one hard problem until I\'ve actually solved it. When I led [activity], I kept working through a difficult issue long after others might have moved on, and pushed it to completion. Along the way, I learned to pair that focus with short breaks so the intensity didn\'t burn me out — a discipline that has made my ideas not just ambitious, but achievable."',
      S: '"I\'ve always been drawn to seeing the whole picture before diving into details. When I led [activity], I quickly synthesized scattered information into a clear plan, then broke it down into concrete steps I could execute and track. Along the way, I learned to slow down and verify each step — a discipline that has made my ideas not just ambitious, but achievable."',
      Q: '"I\'ve always been drawn to working through a problem step by step, in order, without skipping ahead. When I led [activity], I broke the work into a clear sequence and checked off each stage before moving to the next. Along the way, I learned to zoom out and sketch the bigger picture first — a discipline that has made my ideas not just ambitious, but achievable."',
      BAL_LOW: '"I\'m still finding my own way of approaching problems, so I try a mix of methods — planning ahead, organizing information, or working step by step — depending on what feels doable. When I led [activity], I broke things into small pieces and finished them one at a time. Along the way, I learned that repeating small completed steps builds real progress — a discipline that has made my ideas not just ambitious, but achievable."',
      BAL_MID: '"I\'ve always been drawn to switching between approaches depending on what a problem needs — planning ahead, digging in and focusing, stepping back to see the whole picture, or working through steps in order. When I led [activity], I moved between these styles as the situation changed, and pulled it all together into one outcome. Along the way, I learned that not locking into a single method is itself a strength — a discipline that has made my ideas not just ambitious, but achievable."',
      BAL_HIGH: '"I\'ve always been drawn to combining planning, synthesis, and careful follow-through depending on what a complex problem calls for. When I led [activity], I integrated multiple approaches to manage several moving parts at once, and brought them together into one coherent outcome. Along the way, I learned that weaving different methods together is itself a strength — a discipline that has made my ideas not just ambitious, but achievable."'
    };
    const TEACHER_KO = {
      P: '" 학생은 프로젝트나 과제를 시작할 때 전체 일정을 미리 계획하고 단계별로 실행하는 능력이 뛰어납니다. 계획이 틀어져도 스스로 다시 조정하는 주도성이 강점이며, 최근에는 실행 과정을 꼼꼼히 기록하는 습관도 함께 발전시키고 있습니다."',
      A: '" 학생은 하나의 과제에 오래 집중해 끝까지 파고드는 몰입력이 뛰어납니다. 어려운 문제도 포기하지 않고 끝까지 해결하려는 태도가 강점이며, 최근에는 적절한 휴식을 배분하는 습관도 함께 발전시키고 있습니다."',
      S: '" 학생은 프로젝트나 과제에서 전체 상황을 빠르게 파악해 구조화하는 능력이 뛰어납니다. 스스로 계획을 세우고 실행하는 주도성이 강점이며, 최근에는 절차를 꼼꼼히 점검하는 습관도 함께 발전시키고 있습니다."',
      Q: '" 학생은 절차를 순서대로 하나씩 꼼꼼히 점검하며 완수하는 능력이 뛰어납니다. 맡은 일을 빠짐없이 챙기는 성실함이 강점이며, 최근에는 전체 그림을 먼저 그려보는 습관도 함께 발전시키고 있습니다."',
      BAL_LOW: '" 학생은 아직 특정 방식을 강점으로 굳히기보다, 계획 세우기·정리하기·순서 확인하기 등 여러 방법을 하나씩 시도해보는 성실한 태도를 보입니다. 짧은 단위로 나누어 꾸준히 완료하는 습관이 강점이며, 최근에는 작은 성공 경험을 스스로 쌓아가는 모습도 보이고 있습니다."',
      BAL_MID: '" 학생은 특정 방식에 치우치지 않고, 상황에 따라 계획을 세우거나 몰입하거나 전체를 조망하거나 순서를 지키는 등 여러 방식을 유연하게 활용하는 능력이 뛰어납니다. 과제 성격에 맞춰 접근 방식을 바꾸는 적응력이 강점이며, 최근에는 자신에게 맞는 방식을 스스로 찾아가는 습관도 함께 발전시키고 있습니다."',
      BAL_HIGH: '" 학생은 계획 수립·정보 종합·절차 점검 등 여러 방식을 상황에 맞게 안정적으로 통합해 활용하는 능력이 뛰어납니다. 복합적인 과제에서도 흔들림 없이 여러 역량을 함께 발휘하는 것이 강점이며, 최근에는 관심 분야의 심화 도전에도 적극적으로 나서고 있습니다."'
    };
    const TEACHER_EN = {
      P: 'shows a strong ability to break big goals into a clear plan and carry it out step by step. Initiative in adjusting the plan when circumstances change is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of documenting progress carefully.',
      A: 'shows a strong ability to stay with a difficult problem until it\'s genuinely solved. Persistence in pushing a task through to completion is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of pacing that focus with short breaks.',
      S: 'shows a strong ability to quickly grasp and structure the overall situation in projects and assignments. Initiative in independently planning and executing is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of carefully checking each procedural step.',
      Q: 'shows a strong ability to work through tasks step by step without missing details. Reliability in following a process from start to finish is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of stepping back to see the bigger picture.',
      BAL_LOW: 'is still building a personal approach, trying a mix of planning, organizing, and step-by-step methods rather than one fixed style. Persistence in completing small tasks one at a time is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of stacking up small successful completions.',
      BAL_MID: 'shows a strong ability to switch between approaches depending on what a task needs — planning ahead, staying focused, seeing the big picture, or following steps in order. Flexibility in not locking into a single method is a clear strength, and ' + '{{N}}' + ' has recently also been building the habit of noticing which approach fits a given situation best.',
      BAL_HIGH: 'shows a strong ability to stably integrate planning, synthesis, and procedural care depending on what a task needs. Handling several demands at once without losing composure is a clear strength, and ' + '{{N}}' + ' has recently also been taking on deeper challenges in areas of interest.'
    };
    const ACTIVITY1_KO = {
      P: '목표까지의 과정을 단계별로 계획하고 진행 상황을 점검하며 완수, 일정 관리 역량을 체계화함',
      A: '하나의 과제에 오래 몰입해 끝까지 파고들어 완수, 지속적인 집중력을 입증함',
      S: '팀 프로젝트를 기획·설계하고 단계별 실행 계획을 수립해 완수, 전체 프로세스를 체계화함',
      Q: '절차를 순서대로 하나씩 점검하며 완수, 꼼꼼한 실행력을 체계화함',
      BAL_LOW: '짧은 단위 과제를 하나씩 끝까지 완료, 꾸준한 기초 실행력을 쌓아감',
      BAL_MID: '상황에 맞게 계획·몰입·종합·절차 등 여러 접근 방식을 유연하게 오가며 프로젝트를 완수, 상황 대응력을 입증함',
      BAL_HIGH: '여러 접근 방식을 통합해 복합적인 프로젝트를 안정적으로 완수, 통합적 실행력을 입증함'
    };
    const ACTIVITY1_EN = {
      P: 'Planned out milestones and tracked progress step by step to complete a project on schedule.',
      A: 'Stayed immersed in a challenging task until fully resolved, demonstrating sustained focus.',
      S: 'Planned and structured a team project end-to-end, translating strategy into a step-by-step execution plan.',
      Q: 'Worked through each step in order and completed the process with careful attention to detail.',
      BAL_LOW: 'Completed short, manageable tasks one step at a time, building a steady basic foundation.',
      BAL_MID: 'Flexibly switched between planning, focus, big-picture thinking, and step-by-step execution to complete a project, demonstrating strong situational adaptability.',
      BAL_HIGH: 'Integrated multiple approaches to complete a complex, multi-part project, demonstrating strong integrative execution.'
    };
    const TEUK_EN = {
      P: '"In [activity/project], broke down the timeline into clear milestones (Situation). Independently developed [a concrete execution plan] (Task), tracked progress against the plan and adjusted schedules when needed (Action). Grew by learning to revise a plan without losing sight of the goal (Result)."',
      A: '"In [activity/project], stayed with a difficult issue long after others might have stopped (Situation). Independently developed [a concrete execution plan] (Task), maintained focus through to completion even when the work got repetitive (Action). Grew by learning to pair deep focus with short breaks to sustain it (Result)."',
      S: '"In [activity/project], quickly grasped the overall problem by viewing it holistically (Situation). Independently developed [a concrete execution plan] (Task), took the lead on the team and checked each stage in order to completion (Action). Grew by developing [a specific verification method] to raise the quality of the final result (Result)."',
      Q: '"In [activity/project], worked through a complex problem step by step without skipping ahead (Situation). Independently developed [a concrete execution plan] (Task), checked each stage in order before moving to the next (Action). Grew by developing [a specific verification method] to catch details others might miss (Result)."',
      BAL_LOW: '"In [activity/project], tried a few different methods — planning, organizing, checking steps — one at a time to see what worked (Situation). Developed [a concrete execution plan] with guidance from a teacher or senior peer (Task), and completed it in small, manageable pieces (Action). Grew by building confidence through repeated small completions (Result)."',
      BAL_MID: '"In [activity/project], approached the problem by switching between planning, focusing in, and seeing the big picture as the situation called for it (Situation). Independently developed [a concrete execution plan] (Task), adjusted roles and methods as the team\'s needs changed to see it through (Action). Grew by learning that staying flexible about method is itself a strength (Result)."',
      BAL_HIGH: '"In [activity/project], integrated planning, synthesis, and careful follow-through to handle a complex, multi-part problem (Situation). Independently developed [a concrete execution plan] (Task), led the team through several interdependent stages at once (Action). Grew by learning to weave different methods together for a more complete result (Result)."'
    };

    if (!isEn) {
      setText('pf-doc-teuk-body', TEUK_KO[topKey]);
      setText('pf-doc-jinro-body', JINRO_KO[topKey]);
      setText('pf-doc-commonapp-ko-body', COMMONAPP_EN[topKey]);
      setText('pf-doc-teacher-body', '"' + name + TEACHER_KO[topKey].slice(1));
      setText('pf-doc-activity1line-body', '');
      const act1El = byId('pf-doc-activity1line-body');
      if (act1El) act1El.innerHTML = 'KO — "' + ACTIVITY1_KO[topKey] + '"<br>EN — "' + ACTIVITY1_EN[topKey] + '"';
    } else {
      setText('pf-doc-teuk-body-en', TEUK_EN[topKey]);
      setText('pf-doc-commonapp-en-body', COMMONAPP_EN[topKey]);
      setText('pf-doc-teacher-body-en', '"' + name + ' ' + TEACHER_EN[topKey].replace('{{N}}', name) + '"');
      setText('pf-doc-activity1line-body-en', '"' + ACTIVITY1_EN[topKey] + '"');
    }
  }

  function levelLabel(v) {
    if (v >= 75) return '상';
    if (v >= 53) return '중';
    return '하';
  }

  function applyEfficiency(PROFILE) {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const bank = isEn ? global.DCasTeenPatternBankEn : global.DCasTeenPatternBank;
    if (typeof bank === 'undefined') return;
    const s = PROFILE.scores;
    const patterns = bank.pickFourPatterns(s);
    const sfx = isEn ? '-en' : '';
    const AXIS_LABEL_EFF = isEn ? bank.AXIS_LABEL : { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
    const container = byId('pf-eff-cards' + sfx);
    if (container) {
      const hintLabel = isEn ? 'Sound familiar?' : '이런 경험 있나요?';
      const whyLabel = isEn ? 'Why it happens' : '왜 그럴까';
      const basedLabel = isEn ? 'Based on your scores: ' : '내 점수 기준: ';
      container.innerHTML = patterns.map(function (p) {
        // 패치: 카드가 축 이름·조합만 캔드 텍스트로 보여주던 것에, 실제 두 축의 정답률을 덧붙여
        // "내 점수 기준"으로 왜 이 패턴이 뽑혔는지 근거를 명시
        const scoreChip = p.axisScores.map(function (as) { return AXIS_LABEL_EFF[as.k] + ' ' + as.v + '%'; }).join(isEn ? ' / ' : '·');
        return '<div class="diag-card"><h4>' + p.pattern.title + '</h4>' +
          '<p style="margin:2px 0 8px;font-size:12.5px;color:var(--muted);">' + basedLabel + scoreChip + '</p>' +
          '<p class="sym"><b>' + hintLabel + '</b> ' + p.pattern.sym + '</p>' +
          '<p class="rx"><b>' + whyLabel + '</b> ' + p.pattern.rx + '</p></div>';
      }).join('');
    }
  }

  function applyOpinionAndEmotional(PROFILE) {
    if (typeof DCasTeenComboBank === 'undefined') return;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const bank = isEn ? global.DCasTeenComboBankEn : DCasTeenComboBank;
    if (typeof bank === 'undefined') return;
    const s = PROFILE.scores;
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const top2 = ranked.slice(0,2), weak = ranked[3];
    // 패치: 4개 축 점수가 사실상 동일할 때(최고-최저 차이 20 미만) 항상 "계획력·주의력 강점/순차처리 약점"으로
    // 임의 결정되던 것을 콤보뱅크의 균형형(BAL) 판정 기준과 동일하게 맞춰 "균형형" 서술로 분기
    const isBalancedProfile = (ranked[0].v - ranked[3].v) < 20;
    const balTier = getBalTier(s);
    const AXIS_LABEL = bank.AXIS_LABEL;
    const sfx = isEn ? '-en' : '';
    const nameForText = isEn ? (PROFILE.fullNameEn || PROFILE.fullName) : PROFILE.fullName;

    // 04 검사자총평 — 패치1: 정성적 서술만 있던 것을 4개 축 실제 점수·격차까지 명시
    // 패치2: "상황을 종합적으로 판단...", "반복·절차 중심 과제에서 인내 필요" 등 해석 문장이
    //        실제 강점/약점 축과 무관하게 고정돼 있던 것을 축별 의미로 분기
    // 패치3: 4개 축 점수가 사실상 동일(균형형)할 때는 특정 축을 강점/약점으로 단정하지 않음
    const STRENGTH_DESC_KO = { P:'목표를 세우고 계획대로 실행', A:'하나의 과제에 오래 집중해 몰입', S:'여러 정보를 종합해 상황을 판단', Q:'순서를 지키며 절차대로 진행' };
    const WEAKNESS_DESC_KO = { P:'계획을 세우고 그대로 지키는 것', A:'하나의 과제에 오래 집중을 유지하는 것', S:'여러 정보를 한 번에 종합해 전체 그림을 그리는 것', Q:'순서를 지키며 절차대로 진행하는 것' };
    const STRENGTH_DESC_EN = { P:'setting goals and executing according to plan', A:'staying deeply focused on one task for a long time', S:'synthesizing information to judge situations holistically', Q:'following procedures in order, step by step' };
    const WEAKNESS_DESC_EN = { P:'making a plan and sticking to it', A:'sustaining focus on one task for a long time', S:'synthesizing scattered information into a big picture at once', Q:'following a procedure in order, step by step' };
    // 패치: 검사자총평의 "처방" 문장이 약한 축과 무관하게 항상 "단계형 체크리스트와 짧고 반복적인
    // 절차 훈련"으로 고정돼 있던 것을 실제 약점축에 맞는 전략으로 교체
    const STRATEGY_RX_KO = {
      P: '구체적인 목표를 세우고 그 목표를 작은 단계로 쪼개 하나씩 점검하는 계획·목표 설정 훈련',
      A: '25분 몰입 + 5분 휴식처럼 짧은 몰입 구간을 반복하고, 방해 자극을 미리 치워두는 몰입·방해자극 관리 훈련',
      S: '마인드맵이나 그림으로 정보를 한눈에 펼쳐보는 시각화·전체 구조화 훈련',
      Q: '순서표와 체크리스트를 만들어 각 단계를 빠짐없이 확인하는 절차 훈련'
    };
    const STRATEGY_RX_EN = {
      P: 'setting a concrete goal and breaking it into small steps to check off one at a time',
      A: 'repeating short focus blocks (e.g., 25 minutes on, 5 minutes off) and clearing away distractions in advance',
      S: 'sketching information out visually — mind maps or diagrams — to see the whole picture at a glance',
      Q: 'building a sequence chart or checklist and confirming each step in order'
    };
    const opinionCard = isEn ? byId('pf-opinion-en') : document.querySelector('#opinion .card p');
    if (opinionCard) {
      const gap = top2[1].v - weak.v;
      if (isEn) {
        const AXIS_LABEL_EN_FULL = { P:'Planning', A:'Attention', S:'Simultaneous processing', Q:'Successive processing' };
        const base = nameForText + '\'s cognitive profile shows ' +
          AXIS_LABEL_EN_FULL.P + ' ' + s.P + '%, ' + AXIS_LABEL_EN_FULL.A + ' ' + s.A + '%, ' + AXIS_LABEL_EN_FULL.S + ' ' + s.S + '%, ' + AXIS_LABEL_EN_FULL.Q + ' ' + s.Q + '%. ';
        opinionCard.textContent = isBalancedProfile
          ? base + balPick(balTier, {
              LOW: 'Accuracy is fairly even across all four domains, without one clearly ahead of the others. Rather than a fixed strength, this is a starting point where all four areas can grow together — short, repeated practice and small completed tasks in each domain will build a steady foundation.',
              MID: 'Accuracy is fairly even across all four domains, without one or two clearly dominant yet. Rather than settling into one fixed strength or weakness, this is a stage for trying out different approaches and noticing which strategies actually work best for you.',
              HIGH: 'Accuracy is evenly high across all four domains. This reflects an ability to draw on any of the four styles reliably and combine them as needed, which suits complex, multi-step tasks and taking on deeper expertise in an area of interest.'
            })
          : base + 'Accuracy is highest in ' + AXIS_LABEL[top2[0].k].toLowerCase() + ' (' + top2[0].v + '%) and ' + AXIS_LABEL[top2[1].k].toLowerCase() + ' (' + top2[1].v + '%), reflecting strength in ' + STRENGTH_DESC_EN[top2[0].k] + ' and ' + STRENGTH_DESC_EN[top2[1].k] + '. ' +
          AXIS_LABEL[weak.k] + ' (' + weak.v + '%) is comparatively lower — a ' + gap + '-percentage-point gap from the next-lowest strength — so ' + WEAKNESS_DESC_EN[weak.k] + ' may take a bit more conscious effort. This is an area that can keep improving with training up to around age 25, so ' + STRATEGY_RX_EN[weak.k] + ' is recommended. Overall, this is a cognitive profile with a clear ' + AXIS_LABEL[top2[0].k].toLowerCase() + '×' + AXIS_LABEL[top2[1].k].toLowerCase() + ' strength combination — well suited to self-directed, project-based learning and career environments.';
      } else {
        const top2Str = AXIS_LABEL[top2[0].k] + (hasBatchim(AXIS_LABEL[top2[0].k]) ? '과' : '와') + ' ' + AXIS_LABEL[top2[1].k];
        const weakLabel = AXIS_LABEL[weak.k];
        const base = nameForText + ' 님의 인지 프로파일은 계획력 ' + s.P + '%·주의력 ' + s.A + '%·동시처리 ' + s.S + '%·순차처리 ' + s.Q + '%로 나타났습니다. ';
        opinionCard.textContent = isBalancedProfile
          ? base + balPick(balTier, {
              LOW: '4개 영역의 정답률이 비교적 고르게 나타나, 특정 영역이 강점으로 두드러지지는 않습니다. 지금은 네 영역의 기초 역량을 함께 다지는 단계로, 짧고 반복적인 루틴을 통해 작은 완료 경험을 쌓아가는 것이 도움이 됩니다.',
              MID: '4개 영역의 정답률이 비교적 고르게 나타나, 특정 방식을 강점이나 약점으로 단정하기보다는 여러 접근을 시도하며 자신에게 효과적인 전략을 찾아가는 단계로 볼 수 있습니다. 4개 영역 중 관심 있는 영역을 자유롭게 집중 훈련 대상으로 선택해도 좋은 유형입니다.',
              HIGH: '4개 영역의 정답률이 고르게 높게 나타나, 네 영역을 안정적으로 활용하고 상황에 맞게 통합할 수 있는 프로파일입니다. 여러 단계가 얽힌 복합 과제나 관심 분야의 전문성을 확장하는 도전을 권장합니다.'
            })
          : base + '이 중 ' + AXIS_LABEL[top2[0].k] + '(' + top2[0].v + '%)과 ' + AXIS_LABEL[top2[1].k] + '(' + top2[1].v + '%)의 정답률이 가장 높게 나타나, ' + STRENGTH_DESC_KO[top2[0].k] + '하는 힘과 ' + STRENGTH_DESC_KO[top2[1].k] + '하는 힘이 뛰어난 학습자입니다. ' +
          '반면 ' + weakLabel + '(' + weak.v + '%)' + (hasBatchim(weakLabel)?'은':'는') + ' 다음으로 낮은 영역과도 ' + gap + '%p 차이로 상대적으로 낮아, ' + WEAKNESS_DESC_KO[weak.k] + '에서는 조금 더 의식적인 훈련이 도움이 될 수 있습니다. 이는 훈련을 통해 25세까지도 꾸준히 개선될 수 있는 영역이므로, ' + STRATEGY_RX_KO[weak.k] + '을 권장합니다. ' +
          '전반적으로 ' + top2Str + ' 조합이 뚜렷한 강점인 인지 프로파일로, 자기주도적 프로젝트형 학습·진로 환경에서 강점이 극대화될 유형입니다.';
      }
    }

    // 05 정서적 지지
    // 패치: 4개 축이 균형형일 때도 top2[0]/[1]이 항상 계획력·주의력으로 고정되어 그대로
    // "강점"으로 노출되던 것을 수정 — 균형형에서는 특정 2축을 강점으로 단정하지 않음
    if (isBalancedProfile) {
      if (isEn) {
        setHTML('pf-emo-title-en', 'Everyone has strengths.<br>' + nameForText + ' ' + balPick(balTier, {
          LOW: 'is building a well-rounded foundation across all four areas.',
          MID: 'has a well-rounded set of them.',
          HIGH: 'has a well-rounded, high-performing set of them.'
        }));
        const statChips = document.querySelectorAll('#pf-emo-stats-en .stat-chip');
        if (statChips[0]) { statChips[0].querySelector('b').textContent = s.P + '%'; statChips[0].querySelector('span').textContent = 'Planning accuracy'; }
        if (statChips[1]) { statChips[1].querySelector('b').textContent = s.A + '%'; statChips[1].querySelector('span').textContent = 'Attention accuracy'; }
        setText('pf-emo-diag3-strength-en', balPick(balTier, { LOW: 'all four domains at a similar early level', MID: 'all four domains fairly evenly', HIGH: 'all four domains at a similarly high level' }));
        setText('pf-emo-mission1-hint-en', balPick(balTier, { LOW: 'any small task you actually finished', MID: 'any of the four areas', HIGH: 'any of the four areas, even in a complex task' }));
        setText('pf-emo-mission2-hint-en', 'a different approach than usual');
        setText('pf-emo-diag4-weak-en', 'no single area');
        setText('pf-emo-mission1-example-en', balPick(balTier, { LOW: 'stuck with it in short repeated tries and', MID: 'picked whichever approach fit the moment and', HIGH: 'combined more than one approach smoothly and' }));
        setText('pf-emo-mission2-tool-en', balPick(balTier, { LOW: 'small repeatable routine to build my own', MID: 'flexible approach to build my own', HIGH: 'integrated approach to build my own' }));
        setText('pf-emo-mission2-weakscenario-en', 'a moment you weren\'t sure which approach to use');
      } else {
        setHTML('pf-emo-title', '누구에게나 강점은 있어요.<br>' + nameForText + ' ' + balPick(balTier, {
          LOW: '님은 네 영역의 기초를 함께 다져가는 균형형이에요.',
          MID: '님은 네 영역을 고르게 갖춘 균형형이에요.',
          HIGH: '님은 네 영역을 고르게, 그것도 높은 수준으로 갖춘 균형형이에요.'
        }));
        const statChips = document.querySelectorAll('#emotional .stat-chip');
        if (statChips[0]) { statChips[0].querySelector('b').textContent = s.P + '%'; statChips[0].querySelector('span').textContent = '계획력 정답률'; }
        if (statChips[1]) { statChips[1].querySelector('b').textContent = s.A + '%'; statChips[1].querySelector('span').textContent = '주의력 정답률'; }
        setText('pf-emo-mission1-hint', balPick(balTier, { LOW: '작은 일을 끝까지 완료했던 순간', MID: '네 영역 중 하나를 자유롭게 발휘했던 순간', HIGH: '복합적인 과제에서 여러 영역을 함께 발휘했던 순간' }));
        setText('pf-emo-mission2-hint', '평소와 다른 방식');
        setText('pf-emo-mission2-hint-particle', '을');
        setText('pf-emo-mission1-example', balPick(balTier, { LOW: '짧게 여러 번 반복해서 끝까지 해내고', MID: '상황에 맞는 방식을 그때그때 골라서', HIGH: '여러 방식을 매끄럽게 통합해서' }));
        setText('pf-emo-mission2-tool', balPick(balTier, { LOW: '짧고 반복 가능한 루틴', MID: '상황별로 다른 접근', HIGH: '통합적인 접근 방식' }));
        setText('pf-emo-mission2-weakscenario', '어떤 방식으로 접근해야 할지 고민됐던 순간');
        setText('pf-emo-diag3-strength', balPick(balTier, { LOW: '네 영역이 비슷한 출발선에서', MID: '네 영역이 고르게', HIGH: '네 영역이 고르게, 높은 수준으로' }));
        setText('pf-emo-diag4-weak', '특별히 약한 영역 없이');
      }
    } else if (isEn) {
      setHTML('pf-emo-title-en', 'Everyone has strengths.<br>' + nameForText + ' already has clear, proven ones.');
      const statChips = document.querySelectorAll('#pf-emo-stats-en .stat-chip');
      if (statChips[0]) { statChips[0].querySelector('b').textContent = s[top2[0].k] + '%'; statChips[0].querySelector('span').textContent = AXIS_LABEL[top2[0].k] + ' accuracy'; }
      if (statChips[1]) { statChips[1].querySelector('b').textContent = s[top2[1].k] + '%'; statChips[1].querySelector('span').textContent = AXIS_LABEL[top2[1].k] + ' accuracy'; }
      setText('pf-emo-diag3-strength-en', top2.map(function(r){return AXIS_LABEL[r.k] + ' ' + s[r.k] + '%';}).join(', '));
      // 패치: EN 버전에서 누락돼 있던 미션힌트·예시문장·약점표현을 KO와 동일하게 채움
      const top2StrEn = top2.map(function(r){return AXIS_LABEL[r.k];}).join(' and ');
      setText('pf-emo-mission1-hint-en', top2StrEn);
      setText('pf-emo-mission2-hint-en', top2StrEn);
      setText('pf-emo-diag4-weak-en', AXIS_LABEL[weak.k]);
      const EXAMPLE_EN = { P:'planned it out step by step and', A:'stayed locked in and pushed through', S:'grasped the whole situation first and', Q:'worked through it in order and' };
      const TOOL_EN = { P:'planning strength to build my own', A:'focus to just push through and finish', S:'big-picture thinking to redesign', Q:'planning strength to build my own step-by-step' };
      setText('pf-emo-mission1-example-en', EXAMPLE_EN[top2[0].k]);
      setText('pf-emo-mission2-tool-en', TOOL_EN[top2[0].k] + ' checklist');
      setText('pf-emo-mission2-weakscenario-en', weak.k === 'Q' || weak.k === 'A' ? 'a moment you missed a step or a detail' : 'a moment things felt scattered or hard to pull together');
    } else {
      setHTML('pf-emo-title', '누구에게나 강점은 있어요.<br>' + nameForText + ' 님에게는 이미 확실한 강점이 있어요.');
      const statChips = document.querySelectorAll('#emotional .stat-chip');
      if (statChips[0]) { statChips[0].querySelector('b').textContent = s[top2[0].k] + '%'; statChips[0].querySelector('span').textContent = AXIS_LABEL[top2[0].k] + ' 정답률'; }
      if (statChips[1]) { statChips[1].querySelector('b').textContent = s[top2[1].k] + '%'; statChips[1].querySelector('span').textContent = AXIS_LABEL[top2[1].k] + ' 정답률'; }
      setText('pf-emo-mission1-hint', (function(){ const t=top2.map(function(r){return AXIS_LABEL[r.k];}).join('·'); return t+(hasBatchim(t)?'을':'를')+' 발휘했던 순간'; })());
      setText('pf-emo-mission2-hint', top2.map(function(r){return AXIS_LABEL[r.k];}).join('·'));
      // 패치: "내 강점(...)을 어떻게 쓰면" — 괄호 뒤 조사가 "을"로 고정돼 있어 순차처리·동시처리처럼
      // 받침 없는 축으로 끝나면 어색해지던 것을 동적으로 교체
      setText('pf-emo-mission2-hint-particle', hasBatchim(AXIS_LABEL[top2[1].k]) ? '을' : '를');
      // 패치: 자기설계 미션 예시문장의 '전체상황파악→계획' 고정을 실제 최고축 기준으로 교체
      const EXAMPLE_KO = { P:'차근차근 계획을 세워서', A:'끝까지 집중해서 몰입한 끝에', S:'전체 상황을 먼저 파악하고', Q:'순서대로 하나씩 처리해서' };
      const TOOL_KO = { P:'계획력으로 체크리스트', A:'집중력으로 시간을 정해서', S:'전체를 다시 그려보는 마인드맵', Q:'계획력으로 순서표' };
      setText('pf-emo-mission1-example', EXAMPLE_KO[top2[0].k]);
      setText('pf-emo-mission2-tool', TOOL_KO[top2[0].k]);
      setText('pf-emo-mission2-weakscenario', (weak.k === 'Q' || weak.k === 'A') ? '순서를 놓쳤거나 디테일을 놓친 순간' : '생각이 여기저기 흩어져서 정리가 안 됐던 순간');
      // 패치: "이럴 때 필요한 대처" 카드의 "계획력 80%·동시처리 89%" 하드코딩을 실제 top2로 교체
      setText('pf-emo-diag3-strength', top2.map(function(r){return AXIS_LABEL[r.k] + ' ' + s[r.k] + '%';}).join('·'));
      // 패치: "노력해도 안 될 것 같을 때" 카드의 '순차처리' 전제를 실제 약점축으로 교체
      setText('pf-emo-diag4-weak', AXIS_LABEL[weak.k]);
    }
  }

  function applyMatrixDeptCreditJobs(PROFILE) {
    if (typeof DCasTeenDeptEngine === 'undefined' || typeof window.DCAS_MAJOR_REQUIREMENTS === 'undefined') return;
    const engine = DCasTeenDeptEngine;
    const reqs = window.DCAS_MAJOR_REQUIREMENTS;
    const s = PROFILE.scores;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const sfx = isEn ? '-en' : '';
    const AXIS_LABEL = isEn ? { P:'Planning', A:'Attention', S:'Simultaneous', Q:'Successive' } : { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
    const nameForText = isEn ? (PROFILE.fullNameEn || PROFILE.fullName) : PROFILE.fullName;

    // 06 계열매트릭스
    const catRanked = engine.rankCategories(s, reqs);
    const matrixTable = byId('pf-matrix-table' + sfx);
    if (matrixTable) {
      matrixTable.innerHTML = catRanked.map(function (c, i) {
        const isTop = i < 2;
        const reasonBank = isEn ? engine.CATEGORY_REASON_EN : engine.CATEGORY_REASON;
        const reason = isTop ? reasonBank[c.category].high : reasonBank[c.category].low;
        const label = isEn ? engine.CATEGORY_LABEL_EN[c.category] : c.category;
        return '<tr><td>' + label + '</td><td><div class="fit-bar-row"><div class="fit-bar-track"><div class="fit-bar-fill' + (isTop ? ' top' : '') + '" style="width:' + c.fit + '%"></div></div><span class="pct' + (isTop ? ' top' : '') + '">' + c.fit + '%</span></div></td><td>' + reason + '</td></tr>';
      }).join('');
    }
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedMatrix = (ranked[0].v - ranked[3].v) < 20;
    const balTierMatrix = getBalTier(s);
    const top2Label = isBalancedMatrix ? (isEn ? 'balanced' : '균형형') : AXIS_LABEL[ranked[0].k] + '×' + AXIS_LABEL[ranked[1].k];
    if (isEn) {
      setText('pf-matrix-combotag-en', isBalancedMatrix
        ? '🔗 This result reflects the ' + balPick(balTierMatrix, {LOW:'balanced, still-developing',MID:'balanced',HIGH:'balanced, high-performing'}) + ' cognitive profile from the Efficiency Diagnosis (section 03) — no single pair of domains dominates'
        : '🔗 This result reflects the [' + top2Label + '] strength combination from the Efficiency Diagnosis (section 03)');
      setHTML('pf-matrix-explain-en', isBalancedMatrix
        ? 'Each field\'s weighting of the 4 cognitive domains is multiplied by ' + nameForText + '\'s accuracy rates and normalized. ' + balPick(balTierMatrix, {
            LOW: 'Since ' + nameForText + '\'s four domains are still developing at a similar level, fit differences across fields come mainly from each field\'s own weighting — this is a good time to build basic ability in all four areas through short, repeated practice.',
            MID: 'Since ' + nameForText + '\'s four domains are fairly even, fit differences across fields mainly come from each field\'s own weighting rather than a personal strength combination — a good opportunity to compare fields and see which approach fits best.',
            HIGH: 'Since ' + nameForText + '\'s four domains are evenly high, ' + nameForText + ' can adapt reliably to whichever combination a field weights most, which suits fields with complex, multi-domain demands.'
          })
        : 'Each field\'s weighting of the 4 cognitive domains is multiplied by ' + nameForText + '\'s accuracy rates and normalized. For example, ' + engine.CATEGORY_LABEL_EN[catRanked[0].category] + ' weights ' + top2Label + ' heavily, aligning well with ' + nameForText + '\'s strengths.');
    } else {
      setText('pf-matrix-combotag', isBalancedMatrix
        ? '🔗 이 결과는 03번 학습효율진단의 ' + balPick(balTierMatrix, {LOW:'균형형(성장 구간)',MID:'균형형(전략 탐색)',HIGH:'균형형(고역량)'}) + ' 프로파일이 그대로 반영됐어요 — 특정 두 축이 두드러지지 않아요'
        : '🔗 이 결과는 03번 학습효율진단의 [' + top2Label + '] 강점 조합이 그대로 반영됐어요');
      setHTML('pf-matrix-explain', isBalancedMatrix
        ? '각 계열이 실제 학업·직무에서 요구하는 4개 인지영역의 가중치와, ' + nameForText + ' 님의 정답률을 곱해 정규화한 값이에요. ' + balPick(balTierMatrix, {
            LOW: nameForText + ' 님은 4개 영역이 비슷한 수준에서 함께 발달하는 중이라, 계열별 적합도 차이는 각 계열 고유의 가중치에서 주로 비롯돼요. 지금은 특정 계열을 정하기보다 여러 계열을 두루 접해보며 기초 역량을 쌓는 시기로 볼 수 있어요.',
            MID: nameForText + ' 님은 4개 영역이 비교적 고르게 나타나, 계열별 적합도 차이는 특정 강점 조합보다는 각 계열 고유의 가중치 차이에서 주로 비롯돼요. 여러 계열을 비교해보며 어떤 접근이 더 잘 맞는지 탐색해보기 좋은 시기예요.',
            HIGH: nameForText + ' 님은 4개 영역이 고르게 높아, 어떤 조합을 요구하는 계열이든 안정적으로 대응할 수 있어요. 여러 인지영역이 복합적으로 요구되는 계열에서 특히 강점이 커요.'
          })
        : '각 계열이 실제 학업·직무에서 요구하는 4개 인지영역의 가중치와, ' + nameForText + ' 님의 정답률을 곱해 정규화한 값이에요. 예를 들어 ' + catRanked[0].category + ' 계열은 ' + top2Label + ' 비중이 높아 ' + nameForText + ' 님의 강점과 잘 맞물려요.');
    }

    // 07 추천학과 TOP5
    const topMajors = engine.rankMajors(s, reqs, 5);
    const deptContainer = byId('pf-dept-cards' + sfx);
    if (deptContainer) {
      deptContainer.innerHTML = topMajors.map(function (m, i) {
        const majorTop2 = Object.keys(m.reqVec).map(function(k){return {k:k,v:m.reqVec[k]};}).sort(function(a,b){return b.v-a.v;}).slice(0,2).map(function(x){return AXIS_LABEL[x.k];}).join(isEn?' & ':'·');
        const rankLabel = isEn ? 'RANK ' + (i+1) + ' · Fit ' + m.fit + '%' : 'RANK ' + (i+1) + ' · 적합도 ' + m.fit + '%';
        const desc = isEn
          ? 'This major emphasizes ' + majorTop2 + ', which overlaps significantly with ' + nameForText + '\'s cognitive profile.'
          : majorTop2 + (hasBatchim(majorTop2)?'을':'를') + ' 요구하는 이 학과는, ' + nameForText + ' 님의 인지 프로파일과 겹치는 부분이 커요.';
        return '<div class="dept-card"><div class="rank">' + rankLabel + '</div><h4>' + m.name + '</h4><p>' + desc + '</p></div>';
      }).join('');
    }

    // 08 선택과목 가이드
    const topCat = catRanked[0].category;
    const guideBank = isEn ? engine.SUBJECT_GUIDE_EN : engine.SUBJECT_GUIDE;
    const guide = guideBank[topCat] || guideBank['공학'];
    const creditTable = byId('pf-credit-table' + sfx);
    if (creditTable) {
      creditTable.innerHTML = guide.map(function (g) {
        return '<tr><td>' + g.area + '</td><td>' + g.subjects + '</td><td>' + g.reason + '</td></tr>';
      }).join('');
    }

    // 09 직업미리보기
    const jobBank = isEn ? engine.JOB_PREVIEW_EN : engine.JOB_PREVIEW;
    const jobGroups = jobBank[topCat] || jobBank['공학'];
    const jobContainer = byId('pf-jobpreview-cards' + sfx);
    if (jobContainer) {
      jobContainer.innerHTML = jobGroups.map(function (g) {
        return '<div class="card"><h4 style="margin:0 0 6px;font-size:13.5px;color:var(--navy);">' + g.group + '</h4>' +
          '<div class="job-strip">' + g.pills.map(function (p) { return '<span class="job-pill">' + p + '</span>'; }).join('') + '</div></div>';
      }).join('');
    }
  }

  function applyParentAndExpert(PROFILE) {
    const s = PROFILE.scores;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const sfx = isEn ? '-en' : '';
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const weak = ranked[3];
    const isBalancedProfile2 = (ranked[0].v - ranked[3].v) < 20;
    const balTierParent = getBalTier(s);
    const AXIS_LABEL = isEn ? { P:'Planning', A:'Attention', S:'Simultaneous', Q:'Successive' } : { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
    const weakLabel = AXIS_LABEL[weak.k];
    const nameForText = isEn ? (PROFILE.fullNameEn || PROFILE.fullName) : PROFILE.fullName;
    const dateStr2 = PROFILE.testDate.y + '.' + String(PROFILE.testDate.m).padStart(2,'0') + '.' + String(PROFILE.testDate.d).padStart(2,'0');
    const dateStr2En = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][PROFILE.testDate.m-1] + ' ' + PROFILE.testDate.d + ', ' + PROFILE.testDate.y;
    setText('pf-expert-testdate', dateStr2);
    setText('pf-expert-testdate-en', dateStr2En);

    // 11 부모님과 함께
    if (isEn) {
      const AXIS_SUFFIX_EN = { P:'', A:'', S:' processing', Q:' processing' };
      const strongStr = (AXIS_LABEL[ranked[0].k]+AXIS_SUFFIX_EN[ranked[0].k]) + ' and ' + (AXIS_LABEL[ranked[1].k]+AXIS_SUFFIX_EN[ranked[1].k]);
      const weakStrFull = weakLabel + AXIS_SUFFIX_EN[weak.k];
      setText('pf-parent-summary-en', isBalancedProfile2
        ? nameForText + ' ' + balPick(balTierParent, {
            LOW: 'shows fairly even accuracy across all four cognitive domains, still at an early stage of development. Rather than one standout strength, this is a time to build basic ability in all four areas together, through short repeated routines and small completed tasks.',
            MID: 'shows fairly even accuracy across all four cognitive domains, without one area standing out. This is a balanced profile that can flex to fit different kinds of tasks, so any of the four areas can be picked as a focus for further growth based on interest.',
            HIGH: 'shows evenly high accuracy across all four cognitive domains. This reflects an ability to draw on and combine all four areas reliably, which suits complex, multi-step tasks and deeper expertise in an area of interest.'
          })
        : nameForText + ' has a notably strong ability in ' + strongStr.toLowerCase() + '. Where a bit more conscious training helps is ' + weakStrFull.toLowerCase() + '. This isn\'t a deficiency — it\'s simply where things stand right now, and it\'s an area that can keep improving steadily with training into the mid-20s. The more often you help ' + nameForText + ' put moments of using a strength into words, the easier it becomes to work on the growth areas too.');
    } else {
      const top2Str = AXIS_LABEL[ranked[0].k] + (hasBatchim(AXIS_LABEL[ranked[0].k]) ? '과' : '와') + ' ' + AXIS_LABEL[ranked[1].k];
      setText('pf-parent-summary', isBalancedProfile2
        ? nameForText + ' ' + balPick(balTierParent, {
            LOW: '님은 4개 영역의 정답률이 비교적 고르게 나타나며, 아직 네 영역 모두 기초를 다지는 단계예요. 특정 강점을 찾기보다는, 짧고 반복 가능한 루틴으로 작은 완료 경험을 함께 쌓아가는 것이 도움이 돼요.',
            MID: '님은 4개 영역의 정답률이 비교적 고르게 나타나, 특정 영역에 치우치지 않고 상황에 따라 유연하게 강점을 발휘할 수 있는 균형형이에요. 4개 영역 중 아이가 관심 있어 하는 영역을 자유롭게 집중 훈련 대상으로 골라도 좋아요.',
            HIGH: '님은 4개 영역의 정답률이 고르게 높아, 네 영역을 안정적으로 활용하고 통합할 수 있는 균형형이에요. 여러 영역이 함께 요구되는 복합적인 활동이나 관심 분야의 심화 도전을 권장해요.'
          })
        : nameForText + ' 님은 ' + top2Str + (hasBatchim(top2Str)?'을':'를') + ' 발휘하는 힘이 뚜렷하게 강해요. 다만 ' + weakLabel + (hasBatchim(weakLabel)?'이':'가') + ' 상대적으로 낮아, 관련 활동에서는 조금 더 의식적인 훈련이 도움이 됩니다. 이는 부족함이 아니라 지금 시점의 특성이며, 훈련을 통해 20대 중반까지도 꾸준히 개선될 수 있는 영역이에요. 아이가 스스로 강점을 발휘한 경험을 자주 언어화해줄수록, 약점 보완도 훨씬 수월해집니다.');
      // 패치: "순차처리처럼"으로 고정돼 있던 것을 실제 최약 축으로 동적화
      setText('pf-parent-mistake3', '한 번의 검사 결과를 고정된 것으로 여기기 — ' + weakLabel + '처럼 훈련으로 개선되는 영역은 다음 검사에서 충분히 달라질 수 있어요');
    }

    // 13 전문가 데이터
    // 두뇌유형은 기질 상·중·하나 81유형 등급과 분리하고 S-Q 실제 점수차만 사용한다.
    // 차이 0~10점은 균형형, 한 축이 11점 이상 높을 때만 해당 처리 우세형이다.
    const diff = Math.abs(s.S - s.Q);
    const isBalancedBrain = diff <= 10;
    const dominant = s.S > s.Q ? 'S' : 'Q';
    if (isEn) {
      const dominantLabel = isBalancedBrain ? 'balanced (no dominant side)' : (dominant === 'S' ? 'right-brain dominant (simultaneous-processing dominant)' : 'left-brain dominant (successive-processing dominant)');
      const dominantDesc = isBalancedBrain ? 'The two processing scores fall within the product-defined balanced range.' : (dominant === 'S' ? 'Integrating information as a whole shows relatively higher accuracy than processing it step by step.' : 'Processing information step by step shows relatively higher accuracy than integrating it all at once.');
      if (isBalancedBrain) {
        setHTML('pf-expert-braintype-en', nameForText + '\'s brain type is <b>' + dominantLabel + '</b>. The gap between successive and simultaneous processing is ' + diff + ' percentage points, which is within the balanced criterion of 10 points or less.');
      } else {
      setHTML('pf-expert-braintype-en', nameForText + '\'s brain type is <b>' + dominantLabel + '</b>. The accuracy gap between successive and simultaneous processing is ' + diff + ' percentage points, meeting the 11-point criterion for a ' + (dominant==='S'?'simultaneous':'successive') + '-processing-dominant type.');
      }
      const table = byId('pf-expert-table-en');
      if (table) {
        const order = ['P','A','S','Q'];
        table.querySelectorAll('tr').forEach(function (row, i) {
          const k = order[i]; if (!k) return;
          const tds = row.querySelectorAll('td');
          if (tds[1]) tds[1].textContent = s[k] + '%';
          const judge = row.querySelector('.judge');
          if (judge) {
            const level = s[k] >= 75 ? 'high' : (s[k] >= 53 ? 'mid' : 'low');
            judge.className = 'judge ' + level;
            judge.textContent = level === 'high' ? 'Relatively high' : (level === 'mid' ? 'Average range' : 'Relatively low');
          }
        });
      }
      const dsCompare = byId('pf-expert-dscompare-en');
      if (dsCompare) {
        const circles = dsCompare.querySelectorAll('.ds-circle b');
        const mid = dsCompare.querySelector('.ds-mid b');
        if (circles[0]) circles[0].textContent = s.Q + '%';
        if (circles[1]) circles[1].textContent = s.S + '%';
        if (mid) mid.textContent = diff + 'pp';
      }
      setHTML('pf-expert-dstext-en', isBalancedBrain
        ? 'The accuracy gap between successive and simultaneous processing is ' + diff + ' percentage points, within the product-defined balanced criterion of 10 points or less. This indicates a <b>balanced processing type</b>.'
        : 'The accuracy gap between successive and simultaneous processing is ' + diff + ' percentage points, indicating a <b>' + (dominant==='S'?'simultaneous':'successive') + '-processing-dominant learner</b>. ' + dominantDesc);
    } else {
      const dominantLabel = isBalancedBrain ? '균형형(동시처리·순차처리 균형)' : (dominant === 'S' ? '우뇌우세형(동시처리 우세)' : '좌뇌우세형(순차처리 우세)');
      const dominantDesc = isBalancedBrain ? '전체를 통합적으로 파악하는 방식과 순서대로 처리하는 방식을 고르게 사용하는 편' : (dominant === 'S' ? '정보를 순서대로 처리하기보다 전체를 통합적으로 파악하는 방식' : '전체를 한번에 보기보다 순서대로 차근차근 처리하는 방식');
      if (isBalancedBrain) {
        setHTML('pf-expert-braintype', nameForText + ' 님의 두뇌유형은 <b>' + dominantLabel + '</b>입니다. 순차처리와 동시처리의 정답률 차이는 ' + diff + '%p로, 두뇌유형 균형 기준인 10점 이하에 해당합니다.');
      } else {
      setHTML('pf-expert-braintype', nameForText + ' 님의 두뇌유형은 <b>' + dominantLabel + '</b>입니다. 순차처리와 동시처리의 정답률 차이가 ' + diff + '%p로, 우세형 기준인 11점 이상에 해당해 ' + (dominant==='S'?'동시':'순차') + '처리 우세형으로 판단됩니다.');
      }
      const table = byId('pf-expert-table');
      if (table) {
        const order = ['P','A','S','Q'];
        table.querySelectorAll('tr').forEach(function (row, i) {
          const k = order[i]; if (!k) return;
          const tds = row.querySelectorAll('td');
          if (tds[1]) tds[1].textContent = s[k] + '%';
          const judge = row.querySelector('.judge');
          if (judge) {
            const level = s[k] >= 75 ? 'high' : (s[k] >= 53 ? 'mid' : 'low');
            judge.className = 'judge ' + level;
            judge.textContent = level === 'high' ? '상대적 높음' : (level === 'mid' ? '평균적 수준' : '상대적 낮음');
          }
        });
      }
      const dsCompare = byId('pf-expert-dscompare');
      if (dsCompare) {
        const circles = dsCompare.querySelectorAll('.ds-circle b');
        const mid = dsCompare.querySelector('.ds-mid b');
        if (circles[0]) circles[0].textContent = s.Q + '%';
        if (circles[1]) circles[1].textContent = s.S + '%';
        if (mid) mid.textContent = diff + '%p';
      }
      setHTML('pf-expert-dstext', isBalancedBrain
        ? '순차처리와 동시처리의 정답률 차이가 ' + diff + '%p로 두뇌유형 균형 기준인 10점 이하에 해당해 <b>균형형</b>으로 판단됩니다. ' + dominantDesc + '이에요.'
        : '순차처리와 동시처리의 정답률 차이가 ' + diff + '%p로 ' + (diff>=20?'크게':'다소') + ' 나타나, <b>' + (dominant==='S'?'동시':'순차') + '처리 우세형 학습자</b>로 판단됩니다. ' + dominantDesc + '에서 상대적으로 더 높은 정확도를 보였어요.');
    }
  }

  function applyMissionSelfcheck(PROFILE) {
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const bank = isEn ? global.DCasTeenMissionBankEn : global.DCasTeenMissionBank;
    if (typeof bank === 'undefined') return;
    const s = PROFILE.scores;
    const d = bank.pickAxisData(s);
    const sfx = isEn ? '-en' : '';
    const isBalancedMission = (d.ranked[0].v - d.ranked[3].v) < 20;
    const balTierMission = getBalTier(s);

    // 09 미션보드
    if (isEn) {
      const strongLabel = d.strong2Keys.map(function (k) { return bank.AXIS_LABEL[k]; }).join(' and ');
      const weakLabel = bank.AXIS_LABEL[d.weakKey];
      setText('pf-mission-intro-en', isBalancedMission
        ? balPick(balTierMission, {
            LOW: 'Since your four domains are still developing at a similar level, these missions focus on short, repeatable steps across all four areas to build a steady foundation.',
            MID: 'Since your four domains are fairly balanced, these missions rotate through different approaches so you keep building whichever one fits the moment.',
            HIGH: 'Since your four domains are evenly high, these missions combine multiple approaches at once so you keep sharpening how you integrate them.'
          })
        : 'Using ' + strongLabel.toLowerCase() + ' strengths as leverage to progressively train ' + weakLabel.toLowerCase() + '.');
    } else {
      const strongLabel = d.strong2Keys.map(function (k) { return bank.AXIS_LABEL[k]; }).join('·');
      const weakLabel = bank.AXIS_LABEL[d.weakKey];
      setText('pf-mission-intro', isBalancedMission
        ? balPick(balTierMission, {
            LOW: '4개 영역이 비슷한 수준에서 함께 발달하는 중이라, 짧고 반복 가능한 미션으로 네 영역의 기초를 고르게 다지는 데 초점을 맞췄어요.',
            MID: '4개 영역이 고르게 나타나, 특정 강점에 기대기보다 상황에 맞는 접근 방식을 골고루 훈련하는 미션이에요.',
            HIGH: '4개 영역이 고르게 높아, 여러 접근 방식을 한 번에 통합해서 쓰는 힘을 더 키우는 미션이에요.'
          })
        : strongLabel + ' 강점을 지렛대 삼아, ' + weakLabel + (hasBatchim(weakLabel)?'을':'를') + ' 단계적으로 훈련하는 미션이에요.');
    }
    const missions = bank.buildMissions(s);
    const diffLabel = isEn ? { low:'Easy', mid:'Medium', high:'Hard' } : { low: '난이도 하', mid: '난이도 중', high: '난이도 상' };
    const missionEl = byId('pf-mission-cards' + sfx);
    if (missionEl) {
      missionEl.innerHTML = missions.map(function (m) {
        return '<div class="mission-card"><span class="diff ' + m.diff + '">' + diffLabel[m.diff] + '</span><h4>' + m.title + '</h4><p>' + m.desc + '</p><span class="xp">+' + m.xp + ' XP</span> <span class="link-skill">· ' + m.skill + '</span></div>';
      }).join('');
    }

    // 10 성장포인트 체크리스트
    const items = bank.buildSelfcheckItems(s);
    const checkEl = byId('pf-selfcheck-items' + sfx);
    if (checkEl) {
      checkEl.innerHTML = items.map(function (it, i) {
        return '<div class="check-item"><input type="checkbox" id="sc' + sfx + i + '"' + (i===0?' checked':'') + '><label for="sc' + sfx + i + '">' + it.text + '<span class="scale">' + it.scale + '</span></label></div>';
      }).join('');
    }
    // 패치(리팩터링): 10번 3단계 로드맵도 i18n 뱅크 조회로 전환
    const rankedGrowth = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedGrowth = (rankedGrowth[0].v - rankedGrowth[3].v) < 20;
    const balTierGrowth = getBalTier(s);
    const topKeyG = isBalancedGrowth ? ('BAL_' + balTierGrowth) : rankedGrowth[0].k, weakKeyG = isBalancedGrowth ? ('BAL_' + balTierGrowth) : rankedGrowth[3].k;
    const Tg = (typeof DCasI18n !== 'undefined') ? DCasI18n.get(isEn ? 'en' : 'ko') : null;
    if (Tg) {
      setText('pf-growth-step1' + sfx, Tg.growthStep.step1[topKeyG]);
      setText('pf-growth-step2' + sfx, Tg.growthStep.step2[topKeyG]);
      setText('pf-growth-step3' + sfx, Tg.growthStep.step3[weakKeyG]);
    }
  }

  function applyAdmissions(PROFILE) {
    if (typeof DCasTeenAdmissionsBank === 'undefined') return;
    const bank = DCasTeenAdmissionsBank;
    const s = PROFILE.scores;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const sfx = isEn ? '-en' : '';
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const strong2Keys = [ranked[0].k, ranked[1].k];
    const weakKey = ranked[3].k;
    const isBalancedAdm = (ranked[0].v - ranked[3].v) < 20;
    const balTierAdm = getBalTier(s);
    const AXIS_LABEL = isEn ? { P:'Planning', A:'Attention', S:'Simultaneous', Q:'Successive' } : bank.AXIS_LABEL;

    // 패치: "2026학년도"가 하드코딩돼 있어 실제 학생 학년과 무관하게 고정 표시되던 것을,
    // gradeLabel에서 고1/2/3을 추출해 실제 대입 학년도를 계산하도록 수정
    const gm = (PROFILE.gradeLabel || '').match(/고(?:등학교)?\s*([1-3])\s*학년|고([1-3])/);
    const gradeNum = gm ? parseInt(gm[1] || gm[2], 10) : null;
    const admissionYear = gradeNum ? (PROFILE.testDate.y + (3 - gradeNum) + 1) : null;
    const admYearStr = admissionYear ? String(admissionYear) : '해당';

    const tracksRanked = bank.rankTracks(s, isEn ? bank.TRACK_EN : undefined);
    tracksRanked.forEach(function (t) { if (t.track.note) t.track.note = t.track.note.replace(/\{\{ADMYEAR\}\}/g, admYearStr); });
    // 패치: 자소서 체크리스트 스케일 라벨의 '순차처리' 전제를 실제 약점축으로 교체
    // (균형형일 때는 특정 약점축을 단정하지 않음)
    setText('pf-adm-checkscale' + sfx, isBalancedAdm
      ? (isEn ? balPick(balTierAdm, {LOW:'Checks that the writing reflects steady, repeated completion across areas',MID:'Checks that the writing reflects your own flexible, situational approach',HIGH:'Checks that the writing reflects integrating multiple strengths at once'}) : balPick(balTierAdm, {LOW:'기초 역량·완료 경험 표현 점검',MID:'상황 대응력 표현 점검',HIGH:'통합적 역량 표현 점검'}))
      : (isEn ? 'Checks the ' + AXIS_LABEL[weakKey].toLowerCase() + '-processing growth area' : AXIS_LABEL[weakKey] + ' 약점 보완 점검'));
    if (isEn) {
      setText('pf-adm-combotag-en', isBalancedAdm
        ? '🔗 Efficiency Diagnosis [' + balPick(balTierAdm, {LOW:'balanced, developing',MID:'balanced',HIGH:'balanced, high-performing'}) + '] pattern — no single pair dominates, so ' + tracksRanked[0].track.name + ' fit comes mainly from overall consistency'
        : '🔗 Efficiency Diagnosis [' + AXIS_LABEL[strong2Keys[0]] + ' × ' + AXIS_LABEL[strong2Keys[1]] + '] pattern — this strength matters most for ' + tracksRanked[0].track.name);
    } else {
      setText('pf-adm-combotag', isBalancedAdm
        ? '🔗 학습효율진단의 ' + balPick(balTierAdm, {LOW:'균형형(성장 구간)',MID:'균형형(전략 탐색)',HIGH:'균형형(고역량)'}) + ' 프로파일이 그대로 반영됐어요 — 특정 두 축이 두드러지지 않아요'
        : '🔗 이 결과는 03번 학습효율진단의 [' + AXIS_LABEL[strong2Keys[0]] + '×' + AXIS_LABEL[strong2Keys[1]] + '] 강점 조합이 그대로 반영됐어요');
    }
    const tracksEl = byId('pf-adm-tracks' + sfx);
    if (tracksEl) {
      tracksEl.innerHTML = tracksRanked.map(function (t, i) {
        const rankLabel = isEn
          ? (i === 0 ? '#1' : (i === 1 ? '#2' : (i === tracksRanked.length - 1 ? 'Note' : '#'+(i+1))))
          : (i === 0 ? '1위' : (i === 1 ? '2위' : (i === tracksRanked.length - 1 ? '참고' : (i+1)+'위')));
        /* 패치: whyFit이 축 이름만 언급하는 캔드 문장이라 순위만 바뀌고 "고정"처럼 보였던 것을
         * 해당 전형이 실제로 보는 축들의 사용자 점수를 괄호로 덧붙여 모든 순위(1~4위)가
         * 실제 숫자로 근거를 갖도록 보강 */
        const scoreDetail = t.track.fitAxes.map(function (k) { return AXIS_LABEL[k] + ' ' + s[k] + '%'; }).join(isEn ? ' / ' : '·');
        const fitLabel = isEn ? ('Match score ' + Math.round(t.score) + '%') : ('적합 지표 ' + Math.round(t.score) + '%');
        return '<div class="track-card"' + (i>0?' style="margin-top:8px;"':'') + '><div class="pctbox">' + rankLabel + '</div><div class="txt"><h4>' + t.track.name + ' · ' + fitLabel + '</h4><p>' + t.track.whyFit + ' (' + t.track.note + ')<br><span style="color:var(--muted);font-size:12.5px;">' + (isEn ? 'Based on: ' : '근거 점수: ') + scoreDetail + '</span></p></div></div>';
      }).join('');
    }

    const guide = isEn ? bank.buildInterviewGuideEn(s, strong2Keys, isBalancedAdm ? ('BAL_' + balTierAdm) : weakKey) : bank.buildInterviewGuide(s, strong2Keys, isBalancedAdm ? ('BAL_' + balTierAdm) : weakKey);
    const interviewEl = byId('pf-adm-interview' + sfx);
    if (interviewEl) {
      interviewEl.innerHTML = guide.map(function (g) {
        return '<div class="interview-card"><div class="q2">' + g.q + '</div><p class="a2">' + g.a + '</p></div>';
      }).join('');
    }
  }

  function applyFaq(PROFILE) {
    const s = PROFILE.scores;
    const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return a.v-b.v;});
    const weakKey = ranked[0].k;
    const rankedDesc = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const isBalancedFaq = (rankedDesc[0].v - rankedDesc[3].v) < 20;
    const balTierFaq = getBalTier(s);
    if (isEn) {
      const AXIS_LABEL_EN = { P:'Planning', A:'Attention', S:'Simultaneous', Q:'Successive' };
      const AXIS_SUFFIX_EN = { P:'', A:'', S:' processing', Q:' processing' };
      const weakLabel = AXIS_LABEL_EN[weakKey] + AXIS_SUFFIX_EN[weakKey];
      if (isBalancedFaq) {
        setText('pf-faq-q1-en', balPick(balTierFaq, {
          LOW: 'I\'m worried all four areas came out on the lower side. Will they stay that way?',
          MID: 'None of my four areas stands out as a strength. Is that a problem?',
          HIGH: 'All four of my areas came out high. Is there anything I still need to work on?'
        }));
        setText('pf-faq-a1-en', balPick(balTierFaq, {
          LOW: 'No. All four areas can keep improving with training well into the early 20s. Short, repeated missions across all four areas on the mission board can meaningfully improve them.',
          MID: 'No, it\'s not a problem. It just means you can flexibly draw on whichever style fits a given task, and there\'s room to develop any of the four further depending on your interests.',
          HIGH: 'Not necessarily a weakness — but even an evenly high profile can go further by combining more than one area at once in complex tasks, so it\'s worth trying the mission board\'s integrated missions.'
        }));
        setText('pf-faq-a2-en', 'Generally every 12–18 months is recommended. Cognitive profiles keep developing during this growth stage, so it\'s worth tracking how your overall balance changes at the next test.');
      } else {
      setText('pf-faq-q1-en', 'I\'m worried ' + weakLabel.toLowerCase() + ' came out low. Will it stay that way?');
      setText('pf-faq-a1-en', 'No. ' + weakLabel + ' can keep improving with training well into the early 20s. Working through the mission board\'s related missions little by little can meaningfully improve it.');
      // 패치: "successive processing"으로 고정돼 있던 재검사 FAQ도 실제 최약 축으로 동적화
      setText('pf-faq-a2-en', 'Generally every 12–18 months is recommended. Cognitive profiles keep developing during this growth stage, so it\'s worth tracking how ' + weakLabel.toLowerCase() + ' changes at the next test.');
      }
    } else {
      const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
      const weakLabel = AXIS_LABEL[weakKey];
      if (isBalancedFaq) {
        setText('pf-faq-q1', balPick(balTierFaq, {
          LOW: '네 영역이 모두 낮게 나온 게 걱정돼요. 계속 이대로일까요?',
          MID: '특별히 두드러지는 강점 영역이 없는 것 같아요. 문제가 되나요?',
          HIGH: '네 영역이 모두 높게 나왔는데, 그래도 더 신경 써야 할 부분이 있을까요?'
        }));
        setText('pf-faq-a1', balPick(balTierFaq, {
          LOW: '아니에요. 네 영역 모두 훈련을 통해 20대 초반까지도 꾸준히 개선될 수 있어요. 미션보드에서 네 영역을 골고루 짧게 반복하다 보면 충분히 좋아질 수 있어요.',
          MID: '아니에요. 오히려 상황에 맞게 유연하게 강점을 전환할 수 있다는 뜻이에요. 관심 있는 영역을 자유롭게 골라 집중 훈련해도 좋아요.',
          HIGH: '약점이라기보다는, 복합적인 과제에서 여러 영역을 동시에 활용하는 연습을 더 해보면 좋다는 뜻이에요. 미션보드의 통합형 미션에 도전해보세요.'
        }));
        setText('pf-faq-a2', '일반적으로 12~18개월 주기를 권장해요. 성장기에는 인지 프로파일이 계속 발달하므로, 다음 검사에서 전체적인 균형이 어떻게 달라지는지 함께 확인해보길 추천해요.');
      } else {
      setText('pf-faq-q1', weakLabel + (hasBatchim(weakLabel)?'이':'가') + ' 낮게 나온 게 걱정돼요. 계속 낮은 채로 남을까요?');
      setText('pf-faq-a1', '아니에요. ' + weakLabel + (hasBatchim(weakLabel)?'은':'는') + ' 훈련을 통해 20대 초반까지도 꾸준히 개선될 수 있는 영역이에요. 미션보드의 관련 미션을 조금씩 쌓아가면 충분히 좋아질 수 있어요.');
      // 패치: "순차처리 영역의 변화"로 고정돼 있던 재검사 FAQ도 실제 최약 축으로 동적화
      setText('pf-faq-a2', '일반적으로 12~18개월 주기를 권장해요. 성장기에는 인지 프로파일이 계속 발달하므로, 다음 검사에서 ' + weakLabel + ' 영역의 변화를 함께 확인해보길 추천해요.');
      }
    }
  }

  const BRAINSCI = {
    P: { region: '전두엽(prefrontal cortex)', desc: '목표 설정·자기조절·시간관리를 담당하며, 실제로 계획을 세우고 실행해보는 경험을 반복할수록 더 단단해져요.' },
    A: { region: '전두엽·망상활성계(reticular activating system)', desc: '필요한 자극에 선택적으로 집중하고 방해 자극을 억제하는 기능을 담당하며, 짧은 몰입을 반복할수록 지속 시간이 늘어나요.' },
    S: { region: '후두-두정엽(occipito-parietal) 연합영역', desc: '흩어진 정보를 하나의 전체 형태로 통합하는 기능을 담당하며, 마인드맵처럼 전체 구조를 그려보는 활동으로 강화돼요.' },
    Q: { region: '측두엽 언어영역과 연결된 작업기억(working memory)', desc: '언어·청각 정보를 순서대로 기억하는 기능과 관련이 깊은데, 이 기능은 학습·훈련을 통해 20대 중반까지도 꾸준히 발달하는 것으로 알려져 있어요.' },
  };

  const BRAINSCI_EN = {
    P: { region: 'the prefrontal cortex', desc: 'handles goal-setting, self-regulation, and time management, and strengthens through repeated real-world practice.' },
    A: { region: 'the prefrontal cortex and reticular activating system', desc: 'handles selective attention to relevant stimuli and suppression of distractions, and its sustain duration grows with repeated short bouts of focus.' },
    S: { region: 'the occipito-parietal association cortex', desc: 'integrates scattered information into one coherent whole, and strengthens through activities like mind-mapping that build the big picture.' },
    Q: { region: 'working memory linked to the temporal language regions', desc: 'holds and orders verbal/auditory information in sequence, a function known to keep developing through training into the mid-20s.' },
  };

  function applyLearning(PROFILE) {
    const s = PROFILE.scores;
    const ranked = [{k:'P',v:s.P},{k:'A',v:s.A},{k:'S',v:s.S},{k:'Q',v:s.Q}].sort(function(a,b){return b.v-a.v;});
    const strong2 = [ranked[0].k, ranked[1].k], weak2 = [ranked[2].k, ranked[3].k];
    const AXIS_LABEL = { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' };
    const AXIS_LABEL_EN = { P: 'planning', A: 'attention', S: 'simultaneous processing', Q: 'successive processing' };
    const strongStr = strong2.map(function(k){return AXIS_LABEL[k];}).join('·');
    const weakStr = weak2.map(function(k){return AXIS_LABEL[k];}).join('·');
    const isBalancedLearning = (ranked[0].v - ranked[3].v) < 20;
    const balTierLearning = getBalTier(s);
    setText('pf-learning-intro', isBalancedLearning
      ? balPick(balTierLearning, {
          LOW: '4개 영역이 비슷한 수준에서 함께 발달하는 중이라, 특정 루틴에 집중하기보다 네 영역 모두에서 짧고 반복 가능한 학습 습관을 쌓는 게 잘 맞아요.',
          MID: '4개 영역이 고르게 나타나, 특정 영역에 맞춘 루틴보다는 과제 성격에 따라 접근 방식을 유연하게 바꾸는 학습설계가 잘 맞아요.',
          HIGH: '4개 영역이 고르게 높아, 여러 접근 방식을 통합해서 쓰는 복합적인 학습설계와 관심 분야의 심화 학습이 잘 맞아요.'
        })
      : strongStr + ' 강점을 살리고, ' + weakStr + (hasBatchim(weakStr)?'은':'는') + ' 짧고 구조화된 루틴으로 보완해요.');
    setText('pf-learning-intro-en', isBalancedLearning
      ? balPick(balTierLearning, {
          LOW: 'Since your four domains are developing together at a similar level, building short, repeatable study habits across all four areas tends to work better than focusing on one routine.',
          MID: 'Since your four domains are fairly even, a flexible study approach that adapts to each task tends to work better than routines built around one fixed strength.',
          HIGH: 'Since your four domains are evenly high, a study design that integrates multiple approaches — and deeper study in an area of interest — tends to work well.'
        })
      : 'Leverage ' + strong2.map(function(k){return AXIS_LABEL_EN[k];}).join(' and ') + ' strengths, while building ' + weak2.map(function(k){return AXIS_LABEL_EN[k];}).join(' and ') + ' through short, structured routines.');

    const isBalancedRoutine = (ranked[0].v - ranked[3].v) < 20;
    const topAxis = ranked[0].k, weakAxis = isBalancedRoutine ? 'BAL' : ranked[3].k;
    const topB = BRAINSCI[topAxis], weakB = BRAINSCI[weakAxis];
    const topBEn = BRAINSCI_EN[topAxis], weakBEn = BRAINSCI_EN[weakAxis];
    function cap(w){ return w.charAt(0).toUpperCase() + w.slice(1); }
    if (isBalancedLearning) {
      setHTML('pf-learning-brainsci', balPick(balTierLearning, {
        LOW: '계획력·주의력·동시처리·순차처리는 각각 전두엽, 망상활성계, 후두-두정엽, 작업기억이라는 서로 다른 뇌 영역과 연관돼요. 지금은 이 네 영역이 비슷한 수준에서 함께 발달하는 시기이며, 어떤 영역이든 짧고 반복적인 훈련을 거치면 20대 중반까지 꾸준히 성장할 수 있어요.',
        MID: '계획력·주의력·동시처리·순차처리는 각각 전두엽, 망상활성계, 후두-두정엽, 작업기억이라는 서로 다른 뇌 영역과 연관돼요. 지금은 네 영역이 고르게 발달해 있어, 과제에 따라 어떤 회로를 더 활용할지 스스로 실험해보며 효과적인 전략을 찾아가기 좋은 시기예요.',
        HIGH: '계획력·주의력·동시처리·순차처리는 각각 전두엽, 망상활성계, 후두-두정엽, 작업기억이라는 서로 다른 뇌 영역과 연관돼요. 네 영역이 고르게 높은 수준으로 발달해 있어, 여러 뇌 회로를 동시에 안정적으로 활용할 수 있다는 뜻이며, 복합적인 과제에서 이 통합적 활용 능력이 강점으로 작용해요.'
      }));
      setHTML('pf-learning-brainsci-en', balPick(balTierLearning, {
        LOW: 'Planning, attention, simultaneous, and successive processing are each tied to different brain regions — the prefrontal cortex, the reticular activating system, the occipito-parietal cortex, and working memory. Right now these four are developing together at a similar level, and any of them can keep growing steadily into the mid-20s with short, repeated training.',
        MID: 'Planning, attention, simultaneous, and successive processing are each tied to different brain regions — the prefrontal cortex, the reticular activating system, the occipito-parietal cortex, and working memory. With all four fairly even, this is a good time to experiment with which circuit a given task calls on most, and find what strategy actually works.',
        HIGH: 'Planning, attention, simultaneous, and successive processing are each tied to different brain regions — the prefrontal cortex, the reticular activating system, the occipito-parietal cortex, and working memory. With all four evenly high, multiple circuits can be engaged reliably at once, which is a real advantage for complex, multi-part tasks.'
      }));
    } else {
      setHTML('pf-learning-brainsci', AXIS_LABEL[topAxis] + (hasBatchim(AXIS_LABEL[topAxis])?'은':'는') + ' ' + topB.region + '과 밀접히 연관돼요. 이 영역은 ' + topB.desc + ' ' +
        AXIS_LABEL[weakAxis] + (hasBatchim(AXIS_LABEL[weakAxis])?'은':'는') + ' ' + weakB.region + '과 관련이 깊은데, ' + weakB.desc + ' 즉 지금의 낮은 ' + AXIS_LABEL[weakAxis] + ' 점수는 고정된 한계가 아니라, 짧고 반복적인 훈련으로 충분히 개선 가능한 영역이라는 뜻이에요.');
      setHTML('pf-learning-brainsci-en', cap(AXIS_LABEL_EN[topAxis]) + ' is closely tied to ' + topBEn.region + ', which ' + topBEn.desc + ' ' +
        cap(AXIS_LABEL_EN[weakAxis]) + ' is closely related to ' + weakBEn.region + ', which ' + weakBEn.desc + ' In other words, today\'s lower ' + AXIS_LABEL_EN[weakAxis] + ' score isn\'t a fixed ceiling — it\'s an area that can meaningfully improve with short, repeated training.');
    }

    // 패치: 주간루틴표 3열·절차체크카드 안내문·자기대화 스크립트가 항상 "순차처리/계획력" 전제로
    // 고정이었던 것을 실제 약점축(weakAxis) 기준으로 교체 (KO+EN)
    const ROUTINE_COL3 = { P:'계획 점검 (15분)', A:'몰입 훈련 (15분)', S:'전체 그림 그리기 (15분)', Q:'순차 훈련 (15분)', BAL:'상황별 접근 훈련 (15분)' };
    const ROUTINE_COL3_EN = { P:'Planning check-in (15 min)', A:'Focus training (15 min)', S:'Big-picture mapping (15 min)', Q:'Sequencing practice (15 min)', BAL:'Situational-approach practice (15 min)' };
    const ROUTINE_ITEMS = {
      P: ['이번 주 계획표 다시 점검', '계획 대비 진행률 체크', '다음 주 계획 초안 잡기', '틀어진 계획 원인 분석', '주간 계획 총점검'],
      A: ['25분 몰입 타이머 연습', '몰입 방해요소 기록', '집중 잘된 시간대 찾기', '몰입 루틴 복기', '이번 주 몰입 기록 정리'],
      S: ['오늘 배운 내용 마인드맵', '단원 전체 구조 그리기', '흩어진 개념 하나로 묶기', '전체 요약 1장 만들기', '주간 큰그림 점검'],
      Q: ['오늘 할 일 순서표 쓰기', '검산 체크카드 연습', '실험보고서 순서카드', '오답노트 단계분류', '주간 목표 점검'],
      BAL: ['오늘 어떤 방식이 잘 맞을지 정하기', '짧은 과제 하나 끝까지 완료', '다른 방식으로 다시 시도해보기', '이번 주 시도한 방식 되돌아보기', '주간 목표 점검']
    };
    const ROUTINE_ITEMS_EN = {
      P: ["Review this week's plan", 'Check progress vs plan', "Draft next week's plan", 'Analyze why a plan slipped', 'Weekly plan review'],
      A: ['Practice a 25-min focus timer', 'Log focus distractions', 'Find your best focus hours', 'Review focus routine', "Summarize this week's focus log"],
      S: ["Mind-map today's material", 'Draw the whole unit structure', 'Merge scattered concepts into one', 'Make a 1-page summary', 'Weekly big-picture review'],
      Q: ["Write today's to-do order", 'Double-check card practice', 'Lab-report order card', 'Sort error log by step skipped', 'Weekly goal review'],
      BAL: ['Decide which approach fits today', 'Complete one short task fully', 'Try a different approach and compare', "Review this week's approaches", 'Weekly goal review']
    };
    setText('pf-routine-col3', ROUTINE_COL3[weakAxis]);
    setText('pf-routine-col3-en', ROUTINE_COL3_EN[weakAxis]);
    ['mon','tue','wed','thu','fri'].forEach(function(day, i){
      setText('pf-routine-' + day, ROUTINE_ITEMS[weakAxis][i]);
      setText('pf-routine-' + day + '-en', ROUTINE_ITEMS_EN[weakAxis][i]);
    });
    const CHECKCARD_TITLE = { P:'✅ 계획 점검 카드 3종', A:'✅ 몰입 유지 카드 3종', S:'✅ 전체구조화 카드 3종', Q:'✅ 절차 체크카드 3종', BAL:'✅ 상황별 접근 카드 3종' };
    const CHECKCARD_TITLE_EN = { P:'✅ 3 Planning Check Cards', A:'✅ 3 Focus-Building Cards', S:'✅ 3 Big-Picture Cards', Q:'✅ 3 Procedure Checklist Cards', BAL:'✅ 3 Situational-Approach Cards' };
    const CHECKCARD_INTRO = {
      P:'아래 3종은 원래 순서 점검용 카드예요. 계획 단계를 점검하는 방식으로 응용해보세요 — 예: 시작 전 "이 계획이 현실적인지" 먼저 점검.',
      A:'아래 3종은 원래 순서 점검용 카드예요. 몰입을 유지하는 체크포인트로 응용해보세요 — 예: 각 단계 사이 "아직 집중되고 있는지" 점검.',
      S:'아래 3종은 원래 순서 점검용 카드예요. 전체 그림을 놓치지 않도록 응용해보세요 — 예: 각 단계 전 "전체 흐름에서 지금 어디인지" 먼저 그려보기.',
      Q:'이 3종은 순서·절차를 점검하는 카드예요. 아래 3개 예시는 과목별 활용법이니, 그대로 따라 해보세요.',
      BAL:'아래 3종은 원래 순서 점검용 카드예요. 매 단계마다 어떤 접근이 잘 맞는지 점검하는 방식으로 응용해보세요 — 예: 시작 전 "이번엔 어떤 방식이 좋을까" 먼저 점검.'
    };
    const CHECKCARD_INTRO_EN = {
      P:'These 3 cards were designed for order-checking. Adapt them into planning checkpoints — e.g., before starting, check "is this plan realistic?"',
      A:'These 3 cards were designed for order-checking. Adapt them into focus checkpoints — e.g., between steps, check "am I still locked in?"',
      S:'These 3 cards were designed for order-checking. Adapt them to keep the big picture in view — e.g., before each step, sketch "where does this fit in the whole?"',
      BAL:'These 3 cards were designed for order-checking. Adapt them into a check on which approach fits — e.g., before starting, ask "which method works best this time?"',
      Q:'These 3 cards check order and procedure. The examples below are by subject — follow them as-is.'
    };
    setText('pf-checkcard-title', CHECKCARD_TITLE[weakAxis]);
    setText('pf-checkcard-title-en', CHECKCARD_TITLE_EN[weakAxis]);
    setText('pf-checkcard-intro', CHECKCARD_INTRO[weakAxis]);
    setText('pf-checkcard-intro-en', CHECKCARD_INTRO_EN[weakAxis]);
    const SELFTALK1 = { P:'<b>계획이 틀어졌을 때</b> — "이것도 하나의 정보야. 다시 세워보자."', A:'<b>집중이 흐트러졌을 때</b> — "잠깐 쉬었다가 다시 시작해도 괜찮아."', S:'<b>생각이 정리 안 될 때</b> — "하나씩 적어보면서 정리해보자."', Q:'<b>순서가 헷갈릴 때</b> — "처음부터 하나씩 다시 확인해보자."', BAL:'<b>어떤 방식이 맞을지 헷갈릴 때</b> — "일단 하나 골라서 해보고, 안 맞으면 바꿔보자."' };
    const SELFTALK2 = { P:'<b>목표가 흐릿해질 때</b> — "지금 이 순간 가장 중요한 한 가지는 뭘까?"', A:'<b>지루해서 몰입이 안 될 때</b> — "딱 5분만 더 해보고 판단하자."', S:'<b>전체가 안 보일 때</b> — "지금까지 한 걸 한 문장으로 요약하면?"', Q:'<b>순서를 건너뛰었을 때</b> — "어떤 순서로 했는지 나 스스로에게 설명해볼까?"', BAL:'<b>여러 방식 중 뭘 골라야 할지 모를 때</b> — "지금 상황에 제일 잘 맞는 건 어떤 걸까?"' };
    const SELFTALK1_EN = { P:'<b>When a plan falls apart</b> — "This is just new information. Let\'s re-plan."', A:'<b>When focus slips</b> — "It\'s okay to pause and restart."', S:'<b>When thoughts feel jumbled</b> — "Let\'s write it down one piece at a time."', Q:'<b>When the order gets confusing</b> — "Let\'s check it again from the start, step by step."', BAL:'<b>When it\'s unclear which approach to use</b> — "Let\'s just pick one and adjust if it doesn\'t work."' };
    const SELFTALK2_EN = { P:'<b>When the goal feels blurry</b> — "What\'s the one thing that matters most right now?"', A:'<b>When it\'s hard to stay locked in</b> — "Just 5 more minutes, then decide."', S:'<b>When the big picture is hard to see</b> — "Can I sum up what I\'ve done so far in one sentence?"', Q:'<b>When a step gets skipped</b> — "Can I explain to myself what order I did this in?"', BAL:'<b>When unsure which of several approaches to use</b> — "Which one fits this situation best?"' };
    setHTML('pf-selftalk1', SELFTALK1[weakAxis]);
    setHTML('pf-selftalk2', SELFTALK2[weakAxis]);
    setHTML('pf-selftalk1-en', SELFTALK1_EN[weakAxis]);
    setHTML('pf-selftalk2-en', SELFTALK2_EN[weakAxis]);
  }

  function render(PROFILE) {
    applyIdentity(PROFILE);
    applyScores(PROFILE);
    applyCombo(PROFILE);
    applyEfficiency(PROFILE);
    applyOpinionAndEmotional(PROFILE);
    applyMatrixDeptCreditJobs(PROFILE);
    applyParentAndExpert(PROFILE);
    applyMissionSelfcheck(PROFILE);
    applyAdmissions(PROFILE);
    applyFaq(PROFILE);
    applyLearning(PROFILE);
    applyProfile81(PROFILE);
  }

  global.DCasTeenEngine = { render: render, applyProfile81: applyProfile81, setProfile81Language: setProfile81Language };

})(typeof window !== 'undefined' ? window : globalThis);
