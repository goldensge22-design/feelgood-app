'use strict';
// 번역 데이터는 i18n/*.js 가 window.LANG 에 채워줍니다.

// ── 언어 적용 ────────────────────────────────────────────────────
// 사용 가능한 언어 = 로드된 i18n 파일들. i18n/<코드>.js 를 추가하면 자동 인식됩니다.
function availableLangs() { return Object.keys(window.LANG || {}); }

// 드롭다운에 표시할 언어명(국기 + 원어 표기). 새 언어 추가 시 여기 한 줄만 더하면 됩니다.
// (없어도 동작하며, 그 경우 언어 코드가 그대로 표시됩니다.)
const LANG_NAMES = {
  ko: '🇰🇷 한국어',
  en: '🇺🇸 English',
  zh: '🇨🇳 中文',
  mn: '🇲🇳 Монгол',
  th: '🇹🇭 ไทย',
  vi: '🇻🇳 Tiếng Việt',
  ja: '🇯🇵 日本語',
  ar: '🇸🇦 العربية',
};

// RTL(오른쪽→왼쪽) 표기 언어
const RTL_LANGS = ['ar', 'he', 'fa', 'ur'];

let currentLang = localStorage.getItem('fg_lang') || 'ko';
if (!LANG[currentLang]) currentLang = availableLangs()[0] || 'ko';

// 드롭다운 옵션을 로드된 언어로 채운다
function buildLangSelect() {
  const sel = document.getElementById('langSelect');
  if (!sel) return;
  sel.innerHTML = '';
  availableLangs().forEach(code => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = LANG_NAMES[code] || code.toUpperCase();
    sel.appendChild(opt);
  });
}

function setLang(lang) {
  if (!LANG[lang]) lang = availableLangs()[0];
  currentLang = lang;
  localStorage.setItem('fg_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGS.indexOf(lang) >= 0 ? 'rtl' : 'ltr';
  document.title = LANG[lang].title;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (LANG[lang][key] !== undefined) {
      el.innerHTML = LANG[lang][key];
    }
  });

  const sel = document.getElementById('langSelect');
  if (sel) sel.value = lang;
  applyKoOnly(lang);
  updateVideos(lang);
}

// 한국어 전용 탭(교육기관/기업/군경찰)은 ko 일 때만 헤더에 노출
const KO_ONLY = ['edu', 'biz', 'mil'];
function applyKoOnly(lang) {
  const isKo = (lang === 'ko');
  // 한국어 전용 요소(히어로의 기관 버튼) → 한국어일 때만 표시
  document.querySelectorAll('.ko-only').forEach(el => {
    el.style.display = isKo ? '' : 'none';
  });
  // 외국어 전용 요소(기관 통합 탭) → 비한국어일 때만 표시
  document.querySelectorAll('.intl-only').forEach(el => {
    el.style.display = isKo ? 'none' : '';
  });
  // 외국어로 전환했는데 한국어 전용 기관 탭을 보고 있으면 홈으로 이동
  if (!isKo) {
    const active = document.querySelector('#ntabs li.active');
    if (active && KO_ONLY.indexOf(active.dataset.s) >= 0) show('home');
  }
}

// ── 섹션 전환 ────────────────────────────────────────────────────
const SECTIONS = ['home','school','test','brainmap','edu','biz','mil'];

function show(id) {
  SECTIONS.forEach(s => {
    const sec = document.getElementById('sec-' + s);
    if (sec) sec.classList.toggle('active', s === id);
  });
  document.querySelectorAll('#ntabs li').forEach(li => {
    li.classList.toggle('active', li.dataset.s === id);
  });
  // 히어로 버튼 active 상태
  const heroBtns = {
    test:   'hbtn-test',
    brainmap: 'hbtn-brainmap',
    edu: 'hbtn-edu',
    biz: 'hbtn-biz',
    mil: 'hbtn-mil'
  };
  Object.entries(heroBtns).forEach(([sec, btnId]) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('active', sec === id);
  });
  window.scrollTo(0, 0);
}


