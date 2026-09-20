(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const guide = window.FEELGOOD_GUIDE_DATA || {groups: []};
  const pages = guide.groups.flatMap(group => group.pages.map(page => ({...page, groupId: group.id, groupTitle: group.title})));
  const pageMap = new Map(pages.map(page => [page.id, page]));
  const groupMap = new Map(guide.groups.map(group => [group.id, group]));
  const rootRoutes = new Set(guide.groups.map(group => group.id));
  const levelCodes = {상: 'H', 중: 'M', 하: 'L'};

  const REPORT_LINKS = {
    kpass: 'https://service.feel-good.io/api/v1/kpass/user/test-result/22599/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0NyIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.Lb3fK2yJlR4DNjHOg_GUgDvalnj8k9rbCPH5OKUTQ1eFeaWX0pBJuYx_M-lPtJl9gBlxYmRLASYCjo9HjVKoyg?lang=ko',
    teen: 'https://service.feel-good.io/api/v1/dcas/user/test-result/22600/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0OCIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.uyPtW9bRKA1sfnTxzvGAlTQ_4fpaQTHTDn1Uvi36El_St9-_IfO7MC360ORcE0oVzHO6IjvmcNOhMOlisVbhVg?lang=ko',
    adult: 'https://service.feel-good.io/api/v1/dcas/user/test-result/22601/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0OSIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.6V-I1PNXCnS5MmdYU2X1x0AUBHxRVuYEltjIePUxi429hWYaPZ9omoo8HZ62LqKB-mWnhXeKCzBvh65ND8fanw?lang=ko'
  };
  const CLASS_DASHBOARD_URL = 'https://goldensge22-design.github.io/feelgood-app/PASS_report_KNUE_Jeungpyeong_FeelGood_12lang_v3.html?lang=ko';
  const LEGACY_HASHES = {
    opening: 'assessment', guide: 'assessment-report', evidence: 'assessment-evidence', pass: 'assessment-pass',
    pathways: 'assessment-ages', results: 'assessment-report', levels: 'assessment-levels', profiles: 'assessment-profiles',
    teacher: 'school-instruction', dashboard: 'school-dashboard', parents: 'school-counseling', support: 'school-followup', closing: 'nuvia-effect'
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  }

  function closeToc(returnFocus = false) {
    $('#tocPanel').classList.remove('open');
    $('#tocOverlay').hidden = true;
    $('#tocToggle').setAttribute('aria-expanded', 'false');
    if (returnFocus) $('#tocToggle').focus();
  }

  function openToc() {
    $('#tocPanel').classList.add('open');
    $('#tocOverlay').hidden = false;
    $('#tocToggle').setAttribute('aria-expanded', 'true');
    $('#tocClose').focus();
  }

  function renderToc() {
    $('#tocNav').innerHTML = guide.groups.map((group, groupIndex) => {
      const items = group.pages.map((page, pageIndex) =>
        '<a href="#' + escapeHtml(page.id) + '" data-route="' + escapeHtml(page.id) + '">' +
        '<span>' + String(pageIndex + 1).padStart(2, '0') + '</span>' + escapeHtml(page.title) + '</a>'
      ).join('');
      return '<section class="toc-group" data-group="' + escapeHtml(group.id) + '">' +
        '<button class="toc-group-button" type="button" aria-expanded="false" aria-controls="toc-sub-' + escapeHtml(group.id) + '" data-group-route="' + escapeHtml(group.id) + '">' +
        '<span>' + String(groupIndex + 1).padStart(2, '0') + '</span><b>' + escapeHtml(group.title) + '</b><i aria-hidden="true">⌄</i></button>' +
        '<div id="toc-sub-' + escapeHtml(group.id) + '" class="toc-subnav" hidden>' + items + '</div></section>';
    }).join('');
  }

  function requestedRoute() {
    const raw = decodeURIComponent(location.hash.slice(1));
    const route = LEGACY_HASHES[raw] || raw;
    return pageMap.has(route) ? route : null;
  }

  function navigate(route) {
    if (!pageMap.has(route)) return;
    if (location.hash === '#' + route) renderRoute(route, true);
    else location.hash = route;
  }

  function syncAccordion(activePage) {
    $$('.toc-group').forEach(section => {
      const open = section.dataset.group === activePage.groupId;
      const button = $('.toc-group-button', section);
      const subnav = $('.toc-subnav', section);
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('is-active', open);
      if (open && rootRoutes.has(activePage.id)) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      subnav.hidden = !open;
    });
    $$('#tocNav [data-route]').forEach(link => {
      if (link.dataset.route === activePage.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function fallbackBuildProfile(levels) {
    const names = {planning:'계획',attention:'주의',simultaneous:'동시처리',successive:'순차처리'};
    const codes = {planning:'P',attention:'A',simultaneous:'S',successive:'Q'};
    const labels = {H:'상',M:'중',L:'하'};
    const keys = Object.keys(names);
    const high = keys.filter(key => levels[key] === 'H').map(key => names[key]);
    const low = keys.filter(key => levels[key] === 'L').map(key => names[key]);
    const code = keys.map(key => codes[key] + '-' + levels[key]).join(' / ');
    const allLow = low.length === 4;
    return {
      code,
      levels: Object.fromEntries(keys.map(key => [names[key], labels[levels[key]]])),
      summary: high.length ? high.join('·') + ' 과정은 상대적으로 편하고 ' + (low.length ? low.join('·') + ' 과정에는 더 명시적인 구조가 필요할 수 있습니다.' : '과제에 따라 다양한 전략을 활용할 수 있습니다.') : '네 영역의 현재 수행 조건과 실제 교실 관찰을 함께 확인합니다.',
      strengths: high.length ? high.join('·') + ' 영역과 관련된 과제 조건에서 강점이 기대됩니다.' : '익숙한 과제와 적절한 지원 조건에서 안정적인 전략 사용을 확인합니다.',
      classroom: '<li>과제 시작, 집중 유지, 전체 구조 이해, 절차 수행을 각각 관찰합니다.</li>',
      support: low.length ? low.join('·') + ' 영역의 부담을 줄이는 설명과 자료를 제공합니다.' : '과제 난이도와 환경에 따라 필요한 지원이 달라질 수 있습니다.',
      teaching: '<li>전체 구조, 핵심 표시, 단계 안내와 중간 점검을 조합합니다.</li>',
      assignment: '<li>완료 기준과 도움 사용 방법이 명확한 과제를 제시합니다.</li>',
      feedback: '“사용한 전략과 도움이 된 조건을 함께 확인해 보자.”',
      nuvia: '가장 필요한 한 영역의 짧은 전략 활동부터 추천하고 부담을 확인합니다.',
      cautions: [allLow ? '네 영역 모두에서 지속적으로 낮은 수행이 확인된다면 검사 당시의 피로, 긴장, 언어 이해, 검사 환경과 참여 상태를 먼저 확인해야 합니다. 수업 관찰과 상담에서도 어려움이 반복될 경우, 학생을 단정하기보다 보호자와 협의하여 전문기관의 종합적인 평가와 지원을 받아보는 것이 좋습니다.' : '기본 규칙 엔진의 오프라인 설명입니다. 학생을 단정하지 않고 실제 관찰과 상담을 함께 확인합니다.']
    };
  }

  function profileMarkup(profile) {
    const levelChips = Object.entries(profile.levels).map(([name, level]) => '<span><b>' + escapeHtml(name) + '</b> ' + escapeHtml(level) + '</span>').join('');
    const cautions = profile.cautions.map(item => '<li>' + escapeHtml(item) + '</li>').join('');
    return '<div class="profile-result-head"><div><p class="result-label">선택한 PASS 조합</p><div class="profile-levels">' + levelChips + '</div></div><code>' + escapeHtml(profile.code) + '</code></div>' +
      '<div class="profile-result-grid">' +
      '<article><h3>한눈에 보는 인지처리 특징</h3><p>' + escapeHtml(profile.summary) + '</p></article>' +
      '<article><h3>기대되는 강점</h3><p>' + escapeHtml(profile.strengths) + '</p></article>' +
      '<article><h3>학교에서 관찰될 수 있는 모습</h3><ul>' + profile.classroom + '</ul></article>' +
      '<article><h3>도움이 필요한 상황</h3><p>' + escapeHtml(profile.support) + '</p></article>' +
      '<article><h3>수업 설계 방법</h3><ul>' + profile.teaching + '</ul></article>' +
      '<article><h3>과제 제시 방법</h3><ul>' + profile.assignment + '</ul></article>' +
      '<article><h3>교사가 사용할 수 있는 피드백 문장</h3><p>' + profile.feedback + '</p></article>' +
      '<article><h3>NUVIA 가정훈련 연결 방향</h3><p>' + escapeHtml(profile.nuvia) + '</p></article></div>' +
      '<aside class="guide-note warning"><h3>해석 시 주의사항</h3><ul>' + cautions + '</ul><p>자동 설명은 교사의 관찰과 상담을 돕는 참고자료이며, 학생의 성격·능력·진로를 확정하지 않습니다.</p></aside>';
  }

  function setupProfileExplorer(host) {
    host.innerHTML = '<form id="profileForm" class="profile-form"><div class="profile-controls">' +
      ['planning:계획','attention:주의','simultaneous:동시처리','successive:순차처리'].map(item => {
        const [key, label] = item.split(':');
        return '<label>' + label + '<select name="' + key + '"><option value="H">상</option><option value="M" selected>중</option><option value="L">하</option></select></label>';
      }).join('') + '</div><div class="profile-actions"><button class="button gold" type="submit">적용하고 설명 보기</button><button id="resetProfile" class="button line" type="button">초기화</button></div></form>' +
      '<p id="profileEngineNotice" class="engine-notice">이 설명은 생성형 AI가 아니라, PASS 네 영역의 상·중·하 조합에 따라 사전에 설계된 해석 규칙을 자동 적용한 결과입니다.</p>' +
      '<p id="profileDirty" class="result-count" aria-live="polite"></p><div id="profileResult" class="profile-result" aria-live="polite"></div>';
    const form = $('#profileForm', host);
    const result = $('#profileResult', host);
    const dirty = $('#profileDirty', host);
    const selects = $$('select', form);

    function selectedLevels() {
      return Object.fromEntries(new FormData(form).entries());
    }
    function applyProfile(focusResult = false) {
      const levels = selectedLevels();
      const engine = window.FEELGOOD_PROFILE_DATA;
      const profile = engine && typeof engine.buildProfile === 'function' ? engine.buildProfile(levels) : fallbackBuildProfile(levels);
      result.innerHTML = profileMarkup(profile);
      dirty.textContent = '적용 완료 · 프로필 코드 ' + profile.code;
      if (focusResult) result.focus({preventScroll:true});
    }
    selects.forEach(select => select.addEventListener('change', () => { dirty.textContent = '선택값이 변경되었습니다. “적용하고 설명 보기”를 눌러 결과를 갱신하세요.'; }));
    selects.forEach(select => select.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      applyProfile(true);
    }));
    form.addEventListener('submit', event => { event.preventDefault(); applyProfile(true); });
    $('#resetProfile', host).addEventListener('click', () => {
      selects.forEach(select => { select.value = 'M'; });
      applyProfile();
      selects[0].focus();
    });
    result.tabIndex = -1;
    applyProfile();
  }

  function reportsMarkup() {
    return '<div class="report-grid result-report-grid">' +
      '<article class="result-card"><p class="report-label">K-PASS 아동용 결과지</p><h3>아동</h3><p>PASS 네 영역의 현재 경향과 교실·보호자 지원을 확인합니다.</p><div class="card-actions"><a href="' + REPORT_LINKS.kpass + '" data-report-link="kpass" target="_blank" rel="noopener noreferrer">결과지 샘플보기 ↗</a></div></article>' +
      '<article class="result-card"><p class="report-label">D-CAS 청소년용 결과지</p><h3>청소년</h3><p>학습 전략, 진로 탐색, 자기관리 맥락을 함께 확인합니다.</p><div class="card-actions"><a href="' + REPORT_LINKS.teen + '" data-report-link="teen" target="_blank" rel="noopener noreferrer">결과지 샘플보기 ↗</a></div></article>' +
      '<article class="result-card"><p class="report-label">D-CAS 성인용 결과지</p><h3>성인</h3><p>대학 학습, 프로젝트, 직무 수행과 생활 조건을 함께 확인합니다.</p><div class="card-actions"><a href="' + REPORT_LINKS.adult + '" data-report-link="adult" target="_blank" rel="noopener noreferrer">결과지 샘플보기 ↗</a></div></article></div>';
  }

  function dashboardMarkup() {
    return '<div class="dashboard-preview"><div class="dashboard-screen"><div class="dashboard-screen-head"><b>학급 인지 프로파일</b><span>가상 데이터 · 개인 식별정보 없음</span></div>' +
      '<div class="dashboard-grid"><article class="summary"><span>우리 반 특징</span><strong>계획·순차 강점 경향</strong><p>목표와 단계가 분명한 활동에서 안정적인 참여가 기대됩니다.</p></article><article class="summary"><span>공통 지원 영역</span><strong>전체 구조 먼저</strong><p>관계도와 완성 예시를 수업 도입에 제공합니다.</p></article><article class="summary"><span>추가 관찰</span><strong>동시처리 부담</strong><p>여러 수업의 실제 과제 장면으로 교차 확인합니다.</p></article></div>' +
      '<div class="chart-card"><h3>PASS 영역 분포 · 가상 데이터</h3><div class="bars"><div><span>계획</span><i class="bar-plan" style="--v:68%"></i><b>강점</b></div><div><span>주의</span><i class="bar-attention" style="--v:56%"></i><b>일반</b></div><div><span>동시</span><i class="bar-simultaneous" style="--v:42%"></i><b>관찰</b></div><div><span>순차</span><i class="bar-successive" style="--v:61%"></i><b>강점</b></div></div></div></div>' +
      '<aside class="dashboard-message"><p>30명의 검사 결과가<br>30개의 결과지로 끝나지 않습니다.</p><strong>학급 전체의 인지 데이터를 교사가 활용할 수 있는 정보로 바꿉니다.</strong><a class="button gold external-dashboard-link" href="' + CLASS_DASHBOARD_URL + '" target="_blank" rel="noopener noreferrer">실제 대시보드 예시 들어가기 ↗</a></aside></div>' +
      '<div class="dashboard-use-grid"><article><h3>학급 수업 설계</h3><p>설명식·시각식·단계식 활동의 비율을 조정하고 공통적으로 낮은 영역에 보조를 제공합니다.</p></article><article><h3>모둠과 개인 과제</h3><p>서로 다른 인지 강점을 활용하되 역할을 고정하지 않고 학생별 난이도와 제시 방식을 조정합니다.</p></article><article><h3>변화 확인</h3><p>재검사와 수업 관찰로 변화와 지원 효과를 확인합니다.</p></article></div>' +
      '<aside class="guide-note warning"><h3>대시보드 활용 금지 사항</h3><p>학급 결과를 학생의 서열화, 반 편성, 낙인, 능력 고정 또는 교육 기회 제한에 사용해서는 안 됩니다.</p></aside>';
  }

  function strengthAnalysisMarkup() {
    const data = [
      ['plan','계획이 강한 학생','목표 설정과 전략 선택 · 문제 해결 순서 설계 · 자기점검과 오류 수정','프로젝트에서 방법을 제안하고 수행 중 전략을 바꾸거나 풀이 과정을 설명할 수 있습니다.','프로젝트 기획 · 개방형 과제 · 탐구 활동 · 자기주도학습','여러 해결 방법 비교 · 학습 계획표 · 전략 설계 역할 · 풀이 과정 설명'],
      ['attention','주의가 강한 학생','선택적·지속적 주의 · 방해 자극 통제 · 정확성과 세부 확인 · 규칙 탐지','핵심 정보를 오래 유지하고 세부 차이나 오류를 찾아 교정하는 모습이 나타날 수 있습니다.','관찰 · 검토 · 교정 · 핵심 정보 찾기 · 세부 차이 비교','검토자 역할 · 핵심 정보 표시 · 시간과 정확성이 필요한 과제 · 오류 찾기'],
      ['simultaneous','동시처리가 강한 학생','전체 구조 파악 · 시각·공간 통합 · 도형·패턴 · 정보 관계 · 문맥 이해','여러 자료의 관계를 빠르게 연결하고 전체 개념이나 공간 구조로 설명할 수 있습니다.','그림·도식·마인드맵 · 자료 관계 찾기 · 공간·디자인·구조화','전체 개념 먼저 · 관계 비교 · 시각 자료 · 개념 연결과 종합 과제'],
      ['successive','순차처리가 강한 학생','순서 기억 · 단계 처리 · 절차 수행 · 음운·언어 계열 · 규칙적 연산','단계별 설명과 절차를 안정적으로 따르고 말·읽기·쓰기의 순서를 유지할 수 있습니다.','절차표 · 단계별 설명 · 순차적 문제 해결 · 시간 순서 파악','단계별 지시 · 체크리스트 · 순서 훈련 · 절차 설명과 복창']
    ];
    return '<div class="strength-grid">' + data.map(item => '<article class="strength-card ' + item[0] + '"><h3>' + item[1] + '</h3><dl><dt>1. 강점이 나타나는 정보처리 방식</dt><dd>' + item[2] + '</dd><dt>2. 학교에서 관찰될 수 있는 모습</dt><dd>' + item[3] + '</dd><dt>3. 뛰어난 수행이 기대되는 학습 활동</dt><dd>' + item[4] + '</dd><dt>4. 교사가 제공할 수 있는 수업 환경</dt><dd>' + item[5] + '</dd></dl></article>').join('') + '</div>' +
      '<aside class="guide-note warning"><h3>직업·진로를 단정하지 않습니다</h3><p>PASS 영역은 직업 적성을 직접 확정하는 검사가 아니라 더 효과적으로 수행할 수 있는 과제 조건과 정보처리 환경을 보여 주는 자료입니다. 한 영역만 보지 않고 네 영역의 조합과 개인 내 차이를 함께 보며, 진로·적성은 흥미, 가치관, 성취도, 경험, 환경 및 면담 자료와 함께 해석합니다.</p></aside>';
  }

  function enhancePage() {
    const profileHost = $('[data-profile-explorer]');
    if (profileHost) setupProfileExplorer(profileHost);
    const reportHost = $('[data-report-links]');
    if (reportHost) reportHost.innerHTML = reportsMarkup();
    const dashboardHost = $('[data-class-dashboard]');
    if (dashboardHost) dashboardHost.innerHTML = dashboardMarkup();
    const strengthsHost = $('[data-strength-analysis]');
    if (strengthsHost) strengthsHost.innerHTML = strengthAnalysisMarkup();
    $$('[data-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.go)));
  }

  function renderRoute(route, focus = false) {
    const page = pageMap.get(route);
    if (!page) return;
    const index = pages.findIndex(item => item.id === route);
    const content = $('#chapterContent');
    content.dataset.route = route;
    content.innerHTML = route === 'assessment'
      ? page.content
      : '<div class="chapter-intro"><p class="eyebrow">' + page.eyebrow + '</p><p class="chapter-path">' + escapeHtml(page.groupTitle) + ' · ' + String(groupMap.get(page.groupId).pages.findIndex(item => item.id === route) + 1).padStart(2, '0') + '</p><h2>' + escapeHtml(page.title) + '</h2><p>' + escapeHtml(page.intro) + '</p></div><div class="chapter-body">' + page.content + '</div>';
    enhancePage();
    syncAccordion(page);
    $('#groupLabel').textContent = page.groupTitle;
    $('#pageLabel').textContent = page.title;
    $('#chapterNumber').textContent = String(index + 1).padStart(2, '0');
    $('#chapterTotal').textContent = String(pages.length);
    $('#chapterProgress').style.width = String(((index + 1) / pages.length) * 100) + '%';
    $('#paginationLabel').textContent = String(index + 1) + ' / ' + pages.length + ' · ' + page.groupTitle + ' · ' + page.title;
    $('#previousChapter').disabled = index === 0;
    $('#nextChapter').disabled = index === pages.length - 1;
    $('#previousChapter').dataset.route = pages[index - 1]?.id || '';
    $('#nextChapter').dataset.route = pages[index + 1]?.id || '';
    document.title = page.title + ' | ' + page.groupTitle + ' | FeelGood';
    $('#reader').scrollTo({top:0,behavior:'auto'});
    closeToc();
    if (focus) content.focus({preventScroll:true});
  }

  function syncFromLocation(focus = false) {
    const route = requestedRoute();
    if (!route) {
      history.replaceState(null, '', '#assessment');
      renderRoute('assessment', focus);
      return;
    }
    renderRoute(route, focus);
  }

  function setupLanguages() {
    const languages = Array.isArray(window.FEELGOOD_LANGUAGES) ? window.FEELGOOD_LANGUAGES : [{code:'ko',label:'한국어',status:'ready'}];
    const options = languages.map(language => '<option value="' + escapeHtml(language.code) + '" data-status="' + escapeHtml(language.status) + '">' + escapeHtml(language.label) + '</option>').join('');
    const selects = $$('[data-language-select]');
    selects.forEach(select => { select.innerHTML = options; });
    selects.forEach(select => select.addEventListener('change', () => {
      const code = select.value;
      selects.forEach(other => { other.value = code; });
      const pending = select.selectedOptions[0].dataset.status !== 'ready';
      $('#translationNotice').hidden = !pending;
      document.documentElement.lang = pending ? 'ko' : code;
      document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    }));
  }

  $('#tocNav').addEventListener('click', event => {
    const groupButton = event.target.closest('[data-group-route]');
    if (groupButton) {
      navigate(groupButton.dataset.groupRoute);
      return;
    }
    const link = event.target.closest('[data-route]');
    if (!link) return;
    event.preventDefault();
    navigate(link.dataset.route);
  });
  ['#previousChapter','#nextChapter'].forEach(selector => $(selector).addEventListener('click', event => navigate(event.currentTarget.dataset.route)));
  $('#tocToggle').addEventListener('click', () => $('#tocPanel').classList.contains('open') ? closeToc(true) : openToc());
  $('#tocClose').addEventListener('click', () => closeToc(true));
  $('#tocOverlay').addEventListener('click', () => closeToc(true));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('#tocPanel').classList.contains('open')) closeToc(true); });
  window.addEventListener('hashchange', () => syncFromLocation(true));

  renderToc();
  setupLanguages();
  syncFromLocation();
})();
