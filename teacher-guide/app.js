const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const EXPECTED_REPORT_LINKS = {
  kpass: 'https://service.feel-good.io/api/v1/kpass/user/test-result/22599/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0NyIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.Lb3fK2yJlR4DNjHOg_GUgDvalnj8k9rbCPH5OKUTQ1eFeaWX0pBJuYx_M-lPtJl9gBlxYmRLASYCjo9HjVKoyg?lang=ko',
  teen: 'https://service.feel-good.io/api/v1/dcas/user/test-result/22600/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0OCIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.uyPtW9bRKA1sfnTxzvGAlTQ_4fpaQTHTDn1Uvi36El_St9-_IfO7MC360ORcE0oVzHO6IjvmcNOhMOlisVbhVg?lang=ko',
  adult: 'https://service.feel-good.io/api/v1/dcas/user/test-result/22601/eyJhbGciOiJIUzUxMiJ9.eyJyb2xlIjoiVVNFUiIsInVzZXJJZHgiOiIxNjM0OSIsImV4cCI6NDk0MjE4MjY2MSwiaWF0IjoxNzg4NTgyNjYxLCJqd3RUeXBlIjoiYWNjZXNzIn0.6V-I1PNXCnS5MmdYU2X1x0AUBHxRVuYEltjIePUxi429hWYaPZ9omoo8HZ62LqKB-mWnhXeKCzBvh65ND8fanw?lang=ko'
};
const DASHBOARD_COPY = {
  support: '동시처리 지원이 필요한 학생이 많은 가상 반입니다. 수업 시작에 전체 지도와 관계도를 먼저 제시한 뒤 세부 내용을 연결합니다.',
  priority: '첫째 전체 구조 제시, 둘째 과제 시작 전 완성 예시 확인, 셋째 긴 절차를 번호 단계로 나눕니다. 공통 지원 뒤에도 어려움이 지속되는지 관찰합니다.',
  groups: '서로 다른 강점을 섞되, 계획·주의·동시·순차 경향으로 학생의 역할을 고정하지 않습니다. 관심과 경험을 함께 고려하고 활동 중 한 번 이상 역할을 교대합니다.',
  observe: '검사 결과 기반 제안입니다. 과제 시작·지시 유지·전체 구조 이해·절차 수행이 여러 수업에서 반복되는지 2–4주 관찰합니다.'
};
const LEGACY_HASHES = {
  top: 'opening',
  'how-to': 'guide',
  intro: 'assessment',
  map: 'pass',
  paths: 'pathways',
  principles: 'results',
  levels: 'results',
  guidance: 'teacher',
  help: 'support',
  result: 'results',
  evidence: 'assessment-expertise'
};
const RESULT_GUIDES = {
  'results-kpass': 'kpass',
  'results-teen': 'teen',
  'results-adult': 'adult'
};
const chapters = $$('.chapter');
const chapterIds = chapters.map(chapter => chapter.id);
const LEVEL_LABELS = {H: '상', M: '중', L: '하'};
const PROFILE_AXES = {
  plan: {
    code: 'P', label: '계획',
    H: {classroom:'목표를 세우고 방법을 바꾸며 오류를 점검하는 모습이 비교적 분명할 수 있습니다.',strength:'목표 설정·전략 선택·자기점검을 강점으로 활용할 수 있습니다.',teaching:'열린 과제에서 여러 전략을 비교하고 선택 이유를 설명하게 합니다.',nuvia:'목표를 직접 정하고 실행 뒤 전략을 유지하거나 수정하는 과제를 제공합니다.'},
    M: {classroom:'익숙한 과제에서는 계획을 세우지만 새롭거나 복잡한 과제에서는 시작 틀이 도움이 될 수 있습니다.',strength:'목표와 절차가 분명할 때 계획 전략을 안정적으로 사용할 수 있습니다.',teaching:'과제 전 목표 한 문장과 중간 점검 질문을 제공합니다.',nuvia:'짧은 계획–실행–점검 주기를 반복합니다.'},
    L: {classroom:'열린 과제에서 시작을 미루거나 한 방법을 반복하고 오류를 점검하지 못할 수 있습니다.',strength:'목표와 첫 행동이 분명하면 다른 처리 강점을 과제 수행에 연결할 수 있습니다.',teaching:'목표 한 문장 → 첫 행동 → 3단계 계획 → 중간 점검의 틀을 제공합니다.',nuvia:'작은 목표를 고르고 방법을 실행한 뒤 결과를 보고 수정하는 훈련을 우선합니다.'}
  },
  attention: {
    code: 'A', label: '주의',
    H: {classroom:'핵심 자극을 고르고 방해를 억제하며 정확성을 유지하는 모습이 나타날 수 있습니다.',strength:'선택적·지속적 주의와 세부 오류 확인을 강점으로 활용할 수 있습니다.',teaching:'관찰·검토·교정 역할과 정확성이 필요한 과제를 제공합니다.',nuvia:'방해 단서 속 핵심을 찾고 정확도를 스스로 확인하는 과제를 제공합니다.'},
    M: {classroom:'환경과 과제 흥미에 따라 집중의 지속성과 정확도가 달라질 수 있습니다.',strength:'활동 구간과 목표가 분명할 때 필요한 자극에 집중할 수 있습니다.',teaching:'핵심어를 표시하고 활동 중간에 짧은 확인 지점을 둡니다.',nuvia:'짧은 집중 구간과 스스로 돌아오는 신호를 연습합니다.'},
    L: {classroom:'주변 자극에 반응하거나 긴 과제에서 이탈하고 세부 오류를 놓칠 수 있습니다.',strength:'자극이 정리되고 활동이 짧으면 현재 과제에 다시 참여하는 힘을 찾을 수 있습니다.',teaching:'한 번에 한 지시, 불필요한 자극 줄이기, 8–12분 활동 구간과 복귀 신호를 사용합니다.',nuvia:'현재 질문에 필요한 단서를 직접 찾고 적용하는 짧은 주의 훈련을 우선합니다.'}
  },
  simultaneous: {
    code: 'S', label: '동시처리',
    H: {classroom:'전체 구조와 여러 정보의 관계를 빠르게 묶어 핵심을 파악할 수 있습니다.',strength:'시각·공간 관계, 패턴, 문맥과 개념 통합을 강점으로 활용할 수 있습니다.',teaching:'도식·마인드맵·복합 자료의 관계를 해석하는 심화 과제를 제공합니다.',nuvia:'사람·장소·정보·원인의 관계를 연결하고 전체 장면을 구성하게 합니다.'},
    M: {classroom:'익숙한 주제에서는 전체 맥락을 이해하지만 정보가 많을 때 관계도가 도움이 될 수 있습니다.',strength:'예시나 시각 자료가 있을 때 부분을 전체 의미로 연결할 수 있습니다.',teaching:'전체 개요와 완성 예시를 먼저 보여준 뒤 세부 내용을 연결합니다.',nuvia:'두세 정보의 관계를 그림이나 배치로 연결하는 활동을 제공합니다.'},
    L: {classroom:'부분 정보는 알지만 전체 관계, 문맥 또는 시각·공간 구조를 한꺼번에 묶는 데 시간이 걸릴 수 있습니다.',strength:'관계를 눈에 보이게 제시하면 세부 정보를 하나씩 연결해 이해할 수 있습니다.',teaching:'전체 지도·관계도·색상 묶음·예시와 비예시를 사용해 관계를 시각화합니다.',nuvia:'사람·책·장소·전달 방법의 관계를 직접 연결한 뒤 장면을 선택하게 합니다.'}
  },
  successive: {
    code: 'Q', label: '순차처리',
    H: {classroom:'순서·절차·음운 정보를 정확하게 유지하고 단계적으로 수행할 수 있습니다.',strength:'순서 기억, 절차 수행, 단계 설명과 계열 정보 처리를 강점으로 활용할 수 있습니다.',teaching:'절차를 설명하거나 규칙을 찾아 다음 단계를 예측하는 심화 과제를 제공합니다.',nuvia:'순서를 스스로 구성하고 다른 가능한 절차와 효율을 비교하게 합니다.'},
    M: {classroom:'짧은 절차는 수행하지만 단계가 길거나 말 지시가 복잡하면 확인이 필요할 수 있습니다.',strength:'단계가 명확할 때 순서를 유지하며 과제를 수행할 수 있습니다.',teaching:'짧은 단계표를 주고 수행 뒤 순서를 다시 설명하게 합니다.',nuvia:'3–5개 과정을 직접 배열하고 빠진 단계를 확인합니다.'},
    L: {classroom:'긴 말 지시, 절차 재현, 이야기나 풀이의 순서를 일부 건너뛸 수 있습니다.',strength:'절차가 짧고 보이는 형태로 제시되면 단계별 수행을 안정시킬 수 있습니다.',teaching:'긴 지시를 짧게 나누고 순서 카드·체크리스트·시범을 제공합니다.',nuvia:'고정된 1·2 번호 없이 중간 과정을 직접 배열해 완성하는 훈련을 우선합니다.'}
  }
};
const FALLBACK_LANGUAGES = [
  {code:'ko',label:'한국어',status:'ready',file:'ko.json'},{code:'en',label:'English',status:'ai-draft',file:'en.json'},
  {code:'ja',label:'日本語',status:'ai-draft',file:'ja.json'},{code:'zh-CN',label:'简体中文',status:'ai-draft',file:'zh-CN.json'},
  {code:'es',label:'Español',status:'ai-draft',file:'es.json'},{code:'ru',label:'Русский',status:'ai-draft',file:'ru.json'},
  {code:'vi',label:'Tiếng Việt',status:'ai-draft',file:'vi.json'},{code:'th',label:'ไทย',status:'ai-draft',file:'th.json'},
  {code:'ar',label:'العربية',status:'ai-draft',file:'ar.json'},{code:'it',label:'Italiano',status:'ai-draft',file:'it.json'},
  {code:'az',label:'Azərbaycan',status:'ai-draft',file:'az.json'},{code:'mn',label:'Монгол',status:'ai-draft',file:'mn.json'},
  {code:'km',label:'ខ្មែរ',status:'ai-draft',file:'km.json'}
];
const GUIDE_PROFILE_ENGINE = window.GuideProfileEngine;
const KOREAN_DOCUMENT_TITLE = document.title;
const AI_TRANSLATION_NOTICE = 'AI 자동 번역 초안입니다. 의미와 교육·심리 용어는 한국어 승인본을 기준으로 확인해 주세요.';
const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'data-chapter-title'];
const koreanText = new WeakMap();
const koreanAttributes = new WeakMap();
let activeLocaleCode = 'ko';
let activeLocaleMessages = {};
let localeRequestId = 0;

