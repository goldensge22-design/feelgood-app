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
  principles: 'levels',
  guidance: 'teacher',
  help: 'support',
  result: 'results'
};
const chapters = $$('.chapter');
const chapterIds = chapters.map(chapter => chapter.id);
let profiles = [];

const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

function requestedChapter() {
  const rawHash = decodeURIComponent(location.hash.slice(1));
  const id = LEGACY_HASHES[rawHash] || rawHash;
  return chapterIds.includes(id) ? id : null;
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
  $('#paginationLabel').textContent = String(index + 1) + ' / ' + chapterIds.length + ' · ' + chapters[index].dataset.chapterTitle;
  $('#previousChapter').disabled = index === 0;
  $('#nextChapter').disabled = index === chapterIds.length - 1;
  $('#previousChapter').dataset.targetChapter = chapterIds[index - 1] || '';
  $('#nextChapter').dataset.targetChapter = chapterIds[index + 1] || '';
  $('#reader').scrollTo({top: 0, behavior: 'auto'});
  closeToc();

  if (focus) {
    chapters[index].tabIndex = -1;
    chapters[index].focus({preventScroll: true});
  }
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

function profileDialogMarkup(profile) {
  const levels = Object.entries(profile.levels).map(([key, value]) => '<span>' + escapeHtml(key) + ' ' + escapeHtml(value) + '</span>').join('');
  return '<span class="profile-code">' + escapeHtml(profile.id) + '</span>' +
    '<h2 id="profileDialogTitle">' + escapeHtml(profile.name) + '</h2>' +
    '<div class="profile-levels">' + levels + '</div>' +
    '<p>' + escapeHtml(profile.summary) + '</p>' +
    '<h3>교실에서 보이는 모습</h3><p>' + escapeHtml(profile.classroom) + '</p>' +
    '<h3>강점</h3><p>' + escapeHtml(profile.strengths) + '</p>' +
    '<h3>지원이 필요한 상황</h3><p>' + escapeHtml(profile.supportNeeds) + '</p>' +
    '<h3>수업 설계 팁</h3><p>' + escapeHtml(profile.teachingTips) + '</p>' +
    '<h3>상담 문장</h3><p>“' + escapeHtml(profile.counselingPhrase) + '”</p>' +
    '<h3>NUVIA 연결</h3><p>' + escapeHtml(profile.nuvia) + '</p>';
}

function openProfile(id) {
  const profile = profiles.find(item => item.id === id);
  if (!profile) return;
  $('#profileDialogBody').innerHTML = profileDialogMarkup(profile);
  $('#profileDialog').showModal();
}

async function setupProfiles() {
  const response = await fetch('data/profiles.ko.json');
  if (!response.ok) throw new Error('프로필 데이터 오류: ' + response.status);
  profiles = await response.json();
  const list = $('#profileList');
  const search = $('#profileSearch');
  const filters = $$('[data-filter]');

  function render() {
    const query = search.value.trim().toLowerCase();
    const selected = Object.fromEntries(filters.map(filter => [filter.dataset.filter, filter.value]));
    const shown = profiles.filter(profile => {
      const haystack = [profile.id, profile.name, profile.summary, profile.classroom].join(' ').toLowerCase();
      return haystack.includes(query) && Object.entries(selected).every(([key, value]) => !value || profile.levels[key] === value);
    });

    $('#profileCount').textContent = '대표 프로필 ' + shown.length + '개 표시';
    list.innerHTML = shown.length ? shown.map(profile => {
      const levels = Object.entries(profile.levels).map(([key, value]) => '<span>' + escapeHtml(key) + ' ' + escapeHtml(value) + '</span>').join('');
      return '<article class="profile-card"><span class="profile-code">' + escapeHtml(profile.id) + '</span>' +
        '<h3>' + escapeHtml(profile.name) + '</h3><div class="profile-levels">' + levels + '</div>' +
        '<p>' + escapeHtml(profile.summary) + '</p><button class="button" type="button" data-profile-id="' +
        escapeHtml(profile.id) + '">상세 보기</button></article>';
    }).join('') : '<p>조건에 맞는 대표 프로필이 없습니다. 필터를 초기화해 보세요.</p>';
  }

  [search, ...filters].forEach(element => element.addEventListener('input', render));
  $('#resetFilters').addEventListener('click', () => {
    search.value = '';
    filters.forEach(filter => { filter.value = ''; });
    render();
    search.focus();
  });
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-profile-id]');
    if (button) openProfile(button.dataset.profileId);
  });
  render();
}

async function setupLanguages() {
  const response = await fetch('locales/languages.json');
  if (!response.ok) throw new Error('언어 데이터 오류: ' + response.status);
  const languages = await response.json();
  const selects = $$('[data-language-select]');
  const options = languages.map(language =>
    '<option value="' + escapeHtml(language.code) + '" data-status="' + escapeHtml(language.status) + '">' +
    escapeHtml(language.label) + '</option>'
  ).join('');
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
  const link = event.target.closest('[data-chapter-link]');
  if (!link) return;
  event.preventDefault();
  navigateToChapter(link.dataset.chapterLink);
});
$$('button[data-go]').forEach(button => button.addEventListener('click', () => navigateToChapter(button.dataset.go)));
['#previousChapter', '#nextChapter'].forEach(selector => $(selector).addEventListener('click', event => {
  const target = event.currentTarget.dataset.targetChapter;
  if (target) navigateToChapter(target);
}));
$$('[data-dashboard]').forEach(button => button.addEventListener('click', () => {
  $('#dashboardDetail').textContent = DASHBOARD_COPY[button.dataset.dashboard];
  $$('[data-dashboard]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));
$('#tocToggle').addEventListener('click', () => $('#tocPanel').classList.contains('open') ? closeToc(true) : openToc());
$('#tocClose').addEventListener('click', () => closeToc(true));
$('#tocOverlay').addEventListener('click', () => closeToc(true));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#tocPanel').classList.contains('open')) closeToc(true);
});
$('#closeProfileDialog').addEventListener('click', () => $('#profileDialog').close());
$('#profileDialog').addEventListener('click', event => {
  if (event.target === $('#profileDialog')) $('#profileDialog').close();
});
window.addEventListener('hashchange', () => syncFromLocation(true));

validateReportLinks();
syncFromLocation();
Promise.all([setupProfiles(), setupLanguages()]).catch(error => {
  console.error(error);
  $('#profileList').innerHTML = '<p>대표 프로필 데이터를 불러오지 못했습니다. 정적 서버에서 다시 실행해 주세요.</p>';
});
