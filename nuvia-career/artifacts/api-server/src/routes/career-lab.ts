import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { SearchCareerLabBody } from "@workspace/api-zod";
import { LabSearchError, publicLabLink, publicLabTerm, runLabWebSearch } from "../lib/career-lab-web";

const router: IRouter = Router();
type Work = {id:string;owner:string;signature:string;expires:number;state:"pending"|"completed"|"failed";
  result?:Awaited<ReturnType<typeof runLabWebSearch>>["result"];error?:string};
const jobs=new Map<string,Work>();
const keys=new Map<string,string>();
const attempted = new Map<string,number[]>();
const lifetime=15*60_000;
let running=0;
const publicWork=({id,state,result,error}:Work)=>({id,state,result,error});
function prune(now:number){
  for(const [id,work] of jobs)if(work.state!=="pending"&&work.expires<=now){
    jobs.delete(id);
    if(keys.get(work.signature)===id)keys.delete(work.signature);
  }
  for(const [id,times] of attempted){
    const active=times.filter(time=>now-time<60_000);
    if(active.length)attempted.set(id,active);else attempted.delete(id);
  }
}

router.post("/career/lab-search",(req,res):void=>{
  res.setHeader("Cache-Control","private, no-store");
  const owner=getAuth(req).userId;
  if(!owner){res.status(401).json({error:"AUTH_REQUIRED"});return;}
  const input=SearchCareerLabBody.strict().safeParse(req.body);
  const company=input.success?publicLabTerm(input.data.company):null;
  const job=input.success?publicLabTerm(input.data.job):null;
  const link=input.success&&input.data.url?publicLabLink(input.data.url):undefined;
  if(link===null){res.status(400).json({error:"LAB_LINK_NOT_PUBLIC"});return;}
  if(company===null||job===null||(!company&&!job&&!link)){res.status(400).json({error:"INVALID_INPUT"});return;}
  const now=Date.now(),signature=JSON.stringify([owner,company,job,link??""]);
  prune(now);
  const cached=jobs.get(keys.get(signature)??"");
  if(cached&&cached.state!=="failed"){
    res.setHeader("X-Lab-Reused","1");res.status(202).json(publicWork(cached));return;
  }
  const calls=attempted.get(owner)??[];
  if(calls.length>=4||running>=6||jobs.size>=400||[...attempted.values()].reduce((n,v)=>n+v.length,0)>=20){
    res.setHeader("Retry-After","30");res.status(429).json({error:"LAB_SEARCH_LIMIT"});return;
  }
  const work:Work={id:randomUUID(),owner,signature,expires:now+lifetime,state:"pending"};
  jobs.set(work.id,work);keys.set(signature,work.id);attempted.set(owner,[...calls,now]);running++;
  res.status(202).json(publicWork(work));
  void runLabWebSearch({company,job,url:link}).then(value=>{
    work.result=value.result;work.state="completed";
    req.log.info({searchCalls:1,resultCount:value.result.materials.length,...value.usage},"Career LAB web search completed");
  }).catch(error=>{
    const safe=error instanceof LabSearchError?error:new LabSearchError("LAB_SEARCH_FAILED",502);
    work.error=safe.code;work.state="failed";
    req.log.warn({code:safe.code,diagnostic:safe.diagnostic},"Career LAB web search failed");
  }).finally(()=>{running--;work.expires=Date.now()+lifetime;});
});

router.get("/career/lab-search/:id",(req,res):void=>{
  res.setHeader("Cache-Control","private, no-store");
  const owner=getAuth(req).userId;
  if(!owner){res.status(401).json({error:"AUTH_REQUIRED"});return;}
  prune(Date.now());
  const work=jobs.get(req.params.id);
  if(!work||work.owner!==owner){res.status(404).json({error:"LAB_SEARCH_NOT_FOUND"});return;}
  res.json(publicWork(work));
});
export default router;
