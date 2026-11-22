import {createHash,randomUUID} from "node:crypto";
import {getAuth} from "@clerk/express";
import {Router,type IRouter} from "express";
import {StartReviewStoryBody,type ReviewStoryJob} from "@workspace/api-zod";
import {runReviewStory} from "../lib/review-story-ai";
import {CareerAiError} from "../lib/career-ai-errors";

const router:IRouter=Router();
type Work={owner:string;fingerprint:string;expires:number;job:ReviewStoryJob};
const jobs=new Map<string,Work>();
const rate=new Map<string,number[]>();
let active=0;
function prune(now:number){
  for(const [id,work] of jobs)if(work.job.state!=="pending"&&now>=work.expires)jobs.delete(id);
  for(const [id,times] of rate){const recent=times.filter(at=>now-at<60_000);if(recent.length)rate.set(id,recent);else rate.delete(id);}
}
router.post("/career/review-story",(req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  const owner=getAuth(req).userId;
  if(!owner){res.status(401).json({error:"AUTH_REQUIRED"});return;}
  const parsed=StartReviewStoryBody.strict().safeParse(req.body);
  if(!parsed.success){res.status(400).json({error:"INVALID_INPUT"});return;}
  const input=parsed.data;
  if(!input.consent){res.status(409).json({error:"AI_CONSENT_REQUIRED"});return;}
  if(new Set(input.evidence.map(e=>e.id)).size!==input.evidence.length||
    !input.evidence.some(e=>/^A/.test(e.id)&&["activity","reflection"].includes(e.kind)&&e.text.trim())||
    input.evidence.some(e=>e.id[0]!==({activity:"A",reflection:"A",report:"R",company:"C"}[e.kind]))||
    (input.kind==="refine"&&(!input.body.trim()||!input.thought.trim()))||
    (input.kind==="generate"&&(input.body||input.thought))){
    res.status(400).json({error:"INVALID_INPUT"});return;
  }
  const now=Date.now();
  prune(now);
  const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const prior=[...jobs.values()].find(w=>w.owner===owner&&w.fingerprint===fingerprint&&w.job.state!=="failed");
  if(prior){res.status(202).json(prior.job);return;}
  const times=rate.get(owner)??[];
  if(active>=5||times.length>=4||jobs.size>=250){res.setHeader("Retry-After","30");res.status(429).json({error:"AI_LOCAL_LIMIT"});return;}
  const job:ReviewStoryJob={id:randomUUID(),state:"pending"};
  const work:Work={owner,fingerprint,expires:now+20*60_000,job};
  jobs.set(job.id,work);rate.set(owner,[...times,now]);active++;
  res.status(202).json(job);
  void runReviewStory(input).then(result=>{job.result=result;job.state="completed";}).catch(error=>{
    job.error=error instanceof CareerAiError?error.code:"AI_UPSTREAM_FAILED";job.state="failed";
    req.log.warn({code:job.error},"Review story AI request failed");
  }).finally(()=>{active--;work.expires=Date.now()+20*60_000;});
});
router.get("/career/review-story/:id",(req,res)=>{
  res.setHeader("Cache-Control","private, no-store");
  const owner=getAuth(req).userId;
  if(!owner){res.status(401).json({error:"AUTH_REQUIRED"});return;}
  prune(Date.now());
  const work=jobs.get(req.params.id);
  if(!work||work.owner!==owner){res.status(404).json({error:"AI_RESULT_EXPIRED"});return;}
  res.json(work.job);
});
export default router;
