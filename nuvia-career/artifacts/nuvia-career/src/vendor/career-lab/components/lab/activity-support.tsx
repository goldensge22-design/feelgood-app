import { useState } from 'react';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { formatMessage, localizeValue } from '@/vendor/career-lab/lib/i18n-runtime';
import { uid, type SupportDraft, type PracticeLink } from '@/vendor/career-lab/lib/types';
import { blankSupport, scopeSuggestion, SUPPORT_QUESTIONS } from '@/vendor/career-lab/lib/activity-assistance';
import { qualitativeText } from '@/vendor/career-lab/lib/recommendation-policy';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { TextArea, TextIn, LField } from './ui';

/** Suggestions never contain student answers and never mutate a draft until explicit acceptance. */
export function ActivitySupport({value=blankSupport(),onChange,id='support',method='original',context,scopeTestId}:{value?:SupportDraft;onChange:(value:SupportDraft)=>void;id?:string;method?:PracticeLink['method'];context?:{activity?:string;activityProduct?:boolean;interests?:string[];strengths?:string[]};scopeTestId?:string}){
  const {t}=useLocale();
  context=context?{activity:context.activity,activityProduct:context.activityProduct,interests:context.interests?.map(qualitativeText).filter(Boolean),strengths:context.strengths?.map(qualitativeText).filter(Boolean)}:undefined;
  const [mode,setMode]=useState<'direct'|'suggest'>('direct'),[round,setRound]=useState(0),[manual,setManual]=useState('');
  const [show,setShow]=useState(false),[message,setMessage]=useState('');
  const proposal=scopeSuggestion(method,round);
  const questionSource=context?.strengths?.[0]?'내가 선택한 강점 “{0}”을 이번 활동의 어느 단계에 활용해 볼까요?':context?.interests?.[0]?'관심 주제 “{0}”에 대해 이번 활동에서 무엇을 확인하고 싶나요?':SUPPORT_QUESTIONS[round%SUPPORT_QUESTIONS.length];
  const questionValues=context?.strengths?.[0]?[context.strengths[0]]:context?.interests?.[0]?[context.interests[0]]:[];
  const addQuestion=()=>{
    if(!manual.trim())return setMessage('직접 만든 질문을 적어 주세요.');
    onChange({...value,questions:[...value.questions,{id:uid(),question:manual.trim(),answer:''}]});setManual('');setMessage('');
  };
  const acceptQuestion=()=>{
    const question=formatMessage(questionSource,questionValues);
    if(value.questions.some(q=>q.question===question))return setMessage('이미 추가한 질문이에요. 기존 답변은 그대로 유지해요.');
    onChange({...value,questions:[...value.questions,{id:uid(),question,answer:'',productSource:questionSource,productValues:questionValues}]});
    setMessage('질문을 추가했어요. 답변은 직접 적어 주세요.');
  };
  return <section className="space-y-3 rounded-xl border p-3" data-testid={id}>
    <h3 className="font-semibold">{t('범위와 질문 도우미')}</h3>
    <p className="text-sm">{t('범위와 질문은 직접 정하거나 준비된 제안을 선택할 수 있어요. 답변·결과물·회고는 학생이 직접 작성해요.')}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('범위와 질문 작성 방식')}>
      <Button type="button" variant={mode==='direct'?'default':'outline'} className="min-h-11 whitespace-normal" onClick={()=>setMode('direct')} data-testid={`${id}-direct`}>{t('직접 범위와 질문 정하기')}</Button>
      <Button type="button" variant={mode==='suggest'?'default':'outline'} className="min-h-11 whitespace-normal" onClick={()=>{setMode('suggest');setShow(true);}} data-testid={`${id}-suggest`}>{t('자동으로 범위·질문 제안받기')}</Button>
    </div>
    {context&&<div className="space-y-1 text-sm" data-testid={`${id}-context`}>
      {context.activity&&<p data-testid={`${id}-context`}>{t('활동')} · {context.activityProduct?<span>{String(localizeValue(context.activity,true))}</span>:<bdi data-i18n-original>{context.activity}</bdi>}</p>}
      {!!context.interests?.length&&<p>{t('관심사')} · <bdi data-i18n-original>{context.interests.join(', ')}</bdi></p>}
      {!!context.strengths?.length&&<p>{t('활용할 강점')} · <bdi data-i18n-original>{context.strengths.join(', ')}</bdi></p>}
    </div>}
    {mode==='suggest'&&show&&<div className="space-y-2 rounded-lg bg-secondary p-3" data-testid={`${id}-proposal`}>
      <p className="text-sm">{t('데모의 사전 준비 제안이에요. 실제 AI 생성이나 학생 답변이 아니에요.')}</p>
      <p>{t(proposal)}</p>
      <Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={()=>onChange({...value,scope:t(proposal),scopeSource:proposal})} data-testid={`${id}-accept-scope`}>{t('이 범위를 확인하고 적용')}</Button>
      <p>{formatMessage(questionSource,questionValues)}</p>
      <Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={acceptQuestion} data-testid={`${id}-accept-question`}>{t('이 질문 추가하기')}</Button>
      <Button type="button" variant="ghost" className="min-h-11" onClick={()=>setRound(x=>x+1)} data-testid={`${id}-regenerate`}>{t('다른 제안 보기')}</Button>
    </div>}
    <LField label="내가 정하는 범위·질문"><TextArea value={value.scopeSource?t(value.scopeSource):value.scope} onChange={e=>onChange({...value,scope:e.target.value,scopeSource:undefined})} data-testid={scopeTestId||`${id}-scope`} /></LField>
    <LField label="내가 직접 만드는 질문"><TextIn value={manual} onChange={e=>setManual(e.target.value)} data-testid={`${id}-new-question`} /></LField>
    <Button type="button" variant="outline" className="min-h-11" onClick={addQuestion} data-testid={`${id}-add-question`}>{t('직접 만든 질문 추가')}</Button>
    {value.questions.map(q=><div key={q.id} className="space-y-2 rounded-lg border p-3">
      <LField label="질문"><TextIn value={q.productSource?formatMessage(q.productSource,q.productValues||[]):q.question} onChange={e=>onChange({...value,questions:value.questions.map(x=>x.id===q.id?{...x,question:e.target.value,productSource:undefined}:x)})} data-testid={`${id}-question-${q.id}`} /></LField>
      <LField label="내가 직접 적는 답변" hint="답변을 적어도 활동 수행이나 완료로 처리되지 않아요."><TextArea value={q.answer} onChange={e=>onChange({...value,questions:value.questions.map(x=>x.id===q.id?{...x,answer:e.target.value}:x)})} data-testid={`${id}-answer-${q.id}`} /></LField>
    </div>)}
    {message&&<p role="status">{t(message)}</p>}
  </section>;
}
