import { storyReflection, actualLabReflection } from './practice';
import type { LabState } from './types';
import { qualitativeText, stripAssessmentData } from './recommendation-policy';
import { runtimeLanguage } from './i18n-runtime';

/** Positive allowlist, never a copied server DTO or raw report. Not stored. */
export function assistanceContext(s:LabState, input:Record<string,unknown>={}) {
  const pick=(v:unknown,keys:string[])=>{
    const obj=v&&typeof v==='object'?v as Record<string,unknown>:{};
    return Object.fromEntries(keys.map(k=>[k,qualitativeText(obj[k])]).filter(([,v])=>v));
  };
  return stripAssessmentData({
    writingLanguage:s.story.writingLanguage||'ko',screenLanguage:runtimeLanguage(),
    intent: qualitativeText(input.purpose),
    strengths:s.tests.flatMap(t=>t.strengths).filter(x=>x.fit==='similar'||x.fit==='partial')
      .map(x=>({id:x.id,text:qualitativeText(x.text),source:x.kind})).filter(x=>x.text),
    interests:s.interests.map(x=>({id:x.id,...pick(x,['text','reason'])})),
    plans_future_only:s.activities.filter(x=>x.status==='planned'||x.status==='doing').map(x=>({id:x.id,...pick(x,['title','purpose','artifact']),status:x.status})),
    actual_experiences:s.reflections.filter(r=>storyReflection(r,s)&&actualLabReflection(s,r))
      .map(r=>({id:r.id,activityId:r.activityId,executionId:r.executionId,practiceCardKeys:r.practiceCardKeys,practiceMode:r.practiceMode||'everyday',notEmployment:!!r.practiceCardKeys?.length||r.practiceMode==='simulation',...pick(r,['did','role','fun','learned','question','next'])})),
    draft_reflection_questions_only:pick(input.reflection,['did','role','fun','learned','question']),
    student_draft:s.story.paragraphs.map(p=>({id:p.id,...pick(p,['heading','text'])})),
    exploration_only:{majorId:s.tempMajor,programId:s.tempProgram||'',notAnAdmissionDecision:true},
  }) as Record<string,unknown>;
}
