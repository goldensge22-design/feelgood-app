import {useState} from 'react';
import {Link} from 'wouter';
import {useWorkspace} from '@/lib/workspace';
import {useI18n} from '@/lib/i18n';
import {confirmLabMaterial,currentLabMaterial,labMaterialKey,revokeLabMaterial,type LabMaterial} from '@/lib/account-lab-handoff';
import type {AccountAudience} from '@/lib/account-journey';

export function LabMaterialConsent({material}:{material:LabMaterial}){
  const {locale}=useI18n(),ko=locale==='ko';
  const {state,update,saveNow,status}=useWorkspace();
  const [view,setView]=useState('');
  const key=labMaterialKey(material);
  const existing=state?.integrated?.labHandoffs?.find(h=>!h.revokedAt&&key===labMaterialKey(h));
  if(existing)return <p role="status" className="text-sm">{status==='saved'
    ?(ko?'계정에 선택을 저장했어요. 플래너에서 활동으로 추가할 수 있어요.':'Selection saved to your account. Add it in Planner.')
    :(ko?'선택을 서버에 저장하는 중입니다. 위 저장 상태를 확인하세요.':'Check the account save status above.')}</p>;
  if((state?.integrated?.labHandoffs?.length??0)>=100)return <p>{ko?'이 계정의 자료 보관 한도에 도달했어요. 이미 저장한 자료는 유지합니다.':'This account reached its source limit. Previously saved sources are kept.'}</p>;
  return view!==key?<button type="button" className="min-h-11 rounded-lg border px-3 text-primary" onClick={()=>setView(key)}>
    {ko?'사용할 자료 확인':'Review material for use'}
  </button>:<section className="mt-2 space-y-2 rounded-lg border bg-blue-50 p-3 text-sm text-slate-900" aria-label={ko?'보낼 자료 확인':'Review selected material'}>
    <strong dir="auto">{material.title} · {material.keyword}</strong>
    <p className="whitespace-pre-wrap break-words" dir="auto">{material.excerpt}</p>
    {material.sourceSnapshot&&<p>{ko?'위 안내와 함께 방금 미리 본 모의 상황카드 원본을 보관합니다. 답안이나 감정 메모는 보내지 않아요.':'The simulated card you previewed is saved along with this guide. Answers and private notes are not sent.'}</p>}
    {material.url&&<a className="break-all underline" href={material.url} target="_blank" rel="noreferrer">{ko?'공개 원문':'Public source'}</a>}
    <p>{material.purpose==='simulation'?(ko?'모의 연습이며 실제 업무나 성과가 아니에요.':'Simulation, not work or an achievement.'):(ko?'탐색 자료이며 실제 수행기록이 아니에요.':'Exploration material, not a record of work.')}</p>
    <p>{ko?'이 부분만 같은 계정의 플래너·스토리보드에서 사용합니다. 기업이나 연구 시스템으로 보내지 않아요.':'Use only this excerpt in this account’s Planner and Storyboard. Nothing is sent to employers or research.'}</p>
    <button type="button" className="mr-3 min-h-11 font-semibold text-primary" onClick={()=>{update(s=>confirmLabMaterial(s,material));saveNow();setView('');}}>{ko?'확인하고 계정에 저장':'Confirm and save to account'}</button>
    <button type="button" className="min-h-11 underline" onClick={()=>setView('')}>{ko?'취소':'Cancel'}</button>
  </section>;
}

export function LabMaterialHistory({audience}:{audience:AccountAudience}){
  const {locale,t}=useI18n(),ko=locale==='ko';
  const {state,status,update,saveNow}=useWorkspace();
  const items=state?.integrated?.labHandoffs?.filter(x=>x.audience===audience)??[];
  if(!items.length)return null;
  return <details className="surface p-3" data-testid="account-lab-handoffs">
    <summary className="font-semibold">{ko?'내 계정의 선택 자료':'My selected sources'} · {items.length}</summary>
    {items.map(h=><article key={h.id} dir="auto" className="mt-2 border-t pt-2">
      <p><b>{h.title}</b> · {h.purpose==='simulation'?(ko?'모의 연습':'Simulation'):(ko?'탐색 자료':'Exploration material')} · {h.revokedAt?(ko?'사용 철회':'Withdrawn'):!currentLabMaterial(state!,h)?(ko?'원본 변경 · 다시 확인 필요':'Original changed · confirm again'):
        h.plannerCardId&&status==='saved'?(ko?'플래너에 저장됨':'Saved in Planner'):(ko?'선택 자료':'Selected source')}</p>
      <p className="break-words text-sm">{h.excerpt}</p>
      {!h.revokedAt&&<button type="button" className="min-h-11 underline" onClick={()=>{update(s=>revokeLabMaterial(s,h.id));saveNow();}}>{ko?'새 작성에서 사용 철회':'Withdraw from new use'}</button>}
    </article>)}
    <Link href="~/planner" className="inline-flex min-h-11 items-center font-medium text-primary underline">{t('audience.activity')}</Link>
  </details>;
}
