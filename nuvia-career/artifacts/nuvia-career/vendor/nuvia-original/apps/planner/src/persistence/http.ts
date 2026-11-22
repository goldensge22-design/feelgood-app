/**
 * 셸 API 호출 공통부.
 *
 * - 식별자와 해석 버전은 헤더로만 보낸다. URL query 에 붙이지 않는다 (문서 §4).
 * - 서비스 API 키를 다루지 않는다. 인증은 셸 세션 쿠키가 담당한다.
 * - 응답을 호출자가 판단할 수 있는 몇 가지 상태로만 정리한다.
 */
import {HEADERS,profileUsable,type ResolvedConfig} from './config';
import type {HttpOutcome,PlannerProfile} from './types';
import {redact} from './redaction';

export interface RequestInput {
 method:'GET'|'PUT'|'POST';
 path:string;
 profile:PlannerProfile;
 headers?:Record<string,string>;
 body?:unknown;
}

/** 저장 범위 헤더. 셸이 인증 세션의 subject 와 대조한다 (문서 §5). */
export function profileHeaders(profile:PlannerProfile):Record<string,string> {
 return {
  [HEADERS.subjectId]:profile.subjectId,
  [HEADERS.assessmentId]:profile.assessmentId,
  [HEADERS.profileVersion]:profile.profileVersion,
  [HEADERS.interpretationVersion]:profile.interpretationVersion,
 };
}

function etagOf(response:Response,body:any){
 const raw=response.headers?.get?.('ETag')??response.headers?.get?.('etag')??'';
 const tag=(raw||'').replace(/^W\//,'').replace(/^"|"$/g,'');
 return tag||(typeof body?.revision==='string'?body.revision:'');
}

function classify(status:number):HttpOutcome['status'] {
 if(status>=200&&status<300)return 'ok';
 if(status===401||status===403)return 'unauthorized';
 if(status===404)return 'notFound';
 if(status===409||status===412)return 'conflict';
 if(status===408||status===429||status>=500)return 'server';
 return 'rejected';
}

const MESSAGES:Record<HttpOutcome['status'],string>={
 ok:'',
 conflict:'다른 탭이나 기기에서 먼저 저장했어요. 어느 쪽을 남길지 골라 주세요.',
 unauthorized:'로그인이 만료되었어요. 필굿 서비스에서 다시 로그인해 주세요.',
 rejected:'저장 자료의 형식이 서버와 맞지 않아요.',
 offline:'지금 서버에 연결하지 못했어요. 이 기기에 임시로 저장하고 연결되면 다시 보낼게요.',
 server:'서버가 잠시 응답하지 않아요. 이 기기에 임시로 저장하고 다시 보낼게요.',
 notFound:'',
};

export function createHttp(cfg:ResolvedConfig){
 return async function request(input:RequestInput):Promise<HttpOutcome> {
  if(input.path.includes('?'))throw new Error('식별자를 URL query 에 붙이지 않습니다.');
  if(!profileUsable(input.profile))return {status:'rejected',httpStatus:0,revision:'',body:null,error:'검사 결과를 먼저 연결해 주세요.'};
  if(!cfg.fetchImpl)return {status:'offline',httpStatus:0,revision:'',body:null,error:MESSAGES.offline};
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=controller?setTimeout(()=>controller.abort(),cfg.timeoutMs):null;
  try{
   const response=await cfg.fetchImpl(cfg.baseUrl+input.path,{
    method:input.method,
    credentials:'same-origin',
    headers:{Accept:'application/json',...(input.body!==undefined?{'Content-Type':'application/json'}:{}),...profileHeaders(input.profile),...(input.headers??{})},
    ...(input.body!==undefined?{body:JSON.stringify(redact(input.body))}:{}),
    ...(controller?{signal:controller.signal}:{}),
   });
   let body:any=null;
   try{body=response.status===204?null:await response.json();}catch{body=null;}
   const status=classify(response.status);
   return {status,httpStatus:response.status,revision:etagOf(response,body),body,error:typeof body?.message==='string'&&status!=='ok'?body.message:MESSAGES[status]};
  }catch{
   // 네트워크 단절·타임아웃. 조작을 막지 않고 캐시·큐로 넘긴다.
   return {status:'offline',httpStatus:0,revision:'',body:null,error:MESSAGES.offline};
  }finally{
   if(timer)clearTimeout(timer);
  }
 };
}

export const TRANSPORT_MESSAGES=MESSAGES;
