/* Report-side bridge. The host server supplies authenticated saveTop5; no identity or scores go in a URL. */
(function(g){
  'use strict';
  const VERSION='dcas-lab-top5/2026-11-17.1';
  let lastProfile=null,lastRanked=null,lastEnvelope=null;
  const byId=id=>g.document?.getElementById(id);
  const locale=()=>g.FeelGoodReportI18n?.getLocale()||g.currentLang||g.__REPORT_LOCALE_ACTIVE__||g.__REPORT_LOCALE__||g.document?.documentElement.lang||'ko';
  function envelope(profile,ranked){
    if(!Array.isArray(ranked)||!ranked.length)return null;
    const selected=byId('majorSelect')?.value;
    const major=selected&&selected!=='__custom__'?selected:(profile?.majorName||'');
    const entries=ranked.slice(0,5).map(item=>({
      label:String(item?.job?._label_ko_raw||item?.job?.label_ko||'').trim(),
      sourceJobId:item?.job?.id==null?'':String(item.job.id),
    })).filter(item=>item.label);
    if(!entries.length)return null;
    const date=profile?.testDate;
    const testDate=date&&Number.isInteger(+date.y)&&Number.isInteger(+date.m)&&Number.isInteger(+date.d)
      ? [date.y,String(date.m).padStart(2,'0'),String(date.d).padStart(2,'0')].join('-') : undefined;
    return {
      version:VERSION,testName:'D-CAS',...(testDate?{testDate}:{}),sourceMajor:major,
      topJobs:entries.map(item=>({label:item.label})),
      sourceJobIds:entries.map(item=>item.sourceJobId),
    };
  }
  function validLabUrl(value){
    try{const url=new URL(value);return url.protocol==='https:'&&((url.hostname==='lab.feel-good.io')||(url.hostname==='nuvia.feel-good.io'&&/^\/lab\/company(?:\/|$)/.test(url.pathname)))&&
      !url.username&&!url.password&&!url.hash&&
      [...url.searchParams.keys()].every(key=>key==='lang')?url.href:null;}catch{return null;}
  }
  function render(profile=lastProfile,ranked=lastRanked){
    lastProfile=profile;lastRanked=ranked;
    byId('fg-lab-top5-bridge')?.remove();
    lastEnvelope=envelope(profile,ranked);
    if(!g.document||locale()!=='ko'||!lastEnvelope||profile?.workContext?.status==='employed')return;
    const host=byId('pf-jobcards');if(!host)return;
    const t=g.DCasLabTop5Locales?.ko;if(!t)return;
    const section=g.document.createElement('div');section.id='fg-lab-top5-bridge';
    section.style.cssText='margin-top:20px;padding:16px;border:1px solid #d9e3f4;border-radius:12px;overflow-wrap:anywhere';
    const heading=g.document.createElement('h3');heading.textContent=t.heading;
    const description=g.document.createElement('p');description.textContent=t.explanation;
    const status=g.document.createElement('p');status.setAttribute('role','status');
    section.append(heading,description);
    const adapter=g.FeelGoodLabBridge;
    if(typeof adapter?.saveTop5==='function'){
      const payload=JSON.parse(JSON.stringify(lastEnvelope));
      const button=g.document.createElement('button');button.type='button';button.textContent=t.send;
      button.style.cssText='min-height:44px;padding:10px 16px;border:0;border-radius:10px;background:#2457c5;color:#fff;font:inherit;cursor:pointer';
      button.addEventListener('click',async()=>{
        if(button.disabled)return;
        button.disabled=true;button.textContent=t.sending;status.textContent='';
        try{
          const result=await adapter.saveTop5(payload);
          if(!result?.ok)throw new Error('lab_top5_not_saved');
          status.textContent=t.saved;
          const target=validLabUrl(result.labUrl||adapter.labUrl);
          if(target){if(typeof adapter.navigate==='function')adapter.navigate(target);else g.location.assign(target);}
        }catch{status.textContent=t.failed;button.disabled=false;button.textContent=t.send;}
      });
      section.append(button);
    }else{
      status.textContent=t.unavailable;
      const target=validLabUrl(adapter?.labUrl);
      if(target){const link=g.document.createElement('a');link.href=target;link.textContent=t.manual;link.rel='noopener noreferrer';section.append(link);}
    }
    section.append(status);host.insertAdjacentElement('afterend',section);
  }
  g.DCasLabTop5Bridge=Object.freeze({version:VERSION,buildEnvelope:envelope,getEnvelope:()=>lastEnvelope&&JSON.parse(JSON.stringify(lastEnvelope)),render});
  if(g.document)g.document.addEventListener('fg-report-locale-changed',()=>render());
})(typeof window!=='undefined'?window:globalThis);
