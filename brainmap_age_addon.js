// ============================================================
//  BrainMap v5 → 연령별 A+B 혼합 애드온
//  붙여넣기 위치: 기존 applyKorean(); 바로 아래, })(); 바로 위
//
//  지원 URL 파라미터:
//    ?name=서우&age=9&p=145&a=131&s=117&su=95&lang=ko&country=korea
//  모든 파라미터 선택사항 — 없으면 기존 하드코딩 값 그대로 사용
// ============================================================

// ── 1. URL 파라미터 파싱 ──────────────────────────────────────
(function() {
  var params = new URLSearchParams(location.search);

  var pName    = params.get('name');      // 학생 이름
  var pAge     = parseInt(params.get('age')) || null;   // 나이 (숫자)
  var pP       = parseInt(params.get('p'))   || null;   // Planning SS
  var pA       = parseInt(params.get('a'))   || null;   // Attention SS
  var pS       = parseInt(params.get('s'))   || null;   // Simultaneous SS
  var pSu      = parseInt(params.get('su'))  || null;   // Successive SS
  var pLang    = params.get('lang') || 'ko';            // ko / en
  var pCountry = params.get('country') || 'korea';

  // 파라미터가 하나도 없으면 애드온 실행 안 함 (기존 하드코딩 유지)
  if (!pName && !pAge && !pP) return;

  // ── 2. 연령 구간 판별 (A안 핵심) ───────────────────────────
  // 구간: 'baby'(5~7), 'junior'(8~10), 'middle'(11~13), 'senior'(14+)
  function getAgeGroup(age) {
    if (!age) return 'junior';
    if (age <= 7)  return 'baby';
    if (age <= 10) return 'junior';
    if (age <= 13) return 'middle';
    return 'senior';
  }
  var ageGroup = getAgeGroup(pAge);

  // ── 3. 연령별 UI 프리셋 즉시 적용 (A안) ─────────────────────
  var PRESET = {
    baby: {
      // 5~7세: 큰 글씨, 이모지 강조, 선택지 2개
      fontSize:   '16px',
      passStyle:  'star',      // ⭐ 별 표시
      choiceCount: 2,
      labelP:  pLang==='ko' ? '계획' : 'Plan',
      labelA:  pLang==='ko' ? '주의' : 'Attn',
      labelS:  pLang==='ko' ? '통합' : 'Simul',
      labelSu: pLang==='ko' ? '순서' : 'Succ',
      dilChoices: 2
    },
    junior: {
      // 8~10세: 현재 v5 수준 (변경 최소)
      fontSize:   '14px',
      passStyle:  'badge',     // PS↑ / PW↓
      labelP:  pLang==='ko' ? '계획력' : 'Planning',
      labelA:  pLang==='ko' ? '주의집중' : 'Attention',
      labelS:  pLang==='ko' ? '동시처리' : 'Simult.',
      labelSu: pLang==='ko' ? '순차처리' : 'Success.',
      dilChoices: 3
    },
    middle: {
      // 11~13세: SS 수치 + 등급 병기
      fontSize:   '14px',
      passStyle:  'ss',        // SS 112 · 평균상
      labelP:  pLang==='ko' ? '계획처리' : 'Planning',
      labelA:  pLang==='ko' ? '주의처리' : 'Attention',
      labelS:  pLang==='ko' ? '동시처리' : 'Simultaneous',
      labelSu: pLang==='ko' ? '순차처리' : 'Successive',
      dilChoices: 3
    },
    senior: {
      // 14세+: SS + 백분위 + 전문 용어
      fontSize:   '14px',
      passStyle:  'full',      // SS 145 (PR 99) 우수
      labelP:  pLang==='ko' ? '계획처리(Planning)' : 'Planning',
      labelA:  pLang==='ko' ? '주의처리(Attention)' : 'Attention',
      labelS:  pLang==='ko' ? '동시처리(Simultaneous)' : 'Simultaneous',
      labelSu: pLang==='ko' ? '순차처리(Successive)' : 'Successive',
      dilChoices: 4
    }
  };
  var preset = PRESET[ageGroup];

  // SS → 별 개수 (5~7세용)
  function ssToStars(ss) {
    if (!ss) return '⭐⭐⭐';
    if (ss >= 120) return '⭐⭐⭐⭐⭐';
    if (ss >= 110) return '⭐⭐⭐⭐';
    if (ss >= 90)  return '⭐⭐⭐';
    if (ss >= 80)  return '⭐⭐';
    return '⭐';
  }

  // SS → 등급 텍스트
  function ssToGrade(ss, lang) {
    if (!ss) return '';
    if (lang === 'ko') {
      if (ss >= 120) return '우수';
      if (ss >= 110) return '평균상';
      if (ss >= 90)  return '평균';
      if (ss >= 80)  return '평균하';
      return '약점';
    } else {
      if (ss >= 120) return 'Superior';
      if (ss >= 110) return 'Avg+';
      if (ss >= 90)  return 'Average';
      if (ss >= 80)  return 'Avg-';
      return 'Weak';
    }
  }

  // SS → 백분위 근사
  function ssToPR(ss) {
    if (!ss) return '';
    var table = {145:99,135:99,130:98,125:95,120:91,115:84,110:75,105:63,100:50,95:37,90:25,85:16,80:9,75:5,70:2};
    var keys = Object.keys(table).map(Number).sort(function(a,b){return b-a;});
    for (var i=0;i<keys.length;i++) { if (ss >= keys[i]) return table[keys[i]]; }
    return 1;
  }

  // PASS 값 표시 문자열 생성
  function passDisplay(ss, domain, lang) {
    if (!ss) return '';
    var isStrength = ss >= 110;
    var isWeakness = ss <= 89;
    switch (preset.passStyle) {
      case 'star':
        return ssToStars(ss);
      case 'badge':
        if (isStrength) return ss + (lang==='ko'?' PS↑':' PS↑');
        if (isWeakness) return ss + (lang==='ko'?' PW↓':' PW↓');
        return ss + (lang==='ko'?' 평균':' Avg');
      case 'ss':
        return 'SS ' + ss + ' · ' + ssToGrade(ss, lang);
      case 'full':
        return 'SS ' + ss + ' (PR ' + ssToPR(ss) + ') ' + ssToGrade(ss, lang);
      default:
        return String(ss);
    }
  }

  // ── 4. DOM 업데이트 (A안 즉시 반영) ─────────────────────────

  // 이름 반영
  if (pName) {
    var tbName = document.querySelector('.tb-name');
    if (tbName) tbName.textContent = pName;
    // 감정 카드 제목의 이름도 교체
    document.querySelectorAll('.card div, .screen div').forEach(function(d) {
      if (d.children.length === 0) {
        d.textContent = d.textContent
          .replace('Seowoo', pName)
          .replace('서우', pName)
          .replace('서우야', pName + (pLang==='ko'?'야':''));
      }
    });
  }

  // 나이 표시
  if (pAge) {
    var tbType = document.querySelector('.tb-type');
    if (tbType) {
      var brainType = tbType.textContent.split('·')[0].trim();
      tbType.textContent = brainType + ' · ' + (pLang==='ko' ? pAge + '세' : 'Age ' + pAge);
    }
  }

  // PASS 점수 표시 업데이트
  var passVals = document.querySelectorAll('.pval');
  var passLbls = document.querySelectorAll('.plbl');
  var scoreMap = [
    { ss: pP,  lbl: preset.labelP  },
    { ss: pA,  lbl: preset.labelA  },
    { ss: pS,  lbl: preset.labelS  },
    { ss: pSu, lbl: preset.labelSu }
  ];
  scoreMap.forEach(function(item, i) {
    if (passLbls[i] && item.lbl) passLbls[i].textContent = item.lbl;
    if (passVals[i] && item.ss)  passVals[i].textContent = passDisplay(item.ss, i, pLang);
  });

  // 5~7세: 폰트 크기 확대
  if (ageGroup === 'baby') {
    document.querySelector('.scroll').style.fontSize = '16px';
    document.querySelectorAll('.mtit').forEach(function(t){ t.style.fontSize='15px'; });
    document.querySelectorAll('.eb .ei').forEach(function(t){ t.style.fontSize='28px'; });
  }

  // 14세+: 탑바에 소형 SS 요약 배지 추가
  if (ageGroup === 'senior' && pP) {
    var tbXp = document.querySelector('.tb-xp');
    if (tbXp) {
      var badge = document.createElement('div');
      badge.style.cssText = 'font-size:9px;color:var(--sub);text-align:right;margin-top:2px;letter-spacing:.3px';
      badge.textContent = 'P:'+pP+' A:'+(pA||'-')+' S:'+(pS||'-')+' Su:'+(pSu||'-');
      tbXp.appendChild(badge);
    }
  }

  // ── 5. Claude API 콘텐츠 생성 (B안) ───────────────────────
  // API 키가 localStorage에 없으면 조용히 skip (기존 콘텐츠 유지)
  var apiKey = localStorage.getItem('fg_api_key');
  if (!apiKey) {
    console.info('[BrainMap Age Addon] API key not set — skipping AI content generation.');
    console.info('Set API key: localStorage.setItem("fg_api_key","sk-ant-...")');
    return;
  }

  // 연령별 AI 프롬프트 전략
  var AGE_PROMPT = {
    baby: {
      tone: pLang==='ko'
        ? '유치원생('+pAge+'세)이 이해할 수 있는 아주 쉬운 단어와 짧은 문장 사용. 이모지 많이 포함.'
        : 'Use very simple words for a '+pAge+'-year-old. Short sentences. Include emoji.',
      dilChoices: 2,
      choiceLabel: pLang==='ko' ? ['선택 A','선택 B'] : ['Choice A','Choice B']
    },
    junior: {
      tone: pLang==='ko'
        ? '초등학생('+pAge+'세) 수준. 친근하고 재미있게. 철학 개념은 친숙한 상황으로 풀어서.'
        : 'Elementary level ('+pAge+'y). Friendly and fun. Explain philosophy through familiar situations.',
      dilChoices: 3,
      choiceLabel: pLang==='ko' ? ['선택 A','선택 B','선택 C'] : ['Choice A','Choice B','Choice C']
    },
    middle: {
      tone: pLang==='ko'
        ? '중학생('+pAge+'세) 수준. 추상적 개념 도입 가능. 논리적 사고 자극.'
        : 'Middle school level ('+pAge+'y). Can introduce abstract concepts. Stimulate logical thinking.',
      dilChoices: 3,
      choiceLabel: pLang==='ko' ? ['선택 A','선택 B','선택 C'] : ['Choice A','Choice B','Choice C']
    },
    senior: {
      tone: pLang==='ko'
        ? '고등학생~성인('+pAge+'세). 진로·가치관 중심. 전문 철학 용어 사용 가능. 백분위 수준 언급 가능.'
        : 'High school to adult ('+pAge+'y). Focus on career and values. Can use philosophical terminology.',
      dilChoices: 4,
      choiceLabel: pLang==='ko'
        ? ['선택 A','선택 B','선택 C','선택 D']
        : ['Choice A','Choice B','Choice C','Choice D']
    }
  };
  var ag = AGE_PROMPT[ageGroup];

  // 강점/약점 도메인 찾기
  var scores = [
    { name: pLang==='ko'?'계획처리':'Planning',   ss: pP  },
    { name: pLang==='ko'?'주의처리':'Attention',  ss: pA  },
    { name: pLang==='ko'?'동시처리':'Simultaneous', ss: pS },
    { name: pLang==='ko'?'순차처리':'Successive', ss: pSu }
  ].filter(function(x){ return !!x.ss; });
  scores.sort(function(a,b){ return b.ss - a.ss; });
  var strongest = scores[0] ? scores[0].name : (pLang==='ko'?'계획처리':'Planning');
  var weakest   = scores[scores.length-1] ? scores[scores.length-1].name : (pLang==='ko'?'순차처리':'Successive');

  var prompt = pLang === 'ko'
    ? `너는 K-PASS 인지처리 기반 두뇌 훈련 콘텐츠 생성기야.

학생 정보:
- 이름: ${pName || '학생'}
- 나이: ${pAge || '?'}세 (${ageGroup} 그룹)
- K-PASS 점수: 계획=${pP||'?'}, 주의=${pA||'?'}, 동시=${pS||'?'}, 순차=${pSu||'?'}
- 강점: ${strongest}, 약점: ${weakest}

톤: ${ag.tone}

아래 JSON만 반환 (마크다운 없이):
{
  "dilemma": {
    "situation": "학생 일상에서 일어날 수 있는 상황 (2~3문장)",
    "question": "핵심 질문 (1문장)",
    "choices": [${ag.choiceLabel.map(function(l,i){ return '"'+l+': 선택지 내용"'; }).join(', ')}],
    "hint": "${strongest}을 활용한 힌트 (1문장)"
  },
  "wisdom": {
    "quote": "오늘의 명언 (나이 수준에 맞게)",
    "source": "철학자 이름",
    "explanation": "이 나이 학생을 위한 쉬운 설명 (1~2문장)"
  },
  "mindful": {
    "guide": "마음챙김 안내 문장 (나이 수준에 맞게, 2~3문장)"
  }
}`
    : `You are a K-PASS cognitive training content generator.

Student info:
- Name: ${pName || 'Student'}
- Age: ${pAge || '?'} (${ageGroup} group)
- K-PASS: Planning=${pP||'?'}, Attention=${pA||'?'}, Simultaneous=${pS||'?'}, Successive=${pSu||'?'}
- Strength: ${strongest}, Weakness: ${weakest}

Tone: ${ag.tone}

Return ONLY this JSON (no markdown):
{
  "dilemma": {
    "situation": "A situation the student might face (2-3 sentences)",
    "question": "Core dilemma question (1 sentence)",
    "choices": [${ag.choiceLabel.map(function(l,i){ return '"'+l+': choice content"'; }).join(', ')}],
    "hint": "Hint using ${strongest} strength (1 sentence)"
  },
  "wisdom": {
    "quote": "Today's wisdom quote (age-appropriate)",
    "source": "Philosopher name",
    "explanation": "Simple explanation for this age (1-2 sentences)"
  },
  "mindful": {
    "guide": "Mindfulness guide text (age-appropriate, 2-3 sentences)"
  }
}`;

  // 로딩 상태 표시
  var wqEl = document.getElementById('wq');
  if (wqEl) wqEl.textContent = pLang==='ko' ? '✨ AI가 오늘의 지혜를 준비하고 있어요...' : '✨ Generating today\'s wisdom...';

  // Claude API 호출
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  .then(function(res) {
    if (res.status === 401) {
      localStorage.removeItem('fg_api_key');
      console.warn('[BrainMap Age Addon] API key invalid — removed from localStorage.');
      return null;
    }
    return res.json();
  })
  .then(function(data) {
    if (!data) return;
    var raw = (data.content || []).map(function(c){ return c.text || ''; }).join('');
    var clean = raw.replace(/```json|```/g, '').trim();
    var json;
    try { json = JSON.parse(clean); } catch(e) {
      console.warn('[BrainMap Age Addon] JSON parse failed:', e, raw);
      return;
    }

    // ── 명언 업데이트 ──
    if (json.wisdom) {
      var wq = document.getElementById('wq');
      var wsrc = document.getElementById('wsrc');
      var waxis = document.getElementById('waxis');
      if (wq)   wq.textContent   = '\u201c' + json.wisdom.quote + '\u201d';
      if (wsrc) wsrc.textContent = '— ' + json.wisdom.source;
      if (waxis) waxis.textContent = json.wisdom.explanation || '';
    }

    // ── 딜레마 업데이트 ──
    if (json.dilemma) {
      var d = json.dilemma;

      // 상황 텍스트
      var dpToday = document.getElementById('dp-today');
      if (dpToday) {
        var sitEl = dpToday.querySelector('[id="dil-situation"], .dil-situation');
        if (!sitEl) {
          // id 없으면 첫 번째 텍스트 div 찾아 교체
          var divs = dpToday.querySelectorAll('div');
          for (var di=0; di<divs.length; di++) {
            if (divs[di].textContent.length > 30 && divs[di].children.length === 0) {
              divs[di].textContent = d.situation;
              break;
            }
          }
        } else {
          sitEl.textContent = d.situation;
        }

        // 선택지 버튼 텍스트 교체
        var choiceBtns = dpToday.querySelectorAll('.dil-choice, [onclick*="dilChoose"]');
        if (choiceBtns.length === 0) {
          // 클래스가 다를 수 있으므로 버튼/div 중 선택지 패턴 탐색
          choiceBtns = dpToday.querySelectorAll('button, [onclick]');
        }
        d.choices.forEach(function(choiceText, idx) {
          if (choiceBtns[idx]) {
            var span = choiceBtns[idx].querySelector('span, b, strong');
            if (span) span.textContent = choiceText;
            else choiceBtns[idx].childNodes.forEach(function(n){
              if (n.nodeType === 3 && n.textContent.trim().length > 5) n.textContent = choiceText;
            });
          }
        });

        // 힌트 추가 (없으면 생성)
        var hintEl = document.getElementById('age-hint');
        if (!hintEl) {
          hintEl = document.createElement('div');
          hintEl.id = 'age-hint';
          hintEl.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;background:var(--accent-b);font-size:12px;color:var(--accent-t);line-height:1.6';
          dpToday.appendChild(hintEl);
        }
        hintEl.textContent = '💡 ' + (d.hint || '');
      }
    }

    // ── 마음챙김 안내 업데이트 ──
    if (json.mindful && json.mindful.guide) {
      var breathGuide = document.querySelector('.screen #sc-mindful p, #sc-mindful .breath-guide');
      if (!breathGuide) {
        // 호흡 안내 문장 찾기 (고정 텍스트 매칭)
        document.querySelectorAll('#sc-mindful div, #sc-mindful p').forEach(function(el) {
          if (el.children.length === 0 &&
              (el.textContent.includes('Breathe in') || el.textContent.includes('코로 숨을') || el.textContent.includes('breath'))) {
            el.textContent = json.mindful.guide;
          }
        });
      } else {
        breathGuide.textContent = json.mindful.guide;
      }
    }

    if (typeof showToast === 'function') {
      showToast(pLang==='ko' ? '✨ 오늘의 콘텐츠 준비 완료!' : '✨ Today\'s content ready!');
    }
  })
  .catch(function(err) {
    console.warn('[BrainMap Age Addon] API error:', err);
  });

})(); // end age addon
