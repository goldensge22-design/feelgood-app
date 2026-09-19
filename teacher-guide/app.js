const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const paths = {
  kpass:['K-PASS 아동','4–12세의 인지처리 특성을 교실 관찰과 연결합니다. 결과 읽기 → 수업 지원 → 보호자 소통 → NUVIA KIDS·HISTORY 연결 순서로 살펴봅니다.'],
  teen:['D-CAS 청소년','학습 전략, 진로 탐색, 자기관리의 맥락에서 결과를 읽습니다. 결과를 고정된 진로 적성으로 단정하지 않습니다.'],
  adult:['D-CAS 성인','대학 학습, 프로젝트, 시간·회복·직무 적용의 맥락에서 인지처리 경향과 지원 전략을 살펴봅니다.'],
  nuvia:['NUVIA 인지훈련','정규수업을 대신하지 않는 가정의 짧은 개인별 인지전략 연습입니다. 한 번에 핵심 프로그램 하나를 배정하고 관찰로 조정합니다.']
};
const dashboard = {
  support:'동시처리 지원이 필요한 학생이 많은 가상 반입니다. 수업 시작에 전체 지도와 관계도를 먼저 제시한 뒤 세부 내용을 연결합니다.',
  groups:'협력 과제에서는 서로 다른 강점을 섞되, 계획·주의·순차 등 인지처리 경향으로 역할을 고정하지 않고 활동 중 한 번 이상 교대합니다.',
  observe:'검사 결과 기반 제안입니다. 과제 시작·지시 유지·전체 구조 이해·절차 수행이 여러 수업에서 반복되는지 2–4주 관찰합니다.'
};
async function renderProfiles(){
  const profiles = await fetch('data/profiles.ko.json').then(r=>r.json());
  const list=$('#profileList'), search=$('#profileSearch');
  const filters=$$('[data-filter]');
  function render(){
    const text=search.value.trim().toLowerCase();
    const selected=Object.fromEntries(filters.map(x=>[x.dataset.filter,x.value]));
    const shown=profiles.filter(p=>`${p.id} ${p.name}`.toLowerCase().includes(text)&&Object.entries(selected).every(([key,value])=>!value||p.levels[key]===value));
    list.innerHTML=shown.length?shown.map(p=>`<article class="profile-card"><span class="profile-code">${p.id}</span><h3>${p.name}</h3><div class="profile-levels">${Object.entries(p.levels).map(([k,v])=>`<span>${k} ${v}</span>`).join('')}</div><p>${p.summary}</p><details><summary>수업·NUVIA 지원 보기</summary><p><b>교실 관찰:</b> ${p.classroom}</p><p><b>첫 도움:</b> ${p.support}</p><p><b>NUVIA 방향:</b> ${p.nuvia}</p></details></article>`).join(''):'<p>조건에 맞는 대표 프로파일이 없습니다. 필터를 초기화해 보세요.</p>';
  }
  [search,...filters].forEach(el=>el.addEventListener('input',render));
  $('#resetFilters').addEventListener('click',()=>{search.value='';filters.forEach(x=>x.value='');render()});render();
}
$('.menu-toggle').addEventListener('click',e=>{const nav=$('#menu');const open=nav.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',open);});
$$('#menu a').forEach(a=>a.addEventListener('click',()=>{$('#menu').classList.remove('open');$('.menu-toggle').setAttribute('aria-expanded','false')}));
$$('[data-path]').forEach(button=>button.addEventListener('click',()=>{const [title,copy]=paths[button.dataset.path];$('#pathDetail').innerHTML=`<h3>${title}</h3><p>${copy}</p>`;$('#pathDetail').focus({preventScroll:true})}));
$$('[data-dashboard]').forEach(button=>button.addEventListener('click',()=>{$('#dashboardDetail').textContent=dashboard[button.dataset.dashboard]}));
$('#languageSelect').addEventListener('change',e=>{const untranslated=e.target.selectedIndex!==0;$('#translationNotice').hidden=!untranslated;document.documentElement.dir=e.target.value==='العربية'?'rtl':'ltr';});
renderProfiles().catch(()=>{$('#profileList').innerHTML='<p>대표 프로파일 데이터를 불러오지 못했습니다.</p>'});
