(function(window){
'use strict';

var ALLOWED_MODES=['auto','live','sample'];

function own(obj,key){return Object.prototype.hasOwnProperty.call(obj||{},key);}
function text(value){return value==null?'':String(value).trim();}
function error(code,message,cause,details){
  var err=new Error(message);
  err.code=code;
  err.dashboardFatal=true;
  if(cause)err.cause=cause;
  if(details)err.details=details;
  return err;
}
function isLocal(){
  return location.protocol==='file:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
}
function queryMode(){
  try{return new URLSearchParams(location.search).get('data');}catch(e){return null;}
}
function resolveMode(config){
  var requested=queryMode()||config.dataMode||'auto';
  if(ALLOWED_MODES.indexOf(requested)<0)requested='auto';
  return requested==='auto'?(isLocal()?'sample':'live'):requested;
}
function joinUrl(base,path){
  if(/^https?:\/\//i.test(path))return path;
  return String(base||'').replace(/\/$/,'')+'/'+String(path||'').replace(/^\//,'');
}
function fillTemplate(template,context){
  return template.replace(/\{([A-Za-z0-9_]+)\}/g,function(all,key){
    var value=context[key];
    if(value==null||value==='')throw error('MISSING_CONTEXT','Missing required dashboard context: '+key,null,{key:key});
    return encodeURIComponent(value);
  });
}
function endpointFor(scope,context,config){
  if(typeof config.endpointBuilder==='function')return config.endpointBuilder(scope,context);
  var template=config.endpoints&&config.endpoints[scope];
  if(!template)throw error('MISSING_ENDPOINT','Dashboard API endpoint is not configured: '+scope,null,{scope:scope});
  return joinUrl(config.apiBase,fillTemplate(template,context));
}
function listFromPayload(payload){
  if(Array.isArray(payload))return payload;
  if(!payload||typeof payload!=='object')return [];
  if(Array.isArray(payload.classes))return payload.classes;
  if(payload.data&&Array.isArray(payload.data.classes))return payload.data.classes;
  if(payload.class&&typeof payload.class==='object')return [payload.class];
  if(payload.data&&payload.data.class&&typeof payload.data.class==='object')return [payload.data.class];
  return [];
}
function resultMeta(payload){
  var meta=payload&&payload.meta||payload&&payload.data&&payload.data.meta||{};
  return {
    requestId:text(meta.requestId||meta.correlationId),
    generatedAt:text(meta.generatedAt||meta.updatedAt),
    assessmentType:text(meta.assessmentType),
    assessmentCycleId:text(meta.assessmentCycleId||meta.cycleId),
    organizationId:text(meta.organizationId),
    schoolId:text(meta.schoolId),
    testedAt:text(meta.testedAt||meta.assessmentDate||meta.completedAt),
    policy:meta.policy&&typeof meta.policy==='object'?meta.policy:{},
    schoolMeans:meta.schoolMeans||meta.comparison&&meta.comparison.schoolMeans||null
  };
}
function resultDate(item){
  var value=item&&(item.testedAt||item.completedAt||item.assessedAt||item.resultDate||item.updatedAt);
  var time=value?Date.parse(value):NaN;
  return isFinite(time)?time:0;
}
function resultIdentity(item,index){
  var value=item&&(item.studentId||item.userId||item.subjectId||item.id||item.code);
  return value==null||value===''?'__row_'+index:String(value);
}
function selectLatestResults(items){
  var selected={},order=[];
  (Array.isArray(items)?items:[]).forEach(function(item,index){
    if(!item)return;
    var key=resultIdentity(item,index);
    if(!own(selected,key)){selected[key]=item;order.push(key);return;}
    if(resultDate(item)>=resultDate(selected[key]))selected[key]=item;
  });
  return order.map(function(key){return selected[key];});
}
function normalizeCareerTop5(student){
  var result=student&&student.result||{};
  var career=student&&student.career||result.career||{};
  var aptitude=student&&student.careerAptitude||result.careerAptitude||career.aptitude||null;
  var list=student&&(student.careerTop5||student.jobTop5)||result.careerTop5||result.jobTop5||career.top5||career.jobTop5||(aptitude&&(aptitude.top5||aptitude.topJobs||aptitude.recommendedJobs))||[];
  if(!Array.isArray(list))list=[];
  return {
    careerAptitude:aptitude,
    careerTop5:list.slice(0,5).map(function(item,index){
      if(typeof item==='string')return {rank:index+1,name:item};
      item=item||{};
      return Object.assign({},item,{
        rank:Number(item.rank)||index+1,
        name:text(item.name||item.title||item.jobName||item.job||item.careerName||item.label),
        fitScore:item.fitScore!=null?Number(item.fitScore):(item.score!=null?Number(item.score):null),
        strengths:item.strengths||item.linkedDomains||item.domains||item.reasons||[]
      });
    }).filter(function(item){return item.name;})
  };
}
function requestHeaders(context){
  var headers={'Accept':'application/json'};
  if(context.locale)headers['Accept-Language']=context.locale;
  return headers;
}
function fetchJson(url,context,config){
  var controller=typeof AbortController==='function'?new AbortController():null;
  var timeout=controller?setTimeout(function(){controller.abort();},config.requestTimeoutMs||15000):null;
  return fetch(url,{
    method:'GET',
    headers:requestHeaders(context),
    credentials:config.credentials||'include',
    signal:controller&&controller.signal
  }).then(function(response){
    if(!response.ok)throw error('HTTP_ERROR','Dashboard result request failed (HTTP '+response.status+')',null,{status:response.status});
    return response.json();
  }).catch(function(err){
    if(err&&err.dashboardFatal)throw err;
    if(err&&err.name==='AbortError')throw error('REQUEST_TIMEOUT','Dashboard result request timed out.',err);
    throw error('NETWORK_ERROR','Could not connect to the dashboard result server.',err);
  }).finally(function(){if(timeout)clearTimeout(timeout);});
}
function normalizeClasses(payload,normalizeClass){
  return listFromPayload(payload).map(function(item){
    return typeof normalizeClass==='function'?normalizeClass(item):item;
  }).filter(function(item){return item&&item.id;});
}
function sampleResult(options){
  var classes=typeof options.sampleFactory==='function'?options.sampleFactory():[];
  return Promise.resolve({classes:classes,source:'sample',meta:{mode:'sample'}});
}
function customTransport(scope,context,config){
  var transport=window.KPASSDashboardTransport;
  if(!transport||typeof transport.load!=='function')return null;
  return Promise.resolve(transport.load({scope:scope,context:context,config:config}));
}
function load(options){
  options=options||{};
  var scope=options.scope;
  var context=options.context||{};
  var config=Object.assign({},window.KPASS_DASHBOARD_CONFIG||{});
  var mode=resolveMode(config);
  if(mode==='sample')return sampleResult(options);

  var transportPromise=customTransport(scope,context,config);
  var request=transportPromise||fetchJson(endpointFor(scope,context,config),context,config);
  return request.then(function(payload){
    var classes=normalizeClasses(payload,options.normalizeClass);
    if(!classes.length)throw error('EMPTY_RESULTS','No dashboard result data was returned.');
    return {classes:classes,source:'live',meta:resultMeta(payload)};
  }).catch(function(err){
    if(config.allowSampleFallback){
      return sampleResult(options).then(function(result){result.warning=err;return result;});
    }
    if(err&&err.dashboardFatal)throw err;
    throw error('ADAPTER_ERROR','Could not process dashboard result data.',err);
  });
}

window.KPASSDashboardDataAdapter={load:load,resolveMode:resolveMode,listFromPayload:listFromPayload,resultMeta:resultMeta,selectLatestResults:selectLatestResults,normalizeCareerTop5:normalizeCareerTop5};
})(window);
