// Mount behind the existing central NUVIA authentication. No test login or
// body/header subject override is supplied by this module.
import {BridgeError,hash} from './planner-lab-bridge.mjs';
export function createPlannerLabHttp({bridge,authenticate,verifyMutation}){
 return async function handle(req,res,next){
  const url=new URL(req.url,'http://localhost'),base='/api/planner/lab';
  if(!url.pathname.startsWith(base+'/'))return next?.();
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
  try{
   const p=await authenticate(req);if(!p?.subject||!p.sessionId)throw new BridgeError(401,'login_required');
   const binding=hash([p.subject,p.sessionId]);
   if(url.pathname!==base+'/context'&&req.headers['x-planner-binding']!==binding)throw new BridgeError(409,'context_changed');
   if(req.method!=='GET')await verifyMutation(req,p); // existing CSRF/origin policy, not optional
   let input=req.body;
   if(req.method==='POST'&&input===undefined){let chunks=[],length=0;for await(const chunk of req){length+=chunk.length;if(length>262144)throw new BridgeError(413,'request_too_large');chunks.push(chunk);}try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new BridgeError(400,'invalid_json');}}
   let result,path=url.pathname.slice(base.length),match;
   if(req.method==='GET'&&path==='/context'){const c=await bridge.context(p);result={binding,scopeId:c.scopeId,report:c.report,jobs:c.jobs,unmapped:c.unmapped};}
   else if(req.method==='POST'&&path==='/recommendations')result=await bridge.recommendations(p,input);
   else if(req.method==='POST'&&path==='/select')result=await bridge.select(p,input);
   else if(req.method==='GET'&&path==='/activities')result=await bridge.list(p);
   else if((match=path.match(/^\/activities\/([a-zA-Z0-9-]{1,100})$/))&&req.method==='GET')result=await bridge.activity(p,match[1]);
   else if((match=path.match(/^\/activities\/([a-zA-Z0-9-]{1,100})\/answers$/))&&req.method==='POST')result=await bridge.save(p,match[1],input);
   else throw new BridgeError(404,'route_not_found');
   res.statusCode=200;res.end(JSON.stringify(result));
  }catch(e){res.statusCode=e instanceof BridgeError?e.status:503;res.end(JSON.stringify({error:e instanceof BridgeError?e.code:'connection_unavailable'}));}
 };
}
/** Concrete server-to-server LAB transport. Credentials come ONLY from the
 * verified request's existing SSO broker. Never put these into browser JS. */
export function createLabTransport({origin,credentialFor,fetchImpl=fetch,allowLoopbackForTests=false}){
 const target=new URL(origin);
 if(target.protocol!=='https:'&&!(allowLoopbackForTests&&['127.0.0.1','localhost'].includes(target.hostname)))throw Error('https_lab_origin_required');
 return async(p,method,path,body,headers={})=>{
  if(!path.startsWith('/api/lab/'))throw new BridgeError(400,'invalid_lab_path');
  const token=await credentialFor(p);if(!token)throw new BridgeError(503,'lab_sso_unconfigured');
  let response;
  try{response=await fetchImpl(new URL(path,target),{method,headers:{...headers,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(90000)});}
  catch{throw new BridgeError(503,'lab_transport_unavailable');}
  const raw=await response.text();if(raw.length>2097152)throw new BridgeError(502,'lab_response_too_large');
  let value;try{value=JSON.parse(raw);}catch{throw new BridgeError(502,'invalid_lab_response');}
  if(!response.ok){const code=typeof value.error==='string'?value.error:'';
   throw new BridgeError([401,403,409,422,429].includes(response.status)?response.status:502,
    ['request_content_conflict','generation_pending','context_changed','session_expired','unknown_profile'].includes(code)?code:`lab_http_${response.status}`);}
  return value;
 };
}
