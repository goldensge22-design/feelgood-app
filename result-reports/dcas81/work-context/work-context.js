/* Optional adult-only context layer. Classification codes are NOT PASS norms.
 * Detached academic nodes retain their values/listeners and are restored on exit.
 * No user data is sent to a translation or classification service at runtime. */
(function(g){
  'use strict';
  const MODES=['student','jobseeker','employed','undecided'];
  const catalog=g.DCasOccupationCatalog;
  const byCode=new Map(catalog.occupations.map(o=>[o.code,o]));
  const backups=new Map();
  let profile, draft, lastSelection, filter='', query='', toolbar, activeLocale='ko';
  const sections={efficiency:'work.efficiency',emotional:'work.support',major:'selection.title',jobs:'work.methods',jobskill:'work.capabilities',growth:'work.growth',roadmap:'work.roadmap',docs:'work.evidence',faq:'work.faq',about:'work.about'};
  function locale(value){
    const normalized=String(value||'ko').replaceAll('_','-');
    return Object.keys(g.DCasWorkResources.locales).find(k=>k.toLowerCase()===normalized.toLowerCase())||'ko';
  }
  function t(key,values){
    let value=g.DCasWorkResources.locales[activeLocale]?.[key];
    if(!value){console.warn('[work-context:i18n-missing]',activeLocale,key);value=g.DCasWorkResources.locales.ko[key];}
    if(!value)throw new Error('Missing work-context key: '+key);
    return value.replace(/\{(\w+)\}/g,(_,k)=>{if(!values||!Object.hasOwn(values,k))throw new Error('Missing placeholder '+k);return String(values[k]);});
  }
  function text(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
  function normalize(value){
    value=value||{};
    const status=MODES.includes(value.status)?value.status:'student';
    const occupationCode=String(value.occupationCode||'');
    return {status,occupationCode:byCode.has(occupationCode)||occupationCode==='other'?occupationCode:'',jobTitle:text(value.jobTitle,120),tasks:text(value.tasks,800)};
  }
  function valid(value){return !!(byCode.has(value.occupationCode)||(value.occupationCode==='other'&&value.jobTitle.trim()));}
  function get(){return normalize(profile?.workContext);}
  function employed(){return get().status==='employed';}
  function el(tag,value,className){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(className)n.className=className;return n;}
  function owned(n){n.dataset.fgGuidance='true';n.dataset.dcasWorkContext='true';n.lang=activeLocale;n.dir=activeLocale==='ar'?'rtl':'ltr';return n;}
  function save(n){
    if(!n||backups.has(n))return;
    backups.set(n,{children:[...n.childNodes],attributes:['data-fg-guidance','data-dcas-work-context','lang','dir'].map(k=>[k,n.getAttribute(k)])});
  }
  function replace(n,...children){if(!n)return;save(n);owned(n);n.replaceChildren(...children);}
  function restore(){for(const [n,b] of backups){n.replaceChildren(...b.children);for(const [k,v] of b.attributes)v===null?n.removeAttribute(k):n.setAttribute(k,v);}backups.clear();}
  function write(selector,value){document.querySelectorAll(selector).forEach(n=>replace(n,document.createTextNode(value)));}
  function jobName(value){return value.jobTitle|| (value.occupationCode==='other'?t('selection.other'):value.occupationCode?t('occupation.'+value.occupationCode):'');}
  function summary(value){
    const box=el('div',undefined,'dcas-work-summary');
    if(!valid(value)){box.append(el('p',t('selection.pending')));return box;}
    box.append(el('h3',t('selection.current',{job:jobName(value)})));
    const o=byCode.get(value.occupationCode);
    if(o)box.append(el('p',t('selection.classification',{group:t('occupation.'+o.group),job:t('occupation.'+o.code),code:o.code})));
    box.append(el('p',value.tasks?t('selection.record',{tasks:value.tasks}):t('selection.noTasks')));
    return box;
  }
  function search(q,middle){
    const needle=String(q||'').trim().toLocaleLowerCase(activeLocale);
    return catalog.occupations.filter(o=>(!middle||o.middle===middle)&&(!needle||[o.code,o.group,o.middle,o.major].some(c=>(c+' '+t('occupation.'+c)+' '+g.DCasWorkResources.locales.ko['occupation.'+c]).toLocaleLowerCase(activeLocale).includes(needle))));
  }
  function field(form,key,input,help){
    const label=el('label',t(key));label.htmlFor=input.id;
    const box=el('div',undefined,'dcas-work-field');box.append(label,input);
    if(help){const note=el('p',t(help),'dcas-work-help');note.id=input.id+'-help';input.setAttribute('aria-describedby',note.id);box.append(note);}form.append(box);return box;
  }
  function picker(value){
    const form=el('form',undefined,'dcas-work-form');form.id='dcas-work-form';form.noValidate=true;
    draft||={...value};
    form.append(el('p',t('selection.intro')),el('p',t('selection.count'),'dcas-work-help'));
    const group=el('select');group.id='dcas-work-group';
    group.append(new Option(t('selection.all'),''));
    for(const major of catalog.groups.filter(c=>c.code.length===1)){
      const optgroup=el('optgroup');optgroup.label=t('occupation.'+major.code);
      catalog.groups.filter(c=>c.code.length===2&&c.parent===major.code).forEach(c=>optgroup.append(new Option(t('occupation.'+c.code),c.code)));group.append(optgroup);
    }group.value=filter;
    field(form,'selection.group',group);
    const input=el('input');input.type='search';input.id='dcas-work-search';input.value=query;input.maxLength=120;field(form,'selection.search',input);
    const count=el('p',undefined,'dcas-work-help');count.id='dcas-work-count';count.setAttribute('aria-live','polite');form.append(count);
    const select=el('select');select.id='dcas-work-occupation';field(form,'selection.job',select);
    const selectionLabel=el('p',undefined,'dcas-work-help');form.append(selectionLabel);
    function fullLabel(){selectionLabel.textContent=draft.occupationCode?(draft.occupationCode==='other'?t('selection.other'):t('occupation.'+draft.occupationCode)):'';}
    function options(){
      const matches=search(query,filter);
      // Retain the selected occupation even if a new search would exclude it.
      const selected=byCode.get(draft.occupationCode);
      const entries=selected&&!matches.includes(selected)?[selected,...matches]:matches;
      select.replaceChildren(new Option(t('selection.placeholder'),''),...entries.map(o=>new Option(t('occupation.'+o.code)+' · '+o.code,o.code)),new Option(t('selection.other'),'other'));
      select.value=draft.occupationCode;
      count.textContent=t('selection.results',{count:new Intl.NumberFormat(activeLocale).format(matches.length)});
      fullLabel();
    }
    options();
    const title=el('input');title.id='dcas-work-title';title.value=draft.jobTitle;title.maxLength=120;title.autocomplete='off';
    field(form,'selection.titleLabel',title,'selection.titleHelp');title.required=draft.occupationCode==='other';
    const tasks=el('textarea');tasks.id='dcas-work-tasks';tasks.value=draft.tasks;tasks.maxLength=800;tasks.rows=3;
    field(form,'selection.tasks',tasks,'selection.tasksHelp');
    const error=el('p');error.id='dcas-work-error';error.setAttribute('role','alert');form.append(error);
    const button=el('button',t('selection.apply'));button.type='submit';button.className='dcas-work-primary';form.append(button);
    const status=el('p');status.id='dcas-work-applied';status.setAttribute('role','status');form.append(status);
    group.addEventListener('change',()=>{filter=group.value;options();});
    input.addEventListener('input',()=>{query=input.value;options();});
    select.addEventListener('change',()=>{draft.occupationCode=select.value;title.required=select.value==='other';fullLabel();});
    title.addEventListener('input',()=>{draft.jobTitle=title.value;title.removeAttribute('aria-invalid');});
    tasks.addEventListener('input',()=>{draft.tasks=tasks.value;});
    form.addEventListener('submit',event=>{
      event.preventDefault();const next=normalize({...draft,status:'employed'});
      if(!valid(next)){
        error.textContent=t('selection.error');const invalid=next.occupationCode==='other'?title:select;invalid.setAttribute('aria-invalid','true');invalid.focus();return;
      }
      commit(next);g.DCasAdultEngine.render();
      const message=document.getElementById('dcas-work-applied');if(message)message.textContent=t('selection.applied');
      document.querySelector('#dcas-work-form button[type="submit"]')?.focus();
    });
    return form;
  }
  function commit(next){
    profile.workContext={...next};
    if(g.__RESULT_REPORT_PAYLOAD__?.reportKind==='dcas-adult')g.__RESULT_REPORT_PAYLOAD__.workContext={...next};
    document.dispatchEvent(new CustomEvent('fg-report-context-changed',{detail:{reportKind:'dcas-adult',workContext:{...next}}}));
  }
  function setMode(status){
    if(!MODES.includes(status))throw new RangeError('Invalid report mode');
    const major=document.getElementById('majorSelect');
    // Preserve a manual academic selection across the round trip; never derive a major from job text.
    if(!employed()&&major&&major.value!=='__custom__')profile.majorName=major.value;
    commit({...get(),status});
    g.DCasAdultEngine.render();
  }
  function mountToolbar(){
    const host=document.getElementById('major');if(!host)return;
    if(!toolbar){toolbar=el('div',undefined,'dcas-work-toolbar');toolbar.id='dcas-work-modes';}
    host.prepend(toolbar);
    owned(toolbar);
    const label=el('h3',t('context.title'));label.id='dcas-work-modes-title';
    const buttons=el('div',undefined,'dcas-work-modes');buttons.setAttribute('role','group');buttons.setAttribute('aria-labelledby',label.id);
    for(const mode of MODES){const b=el('button',t('mode.'+mode));b.type='button';b.dataset.role='mode';b.dataset.v=mode;b.setAttribute('aria-pressed',String(get().status===mode));b.addEventListener('click',()=>setMode(mode));buttons.append(b);}
    toolbar.replaceChildren(label,buttons,el('p',t('context.note'),'dcas-work-help'));
  }
  function methods(advice){
    const grid=el('div',undefined,'dcas-work-grid');
    for(const card of advice.cards){const article=el('article',undefined,'dcas-work-card');article.dataset.axis=card.axis;article.dataset.support=card.support;article.append(el('h3',card.title),el('p',card.method),el('p',card.supportText),el('h4',advice.t('observe.label')),el('p',card.check));grid.append(article);}return grid;
  }
  function plan(){const list=el('ol');for(const key of ['work.step1','work.step2','work.step3'])list.append(el('li',t(key)));return list;}
  function refreshNavigation(){
    if(!employed())return;
    const ids=['temperament','strength','efficiency','opinion','emotional','major','jobs','jobskill','growth','roadmap','docs','expert','faq','about'];
    document.querySelectorAll('.toc-item[data-idx] .label').forEach(n=>{const key=sections[ids[Number(n.parentElement.dataset.idx)]];if(key)writeNode(n,t(key));});
    const current=document.querySelector('#pdfArea > section.active');const key=sections[current?.id];
    if(key)write('#stepLabel',t(key));
  }
  function writeNode(n,value){replace(n,document.createTextNode(value));}
  function afterRender(p,lang){
    profile=p;activeLocale=locale(lang||g.__REPORT_LOCALE__||g.__DCAS_LANG__||'ko');
    restore();mountToolbar();
    if(!employed())return;
    const value=get(),advice=g.FeelGoodPassGuidance.describe('dcas-adult',profile,activeLocale);
    const selection=JSON.stringify([value.occupationCode,value.jobTitle,value.tasks]);
    if(selection!==lastSelection){draft={...value};lastSelection=selection;}
    for(const [id,key] of Object.entries(sections)){
      const host=document.getElementById(id);if(!host)continue;
      const box=owned(el('div',undefined,'dcas-work-content'));box.append(el('h2',t(key)));
      if(id==='major'){
        box.append(picker(value),summary(value),el('p',t('selection.noFit'),'dcas-work-limit'));
        const link=el('a',t('selection.source'));link.href=catalog.source;link.target='_blank';link.rel='noopener noreferrer';box.append(link);
      }else if(id==='efficiency'){
        box.append(el('p',advice.scoreLine),el('p',advice.reason),el('p',advice.learning),methods(advice),el('p',advice.limitation));
      }else if(id==='emotional'){
        box.append(el('p',t('work.supportText')),el('p',advice.adjust),el('p',t('work.sharing')));
      }else if(id==='faq'||id==='about'){
        box.append(el('p',t('work.noRanking')),el('p',t('work.restore')),el('p',t('work.supportText')),el('p',t('work.sharing')));
      }else{
        box.append(summary(value));
        if(!valid(value))box.append(el('p',t('work.chooseFirst')));
        else if(id==='jobs')box.append(el('h3',t('work.methodPrompt',{job:jobName(value)})),el('p',advice.reason),methods(advice));
        else if(id==='docs')box.append(el('p',t('work.recordTemplate')),el('p',advice.t('evidence.verify')));
        else if(id==='jobskill'){
          const grid=el('div',undefined,'dcas-work-grid');
          for(const card of advice.cards){const item=el('article',undefined,'dcas-work-card');item.append(el('h3',card.title),el('p',card.supportText),el('h4',advice.t('observe.label')),el('p',card.check));grid.append(item);}
          box.append(grid,el('p',advice.limitation));
        }
        else if(id==='growth')box.append(el('p',advice.scoreLine),el('p',t('work.recordTemplate')),el('p',advice.adjust),el('p',advice.t('evidence.verify')));
        else box.append(el('h3',t('work.taskPrompt',{job:jobName(value)})),plan(),el('p',advice.learning),el('p',advice.adjust));
        box.append(el('p',t('selection.noFit'),'dcas-work-limit'));
      }
      replace(host,box);
      if(id==='major')host.prepend(toolbar);
    }
    // Remove academic claims from the retained score/profile sections and cover.
    write('#coverArea .cover-card ol li:last-child',t('work.cover'));
    write('#pf-cover-teaser',t('work.cover'));
    write('#t-footnote',t('work.sharing'));
    write('#temperament .hook-card',t('work.hook'));
    write('#temperament .recommend-box',t('work.supportText'));
    const date=profile.testDate||{};
    const dateText=new Intl.DateTimeFormat(activeLocale,{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(date.y||2026,(date.m||1)-1,date.d||1)));
    const meta=t('work.header',{age:new Intl.NumberFormat(activeLocale).format(profile.ageYears),date:dateText});
    write('#pf-cover-meta,#t-meta',meta);
    refreshNavigation();
  }
  // New host applications can bind their existing mode buttons to setMode;
  // this candidate's toolbar uses the same mode values as the archived report.
  g.DCasWorkContext=Object.freeze({normalize,valid,search,get,setMode,afterRender,beforeRender:restore,refreshNavigation,MODES:MODES.slice()});
  document.addEventListener('fg-report-locale-changed',e=>{if(profile)afterRender(profile,e.detail.locale);});
  // Loaded after academic form listeners, so an initially employed payload can
  // later restore the fully functional academic form as well.
  if(g.DCasAdultEngine)afterRender(g.DCasAdultEngine.PROFILE,g.__REPORT_LOCALE__||g.__DCAS_LANG__||'ko');
})(window);