// ── 비디오 URL 동적 업데이트 ─────────────────────────────────────
function updateVideos(lang) {
  var vids = ['vid1','vid2','vid3'];
  vids.forEach(function(v) {
    var key = 'test_' + v + '_id';
    var id = LANG[lang][key];
    if (!id) return;
    var url = 'https://www.youtube.com/watch?v=' + id;
    var thumb = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';
    var link = document.getElementById(v + '-link');
    var thumbEl = document.getElementById(v + '-thumb');
    var ytBtn = document.getElementById(v + '-ytbtn');
    if (link) link.href = url;
    if (thumbEl) thumbEl.src = thumb;
    if (ytBtn) ytBtn.href = url;
  });
  var tryBtn = document.getElementById('bm-dash-try-btn');
  var ctaBtn2 = document.getElementById('bm-cta-btn2');
  if (tryBtn && LANG[lang].bm_dash_try_url) tryBtn.href = LANG[lang].bm_dash_try_url;
  if (ctaBtn2 && LANG[lang].bm_cta_btn2_url) ctaBtn2.href = LANG[lang].bm_cta_btn2_url;
}

// ── 브로셔 ────────────────────────────────────────────────────────
var bPages = ["images/img-18.png",
      "images/img-19.png",
      "images/img-20.png",
      "images/img-21.png",
      "images/img-22.png",
      "images/img-23.png",
      "images/img-24.png",
      "images/img-25.png",
      "images/img-26.png",
      "images/img-27.png",
      "images/img-28.png",
      "images/img-29.png",
      "images/img-30.png",
      "images/img-31.png",
      "images/img-32.png",
      "images/img-33.png",
      "images/img-34.png",
      "images/img-35.png",
      "images/img-36.png",
      "images/img-37.png"];
var bCur = 0;
function bRender() {
  document.getElementById('b-page-img').src = bPages[bCur];
  document.getElementById('b-page-label').textContent = (bCur+1) + ' / ' + bPages.length;
  var dots = document.getElementById('b-dots');
  dots.innerHTML = '';
  var s = Math.max(0,bCur-4), e = Math.min(bPages.length-1,bCur+4);
  for(var i=s;i<=e;i++){
    var d = document.createElement('div');
    d.style.cssText='width:'+(i===bCur?'20px':'8px')+';height:8px;border-radius:4px;background:'+(i===bCur?'#F5A623':'rgba(255,255,255,.4)')+';transition:.2s;cursor:pointer;';
    (function(idx){d.onclick=function(){bCur=idx;bRender();};})(i);
    dots.appendChild(d);
  }
}
function bPrev(){if(bCur>0){bCur--;bRender();}}
function bNext(){if(bCur<bPages.length-1){bCur++;bRender();}}
function openB(){bCur=0;bRender();document.getElementById('bModal').classList.add('open');document.body.style.overflow='hidden';}
function closeB(){document.getElementById('bModal').classList.remove('open');document.body.style.overflow='';}
document.getElementById('bModal').addEventListener('click',function(e){if(e.target===this)closeB();});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')closeB();
  if(!document.getElementById('bModal').classList.contains('open'))return;
  if(e.key==='ArrowRight')bNext();
  if(e.key==='ArrowLeft')bPrev();
});
// ── 초기화 ───────────────────────────────────────────────────────
buildLangSelect();
setLang(currentLang);
// footer 로고 = nav 로고와 동일
(function(){
  var navImg = document.querySelector('.nav-logo img');
  var ftImg  = document.getElementById('footer-logo');
  if (navImg && ftImg) ftImg.src = navImg.src;
})();

// nav 스크롤 active 처리
document.querySelectorAll('#ntabs li').forEach(li => {
  li.addEventListener('click', () => {
    document.querySelectorAll('#ntabs li').forEach(l => l.classList.remove('active'));
    li.classList.add('active');
  });
});
