const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const paths = {
  kpass: {
    title: 'K-PASS 아동용 빠른 경로',
    copy: '4–12세의 인지처리 특성을 교실 관찰과 연결합니다. 결과 읽기 → 대표 프로필 → 수업 지원 → 보호자 소통 → NUVIA 연결 순서로 살펴보세요.',
    links: [['결과 읽기', '#results'], ['대표 프로필', '#profiles'], ['교사 활용', '#teacher']]
  },
  teen: {
    title: 'D-CAS 청소년용 빠른 경로',
    copy: '학습 전략, 진로 탐색, 자기관리의 맥락에서 결과를 읽습니다. 결과를 고정된 진로 적성으로 단정하지 않고 실제 학교생활 관찰과 함께 봅니다.',
    links: [['결과 읽기', '#results'], ['상담 문장 보기', '#profiles'], ['NUVIA 연결', '#nuvia']]
  },
  adult: {
    title: 'D-CAS 성인용 빠른 경로',
    copy: '대학 학습, 프로젝트, 시간·회복·직무 적용의 맥락에서 인지처리 경향과 자기관리 전략을 살펴봅니다. D-CAS 근거는 K-PASS 근거와 분리해 해석합니다.',
    links: [['검사 소개', '#intro'], ['결과 읽기', '#results'], ['NUVIA 연결', '#nuvia']]
  },
  nuvia: {
    title: 'NUVIA 가정과제형 훈련 경로',
    copy: '정규수업을 대신하지 않는 가정의 짧은 개인별 인지전략 연습입니다. 교사 배정 → 가정 훈련 → 수행 기록 확인 → 난이도·빈도 조정의 흐름으로 운영합니다.',
    links: [['NUVIA 역할과 흐름', '#nuvia'], ['도움 요청 기준', '#help']]
  }
};

const dashboard = {
  support: '동시처리 지원이 필요한 학생이 많은 가상 반입니다. 수업 시작에 전체 지도와 관계도를 먼저 제시한 뒤 세부 내용을 연결합니다.',
  priority: '첫째 전체 구조 제시, 둘째 과제 시작 전 완성 예시 확인, 셋째 긴 절차를 번호 단계로 나눕니다. 공통 지원 뒤에도 어려움이 지속되는지 관찰합니다.',
  groups: '서로 다른 강점을 섞되, 계획·주의·동시·순차 경향으로 학생의 역할을 고정하지 않습니다. 관심과 경험을 함께 고려하고 활동 중 한 번 이상 역할을 교대합니다.',
  observe: '검사 결과 기반 제안입니다. 과제 시작·지시 유지·전체 구조 이해·절차 수행이 여러 수업에서 반복되는지 2–4주 관찰합니다.'
};

const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

let profiles = [];

function profileDialogMarkup(profile) {
  const levels = Object.entries(profile.levels)
    .map(([key, value]) => `<span>${escapeHtml(key)} ${escapeHtml(value)}</span>`).join('');
  return `<span class="profile-code">${escapeHtml(profile.id)}</span>
    <h2 id="profileDialogTitle">${escapeHtml(profile.name)}</h2>
    <div class="profile-levels">${levels}</div>
    <p>${escapeHtml(profile.summary)}</p>
    <h3>교실에서 보이는 모습</h3><p>${escapeHtml(profile.classroom)}</p>
    <h3>강점</h3><p>${escapeHtml(profile.strengths)}</p>
    <h3>지원이 필요한 상황</h3><p>${escapeHtml(profile.supportNeeds)}</p>
    <h3>수업 설계 팁</h3><p>${escapeHtml(profile.teachingTips)}</p>
    <h3>상담 문장</h3><p>“${escapeHtml(profile.counselingPhrase)}”</p>
    <h3>NUVIA 연결</h3><p>${escapeHtml(profile.nuvia)}</p>`;
}

