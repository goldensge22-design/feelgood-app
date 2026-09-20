import {catalog,common,messages,requiredKeys,resolveLocale,validatePack,translator,w24Url,type Mission} from './adapters';
import './style.css';
const mount=document.querySelector<HTMLDivElement>('#app')!;
const query=new URLSearchParams(location.search);
const t=translator(messages);
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,cls?:string)=>{
 const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;
};
const button=(label:string,action:()=>void,cls='')=>{const b=node('button',label,cls);b.type='button';b.addEventListener('click',action);return b;};
const safeStored=()=>{
 const linked=sessionStorage.getItem('nuvia.linkedProfile.v1');
 if(linked){const profile=JSON.parse(linked);if(typeof profile.locale==='string')return profile.locale;}
 return localStorage.getItem('nuvia.history.annual.locale.v1');
};
function picker(error?:unknown,selectedLocale?:string|null){
 mount.replaceChildren();document.documentElement.removeAttribute('lang');document.title='NUVIA HISTORY';
 const section=node('main',undefined,'language-panel');section.append(node('h1','NUVIA HISTORY'));
 if(error&&selectedLocale==='ko'){
   document.documentElement.lang='ko';
   section.append(node('p',t('languageUnavailable')),node('p',t('chooseLanguage')));
 }
 // Native names on a language selector are not a fallback content screen.
 for(const item of common.languages!.filter(l=>l.availability==='release')){
   if(item.code!=='ko')continue;
   const b=button(t('ko'),()=>{const next=new URL(location.href);next.searchParams.set('lang','ko');location.assign(next.href);});
   b.lang='ko';section.append(b);
 }
 mount.append(section);
 if(query.get('qa')==='1'&&error){const aside=node('aside',undefined,'qa-panel');aside.dataset.qaInspector='true';aside.append(node('h2','QA Inspector'),node('pre',String(error)));mount.append(aside);}
}
function showDetails(m:Mission,origin:HTMLElement){
 const dialog=node('dialog');const heading=node('h2',t(m.titleKey));heading.id='mission-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading,node('p',t('notReady')));
 const list=node('dl','', 'readiness');
 const fields=[['data','linked'],['execution','pending'],['assets','pending'],['content',m.week===1?'contentSource':'pending'],['userReview','reviewPending']];
 for(const [key,value] of fields)list.append(node('dt',t(key)),node('dd',t(value)));
 dialog.append(list,button(t('close'),()=>dialog.close(),'primary'));
 dialog.addEventListener('close',()=>{dialog.remove();origin.focus();});
 document.body.append(dialog);dialog.showModal();
}
function card(m:Mission,locale:string,featured=false){
 const article=node('article',undefined,'mission-card'+(featured?' featured':''));
 article.dataset.week=String(m.week);
 article.append(node('span',t('week',{week:m.week}),'week'),node('h3',t(m.titleKey)),node('span',t(m.state),'status '+m.state));
 if(m.state==='executable'){
  const link=node('a',t('open'),'primary');link.href=w24Url(m,location.href,locale);article.append(link,node('small',t('compat')));
 }else{
  const b=button(t('details'),()=>{try{localStorage.setItem('nuvia.history.annual.selection.v1',String(m.week));}catch{}showDetails(m,b);});article.append(b);
 }
 return article;
}
let selectedLocale=query.get('lang');
try{
 selectedLocale=selectedLocale??safeStored()??common.defaultLocale;
 const locale=resolveLocale(selectedLocale,null);validatePack(locale,messages,requiredKeys);
 document.documentElement.lang=locale;document.documentElement.dir='ltr';document.title=t('title')+' · '+t('brand');
 const skip=node('a',t('skip'),'skip');skip.href='#all-stories';mount.append(skip);
 const header=node('header');const brand=node('div',t('brand'),'brand');header.append(brand,node('span',t('feelgood'),'wordmark'));
 const lang=button(t('ko'),()=>picker());lang.lang='ko';lang.setAttribute('aria-label',t('language'));header.append(lang);mount.append(header);
 const main=node('main');const hero=node('section',undefined,'hero');hero.append(node('p',t('intro'),'eyebrow'),node('h1',t('title')),node('p',t('notice')),node('span',t('count'),'count'));main.append(hero);
 const featured=node('section');featured.setAttribute('aria-labelledby','featured-title');const title=node('h2',t('featured'));title.id='featured-title';featured.append(title);
 const grid=node('div',undefined,'featured-grid');for(const week of [1,24,48])grid.append(card(catalog.missions.find(m=>m.week===week)!,locale,true));featured.append(grid);main.append(featured);
 const all=node('section');all.id='all-stories';all.tabIndex=-1;all.append(node('h2',t('all')));const allGrid=node('div',undefined,'all-grid');for(const m of catalog.missions)allGrid.append(card(m,locale));all.append(allGrid);main.append(all);mount.append(main);
 const footer=node('footer',t('preserved'));mount.append(footer);
}catch(error){picker(error,selectedLocale);}
