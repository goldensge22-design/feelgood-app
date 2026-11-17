/** Official career fields are not psychometric requirements. */
(function(g){
  'use strict';
  const VERSION='aviation-careers-2026-11-17.1';
  const CATALOG={
  "aviation-security": {
    "id": "aviation-security",
    "aliases": [
      "항공보안학과",
      "항공보안과",
      "항공보안"
    ],
    "jobIds": [],
    "sources": [
      "https://avsecurity.hanseo.ac.kr/sub/info.do?m=0203&s=avsecu"
    ],
    "checkedAt": "2026-11-08",
    "mode": "existing-interim-ranking",
    "basis": "official-career-fields-with-editorial-role-examples",
    "passRequirements": null
  },
  "aviation-language": {
    "id": "aviation-language",
    "aliases": [
      "항공외국어학과",
      "항공외국어과",
      "항공외국어"
    ],
    "jobIds": [
      "cabin",
      "passenger",
      "reservation",
      "transfer",
      "lounge"
    ],
    "sources": [
      "https://www.hanseo.ac.kr/sub/info.do?m=031702&page=031702&s=hs",
      "https://www.emiratesgroupcareers.com/cabin-crew/",
      "https://www.emiratesgroupcareers.com/search-and-apply/129"
    ],
    "checkedAt": "2026-11-08",
    "mode": "exploration-unranked",
    "basis": "official-career-fields-with-editorial-role-examples",
    "passRequirements": null
  },
  "aviation-transport": {
    "id": "aviation-transport",
    "aliases": [
      "항공교통물류학과",
      "항공교통물류과",
      "항공교통물류"
    ],
    "jobIds": [
      "atc",
      "apron",
      "dispatch",
      "airport",
      "cargo"
    ],
    "sources": [
      "https://www.hanseo.ac.kr/sub/info.do?m=030403&page=030403&s=hs",
      "https://www.hanseoatl.com/page/sub1_3"
    ],
    "checkedAt": "2026-11-08",
    "mode": "exploration-unranked",
    "basis": "official-career-fields-with-editorial-role-examples",
    "passRequirements": null
  },
  "airport-administration": {
    "id": "airport-administration",
    "aliases": [
      "공항행정학과",
      "공항행정과",
      "공항행정",
      "항공행정학과",
      "항공행정과",
      "항공행정"
    ],
    "jobIds": [
      "public-admin",
      "civil-service",
      "policy",
      "hr",
      "budget"
    ],
    "sources": [
      "https://www.hanseo.ac.kr/sub/info.do?m=030416&page=030416&s=hs"
    ],
    "checkedAt": "2026-11-08",
    "mode": "exploration-unranked",
    "basis": "official-career-fields-with-editorial-role-examples",
    "passRequirements": null
  }
};
  const alias=new Map();
  const originals=new Map();
  function remember(e){if(e&&!originals.has(e))originals.set(e,{html:e.innerHTML,hidden:e.hidden,display:e.style.display});}
  function setElement(e,text){if(!e)return;remember(e);e.dataset.fgGuidance='aviation';e.textContent=text;}
  function hideElement(e){if(!e)return;remember(e);e.dataset.fgGuidance='aviation';e.hidden=true;e.style.display='none';}
  const normalize=s=>typeof s==='string'?s.normalize('NFKC').replace(/\s+/g,'').trim():'';
  Object.values(CATALOG).forEach(c=>c.aliases.forEach(a=>alias.set(normalize(a),c.id)));
  function resolve(name){return CATALOG[alias.get(normalize(name))]||null;}
  function unranked(name){const c=resolve(name);return !!c&&c.mode==='exploration-unranked';}
  function getCareerContext(name){
    const c=resolve(name);if(!c)return null;
    const profiles=g.DCasAviationJobProfiles;
    return JSON.parse(JSON.stringify({version:VERSION,...c,
      profileCatalogVersion:profiles?.catalogVersion||null,
      profileIds:profiles?.majorProfileIds?.[c.id]||[],
      profileTranslationStatus:profiles?.translationStatus||'unavailable'}));
  }
  function locale(){return g.FeelGoodReportI18n?.getLocale()||g.currentLang||g.__REPORT_LOCALE_ACTIVE__||g.__REPORT_LOCALE__||document.documentElement.lang||'ko';}
  function ensureMajorOptions(){
    if(!g.document)return;
    const select=document.getElementById('majorSelect');if(!select)return;
    const lang=locale();
    const t=g.DCasAviationLocales?.[lang==='zh-CN'?'zh':lang]||g.DCasAviationLocales?.ko||{};
    let group=select.querySelector('optgroup[data-fg-aviation-majors]');
    if(!group){
      group=document.createElement('optgroup');
      group.dataset.fgAviationMajors='';
      const custom=select.querySelector('option[value="__custom__"]');
      select.insertBefore(group,custom?.closest('optgroup')||null);
    }
    group.label=t.nav||'진로 탐색';
    const selected=select.value;
    Object.values(CATALOG).filter(c=>c.mode==='exploration-unranked').forEach(c=>{
      const value=c.aliases[0];
      let option=Array.from(select.options).find(o=>o.value===value);
      if(!option){option=document.createElement('option');option.value=value;}
      if(option.parentElement!==group)group.append(option);
      option.dataset.fgAviationMajor=c.id;
      option.textContent=lang==='ko'?value:(t[c.id]||value);
    });
    if(selected)select.value=selected;
    const countNote=Array.from(document.querySelectorAll('#major .picker-note')).find(e=>e.textContent.includes('61개 학과')||e.dataset.fgAviationCount==='');
    if(countNote){
      setElement(countNote,lang==='ko'
        ? '전체 9개 계열 · 64개 학과 중 선택할 수 있어요(기타 직접 입력 포함). 학과별 직무는 탐색 경로이며 개인 적합도 순위가 아닙니다.'
        : t.note);
      countNote.dataset.fgAviationCount='';
    }
  }
  function koreanProfiles(c){
    const data=g.DCasAviationJobProfiles;
    const ids=data?.majorProfileIds?.[c.id]||[];
    return ids.map(id=>({id,label:data.namesKo?.[id]})).filter(item=>item.label);
  }
  function renderSecurityProfiles(c){
    document.getElementById('fg-aviation-security-profiles')?.remove();
    if(locale()!=='ko'||c.id!=='aviation-security')return;
    const host=document.getElementById('pf-jobcards');if(!host)return;
    const section=document.createElement('div');
    section.id='fg-aviation-security-profiles';
    section.dataset.fgGuidance='aviation';
    section.style.cssText='margin-top:20px;padding:16px;border:1px solid #d9e3f4;border-radius:12px;overflow-wrap:anywhere';
    const title=document.createElement('h3');title.textContent='항공보안 관련 직무 탐색 목록';
    const note=document.createElement('p');note.textContent='아래 직무는 학과 관련 탐색 경로입니다. 위의 기존 TOP5 순위·점수와 별개이며, 채용 조건은 직무별로 확인하세요.';
    const list=document.createElement('ul');list.style.cssText='padding-inline-start:1.5rem;line-height:1.8';
    koreanProfiles(c).forEach(item=>{const li=document.createElement('li');li.dataset.careerProfileId=item.id;li.textContent=item.label;list.append(li);});
    section.append(title,note,list);host.insertAdjacentElement('afterend',section);
  }
  function renderLectureRoles(){
    document.getElementById('fg-aviation-lecture-roles')?.remove();
    const roles=g.DCasAviationJobProfiles?.lectureRoles;
    if(locale()!=='ko'||!Array.isArray(roles)||!roles.length)return;
    const host=document.getElementById('fg-aviation-security-profiles')||document.getElementById('pf-jobcards');
    if(!host)return;
    const section=document.createElement('section');
    section.id='fg-aviation-lecture-roles';
    section.dataset.fgGuidance='aviation';
    section.style.cssText='margin-top:20px;padding:16px;border:1px solid #d9e3f4;border-radius:12px;overflow-wrap:anywhere;break-inside:avoid';
    const title=document.createElement('h3');title.textContent='강의에서 소개된 항공산업 추가 직무';
    const note=document.createElement('p');note.textContent='항공산업 전반의 탐색 목록입니다. 선택 학과별 추천 또는 개인 적합도 순위가 아닙니다. 자격·채용 조건은 각 기관의 최신 공고에서 확인하세요.';
    const list=document.createElement('ul');
    list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:4px 16px;padding-inline-start:1.5rem;line-height:1.6';
    roles.forEach(role=>{const li=document.createElement('li');li.dataset.lectureRoleId=role.id;li.textContent=role.nameKo;list.append(li);});
    section.append(title,note,list);host.insertAdjacentElement('afterend',section);
    const competencies=g.DCasAviationJobProfiles?.lectureCompetencies||[];
    if(competencies.length){
      const skillsTitle=document.createElement('h4');skillsTitle.textContent='강의의 공통 준비 역량';
      const skillsNote=document.createElement('p');skillsNote.textContent='아래 활동은 모든 학습자를 위한 일반 연습 예시이며 PASS 점수의 진단·직무 적합도 판정이 아닙니다.';
      const skills=document.createElement('ul');skills.style.cssText=list.style.cssText;
      competencies.forEach(item=>{const li=document.createElement('li');li.dataset.lectureCompetencyId=item.id;li.textContent=item.nameKo+' — '+item.practiceKo;skills.append(li);});
      section.append(skillsTitle,skillsNote,skills);
    }
  }
  function render(){
    ensureMajorOptions();
    if(!g.document||!g.DCasAdultEngine)return;
    const p=g.DCasAdultEngine.PROFILE;
    if(p.workContext&&p.workContext.status==='employed')return;
    const select=document.getElementById('majorSelect');
    const name=select&&select.value!=='__custom__'?select.value:p.majorName;
    const c=resolve(name);if(!c)return;
    if(c.mode==='existing-interim-ranking'){renderSecurityProfiles(c);renderLectureRoles();return;}
    const lang=locale();
    const normalized=lang==='zh-CN'?'zh':lang;
    const t=g.DCasAviationLocales[normalized]||g.DCasAviationLocales.ko;
    const set=(id,text)=>{const e=document.getElementById(id);setElement(e,text);if(e)e.lang=normalized;};
    const host=document.getElementById('pf-jobcards');if(!host)return;
    host.dataset.fgGuidance='aviation';host.lang=normalized;host.dir=normalized==='ar'?'rtl':'ltr';
    host.replaceChildren();
    const ul=document.createElement('ul');ul.style.cssText='padding-inline-start:1.5rem;line-height:1.8;overflow-wrap:anywhere';
    if(lang==='ko'&&g.DCasAviationJobProfiles){
      koreanProfiles(c).forEach(item=>{const li=document.createElement('li');li.dataset.careerProfileId=item.id;li.textContent=item.label;ul.append(li);});
    }else{
      c.jobIds.forEach(id=>{const li=document.createElement('li');li.dataset.careerJobId=id;li.textContent=t[id];ul.append(li);});
    }
    host.append(ul);
    c.sources.forEach((url,i)=>{const row=document.createElement('p'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=t.source+' '+new Intl.NumberFormat(normalized).format(i+1);row.append(a);host.append(row);});
    set('pf-jobs-h2',t.heading+' · '+t[c.id]);set('pf-jobs-combotag','');
    document.getElementById('pf-jobs-combotag').hidden=true;
    document.getElementById('pf-jobs-combotag').style.display='none';
    const interview=document.getElementById('pf-interviewcard');
    if(interview){remember(interview);interview.dataset.fgGuidance='aviation';interview.hidden=true;interview.style.display='none';}
    setElement(document.querySelector('#jobs > .eyebrow'),t.nav);
    setElement(document.querySelector('#jobs > .sub'),t.note);
    setElement(document.querySelector('#jobskill > h2'),t.heading);
    setElement(document.querySelector('#jobskill > .sub'),t.note);
    document.querySelectorAll('#major > .tip-box:not([id]), #major > .recommend-box').forEach(hideElement);
    ['pf-cover-teaser','pf-faq-lowjob','pf-major-gaugedesc','pf-jobskillcards'].forEach(id=>set(id,t.note));
    g.__DCAS_CAREER_EXPLORATION__=getCareerContext(name);
    renderLectureRoles();
    refreshNavigation();
  }
  function refreshNavigation(){
    if(!g.document||!g.DCasAdultEngine)return;
    const p=g.DCasAdultEngine.PROFILE;if(p.workContext?.status==='employed')return;
    const c=resolve(p.majorName);if(!c||c.mode!=='exploration-unranked')return;
    const lang=g.FeelGoodReportI18n?.getLocale()||g.__REPORT_LOCALE__||'ko';
    const t=g.DCasAviationLocales[lang==='zh-CN'?'zh':lang]||g.DCasAviationLocales.ko;
    document.querySelectorAll('.toc-item[data-idx="6"] .label').forEach(e=>setElement(e,t.nav));
    if(document.getElementById('jobs')?.classList.contains('active'))setElement(document.getElementById('stepLabel'),t.nav);
  }
  // Restore elements before normal report rendering; never translate user input.
  function beforeRender(){
    if(!g.document)return;
    document.getElementById('fg-aviation-security-profiles')?.remove();
    document.getElementById('fg-aviation-lecture-roles')?.remove();
    originals.forEach((v,e)=>{if(e.isConnected){e.innerHTML=v.html;e.hidden=v.hidden;e.style.display=v.display;}});originals.clear();
    document.querySelectorAll('[data-fg-guidance="aviation"]').forEach(e=>{delete e.dataset.fgGuidance;e.removeAttribute('lang');e.removeAttribute('dir');});
    g.__DCAS_CAREER_EXPLORATION__=null;
  }
  g.DCasAviationCatalog=Object.freeze({version:VERSION,resolve,isUnranked:unranked,getCareerContext,render,beforeRender,refreshNavigation,ensureMajorOptions});
  if(g.document){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureMajorOptions,{once:true});
    else ensureMajorOptions();
    document.addEventListener('fg-report-locale-changed',render);
  }
})(typeof window!=='undefined'?window:globalThis);
