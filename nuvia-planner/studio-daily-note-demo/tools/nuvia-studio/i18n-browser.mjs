import fs from 'node:fs';
import {browser} from './browser-lib.mjs';
const locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const origin='https://'+process.env.REPLIT_DEV_DOMAIN,key='nuvia:studio:v1:review',t=id=>`[data-testid="${id}"]`;
const b=await browser(9482),results=[];
const nav=async page=>{
 const top=await b.run(`document.querySelector('${t('button-more-top')}').checkVisibility()`);
 const direct=(top?['now','plan','reflect','report']:['now','plan','reflect']).includes(page);
 if(direct){await b.run(`document.querySelector('${t((top?'tab-':'mtab-')+page)}').click()`);return;}
 const side=top?'top':'bottom',item=t('menu-'+page+'-'+side);
 if(!await b.run(`!!document.querySelector('${item}')`))await b.run(`document.querySelector('${t('button-more-'+side)}').click()`);
 await b.run(`document.querySelector('${item}').click()`);
};
const inspect=()=>b.run(`(()=>{
 const root=document.querySelector('[data-testid=studio-root]'),bad=[],stored=JSON.parse(localStorage.getItem('${key}'));
 const user=[];const fields=new Set(['title','cardTitle','subject','scope','firstAction','flag','name','output','materials','nextPosition','example','note']);
 const collect=x=>{if(!x||typeof x!=='object')return;for(const [k,v]of Object.entries(x)){if(fields.has(k)&&typeof v==='string'&&v)user.push(v);else if(v&&typeof v==='object')collect(v);}};collect(stored);
 const clean=s=>user.sort((a,b)=>b.length-a.length).reduce((v,u)=>v.split(u).join(''),s);
 const visit=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 while(visit.nextNode()){const n=visit.currentNode,p=n.parentElement;if(!p||!p.checkVisibility()||p.closest('[data-st-user],[translate=no],select[data-testid=select-language]'))continue;const s=clean(n.textContent.trim());if(/[가-힣]/.test(s))bad.push({kind:'text',s:s.slice(0,180)});}
 for(const e of root.querySelectorAll('[aria-label],[alt],[title],[placeholder]')){if(!e.checkVisibility()||e.closest('[data-st-user],[translate=no]'))continue;for(const a of ['aria-label','alt','title','placeholder'])if(/[가-힣]/.test(clean(e.getAttribute(a)||'')))bad.push({kind:a,s:e.getAttribute(a)});}
 return {overflow:document.documentElement.scrollWidth>innerWidth+1,bad};
})()`);
try{
 await b.call('Page.navigate',{url:origin+'/studio.html?review=1#i18n-qa'});
 await b.wait('!!document.querySelector("[data-testid=studio-root]")');
 await b.click(t('studio-board-fixture'));await b.click(t('fixture-confirm'));
 await b.run(`document.querySelector('${t('review-console')}').open=false`);
 const selected=process.argv.slice(2).filter(x=>locales.includes(x));
 for(const locale of selected.length?selected:locales){
  const row={locale,failures:[],viewports:[],reports:[]};
  await nav('settings');await b.fill(t('select-language'),locale);
  const s=await b.run(`JSON.parse(localStorage.getItem('${key}'))`);const desk=s.studio.deskId;
  if(!await b.run(`document.documentElement.lang===${JSON.stringify(locale)}&&document.documentElement.dir===${JSON.stringify(locale==='ar'?'rtl':'ltr')}&&location.hash==='#i18n-qa'&&location.search==='?review=1'`))row.failures.push('lang/dir/location');
  for(const width of [1440,360]){
   await b.viewport(width,1000);const pages=[];
   for(const page of ['settings','now','plan','reflect','report','roadmap','growth']){
    await nav(page);const found=await inspect();pages.push({page,...found});
    if(found.overflow)row.failures.push(width+'/'+page+'/overflow');
    if(locale!=='ko'&&found.bad.length)row.failures.push(width+'/'+page+'/Korean');
    if(page==='report'){
     const report=await b.run(`(()=>{const html=document.querySelector('[data-testid=report-preview]').srcdoc,d=new DOMParser().parseFromString(html,'text/html'),s=JSON.parse(localStorage.getItem('${key}')),values=[];const collect=x=>{if(!x||typeof x!=='object')return;for(const[k,v]of Object.entries(x)){if(['title','cardTitle','subject','scope','firstAction','flag','name','output','materials','nextPosition','example','note'].includes(k)&&typeof v==='string'&&v)values.push(v);else if(v&&typeof v==='object')collect(v);}};collect(s);let text=d.body.textContent;for(const v of values.sort((a,b)=>b.length-a.length))text=text.split(v).join('');return {lang:d.documentElement.lang,dir:d.documentElement.dir,korean:/[가-힣]/.test(text),remaining:text.match(/[^.]{0,30}[가-힣][^.]{0,50}/g),text:d.body.textContent.slice(0,130)}})()`);
     row.reports.push({width,...report});if(report.lang!==locale||report.dir!==(locale==='ar'?'rtl':'ltr'))row.failures.push(width+'/report/lang-dir');
     if(locale!=='ko'&&report.korean)row.failures.push(width+'/report/Korean');
     // This fixture's titles/subjects are synthetic student content, not translated.
     await b.call('Emulation.setEmulatedMedia',{media:'print'});
     const pdf=await b.call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});
     fs.mkdirSync('generated-artifacts/studio-i18n/print',{recursive:true});fs.writeFileSync(`generated-artifacts/studio-i18n/print/${locale}-${width}.pdf`,Buffer.from(pdf.data,'base64'));
     await b.call('Emulation.setEmulatedMedia',{media:'screen'});
    }
   }
   await nav('now');
   await b.run('window.scrollTo(0,0)');
   const shot=await b.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.mkdirSync('screenshots/studio-i18n',{recursive:true});fs.writeFileSync(`screenshots/studio-i18n/${locale}-${width}.png`,Buffer.from(shot.data,'base64'));
   row.viewports.push({width,pages});
  }
  const after=await b.run(`JSON.parse(localStorage.getItem('${key}'))`);
  if(JSON.stringify(s.lab.students)!==JSON.stringify(after.lab.students)||after.studio.deskId!==desk)row.failures.push('record mutation');
  row.status=row.failures.length?'FAIL':'PASS';results.push(row);console.log(locale,row.status,row.failures.join(','));
   fs.writeFileSync('generated-artifacts/studio-i18n/browser'+(selected.length?'-focused':'')+'-results.json',JSON.stringify({results,consoleErrors:b.errors},null,2));
 }
 console.log('CONSOLE',b.errors);
}finally{b.close();}
