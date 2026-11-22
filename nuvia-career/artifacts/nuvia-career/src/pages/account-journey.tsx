import {lazy,Suspense,useState,type ReactNode} from 'react';
import {UserButton} from '@clerk/react';
import {Link,Redirect,Route,Switch,useLocation} from 'wouter';
import {LanguageSwitcher} from '@/components/shell';
import {AccountLab} from '@/components/account-lab';
import {AccountStory} from '@/components/account-story';
import {useWorkspace} from '@/lib/workspace';
import {useI18n} from '@/lib/i18n';
import {reviewRouteRedirect} from '@/lib/review-audience';
import type {AccountAudience} from '@/lib/account-journey';

const action='inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground';
const link='inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-primary underline-offset-4 hover:underline';
const AccountPlanner=lazy(()=>import('@/components/account-planner').then(x=>({default:x.AccountPlanner})));
const AccountYouthNative=lazy(()=>import('@/components/account-youth-native'));
const AccountEnterpriseNative=lazy(()=>import('@/components/account-enterprise-native'));
export function AccountJourney({legacy}:{legacy:ReactNode}){
  const {t,locale,dir}=useI18n();const ko=locale==='ko';
  const [path]=useLocation();
  const ws=useWorkspace();
  const [choosing,setChoosing]=useState(false);
  const audience=ws.state?.integrated?.audience;
  const [recoveryMessage,setRecoveryMessage]=useState('');
  const safeRedirect=audience?reviewRouteRedirect(path,audience,true):null;
  // The older experience library remains accessible directly; it is not the History product.
  if(path!=='/experiences'&&safeRedirect)return <Redirect to={safeRedirect}/>;
  const label=audience==='youth'?t('audience.career'):t('audience.company');
  const statuses={
    local:ko?'기기에만 저장됨':'Saved only on device',loading:ko?'계정 자료 불러오는 중…':'Loading account…',
    saved:ko?'계정 서버에 저장됨':'Saved to account',dirty:ko?'서버 저장 대기 중':'Waiting to save',saving:ko?'서버에 저장하는 중…':'Saving to account…',
    error:ko?'서버 저장 실패 · 현재 입력 유지':'Server save failed · input kept',
    conflict:ko?'다른 탭에 새 저장본이 있어요. 두 글을 덮어쓰지 않고 보관할 수 있어요.':'Another tab has a newer save. Keep both copies without replacing either.',
  } as const;
  const base=import.meta.env.BASE_URL;
  return <div dir={dir} className="min-h-screen bg-slate-50 text-slate-900" data-testid="account-journey">
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <Link href="/home" className="flex min-h-11 items-center gap-2 font-bold"><img src={`${base}feelgood-brand-original.png`} alt="FeelGood" className="w-24"/><span>NUVIA</span></Link>
        <div className="flex items-center gap-2"><LanguageSwitcher/><UserButton/></div>
        {audience&&<nav aria-label={ko?'주요 서비스':'Main services'} className="flex w-full flex-wrap gap-x-1 sm:w-auto sm:gap-x-2" data-testid="account-products">
          <Link className={link} href="/home" aria-current={path==='/home'?'page':undefined}>MY NUVIA</Link>
          <Link className={link} href="/lab" aria-current={path.startsWith('/lab')?'page':undefined}>{label}</Link>
          <Link className={link} href="/storyboard" aria-current={path==='/storyboard'?'page':undefined}>{t('audience.story')}</Link>
        </nav>}
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-3 p-3 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" >
        <p role="status" data-testid="account-save-status">{statuses[ws.status]}</p>
        {ws.status==='error'&&<button className={link} onClick={ws.saveNow}>{ko?'저장 다시 시도':'Retry save'}</button>}
        {ws.status==='conflict'&&<button className={link} onClick={()=>void ws.recoverAsDraft().then(()=>{
          setRecoveryMessage(path==='/storyboard'?
            (ko?'기존 글은 그대로예요. 서버 저장이 끝나면 아래 ‘보관한 글’에서 이번 편집의 사본을 확인하세요.':'Your existing writing is unchanged. Once the server save finishes, find your edits under Kept writing below.') :
            (ko?'서버 원본을 유지하고 편집 사본을 준비했어요. 위에 서버 저장이 완료되면, 편집한 화면에서 사본을 찾을 수 있습니다.':'The server copy was kept. Once saving is confirmed above, find the recovered copy where you edited it.'));
        }).catch(()=>setRecoveryMessage(ko?'아직 복구하지 못했어요. 원문은 이 창에 있습니다.':'Recovery failed. Your text is still in this window.'))}>{ko?'두 사본 유지하고 복구':'Keep both copies and recover'}</button>}
        {recoveryMessage&&<p role="status">{recoveryMessage}</p>}
      </div>
      {ws.recovery&&<div className="surface p-3" data-testid="account-recovery">
        <p>{ko?'서버에 보내기 전 이 기기에 남긴 편집이 있어요.':'Unsynced edits were left on this device.'}</p>
        <button className={link} onClick={ws.applyRecovery}>{ko?'이 기기 편집 복구':'Recover edits from this device'}</button>
      </div>}
      {!ws.state?(ws.loadError?<div role="alert" className="surface p-4">
        <p>{ko?'계정 자료를 열지 못했어요. 체험 기록으로 바꾸지 않습니다.':'Could not open account data. Demo records will not be substituted.'}</p>
        <button className={link} onClick={ws.retryLoad}>{ko?'다시 불러오기':'Retry loading'}</button></div>:null)
        : (!audience||choosing)
        ? <section className="surface space-y-3 p-4 sm:p-6" data-testid="account-audience">
          <h1 className="text-xl font-bold">{ko?'MY NUVIA · 사용할 화면 선택':'MY NUVIA · Choose your workspace'}</h1>
          <p>{ko?'직접 선택하는 화면 설정입니다. 나이 인증이나 서버 역할 지정이 아니며, 기존 계정 기록은 지우지 않아요.':'This preference changes your screens, not your verified age or permissions. Existing account records remain intact.'}</p>
          <div className="flex flex-wrap gap-2">{(['youth','adult'] as const).map(option=><button data-testid={`account-select-${option}`} key={option} className={action} onClick={()=>{
            ws.update(s=>({...s,integrated:{...s.integrated,audience:option}}));ws.saveNow();setChoosing(false);
          }}>{t(`audience.${option}`)}</button>)}</div>
          {audience&&<button className={link} onClick={()=>setChoosing(false)}>{ko?'취소':'Cancel'}</button>}
        </section>
        : <Switch>
          <Route path="/"><Redirect to="/home"/></Route>
          <Route path="/home">
            <section className="surface space-y-4 p-4 sm:p-6">
              <h1 className="text-2xl font-bold">MY NUVIA</h1>
              <p>{ko?'결과지를 확인하고, 플래너에서 활동을 기록해 강점 이야기로 정리해요. LAB은 필요한 때만 열어도 돼요.':'Check your report, record an activity and turn it into your strength story. Visit LAB whenever you need it.'}</p>
              <Link className={link} href="/report">{ko?'결과지 보기':'View report'}</Link>
              <div className="grid gap-3 sm:grid-cols-2" data-testid="account-service-cards">
                {[['/lab',label],['/storyboard',t('audience.story')]].map(([to,name])=><Link key={to} className="rounded-lg border bg-white p-4 font-semibold text-primary" href={to}>{name}</Link>)}
              </div>
              <button className={link} onClick={()=>setChoosing(true)}>{ko?'화면 설정 바꾸기':'Change workspace preference'}</button>
            </section>
          </Route>
          <Route path="/report">
            <section className="surface space-y-3 p-4 sm:p-6">
              <h1 className="text-xl font-bold">{ko?'내 결과지':'My assessment report'}</h1>
              <p>{ko?'이 계정에 연결된 실제 결과지가 없습니다. 가상 점수는 표시하거나 저장하지 않아요. 결과지 없이도 활동하고 글을 쓸 수 있어요.':'No real report is connected to this account. Synthetic scores are not displayed or saved. You can still record activities and write.'}</p>
              <Link className={action} href="/planner">{t('audience.activity')}</Link>
            </section>
          </Route>
          <Route path="/lab" nest>
            <Suspense fallback={<p role="status">{ko?'LAB 자료를 불러오는 중…':'Loading LAB…'}</p>}>
              {audience==='youth'?
                <><AccountYouthNative key={`youth:${ws.refreshGeneration}`}/><details className="surface p-4"><summary>{ko?'이전에 적은 관심 진로':'Earlier career interest'}</summary><AccountLab key={`youth-legacy:${ws.refreshGeneration}`} audience="youth"/></details></>:
                <><AccountEnterpriseNative key={`adult:${ws.refreshGeneration}`}/><AccountLab key={`adult-search:${ws.refreshGeneration}`} audience="adult"/></>}
            </Suspense>
          </Route>
          <Route path="/planner"><Suspense fallback={<p role="status">{ko?'작업대를 불러오는 중…':'Loading workbench…'}</p>}><AccountPlanner key={audience} audience={audience}/></Suspense></Route>
          <Route path="/storyboard"><AccountStory key={`${audience}:${ws.refreshGeneration}`} audience={audience}/></Route>
          <Route>{legacy}</Route>
        </Switch>}
    </main>
  </div>;
}