function openProfile(id) {
  const profile = profiles.find(item => item.id === id);
  if (!profile) return;
  $('#profileDialogBody').innerHTML = profileDialogMarkup(profile);
  $('#profileDialog').showModal();
}

async function renderProfiles() {
  const response = await fetch('data/profiles.ko.json');
  if (!response.ok) throw new Error(`프로필 데이터 오류: ${response.status}`);
  profiles = await response.json();
  const list = $('#profileList');
  const search = $('#profileSearch');
  const filters = $$('[data-filter]');

  function render() {
    const text = search.value.trim().toLowerCase();
    const selected = Object.fromEntries(filters.map(filter => [filter.dataset.filter, filter.value]));
    const shown = profiles.filter(profile => {
      const haystack = [profile.id, profile.name, profile.summary, profile.classroom].join(' ').toLowerCase();
      return haystack.includes(text) && Object.entries(selected).every(([key, value]) => !value || profile.levels[key] === value);
    });
    $('#profileCount').textContent = `대표 프로필 ${shown.length}개 표시`;
    list.innerHTML = shown.length ? shown.map(profile => `
      <article class="profile-card">
        <span class="profile-code">${escapeHtml(profile.id)}</span>
        <h3>${escapeHtml(profile.name)}</h3>
        <div class="profile-levels">${Object.entries(profile.levels).map(([key, value]) => `<span>${escapeHtml(key)} ${escapeHtml(value)}</span>`).join('')}</div>
        <p>${escapeHtml(profile.summary)}</p>
        <button class="button" type="button" data-profile-id="${escapeHtml(profile.id)}">상세 보기</button>
      </article>`).join('') : '<p>조건에 맞는 대표 프로필이 없습니다. 필터를 초기화해 보세요.</p>';
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

async function loadLanguages() {
  const response = await fetch('locales/languages.json');
  if (!response.ok) throw new Error(`언어 데이터 오류: ${response.status}`);
  const languages = await response.json();
  const select = $('#languageSelect');
  select.innerHTML = languages.map(language => `<option value="${escapeHtml(language.code)}" data-status="${escapeHtml(language.status)}">${escapeHtml(language.label)}</option>`).join('');
  select.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    const pending = option.dataset.status !== 'ready';
    $('#translationNotice').hidden = !pending;
    document.documentElement.lang = pending ? 'ko' : option.value;
    document.documentElement.dir = option.value === 'ar' ? 'rtl' : 'ltr';
  });
}

$('.menu-toggle').addEventListener('click', event => {
  const nav = $('#menu');
  const open = nav.classList.toggle('open');
  event.currentTarget.setAttribute('aria-expanded', String(open));
});

$$('#menu a').forEach(link => link.addEventListener('click', () => {
  $('#menu').classList.remove('open');
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
}));

$$('[data-path]').forEach(button => button.addEventListener('click', () => {
  const path = paths[button.dataset.path];
  const links = path.links.map(([label, href]) => `<a class="button path-link" href="${href}">${escapeHtml(label)}</a>`).join('');
  $('#pathDetail').innerHTML = `<h3>${escapeHtml(path.title)}</h3><p>${escapeHtml(path.copy)}</p><div class="actions">${links}</div>`;
  $$('[data-path]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('#pathDetail').focus({preventScroll: true});
}));

$$('[data-dashboard]').forEach(button => button.addEventListener('click', () => {
  $('#dashboardDetail').textContent = dashboard[button.dataset.dashboard];
  $$('[data-dashboard]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
}));

$('#closeProfileDialog').addEventListener('click', () => $('#profileDialog').close());
$('#profileDialog').addEventListener('click', event => {
  if (event.target === $('#profileDialog')) $('#profileDialog').close();
});

Promise.all([renderProfiles(), loadLanguages()]).catch(error => {
  console.error(error);
  if (!profiles.length) $('#profileList').innerHTML = '<p>대표 프로필 데이터를 불러오지 못했습니다. 정적 서버에서 다시 실행해 주세요.</p>';
});