const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

function translatedValue(value) {
  const source = String(value);
  const trimmed = source.trim();
  if (!trimmed || !activeLocaleMessages[trimmed]) return source;
  const leading = source.match(/^\s*/)[0];
  const trailing = source.match(/\s*$/)[0];
  return leading + activeLocaleMessages[trimmed] + trailing;
}

function rememberElementAttributes(element) {
  if (koreanAttributes.has(element)) return;
  const values = {};
  TRANSLATABLE_ATTRIBUTES.forEach(name => {
    if (element.hasAttribute(name)) values[name] = element.getAttribute(name);
  });
  koreanAttributes.set(element, values);
}

function restoreKorean(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (koreanText.has(node)) node.nodeValue = koreanText.get(node);
  }
  const elements = root.matches ? [root, ...$$('*', root)] : $$('*', root);
  elements.forEach(element => {
    const values = koreanAttributes.get(element);
    if (!values) return;
    Object.entries(values).forEach(([name, value]) => element.setAttribute(name, value));
  });
}

function localizeSubtree(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script, style, [data-language-select], [data-localize-skip]')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  let node;
  while ((node = walker.nextNode())) {
    if (!koreanText.has(node)) koreanText.set(node, node.nodeValue);
    node.nodeValue = translatedValue(koreanText.get(node));
  }
  const elements = root.matches ? [root, ...$$('*', root)] : $$('*', root);
  elements.forEach(element => {
    if (element.closest('[data-language-select], [data-localize-skip]')) return;
    rememberElementAttributes(element);
    const values = koreanAttributes.get(element);
    Object.entries(values).forEach(([name, value]) => element.setAttribute(name, translatedValue(value)));
  });
}

