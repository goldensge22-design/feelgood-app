import {useMemo,type ReactNode} from 'react';
import {Link,Route,Switch} from 'wouter';
import {useWorkspace} from '@/lib/workspace';
import {useI18n} from '@/lib/i18n';
import {AccountLabProvider,editLabState,useLab} from '@/vendor/career-lab/lib/store';
import {LocaleProvider} from '@/vendor/career-lab/lib/locale';
import {emptyState,type LabState} from '@/vendor/career-lab/lib/types';
import {fieldById,majorById} from '@/vendor/career-lab/lib/catalog';
import {programById} from '@/vendor/career-lab/lib/universities';
import NativeInterests from '@/vendor/career-lab/pages/interests';
import NativeExplore from '@/vendor/career-lab/pages/explore';
import NativeMajors from '@/vendor/career-lab/pages/majors';
import NativeDesign from '@/vendor/career-lab/pages/design';
import NativePlanner from '@/vendor/career-lab/pages/planner';
import NativeExperiences from '@/vendor/career-lab/pages/experiences';
import {PracticeLinkDialog} from '@/vendor/career-lab/components/lab/practice-link-dialog';
import {Toaster} from '@/vendor/career-lab/components/ui/toaster';
import {LabMaterialConsent,LabMaterialHistory} from './account-lab-material';
import type {LabMaterial} from '@/lib/account-lab-handoff';

