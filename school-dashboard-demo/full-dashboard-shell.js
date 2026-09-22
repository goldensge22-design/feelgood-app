(function(){
'use strict';
var FALLBACK='ko';
var STORAGE='fg.schoolDashboard.locale';
var MODE=document.body.getAttribute('data-mode')||location.pathname.split('/').pop().replace('.html','')||'homeroom';
var UI_STATE_STORAGE='fg.schoolDashboard.localeState.'+MODE;
var LOCALES=[
  ['ko','한국어','ltr'],['en','English','ltr'],['ja','日本語','ltr'],['zh-CN','简体中文','ltr'],['zh-TW','繁體中文','ltr'],
  ['es','Español','ltr'],['fr','Français','ltr'],['ru','Русский','ltr'],['vi','Tiếng Việt','ltr'],['th','ไทย','ltr'],
  ['ar','العربية','rtl'],['it','Italiano','ltr'],['az','Azərbaycan','ltr'],['mn','Монгол','ltr'],['km','ខ្មែរ','ltr']
];
function alias(code){
  var c=String(code||'').toLowerCase();
  if(c==='zh'||c==='zh-cn'||c==='zh-hans')return'zh-CN';
  if(c==='zh-tw'||c==='zh-hant'||c==='zh-hk')return'zh-TW';
  for(var i=0;i<LOCALES.length;i++)if(LOCALES[i][0].toLowerCase()===c)return LOCALES[i][0];
  return null;
}
function resolveLocale(){
  var q=alias(new URLSearchParams(location.search).get('lang'));if(q)return q;
  try{var saved=alias(localStorage.getItem(STORAGE));if(saved)return saved;}catch(e){}
  return alias(navigator.language)||alias(String(navigator.language||'').split('-')[0])||FALLBACK;
}
function esc(v){return String(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function href(mode,locale){var name=mode==='homeroom'?'homeroom.html':mode==='school'?'school.html':'track.html';return name+'?lang='+encodeURIComponent(locale);}
function captureUiState(){
  var saved={selects:{},fields:{}};
  document.querySelectorAll('select[id]:not(#language-select)').forEach(function(el){saved.selects[el.id]=el.value;});
  document.querySelectorAll('input[id],textarea[id]').forEach(function(el){
    if(el.type!=='file'&&el.type!=='password')saved.fields[el.id]=el.value;
  });
  try{sessionStorage.setItem(UI_STATE_STORAGE,JSON.stringify(saved));}catch(e){}
}
function restoreUiState(){
  var raw;try{raw=sessionStorage.getItem(UI_STATE_STORAGE);}catch(e){}if(!raw)return;
  var saved;try{saved=JSON.parse(raw);}catch(e){return;}
  var attempts=0;
  function restore(){
    attempts++;
    var classSelect=document.getElementById('class-select');
    var classValue=saved.selects&&saved.selects['class-select'];
    if(classValue&&classSelect&&classSelect.value!==classValue&&classSelect.querySelector('option[value="'+classValue.replace(/["\\]/g,'\\$&')+'"]')){
      classSelect.value=classValue;classSelect.dispatchEvent(new Event('change',{bubbles:true}));
      setTimeout(restore,0);return;
    }
    var pending=false;
    Object.keys(saved.selects||{}).forEach(function(id){
      if(id==='class-select')return;
      var el=document.getElementById(id),value=saved.selects[id];
      if(!el){pending=true;return;}
      var valid=Array.prototype.some.call(el.options||[],function(option){return option.value===value;});
      if(valid&&el.value!==value){el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));}
    });
    Object.keys(saved.fields||{}).forEach(function(id){var el=document.getElementById(id);if(!el){pending=true;return;}el.value=saved.fields[id];});
    if(pending&&attempts<20)setTimeout(restore,100);
    else try{sessionStorage.removeItem(UI_STATE_STORAGE);}catch(e){}
  }
  restore();
}
function installShell(locale,messages){
  var ctl=document.querySelector('.top .ctl');if(!ctl)return;
  var nav=document.createElement('nav');nav.className='dashboard-switch';nav.setAttribute('aria-label',messages['nav.dashboardTypes']||'대시보드 유형');
  [['homeroom','nav.homeroom'],['school','nav.school'],['track','nav.track']].forEach(function(x){var a=document.createElement('a');a.href=href(x[0],locale);a.textContent=messages[x[1]]||x[0];if(x[0]===MODE)a.setAttribute('aria-current','page');nav.appendChild(a);});
  var wrap=document.createElement('div');wrap.className='language-control';
  var label=document.createElement('label');label.htmlFor='language-select';label.textContent='🌐 '+(messages['language.select']||'언어 선택');
  var select=document.createElement('select');select.id='language-select';select.setAttribute('aria-label',messages['language.select']||'언어 선택');
  LOCALES.forEach(function(item){var o=document.createElement('option');o.value=item[0];o.textContent=item[1];o.selected=item[0]===locale;select.appendChild(o);});
  select.addEventListener('change',function(){captureUiState();try{localStorage.setItem(STORAGE,select.value);}catch(e){}var url=new URL(location.href);url.searchParams.set('lang',select.value);location.href=url.pathname+url.search+url.hash;});
  wrap.appendChild(label);wrap.appendChild(select);
  ctl.parentNode.insertBefore(nav,ctl);ctl.insertBefore(wrap,ctl.firstChild);
}
function translateExact(ko,target){
  if(!ko||!target)return;
  var reverse={},patterns=[];
  function regexEscape(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  Object.keys(ko).forEach(function(k){
    if(!ko[k]||typeof ko[k]!=='string'||ko[k].indexOf('{')>=0)return;
    if(ko[k].indexOf('__V')<0){reverse[ko[k]]=k;return;}
    var markers=[],last=0,source=ko[k],expression='^',match;
    var marker=/__V([0-9]+)__/g;
    while((match=marker.exec(source))){
      expression+=regexEscape(source.slice(last,match.index))+'(.*?)';markers.push(Number(match[1]));last=match.index+match[0].length;
    }
    expression+=regexEscape(source.slice(last))+'$';
    patterns.push({key:k,re:new RegExp(expression),markers:markers,fixed:source.replace(/__V[0-9]+__/g,'').length});
  });
  patterns.sort(function(a,b){return b.fixed-a.fixed||a.markers.length-b.markers.length;});
  function translated(value){
    var key=reverse[value];if(key&&target[key])return target[key];
    for(var i=0;i<patterns.length;i++){
      var pattern=patterns[i],matched=pattern.re.exec(value),template=target[pattern.key];
      if(!matched||!template)continue;
      var values={};pattern.markers.forEach(function(number,index){values[number]=matched[index+1];});
      return template.replace(/__V([0-9]+)__/g,function(_,number){return values[number]==null?'':values[number];});
    }
    return null;
  }
  function run(root){
    var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      if(!n.parentElement||n.parentElement.closest('script,style,#language-select'))return;
      var raw=n.nodeValue,trim=raw.trim(),compact=trim.replace(/\s+/g,' '),value=translated(compact);
      if(value&&value!==compact)n.nodeValue=raw.slice(0,raw.indexOf(trim))+value+raw.slice(raw.indexOf(trim)+trim.length);
    });
    var attributed=[];
    if(root.nodeType===1&&root.matches('[aria-label],[title],[placeholder]'))attributed.push(root);
    root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(function(el){attributed.push(el);});
    attributed.forEach(function(el){['aria-label','title','placeholder'].forEach(function(a){var v=el.getAttribute(a),value=translated(v);if(value)el.setAttribute(a,value);});});
  }
  run(document.body);
  var translatedTitle=translated(document.title.replace(/\s+/g,' ').trim());if(translatedTitle)document.title=translatedTitle;
  var observer=new MutationObserver(function(changes){changes.forEach(function(c){
    if(c.type==='characterData'&&c.target.parentElement)run(c.target.parentElement);
    c.addedNodes.forEach(function(n){if(n.nodeType===1)run(n);else if(n.nodeType===3&&n.parentElement)run(n.parentElement);});
  });});
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
}
function interpolate(text,vars){return String(text||'').replace(/\{(\w+)\}/g,function(_,key){return vars&&vars[key]!=null?vars[key]:'';});}
var locale=resolveLocale();var meta=LOCALES.filter(function(x){return x[0]===locale;})[0]||LOCALES[0];document.documentElement.lang=locale;document.documentElement.dir=meta[2];try{localStorage.setItem(STORAGE,locale);}catch(e){}
if(MODE==='track'&&location.hash==='#s-school'){var migrated=new URL(location.href);migrated.hash='s-students';history.replaceState(null,'',migrated.pathname+migrated.search+migrated.hash);}
Promise.all([fetch('locales/ko.json').then(function(r){return r.json();}),fetch('locales/'+locale+'.json').then(function(r){return r.json();})]).then(function(packs){
  var source=packs[0].messages||{},target=packs[1].messages||{};
  window.kpassT=function(key,vars){return interpolate(target[key]||source[key]||'',vars);};
  installShell(locale,target);if(locale!==FALLBACK)translateExact(source,target);
  window.dispatchEvent(new CustomEvent('kpass-locale-ready',{detail:{locale:locale}}));
  restoreUiState();
}).catch(function(){window.kpassT=function(){return'';};installShell(locale,{});window.dispatchEvent(new CustomEvent('kpass-locale-ready',{detail:{locale:FALLBACK,error:true}}));});
})();