function originalAttribute(element, name) {
  const values = koreanAttributes.get(element);
  return values && Object.hasOwn(values, name) ? values[name] : element.getAttribute(name);
}

function updateReportLinkLanguage(code) {
  $$('[data-report-link]').forEach(link => {
    const url = new URL(link.href);
    url.searchParams.set('lang', code);
    link.href = url.toString();
  });
}

function requestedChapter() {
  const rawHash = decodeURIComponent(location.hash.slice(1));
  if (RESULT_GUIDES[rawHash]) return 'results';
  const id = LEGACY_HASHES[rawHash] || rawHash;
  return chapterIds.includes(id) ? id : null;
}

function requestedResultGuide() {
  const rawHash = decodeURIComponent(location.hash.slice(1));
  return RESULT_GUIDES[rawHash] || 'chooser';
}

function renderResultGuide(focus = false) {
  const view = requestedResultGuide();
  $$('[data-result-view]').forEach(panel => {
    const active = panel.dataset.resultView === view;
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
  const interpretation = $('#resultInterpretation');
  interpretation.hidden = view === 'chooser';
  interpretation.setAttribute('aria-hidden', String(view === 'chooser'));
  if (focus && view !== 'chooser') {
    const panel = $('[data-result-view="' + view + '"]');
    panel.focus({preventScroll: true});
  }
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

function updatePaginationLabel(index) {
  const sourceChapterTitle = originalAttribute(chapters[index], 'data-chapter-title');
  $('#paginationLabel').textContent = String(index + 1) + ' / ' + chapterIds.length + ' · ' + translatedValue(sourceChapterTitle);
}

function renderChapter(id, focus = false) {
  const index = chapterIds.indexOf(id);
  if (index < 0) return;

  chapters.forEach(chapter => {
    const active = chapter.id === id;
    chapter.hidden = !active;
    chapter.setAttribute('aria-hidden', String(!active));
  });
  $$('[data-chapter-link]').forEach(link => {
    if (link.dataset.chapterLink === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  $('#chapterNumber').textContent = String(index + 1).padStart(2, '0');
  $('#chapterTotal').textContent = String(chapterIds.length);
  $('#chapterProgress').style.width = String(((index + 1) / chapterIds.length) * 100) + '%';
  updatePaginationLabel(index);
  $('#previousChapter').disabled = index === 0;
  $('#nextChapter').disabled = index === chapterIds.length - 1;
  $('#previousChapter').dataset.targetChapter = chapterIds[index - 1] || '';
  $('#nextChapter').dataset.targetChapter = chapterIds[index + 1] || '';
  $('#reader').scrollTo({top: 0, behavior: 'auto'});
  closeToc();

  if (focus && id !== 'results') {
    chapters[index].tabIndex = -1;
    chapters[index].focus({preventScroll: true});
  }
  if (id === 'results') renderResultGuide(focus);
}

function syncFromLocation(focus = false) {
  const id = requestedChapter();
  if (!id) {
    history.replaceState(null, '', '#opening');
    renderChapter('opening', focus);
    return;
  }
  renderChapter(id, focus);
}

function navigateToChapter(id) {
  if (!chapterIds.includes(id)) return;
  if (location.hash === '#' + id) renderChapter(id, true);
  else location.hash = id;
}

function validateReportLinks() {
  $$('[data-report-link]').forEach(link => {
    const expected = EXPECTED_REPORT_LINKS[link.dataset.reportLink];
    if (!expected || link.href !== expected) throw new Error('결과지 링크 불일치: ' + link.dataset.reportLink);
    if (link.target !== '_blank' || !link.relList.contains('noopener') || !link.relList.contains('noreferrer')) {
      throw new Error('결과지 링크 보안 속성 누락: ' + link.dataset.reportLink);
    }
  });
}

function selectedProfileLevels() {
  return {
    plan: $('#profilePlan').value,
    attention: $('#profileAttention').value,
    simultaneous: $('#profileSimultaneous').value,
    successive: $('#profileSuccessive').value
  };
}

function profileCode(levels) {
  return Object.entries(levels).map(([key, level]) => PROFILE_AXES[key].code + '-' + level).join(' / ');
}

function profileName(levels) {
  const entries = Object.entries(levels);
  const high = entries.filter(([, level]) => level === 'H').map(([key]) => PROFILE_AXES[key].label);
  const low = entries.filter(([, level]) => level === 'L').map(([key]) => PROFILE_AXES[key].label);
  if (high.length === 4) return '전 영역 고강점 확장형';
  if (low.length === 4) return '전 영역 지원 우선형';
  if (entries.every(([, level]) => level === 'M')) return '균형 탐색형';
  if (high.length && low.length) return high.join('·') + ' 강점 / ' + low.join('·') + ' 지원형';
  if (high.length) return high.join('·') + ' 강점 확장형';
  if (low.length) return low.join('·') + ' 지원 조정형';
  return '상황 적응형';
}

function profileOverview(levels) {
  const values = Object.values(levels);
  const high = values.filter(level => level === 'H').length;
  const low = values.filter(level => level === 'L').length;
  if (high === 4) return '네 처리영역이 모두 강점 구간에 있습니다. 높은 수행을 하나의 능력으로 뭉뚱그리지 말고, 과제별로 어떤 전략을 선택하고 조절하는지 관찰합니다.';
  if (low === 4) return '네 영역 모두에서 지원 신호가 나타났습니다. 학생을 낮은 능력으로 규정하지 않고 검사 조건과 반복 관찰을 먼저 확인하며, 가장 작은 성공 경험부터 지원합니다.';
  if (values.every(level => level === 'M')) return '네 영역이 중간 구간에서 균형을 이룹니다. 특정 유형을 단정하기보다 과제의 낯섦·복잡성·흥미에 따라 달라지는 전략 사용을 관찰합니다.';
  if (high && low) return '강점과 지원 필요가 함께 나타나는 차이가 큰 프로필입니다. 전체 평균만 보면 중요한 특성이 가려질 수 있으므로 강점을 지원의 통로로 활용합니다.';
  if (high) return '뚜렷한 강점 영역을 중심으로 다른 처리과정을 연결할 수 있는 프로필입니다. 강점을 과도하게 한 방식으로만 사용하지 않는지도 함께 봅니다.';
  return '특정 영역에서 더 구체적인 지원이 필요한 프로필입니다. 낮은 영역만 반복 훈련하기보다 중간 영역과 성공 경험을 활용해 참여 조건을 만듭니다.';
}

function listMarkup(items) {
  return '<ul>' + items.map(item => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>';
}

function analyzeProfile(levels) {
  const entries = Object.entries(levels);
  const highKeys = entries.filter(([, level]) => level === 'H').map(([key]) => key);
  const midKeys = entries.filter(([, level]) => level === 'M').map(([key]) => key);
  const lowKeys = entries.filter(([, level]) => level === 'L').map(([key]) => key);
  const classroom = entries.map(([key, level]) => PROFILE_AXES[key][level].classroom);
  const strengthKeys = highKeys.length ? highKeys : midKeys.length ? midKeys : Object.keys(levels);
  const strengths = strengthKeys.map(key => PROFILE_AXES[key][levels[key]].strength);
  const support = lowKeys.length
    ? lowKeys.map(key => PROFILE_AXES[key].L.classroom)
    : ['뚜렷한 하 구간이 없더라도 과제의 난도, 낯섦, 시간 압박에 따라 필요한 도움은 달라질 수 있습니다.'];
  const teachingKeys = lowKeys.length ? [...lowKeys, ...highKeys] : highKeys.length ? highKeys : Object.keys(levels);
  const teaching = [...new Set(teachingKeys.map(key => PROFILE_AXES[key][levels[key]].teaching))];
  const nuvia = lowKeys.length
    ? lowKeys.map(key => PROFILE_AXES[key].L.nuvia)
    : highKeys.length
      ? highKeys.map(key => PROFILE_AXES[key].H.nuvia)
      : ['현재 학습 목표를 한 가지 정하고 계획·주의·동시·순차 활동을 짧게 순환하며 실제 생활 전이를 관찰합니다.'];
  const highLabels = highKeys.map(key => PROFILE_AXES[key].label);
  const lowLabels = lowKeys.map(key => PROFILE_AXES[key].label);
  let feedback = '여러 방법을 사용할 수 있어. 이번 과제에 어떤 방법이 가장 잘 맞았는지 함께 찾아보자.';
  if (highKeys.length && lowKeys.length) feedback = highLabels.join('·') + '의 강점을 활용해서 ' + lowLabels.join('·') + '이 필요한 순간에 쓸 방법을 함께 만들어 보자.';
  else if (highKeys.length) feedback = highLabels.join('·') + '에서 보인 강점을 더 어려운 과제에도 적용하고, 어떤 전략이 효과적이었는지 확인해 보자.';
  else if (lowKeys.length === 4) feedback = '이번 결과 하나로 너를 판단하지 않아. 편하게 참여할 수 있는 조건과 도움이 되는 방법을 하나씩 함께 찾아보자.';
  else if (lowKeys.length) feedback = lowLabels.join('·') + '이 필요한 과제에서는 도움을 받아도 괜찮아. 가장 작은 첫 단계부터 성공해 보자.';
  const cautions = ['이 자동 설명은 생성형 AI가 아니라 사전 설계된 고정 규칙의 조합입니다.', '검사 결과는 성격·능력·진로 또는 의학적 진단을 확정하지 않으며, 실제 관찰·상담·학업자료와 함께 해석합니다.'];
  if (highKeys.length && lowKeys.length) cautions.push('상과 하가 함께 있는 프로필은 평균만으로 해석하지 말고 영역 간 차이가 실제 과제에서도 반복되는지 확인합니다.');
  if (levels.plan === 'L' && levels.attention === 'L') cautions.push('계획과 주의의 동반 지원 신호는 수면·정서·동기·검사환경의 영향도 받을 수 있으므로 행동 관찰과 함께 재확인합니다.');
  if ((levels.simultaneous === 'H' && levels.successive === 'L') || (levels.simultaneous === 'L' && levels.successive === 'H')) cautions.push('동시처리와 순차처리의 차이가 큽니다. 강한 방식으로 먼저 이해하게 한 뒤 약한 방식이 필요한 절차를 별도로 지원합니다.');
  if (lowKeys.length === 4) cautions.push('네 영역 모두에서 낮은 수행이 지속된다면 피로·긴장·언어 이해·검사환경을 먼저 확인합니다. 수업과 생활에서도 어려움이 반복될 경우 보호자와 협의하여 전문기관의 종합평가와 지원을 권합니다.');
  return {name:profileName(levels),code:profileCode(levels),overview:profileOverview(levels),classroom,strengths,support,teaching,feedback,nuvia,cautions};
}

function renderProfileAnalysis(levels, focus = false) {
  const result = analyzeProfile(levels);
  const chips = Object.entries(levels).map(([key, level]) => '<span class="profile-chip ' + level.toLowerCase() + '">' + escapeHtml(PROFILE_AXES[key].label) + ' ' + escapeHtml(LEVEL_LABELS[level]) + '</span>').join('');
  $('#profileAnalysis').innerHTML = '<header class="profile-analysis-head"><div><p class="profile-code">' + escapeHtml(result.code) + '</p><h3 id="profileAnalysisTitle" tabindex="-1">' + escapeHtml(result.name) + '</h3><div class="profile-chips">' + chips + '</div></div><p>' + escapeHtml(result.overview) + '</p></header>' +
    '<div class="profile-analysis-grid">' +
      '<article><h4>교실에서 관찰될 수 있는 모습</h4>' + listMarkup(result.classroom) + '</article>' +
      '<article><h4>기대되는 강점</h4>' + listMarkup(result.strengths) + '</article>' +
      '<article><h4>도움이 필요한 상황</h4>' + listMarkup(result.support) + '</article>' +
      '<article><h4>수업·과제 설계</h4>' + listMarkup(result.teaching) + '</article>' +
      '<article><h4>교사가 사용할 수 있는 피드백</h4><p class="feedback-phrase">“' + escapeHtml(result.feedback) + '”</p></article>' +
      '<article><h4>NUVIA 가정훈련 연결</h4>' + listMarkup(result.nuvia) + '</article>' +
    '</div><aside class="profile-caution"><h4>해석할 때 꼭 확인하세요</h4>' + listMarkup(result.cautions) + '</aside>';
  if (activeLocaleCode !== 'ko') localizeSubtree($('#profileAnalysis'));
  if (focus) $('#profileAnalysisTitle').focus({preventScroll: true});
}

function setupProfileExplorer() {
  const form = $('#profileForm');
  form.addEventListener('submit', event => {
    event.preventDefault();
    renderProfileAnalysis(selectedProfileLevels(), true);
  });
  $('#resetProfile').addEventListener('click', () => {
    ['#profilePlan','#profileAttention','#profileSimultaneous','#profileSuccessive'].forEach(selector => { $(selector).value = 'M'; });
    renderProfileAnalysis(selectedProfileLevels());
    $('#profilePlan').focus();
  });
  renderProfileAnalysis(selectedProfileLevels());
}

function selectedSupportLevels(prefix) {
  return {
    plan: $('#' + prefix + 'Plan').value,
    attention: $('#' + prefix + 'Attention').value,
    simultaneous: $('#' + prefix + 'Simultaneous').value,
    successive: $('#' + prefix + 'Successive').value
  };
}

function supportHeaderMarkup(result, titleId) {
  const tags = result.tags.length
    ? result.tags.map(tag => '<span class="pattern-tag">' + escapeHtml(tag) + '</span>').join('')
    : '<span class="pattern-tag">과제 조건 탐색형</span>';
  return '<header class="profile-analysis-head support-analysis-head"><div><p class="profile-code">' + escapeHtml(result.code) + '</p><h3 id="' + titleId + '" tabindex="-1">' + escapeHtml(result.name) + '</h3><div class="pattern-tags" aria-label="프로파일 특징">' + tags + '</div></div><p>' + escapeHtml(result.summary) + '</p></header>';
}

function supportArticle(title, content, className = '') {
  const body = Array.isArray(content) ? listMarkup(content) : '<p>' + escapeHtml(content) + '</p>';
  return '<article' + (className ? ' class="' + className + '"' : '') + '><h4>' + escapeHtml(title) + '</h4>' + body + '</article>';
}

function renderTeacherProfile(levels, focus = false) {
  const result = GUIDE_PROFILE_ENGINE.teacherAnalysis(levels);
  $('#teacherProfileAnalysis').innerHTML = supportHeaderMarkup(result, 'teacherProfileAnalysisTitle') +
    '<div class="profile-analysis-grid support-analysis-grid">' +
      supportArticle('수업에서 먼저 활용할 강점', result.strengthUses) +
      supportArticle('수업에서 막힐 가능성이 큰 지점', result.bottlenecks) +
      supportArticle('맞춤 수업 설계', result.lessonDesign, 'support-feature-card') +
      supportArticle('맞춤 관리팁', result.management, 'support-feature-card') +
      supportArticle('교사가 사용할 문장', result.teacherScripts) +
    '</div><aside class="profile-caution support-priority"><h4>이 조합의 지원 우선순위</h4>' + listMarkup(result.priorities) + '<h4>관찰할 위험과 오해</h4>' + listMarkup(result.risks) + '</aside>';
  if (activeLocaleCode !== 'ko') localizeSubtree($('#teacherProfileAnalysis'));
  if (focus) $('#teacherProfileAnalysisTitle').focus({preventScroll: true});
}

function renderParentProfile(levels, focus = false) {
  const result = GUIDE_PROFILE_ENGINE.parentAnalysis(levels);
  $('#parentProfileAnalysis').innerHTML = supportHeaderMarkup(result, 'parentProfileAnalysisTitle') +
    '<div class="profile-analysis-grid support-analysis-grid">' +
      supportArticle('가정에서 확인할 실제 행동', result.behaviors) +
      supportArticle('상담 중 교사가 물어볼 질문', result.questions) +
      supportArticle('가정에서 실천할 지원', result.homeSupports, 'support-feature-card') +
      supportArticle('상담 문장 예시', result.scripts, 'support-feature-card') +
      supportArticle('피해야 할 해석', result.avoid) +
    '</div><aside class="profile-caution"><h4>학교와 가정이 함께 관찰할 기준</h4>' + listMarkup(result.jointObservation) + '</aside>';
  if (activeLocaleCode !== 'ko') localizeSubtree($('#parentProfileAnalysis'));
  if (focus) $('#parentProfileAnalysisTitle').focus({preventScroll: true});
}

function setupSupportProfile({formId, prefix, resetId, render}) {
  const form = $('#' + formId);
  form.addEventListener('submit', event => {
    event.preventDefault();
    render(selectedSupportLevels(prefix), true);
  });
  $('#' + resetId).addEventListener('click', () => {
    ['Plan', 'Attention', 'Simultaneous', 'Successive'].forEach(axis => { $('#' + prefix + axis).value = 'M'; });
    render(selectedSupportLevels(prefix));
    $('#' + prefix + 'Plan').focus();
  });
  render(selectedSupportLevels(prefix));
}

async function setupLanguages() {
  let languages = FALLBACK_LANGUAGES;
  if (location.protocol !== 'file:') {
    try {
      const response = await fetch('locales/languages.json');
      if (response.ok) languages = await response.json();
    } catch (error) {
      console.warn('언어 목록은 내장 기본값을 사용합니다.', error.message);
    }
  }
  const languageCodes = languages.map(language => language.code);
  if (new Set(languageCodes).size !== languageCodes.length) throw new Error('언어 코드가 중복되었습니다.');
  if (languages.length !== 13) throw new Error('지원 언어 목록은 13개여야 합니다.');
  const readyLanguages = languages.filter(language => language.status === 'ready').map(language => language.code);
  if (readyLanguages.length !== 1 || readyLanguages[0] !== 'ko') throw new Error('한국어 승인본 상태가 언어 manifest와 일치하지 않습니다.');
  const selects = $$('[data-language-select]');
  const options = languages.map(language =>
    '<option value="' + escapeHtml(language.code) + '" data-status="' + escapeHtml(language.status) + '">' +
    escapeHtml(language.label) + '</option>'
  ).join('');
  selects.forEach(select => { select.innerHTML = options; });
  async function applyLanguage(select) {
    const requestId = ++localeRequestId;
    const code = select.value;
    selects.forEach(other => { other.value = code; });
    const language = languages.find(item => item.code === code);
    const isDraft = language.status === 'ai-draft';
    selects.forEach(item => { item.disabled = true; });
    restoreKorean(document.body);
    activeLocaleMessages = {};
    activeLocaleCode = code;
    document.title = KOREAN_DOCUMENT_TITLE;
    if (code !== 'ko') {
      try {
        const response = await fetch('locales/' + language.file, {cache:'no-store'});
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const pack = await response.json();
        if (pack.locale !== code || !pack.messages) throw new Error('locale pack 형식 오류');
        if (requestId !== localeRequestId) return;
        activeLocaleMessages = pack.messages;
        document.title = translatedValue(KOREAN_DOCUMENT_TITLE);
      } catch (error) {
        console.warn('번역 파일을 불러오지 못해 한국어 승인본을 표시합니다.', code, error.message);
        activeLocaleCode = 'ko';
      }
    }
    $('#translationNotice').textContent = AI_TRANSLATION_NOTICE;
    $('#translationNotice').hidden = code === 'ko';
    document.documentElement.lang = activeLocaleCode;
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.requestedLanguage = code;
    updateReportLinkLanguage(activeLocaleCode);
    localizeSubtree(document.body);
    const visibleChapterIndex = chapterIds.indexOf(requestedChapter() || 'opening');
    updatePaginationLabel(visibleChapterIndex < 0 ? 0 : visibleChapterIndex);
    selects.forEach(item => { item.disabled = false; item.value = code; });
    if (!isDraft && code !== 'ko') $('#translationNotice').hidden = true;
  }
  selects.forEach(select => select.addEventListener('change', () => { applyLanguage(select); }));
  localizeSubtree(document.body);
}

$('#tocNav').addEventListener('click', event => {
  const link = event.target.closest('[data-chapter-link]');
  if (!link) return;
  event.preventDefault();
  navigateToChapter(link.dataset.chapterLink);
});
$$('button[data-go]').forEach(button => button.addEventListener('click', () => navigateToChapter(button.dataset.go)));
$$('[data-result-guide]').forEach(button => button.addEventListener('click', () => {
  location.hash = 'results-' + button.dataset.resultGuide;
}));
$$('[data-result-back]').forEach(button => button.addEventListener('click', () => {
  location.hash = 'results';
}));
['#previousChapter', '#nextChapter'].forEach(selector => $(selector).addEventListener('click', event => {
  const target = event.currentTarget.dataset.targetChapter;
  if (target) navigateToChapter(target);
}));
$$('[data-dashboard]').forEach(button => button.addEventListener('click', () => {
  $('#dashboardDetail').textContent = DASHBOARD_COPY[button.dataset.dashboard];
  if (activeLocaleCode !== 'ko') localizeSubtree($('#dashboardDetail'));
  $$('[data-dashboard]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
$('#tocToggle').addEventListener('click', () => $('#tocPanel').classList.contains('open') ? closeToc(true) : openToc());
$('#tocClose').addEventListener('click', () => closeToc(true));
$('#tocOverlay').addEventListener('click', () => closeToc(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#tocPanel').classList.contains('open')) closeToc(true);
});
window.addEventListener('hashchange', () => syncFromLocation(true));

validateReportLinks();
syncFromLocation();
setupProfileExplorer();
setupSupportProfile({formId:'teacherProfileForm', prefix:'teacher', resetId:'resetTeacherProfile', render:renderTeacherProfile});
setupSupportProfile({formId:'parentProfileForm', prefix:'parent', resetId:'resetParentProfile', render:renderParentProfile});
setupLanguages();
