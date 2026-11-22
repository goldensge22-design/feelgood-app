import {messages} from './messages.mjs';
export const LANGUAGES=[['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文'],['zh-TW','繁體中文'],['mn','Монгол'],['th','ไทย'],['vi','Tiếng Việt'],['ar','العربية'],['ru','Русский'],['km','ខ្មែរ'],['es','Español'],['fr','Français'],['it','Italiano'],['az','Azərbaycanca']].map(([code,name])=>({code,name,dir:code==='ar'?'rtl':'ltr'}));
export function resolveLocale(value){if(typeof value!=='string')return null;const low=value.trim().replaceAll('_','-').toLowerCase();const exact=LANGUAGES.find(l=>l.code.toLowerCase()===low);if(exact)return exact.code;if(/^zh(-|$)/.test(low))return /hant|tw|hk|mo/.test(low)?'zh-TW':'zh-CN';return LANGUAGES.find(l=>l.code===low.split('-')[0])?.code??null;}
export function translate(locale,key,vars={}){const code=resolveLocale(locale);if(!code)throw Error('UNSUPPORTED_LOCALE');const message=messages[code][key];if(typeof message!=='string')throw Error('MISSING_TRANSLATION:'+key);return message.replace(/\{([a-z]+)\}/g,(_all,name)=>String(vars[name]??'{'+name+'}'));}
export const direction=locale=>resolveLocale(locale)==='ar'?'rtl':'ltr';
export function candidatePlans(research,locale='ko'){
 const t=(key,vars)=>translate(locale,key,vars);const d=research.data;const job=research.kind==='job';
 const base={goal:d.question,targetCapability:d.preparation,date:'',status:'planned'};
 return [{...base,title:t(job?'jobCompareTitle':'majorCompareTitle',{title:d.title}),steps:t(job?'jobCompareSteps':'majorCompareSteps'),successCriteria:t(job?'jobCompareCriteria':'majorCompareCriteria'),artifactPlan:t('comparisonArtifact')},
 {...base,title:t(job?'jobTryTitle':'majorTryTitle',{title:d.title}),steps:t(job?'jobTrySteps':'majorTrySteps'),successCriteria:t('tryCriteria'),artifactPlan:t('tryArtifact')}];
}
export const errorKeys={AUTH_REQUIRED:'auth',FLOW_NOT_CONFIGURED:'unavailable',ORIGIN_NOT_CONFIGURED:'unavailable',AI_CONNECTOR_NOT_CONFIGURED:'unavailable',RESULT_REFERENCE_NOT_CONFIGURED:'unavailable',SOURCE_NOT_FOUND:'empty',SOURCE_RECONFIRM_REQUIRED:'sourceChanged',REVISION_CONFLICT:'conflict',ACTIVITY_CHANGED_OR_UNAVAILABLE:'conflict',REQUEST_REUSED:'conflict',IDENTITY_CHANGED:'identity',IDENTITY_CONTEXT_REQUIRED:'identity',EXPLORATION_INCOMPLETE:'incomplete',ACTUAL_ACTION_REQUIRED:'incomplete',PLAN_CRITERIA_REQUIRED:'incomplete',INVALID_SOURCE_URL:'invalidSource',INVALID_DATE:'invalidSource',EXPERIENCE_TOO_LONG:'tooLong'};
export const errorKey=error=>errorKeys[error?.code??error?.message]??(Object.hasOwn(messages.en,error?.message??'')?error.message:'error');
