import { useEffect, useRef, useState } from 'react';
import { BookOpenText, CalendarCheck, ChevronRight, FlaskConical, History, Home, LogOut } from 'lucide-react';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import { LanguageSwitcher } from '@/components/shell';
import ReviewDemoView from '@/components/review-demo-view';
import ReviewPlannerView from '@/components/review-planner-view';
import ReviewEverydayView from '@/components/review-everyday-view';
import { ReviewDailyCards } from '@/components/review-daily-cards';
import ReviewStudioFrame from '@/components/review-studio-frame';
import { reviewStudioSourceCurrent } from '@/lib/review-studio-bridge';
import { ReviewCompanyLab, type ReviewInterest } from '@/components/review-company-lab';
import { ReviewYouthLab } from '@/components/review-youth-lab';
import { DAILY_EVIDENCE } from '@/lib/review-daily-model';
import { useI18n } from '@/lib/i18n';
import { loadJSON, removeKey, saveJSON } from '@/lib/career';
import { REVIEW_AUDIENCE, REVIEW_PRODUCT_LINKS, reviewAudience, reviewProducts, reviewRouteRedirect, usesActivityWorkspace, type ReviewAudience } from '@/lib/review-audience';
import { switchReviewAudience } from '@/lib/review-device';
import { useWorkspace } from '@/lib/workspace';
import { REVIEW_RECORD_META } from '@/lib/provenance';
import { editStoryboard, emptyStoryboard, saveStoryboard, sourceRevision, storedStoryboard } from '@/lib/storyboard';
import { bindReviewStoryboard, reviewOption, reviewResumePath, REVIEW_RESUME_KEY, REVIEW_SELECTION_KEY, REVIEW_START_KEY, type ReviewSelection } from '@/lib/review-demo-state';
import { approveCardRevision, reviewCardExperience } from '@/lib/review-planner-model';
import { addEverydayCard, approveReviewCards, getReviewPlannerSnapshot, retryReviewPlanner, useReviewPlanner } from '@/lib/review-planner';
import { REVIEW_ROLES, contextOf, evidenceKey, matchOf, validEverydayPlan, type ReviewRoleId } from '@/lib/review-everyday-model';
import { cn } from '@/lib/utils';
import { ReviewDataControls, ReviewSaveWarning } from '@/components/review-data-controls';
import { recordReviewAction, recordSyntheticReport } from '@/lib/review-trail';
import { reviewShortcutEntry } from '@/lib/review-shortcuts';
import {
  beginEverydayDraft, changeEverydayChoice, chooseEverydayPlan, confirmEverydayChoice, editEverydayPlan,
  editEverydayWorksheet, everydayKey, retryEveryday, selectEverydaySources, setEverydayPhase, setEverydayRegistered, useEveryday,
} from '@/lib/review-everyday-store';
import StoryboardPage from '@/pages/storyboard';
import WritePage from '@/pages/write';
import VersionsPage from '@/pages/versions';
import ExportPage from '@/pages/export';
import QuestionsPage from '@/pages/questions';
import CriteriaPage from '@/pages/criteria';

const routeBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const schoolPages = ['home', 'report', 'lab'] as const;
const COMPANY_ROLE = 'review:company-role:v1';
const shortcutStart = typeof window !== 'undefined' &&
  !!reviewShortcutEntry(window.location.pathname, window.location.search, routeBase);
const adultStages = [
  ['/report','결과지','강점과 보완 필요영역을 살펴본 뒤 플래너에서 바로 기록할 수 있어요.'],
  ['/planner','플래너 일상기록','내 기록을 저장하고 이야기에 사용할 기록을 골라 주세요.'],
  ['/storyboard','나의 강점 스토리보드','후보를 살펴보고 내 글을 확인한 뒤 내려받으세요.'],
] as const;