const version='b58d48d7aaa2c880e90417febffa7e9f30686bcc';
function decode(raw?:string):LabState{
  if(!raw)return emptyState();
  const parsed=JSON.parse(raw);
  if(parsed?.v!==1||!Array.isArray(parsed.activities)||!Array.isArray(parsed.reflections))throw Error('INVALID_YOUTH_LAB_DRAFT');
  return {...emptyState(),...parsed};
}
function YouthSources(){
  const {state}=useLab();
  const {locale}=useI18n(),ko=locale==='ko';
  const major=majorById(state.tempMajor);
  const program=state.tempProgram?programById(state,state.tempProgram):undefined;
  const chosenFields=Object.entries(state.fields).filter(([,mark])=>mark.status==='interested').map(([id])=>fieldById(id)).filter(Boolean);
  const materials:LabMaterial[]=[];
  if(major)materials.push({audience:'youth',sourceId:`major:${major.id}`,sourceVersion:version,title:major.name,
    keyword:major.competencies.slice(0,3).join(' · ').slice(0,300),excerpt:major.tryIt,purpose:'exploration'});
  if(program){
    const src=program.sources.find(src=>/^https:\/\//.test(src.url));
    if(src)materials.push({audience:'youth',sourceId:`program:${program.id}`.slice(0,180),sourceVersion:`${version}/${src.academicVersion??'catalogue'}`.slice(0,180),
      title:`${program.universityOriginal} · ${program.programOriginal}`.slice(0,150),keyword:program.programOriginal.slice(0,300),
      excerpt:(program.curriculum[0]?.status==='verified'?program.curriculum[0].text:(ko?'공개 학과 목록에서 고른 탐색 후보입니다.':'Selected from the public program catalogue.')).slice(0,1200),
      purpose:'exploration',url:src.url});
  }
  for(const field of chosenFields.slice(0,6))if(field)materials.push({audience:'youth',sourceId:`field:${field.id}`,
    sourceVersion:version,title:field.name,keyword:field.keywords.slice(0,3).join(' · ').slice(0,300),
    excerpt:field.tryIt,purpose:'exploration'});
  for(const activity of state.activities.slice(-20)) {
    const simulation=activity.simulation??activity.practiceLinks?.find(x=>x.mode==='simulation')?.simulation;
    const mode=simulation||activity.practiceLinks?.some(x=>x.mode==='simulation');
    materials.push({audience:'youth',sourceId:`activity:${activity.id}`,sourceVersion:`${version}/${activity.updatedAt}`,
      title:activity.title.slice(0,150),keyword:(activity.sourceLabel||activity.kind).slice(0,300),
      excerpt:([simulation?.scenario,simulation?.problem,...simulation?.steps??[]].filter(Boolean).join('\n')||
        activity.purpose||activity.artifact||activity.title).slice(0,1200),purpose:mode?'simulation':'exploration'});
  }
  return <section className="surface space-y-2 p-4">
    <h2 className="font-semibold">{ko?'진로 LAB에서 고른 자료':'Selections from Career LAB'}</h2>
    {!materials.length&&<p className="text-sm">{ko?'가능성 탐색의 분야나 대학·학과에서 후보를 고르면 여기에서 확인할 수 있어요.':'Choose a field or a program in the original catalogue to see it here.'}</p>}
    {materials.map(m=><div className="border-t pt-2" key={m.sourceId}><p dir="auto"><b>{m.title}</b> · {m.keyword}</p><LabMaterialConsent material={m}/></div>)}
  </section>;
}

export default function AccountYouthNative(){
  const ws=useWorkspace(),{locale}=useI18n(),ko=locale==='ko';
  const raw=ws.state?.integrated?.youthLab;
  const parsed=useMemo(()=>{try{return {state:decode(raw)}}catch{return {state:null}}},[raw]);
  if(!parsed.state)return <p role="alert">{ko?'이전 진로 자료를 읽지 못했습니다. 원본을 삭제하지 않았어요.':'The earlier career draft could not be read. It was not deleted.'}</p>;
  const menu=[['/interests','관심사','Interests'],['/explore','가능성 탐색','Explore'],['/majors','대학·학과','Programs'],['/design','진로 설계','Design'],['/practice','LAB 안의 활동 초안','Practice drafts'],['/experience','LAB 활동 돌아보기','Practice reflection']];
  const practice=(children:ReactNode)=><section className="space-y-3">{children}</section>;
  return <LocaleProvider embeddedLocale={locale}><AccountLabProvider draft={{state:parsed.state,retrySave:ws.saveNow,update:recipe=>{
    ws.update(s=>{
      const next=editLabState(decode(s.integrated?.youthLab),recipe);
      const encoded=JSON.stringify(next);
      if(encoded.length>460000)throw Error('CAREER_LAB_DRAFT_TOO_LARGE');
      return {...s,integrated:{...s.integrated,youthLab:encoded}};
    });
  }}}>
    <section className="surface space-y-2 p-4" data-testid="account-native-youth">
      <h1 className="text-xl font-bold">{ko?'진로 LAB':'Career LAB'}</h1>
      <p>{ko?'기존 진로 탐색 자료와 관심사를 사용합니다. 실제 검사 결과지는 연결되지 않았고, 모의 활동과 실제 기록은 구분합니다.':'Explore original career resources and interests. No assessment is connected; simulated activity stays distinct.'}</p>
      <nav aria-label={ko?'진로 LAB 안의 탐색':'Explore inside Career LAB'} className="flex flex-wrap gap-2">
        {menu.map(([path,k,e])=><Link key={path} className="inline-flex min-h-11 items-center rounded-md border px-2 text-sm text-primary" href={path}>{ko?k:e}</Link>)}
      </nav>
      {ws.state?.integrated?.youthLabRecovery&&<details><summary>{ko?'다른 탭의 진로 초안 사본':'Career draft recovered from another tab'}</summary>
        <button type="button" className="min-h-11 underline" onClick={()=>{ws.update(s=>({...s,integrated:{...s.integrated,youthLab:s.integrated?.youthLabRecovery,youthLabRecovery:s.integrated?.youthLab}}));ws.saveNow();}}>
          {ko?'두 사본을 유지하고 복구 사본 열기':'Open the recovered copy and keep both'}</button></details>}
    </section>
    <YouthSources/>
    <LabMaterialHistory audience="youth"/>
    <div className="surface min-w-0 p-3 sm:p-5">
      <Switch>
        <Route path="/"><NativeExplore/></Route>
        <Route path="/explore"><NativeExplore/></Route>
        <Route path="/interests"><NativeInterests/></Route>
        <Route path="/majors"><NativeMajors/></Route>
        <Route path="/design"><NativeDesign/></Route>
        <Route path="/practice">{practice(<NativePlanner/>)}</Route>
        <Route path="/planner">{practice(<NativePlanner/>)}</Route>
        <Route path="/experience"><NativeExperiences/></Route>
        <Route path="/experiences"><NativeExperiences/></Route>
        <Route><NativeExplore/></Route>
      </Switch>
    </div>
    <PracticeLinkDialog/><Toaster/>
  </AccountLabProvider></LocaleProvider>;
}
