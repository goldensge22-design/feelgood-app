import type {Profile,Run} from './types';

// Student UI policy is independent of QA mode and content version.
export const PRESCHOOL_POLICY={maxText:80,maxPrompt:18,maxChoices:3,minChoices:2,minVisualRatio:.7,forbidden:/PASS|목표|제약|전략|대안|근거|판단|조건|완료\s*확인|인지|메타인지/i} as const;
export function inspectPreschoolText(text:string,prompts:string[]=[]){
 const normalized=text.replace(/\s+/g,' ').trim();
 return [PRESCHOOL_POLICY.forbidden.test(normalized)?'FORBIDDEN_TEXT':'',normalized.length>PRESCHOOL_POLICY.maxText?'TEXT_BUDGET':'',prompts.length>1?'PROMPT_COUNT':'',prompts.some(p=>p.length>PRESCHOOL_POLICY.maxPrompt)?'PROMPT_LENGTH':''].filter(Boolean);
}
export const planningLength=(p:Profile)=>p.ageBand==='preschool'?1:p.ageBand==='elementary-low'?(p.schoolGrade===2?2:1):3;
export function planningProgress(run:Run){return run.events.filter(e=>e.eventType==='planningInteraction'&&e.conditionId===run.conditionId);}
export const requiresPicturePlanning=(r:Run)=>r.contentVersion==='3.3.0'&&['preschool','elementary-low','elementary-high'].includes(r.profile.ageBand);