export default function ReviewDemoPage() {
  const { t, locale } = useI18n();
  const ko = locale === 'ko';
  const shellRef=useRef<HTMLDivElement>(null);
  const [location, navigate] = useLocation();
  const { status, saveNow, setSelectedExpId } = useWorkspace();
  const { book, error: plannerError } = useReviewPlanner();
  const { value: everyday, error: everydayError } = useEveryday();
  const context = contextOf(everyday.choice)!;
  const match = matchOf(everyday.choice)!;
  const matchConfirmed = !everydayError && everyday.confirmedVersion === everyday.version;
  const activeEvidence = !everydayError ? `${evidenceKey(match,everyday.version)}:${matchConfirmed?'reviewed':'unmatched'}` : '';
  const [audience, setAudience] = useState(() => reviewAudience(loadJSON<unknown>(REVIEW_AUDIENCE)));
  const adult = audience === 'adult';
  const youth = audience === 'youth';
  const activityWorkspace = usesActivityWorkspace(audience);
  const [started, setStarted] = useState(() => audience !== null && (shortcutStart || loadJSON<boolean>(REVIEW_START_KEY) === true));
  const routeRedirect = reviewRouteRedirect(location, audience, started);
  const [selection, setSelection] = useState(() => loadJSON<ReviewSelection>(REVIEW_SELECTION_KEY));
  const [companyRole,setCompanyRole]=useState(()=>loadJSON<ReviewRoleId>(COMPANY_ROLE));
  const [error, setError] = useState(false);
  const previousArea=useRef('');
  const [binding, bumpBinding] = useState(0);
  const [adultResume,setAdultResume]=useState(()=>reviewResumePath(loadJSON<string>(REVIEW_RESUME_KEY)));
  const [resumeTo, setResumeTo] = useState(() => {
    try { return storedStoryboard('demo')?.experienceId ? '/storyboard' : null; }
    catch { return null; }
  });
  useEffect(() => {
    if (shortcutStart && audience && loadJSON<boolean>(REVIEW_START_KEY) !== true && !saveJSON(REVIEW_START_KEY, true)) setError(true);
  }, []);

  useEffect(() => {
    const hash=window.location.hash.slice(1);
    if (!hash) window.scrollTo(0, 0);
    else document.getElementById(hash)?.focus();
  }, [location]);
  useEffect(()=>{
    if(started)recordSyntheticReport();
  },[started,everyday.choice.trait,everyday.choice.focus]);
  useEffect(()=>{
    const areas=['/home','/report','/lab','/planner','/storyboard'];
    const area=areas.find(p=>location===p||location.startsWith(`${p}/`))??'';
    if(started&&area&&area!==previousArea.current){
      recordReviewAction('navigation.entered','review-route',{from:previousArea.current||'entry',to:area});
      previousArea.current=area;
    }
  },[started,location]);
  useEffect(()=>{
    const next=started && activityWorkspace ? reviewResumePath(location) : null;
    if (next && !plannerError && !everydayError) {
      if (saveJSON(REVIEW_RESUME_KEY,next)) setAdultResume(next);
    }
  },[started,activityWorkspace,location,plannerError,everydayError]);
  useEffect(() => {
    if (plannerError !== 'write' && everydayError !== 'write') return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [plannerError,everydayError]);

  function start(next: ReviewAudience, destination = '/home') {
    if (audience && audience !== next) {
      try {
        switchReviewAudience(next,REVIEW_START_KEY);
        const params=new URLSearchParams({lang:locale});
        window.location.assign(`${routeBase}/demo/review${destination}?${params}`);
      } catch { setError(true); }
      return;
    }
    if (!saveJSON(REVIEW_AUDIENCE,next) || !saveJSON(REVIEW_START_KEY, true)) { setError(true); return; }
    setAudience(next);
    setStarted(true);
    setError(false);
    const shortcut=reviewShortcutEntry(window.location.pathname, window.location.search, routeBase) ??
      new URLSearchParams(window.location.search).get('startAt');
    navigate(shortcut==='planner'?'/planner':destination);
  }

  function leave() {
    removeKey(REVIEW_START_KEY);
    if (loadJSON<boolean>(REVIEW_START_KEY) === true) { setError(true); return; }
    setStarted(false);
    setError(false);
    navigate('/');
  }

  function select(next: ReviewSelection) {
    setSelection(next);
    setError(!saveJSON(REVIEW_SELECTION_KEY, next));
  }

  function useRecords(ids: string[], expectedRevision?:number, appendExisting=false) {
    try {
      const {book,error:latestPlannerError}=getReviewPlannerSnapshot();
      if (latestPlannerError || ids.some(id=>!reviewStudioSourceCurrent(id)) || (expectedRevision!==undefined && book.cards[ids[0]]?.revision!==expectedRevision)) return false;
      const current = storedStoryboard('demo');
      if(appendExisting && activityWorkspace && current?.evidenceSources?.length) {
        const prior=(current.evidenceSources ?? []).filter(source=>ids.includes(source.id) ||
          (book.cards[source.id]?.revision===source.revision && book.cards[source.id]?.approvedRevision===source.revision &&
            !book.noteEdits[source.id] && !book.planEdits[source.id] && reviewStudioSourceCurrent(source.id))).map(source=>source.id);
        ids=[...new Set([...prior,...ids])];
      }
      const sources = [...new Set(ids)].flatMap(id=>book.cards[id] ? [{id,revision:book.cards[id].revision}] : []);
      const id=sources[0]?.id;
      if (!id || sources.length!==ids.length) return false;
      const candidate = approveCardRevision(book, id, sources[0].revision)?.cards[id];
      const record = candidate && reviewCardExperience(candidate);
      if (!candidate || !record) return false;
      if (activityWorkspace && everydayError) return false;
      if (current?.sections.some((s) => s.trim()) && current.experienceId !== id &&
        !window.confirm(ko ? '출처 활동을 바꾸시겠어요? 작성한 문장과 이전 버전은 그대로 남습니다.' :
          'Change the source activity? Your writing and previous versions will stay unchanged.')) return false;
      const next = activityWorkspace
        ? editStoryboard(current ?? emptyStoryboard(),{experienceId:id,sourceRevision:sourceRevision(record,{meta:REVIEW_RECORD_META,syntheticStatus:null}),
            evidenceKey:DAILY_EVIDENCE,evidenceSources:sources})
        : bindReviewStoryboard(current, { option: candidate.option, approved: true },
            current?.experienceId === id ? candidate.option : null, record, REVIEW_RECORD_META);
      if (!next || !approveReviewCards(sources) || (activityWorkspace && !selectEverydaySources(ids,DAILY_EVIDENCE)) || !saveStoryboard('demo', next, current)) {
        setError(true);
        return false;
      }
      setSelectedExpId(record.id);
      setResumeTo('/storyboard');
      bumpBinding((n)=>n+1);
      setError(false);
      navigate('/storyboard');
      return true;
    } catch {
      setError(true);
      return false;
    }
  }
  const useRecord = (id:string,revision:number)=>useRecords([id],revision,activityWorkspace);
  function useInterest(interest:ReviewInterest) {
    try {
      const current=storedStoryboard('demo');
      const company=interest.company.trim(),job=interest.job.trim();
      if(!company&&!job)return false;
      const next=editStoryboard(current ?? emptyStoryboard(),{company,job,keyword:'',reviewInterest:{...interest,company,job}});
      if(!saveStoryboard('demo',next,current))return false;
      setResumeTo('/storyboard');
      return true;
    } catch {return false;}
  }
  function useCareer(role:ReviewRoleId) {
    const career=REVIEW_ROLES.find(item=>item.id===role);
    if(!youth||!career) return false;
    try {
      const current=storedStoryboard('demo');
      const next=editStoryboard(current??emptyStoryboard(),{company:'',job:career.job,keyword:career.needs[0].keyword,reviewInterest:undefined});
      if(!saveStoryboard('demo',next,current))return false;
      recordReviewAction('career.keyword.selected','synthetic-youth-lab',{roleId:role,sourceVersion:career.sourceVersion,reportVersion:everyday.version});
      setResumeTo('/storyboard');
      navigate('/storyboard');
      return true;
    }catch{return false;}
  }
  function pickRole(id:ReviewRoleId) {
    if(id===context.role.id) return !everydayError;
    const role=REVIEW_ROLES.find(item=>item.id===id);
    return !!role && changeEverydayChoice({role:id,need:role.needs[0].id});
  }
  function isLinked(id:string,revision:number) {
    try {
      const saved=storedStoryboard('demo');
      const sources=saved?.evidenceSources ?? [];
      const ids=sources.map(s=>s.id);
      return !!saved && (saved.evidenceKey===DAILY_EVIDENCE || saved.evidenceKey===activeEvidence &&
        JSON.stringify(ids)===JSON.stringify(everyday.selected?.[everydayKey(everyday)] ?? [])) &&
        sources.some(s=>s.id===id && s.revision===revision);
    } catch { return false; }
  }

  const view = (page: 'start' | 'family' | 'teacher' | typeof schoolPages[number]) => (
    <ReviewDemoView page={page} started={started} audience={audience} activityWorkspace={activityWorkspace} onStart={start}
      trait={everyday.choice.trait} onTrait={(trait)=>changeEverydayChoice({trait})}
      focus={everyday.choice.focus} onFocus={focus=>changeEverydayChoice({focus})}
      resumeTo={started ? resumeTo : null} selection={selection?.option ?? null}
      adultResume={adultResume && (!adultResume.startsWith('/planner/card/') || book.cards[adultResume.split('/').at(-1)!]) ? adultResume : null}
      adultResumeLabel={adultResume?.startsWith('/planner/card/') ? book.cards[adultResume.split('/').at(-1)!]?.plan.goal : adultResume?.startsWith('/planner/daily')?t('daily.title'):adultStages.find(([path])=>path===adultResume)?.[1]}
      onPickJob={(role)=>{
        if(youth){
          if(saveJSON('review:youth-career-draft:v1',role)){setError(false);navigate('/lab');}else setError(true);
          return;
        }
        const job=REVIEW_ROLES.find(r=>r.id===role)?.job??'';
        if(saveJSON(COMPANY_ROLE,role)&&saveJSON('review:lab-search:v1',{company:'',job})){
          recordReviewAction('lab.role.explore','synthetic-home-top5',{roleId:role});setCompanyRole(role);setError(false);navigate('/lab');
        } else setError(true);
      }}
      onSelect={(option) => { if (reviewOption(option)) select({ option, approved: false }); }}
      error={error} />
  );
  const dailyDraft = everyday.drafts[everydayKey(everyday)] ?? null;
  function register(continueToPlanner = false) {
    if (plannerError || !matchConfirmed || !dailyDraft?.selected || dailyDraft.phase !== 'worksheet' ||
      (continueToPlanner && !dailyDraft.worksheet.before.trim()) ||
      !validEverydayPlan(dailyDraft.selected) || !/^\d{4}-\d{2}-\d{2}$/.test(dailyDraft.worksheet.date)) return;
    if (!addEverydayCard(dailyDraft.id, {match,activity:dailyDraft.selected,worksheet:dailyDraft.worksheet}) ||
      !setEverydayRegistered(dailyDraft.id)) { setError(true); return; }
    setError(false);
    if (continueToPlanner) navigate(`/planner/card/${dailyDraft.id}`);
  }
  const everydayView = (page:'lab'|'activity'|'worksheet') => !activityWorkspace ? <Redirect to="/lab" /> : (
    <ReviewEverydayView key={`${page}:${everyday.version}`} page={page} {...context} confirmed={matchConfirmed} draft={dailyDraft}
      error={everydayError || plannerError || error ? '이 기기에 저장하지 못했거나 불러올 수 없습니다. 다시 시도해 주세요.' : null}
      onRetry={()=>{ if (everydayError) retryEveryday(); if (plannerError) retryReviewPlanner(); setError(false); }}
      onRole={pickRole}
      onNeed={(need)=>changeEverydayChoice({need})} onConfirm={confirmEverydayChoice} onGenerate={beginEverydayDraft}
      onChoose={chooseEverydayPlan} onPlan={editEverydayPlan} onWorksheet={editEverydayWorksheet}
      onWorksheetOpen={()=>{if(dailyDraft?.selected && validEverydayPlan(dailyDraft.selected) && setEverydayPhase('worksheet')) navigate('/worksheet');}}
      onRegister={register} />
  );
  const plannerView = (page: 'list' | 'new' | 'card' | 'history', id?: string, option?: string) => started ? (
    <>
      {error && <p role="alert" className="rounded-xl border border-destructive p-3 text-sm">선택을 저장하지 못했습니다. 입력을 유지한 채 다시 시도해 주세요.</p>}
      <ReviewPlannerView key={`${page}:${id ?? ''}:${option ?? ''}`} page={page} id={id} option={option ?? selection?.option}
        onUse={useRecord} onUseBundle={useRecords} isLinked={isLinked} hasStoryboard={!!resumeTo} adult={activityWorkspace} />
    </>
  ) : <Redirect to="/" />;
  const simpleStoryboard=(adult&&ko||youth)&&location==='/storyboard';
  const productIcons={company:FlaskConical,career:FlaskConical,familyLab:FlaskConical,planner:CalendarCheck,history:History,storyboard:BookOpenText};
  const productIds={company:1,career:1,familyLab:1,planner:3,history:4,storyboard:2};
  const nav = [
    { href: '/home', name: 'MY NUVIA', icon: Home, id:0, product:null },
    ...reviewProducts(audience).map(product=>{
      const [href,key]=REVIEW_PRODUCT_LINKS[product];
      return {href,name:t(key),icon:productIcons[product],id:productIds[product],product};
    }),
  ];
  const activeStage = adultStages.findIndex(([href])=>location===href || location.startsWith(href+'/'));
  const lightEntry = location !== '/teacher';
  const embeddedPlanner=activityWorkspace && started && location==='/planner';
  useEffect(()=>{
    if(!embeddedPlanner||!shellRef.current)return;
    const shell=shellRef.current;
    const fit=()=>shell.style.setProperty('--review-preview-offset',`${Math.max(0,Math.round(shell.getBoundingClientRect().top+window.scrollY))}px`);
    fit();
    const observer=new ResizeObserver(fit);
    observer.observe(document.body);
    window.addEventListener('resize',fit);
    return ()=>{observer.disconnect();window.removeEventListener('resize',fit);};
  },[embeddedPlanner]);

  if(routeRedirect){
    const params=new URLSearchParams(window.location.search);
    if(!started&&shortcutStart&&params.get('shortcut')==='planner')params.set('startAt','planner');
    params.set('lang',locale);
    if(started&&routeRedirect!=='/')return <Redirect to={routeRedirect} replace />;
    return <Redirect to={`${routeRedirect}?${params}`} replace />;
  }

  return (
    <div ref={shellRef} className={cn('min-h-[100dvh] bg-background',!/^\/(?:planner|activity|worksheet)(?:\/|$)/.test(location)&&'review-brand',embeddedPlanner&&'review-planner-shell')}>
      <header className={lightEntry ? 'border-b border-slate-200 bg-white text-slate-950' : 'header-glow text-white'} data-testid="header-review">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link href={started ? '/home' : '/'} className="flex min-h-11 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-display font-bold" data-testid="link-review-brand">
            <span className="inline-flex items-center rounded-sm bg-white px-1 py-1">
              <img src={`${routeBase}/feelgood-brand-original.png`} alt="FeelGood" width="2415" height="398" className="h-auto w-[100px] sm:w-[124px]" data-testid="image-review-feelgood"/>
            </span>
            <span className="border-s border-slate-300 ps-2 text-sm tracking-wide">NUVIA</span>
            <span className={cn('rounded-full border px-2 py-1 text-[10px] tracking-normal', lightEntry ? 'border-slate-200 text-slate-600' : 'border-white/30')}>{ko ? '검토용 데모' : 'Review demo'}</span>
          </Link>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            {started && <button type="button" onClick={leave} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold', lightEntry ? 'text-blue hover:bg-blue-soft' : 'text-white hover:bg-white/10')} data-testid="button-review-exit">
              <LogOut className="h-4 w-4" aria-hidden />{t('audience.change')}
            </button>}
            <LanguageSwitcher onDark={!lightEntry} />
          </div>
        </div>
      </header>
      {started && location !== '/' && location !== '/teacher' && location !== '/family' && (
        <nav aria-label={t('audience.services')} className="border-b bg-card" data-testid="nav-review-services">
          <div className={cn('mx-auto grid max-w-6xl gap-1 px-3 py-2 sm:flex sm:flex-wrap sm:px-6',activityWorkspace?'grid-cols-3':'grid-cols-2')}>
            {nav.map(({ href, name, icon: Icon, id, product }) => (
              <Link key={id} href={href} aria-current={href === location ? 'page' : undefined} aria-label={name}
                className="flex min-h-11 min-w-0 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold leading-tight text-blue hover:bg-blue-soft aria-[current=page]:bg-blue-soft sm:gap-2 sm:px-2 sm:text-sm"
                data-testid={`link-review-service-${id}`} data-review-product={product??undefined}>
                <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden /><span className="min-w-0 break-words">{name}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
      <main className={cn('review-page-main mx-auto max-w-6xl px-4 sm:px-6 sm:py-7',simpleStoryboard?'space-y-2 py-3':'space-y-4 py-5')}>
        {!simpleStoryboard&&<p className="text-xs leading-relaxed text-muted-foreground" data-testid="review-scope">{t(youth?'audience.youthBoundary':'simpleStory.demoBoundary')}</p>}
        {!ko && <p className="text-xs text-muted-foreground" lang="en">
          This review walkthrough uses Korean sample material. The existing editor still follows the chosen language.
        </p>}
        {location === '/storyboard' && !simpleStoryboard && <p className="text-xs leading-relaxed text-muted-foreground">{t('simpleStory.downloadBoundary')}</p>}
        {status === 'error' && <div role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">
          {t('save.error')} <button type="button" className="ms-2 min-h-11 underline" onClick={saveNow} data-testid="button-review-save-retry">{t('sb.retry')}</button>
        </div>}
        <ReviewSaveWarning/>
        {adult && started && activeStage >= 0 && !simpleStoryboard && <div lang="ko" className="review-page-stage space-y-1">
          <ol aria-label="성인 체험 단계" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {adultStages.map(([href,label],index)=><li key={href} aria-current={index===activeStage?'step':undefined} className={index===activeStage?'font-bold text-blue':undefined}>{index+1}. {label}</li>)}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
            <p data-testid="text-review-next-action">{adultStages[activeStage][2]}</p>
            {!plannerError && !everydayError && !error && status!=='error' && <Link href="/home" className="inline-flex min-h-11 items-center text-blue underline" data-testid="link-review-pause-home">나중에 이어쓰기 · 홈으로</Link>}
          </div>
        </div>}
        {adult && everydayError && location === '/report' && <p role="alert" className="text-sm text-destructive">프로필을 저장하지 못했습니다. <button className="min-h-11 underline" onClick={retryEveryday}>다시 시도</button></p>}
        <Switch>
          <Route path="/">{view('start')}</Route>
          <Route path="/family">{view('family')}</Route>
          <Route path="/teacher">{view('teacher')}</Route>
          {schoolPages.map((page) => <Route key={page} path={`/${page}`}>{page==='lab' && adult ? <ReviewCompanyLab key={companyRole} role={companyRole} trait={everyday.choice.trait} focus={everyday.choice.focus} onUse={useInterest}/> : page==='lab' && youth ? <ReviewYouthLab onSave={useCareer}/> : view(page)}</Route>)}
          <Route path="/activity">{dailyDraft && matchConfirmed ? everydayView('activity') : <Redirect to="/planner/daily" />}</Route>
          <Route path="/worksheet">{dailyDraft && matchConfirmed ? everydayView('worksheet') : <Redirect to="/planner/daily" />}</Route>
          <Route path="/planner">{activityWorkspace?<ReviewStudioFrame/>:plannerView('list')}</Route>
          <Route path="/planner/previous">{plannerView('list')}</Route>
          <Route path="/planner/daily">{activityWorkspace?<ReviewDailyCards/>:<Redirect to="/planner"/>}</Route>
          <Route path="/planner/daily/:id">{({id})=>activityWorkspace?<ReviewDailyCards key={id} id={id}/>:<Redirect to="/planner"/>}</Route>
          <Route path="/planner/new/:option">{({ option }) => activityWorkspace ? <Redirect to="/planner" /> : plannerView('new', undefined, option)}</Route>
          <Route path="/planner/card/:id">{({ id }) => plannerView('card', id)}</Route>
          {audience==='family'&&<Route path="/history/:id?">{({id})=>plannerView('history',id)}</Route>}
          {audience==='family'&&<Route path="/history/:rest*"><Redirect to="/history" /></Route>}
          {audience==='family'&&<Route path="/experiences"><Redirect to="/history" /></Route>}
          <Route path="/activities">{started ? <Redirect to="/planner" /> : <Redirect to="/" />}</Route>
          <Route path="/storyboard">
            {!started ? <Redirect to="/" /> : (
              <>
                {!simpleStoryboard&&<nav aria-label={ko ? '체험 진행 단계' : 'Demo steps'} className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-blue">
                  <Link href="/report" className="inline-flex min-h-11 items-center" data-testid="link-review-editor-report">{ko ? '결과지 보기' : 'View report'}</Link>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                  <Link href={activityWorkspace ? '/planner' : '/history'} className="inline-flex min-h-11 items-center" data-testid="link-review-editor-records">{activityWorkspace?t('audience.activity'):(ko?'활동 기록':'Activity records')}</Link>
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
                  <span aria-current="step">{t('sb.title')}</span>
                  <Link href="/lab" className="ms-auto inline-flex min-h-11 items-center gap-1 text-xs underline" data-testid="link-review-editor-lab"><FlaskConical aria-hidden className="h-4 w-4"/>{t(adult?'audience.company':youth?'audience.career':'audience.familyLab')}</Link>
                </nav>}
                <StoryboardPage key={`${audience}:${binding}`} review adultReview={activityWorkspace} youthReview={youth} adultEvidence={activeEvidence} reviewBook={book}
                  reviewSelection={everyday.selected?.[everydayKey(everyday)] ?? []} onUseReviewBundle={useRecords} />
              </>
            )}
          </Route>
          <Route path="/write">{started ? <WritePage /> : <Redirect to="/" />}</Route>
          <Route path="/questions">{started ? <QuestionsPage /> : <Redirect to="/" />}</Route>
          <Route path="/criteria">{started ? <CriteriaPage /> : <Redirect to="/" />}</Route>
          <Route path="/versions">{started ? <VersionsPage /> : <Redirect to="/" />}</Route>
          <Route path="/export">{started ? <ExportPage /> : <Redirect to="/" />}</Route>
          <Route>{<Redirect to={started ? '/home' : '/'} />}</Route>
        </Switch>
        {(location==='/'||location==='/home')&&<ReviewDataControls/>}
        <footer className="border-t pt-2 text-xs text-muted-foreground">
          <a className="inline-flex min-h-11 items-center underline" href={`${routeBase}/storyboard`} data-testid="link-review-existing-records">
            {ko ? '기존 작업 공간 열기 (데모와 별도)' : 'Open your existing workspace (separate from this demo)'}
          </a>
        </footer>
      </main>
    </div>
  );
}
