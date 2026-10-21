import {AUDIENCES, type Audience} from './audiences';
import {useEffect} from 'react';
import {demoAssessmentEnvelope} from './assessment';
import {previousDemoStorageKey} from './session';
import {currentLocale,t} from '../studio/i18n/runtime';
import './notice.css';

export const DEMO_WARNING = '가상 데이터 데모 · 실제 D-CAS 결과지 연동·로그인·서버 저장/동기화 없음. 실제 학생·직원 개인정보나 검사 결과 입력 금지. 입력은 이 브라우저에 남을 수 있으며 JSON 백업은 평문입니다. 표시 점수는 가상 예시이며 인지능력 향상이나 효과 검증 자료가 아닙니다.';
export const demoReportNotice = `<aside style="border:2px solid #9b4b13;padding:12px;margin:12px 0;color:#182742;background:#fff5e7"><strong>${DEMO_WARNING}</strong></aside>`;
export function localizedDemoReportNotice(){
 const locale=currentLocale();
 if(locale==='ko')return demoReportNotice;
 const warning=[t('s.e6370a900b579e42'),t('s.1212a1bd7c5227d3'),t('s.daaeb4a10c3fc791'),t('s.5df0fa35edca4463')].join(' ');
 return `<aside lang="${locale}" style="border:2px solid #9b4b13;padding:12px;margin:12px 0;color:#182742;background:#fff5e7"><strong>${warning}</strong></aside>`;
}
export default function DemoNotice({audience}:{audience:Audience}) {
 const locale=currentLocale();
 const config = AUDIENCES[audience];
 const example = demoAssessmentEnvelope(audience);
 let previous=false;
 try{previous=localStorage.getItem(previousDemoStorageKey(audience))!==null;}catch{/* Storage error is handled by Studio. */}
 useEffect(()=>{
  document.title=locale==='ko'?`NUVIA PLANNER · ${config.label} 가상 데이터 데모`:`NUVIA PLANNER · ${t('s.f75c653dc3c3fdf3',{},locale)}`;
  const meta=document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';
  document.head.append(meta);return()=>meta.remove();
 },[config.label,locale]);
 if(locale!=='ko')return <aside className="external-demo-notice" aria-label={t('s.f75c653dc3c3fdf3')} data-testid="external-demo-notice" lang={locale} dir={locale==='ar'?'rtl':'ltr'}>
  <strong>{t('s.f75c653dc3c3fdf3')}</strong>
  <p data-testid="external-demo-assessment">{t('s.e6370a900b579e42')}</p>
  <p>{t('s.1212a1bd7c5227d3')}</p>
  <p>{t('s.daaeb4a10c3fc791')}</p>
  <p>{t('s.5df0fa35edca4463')}</p>
 </aside>;
 return <aside className="external-demo-notice" aria-label="외부 데모 이용 안내" data-testid="external-demo-notice" lang="ko" dir="ltr">
  <strong>가상 데이터 데모 · {config.label}</strong>
  <p data-testid="external-demo-assessment">{example.testKind} · {config.stage==='adult'?'대학생·성인':'중고등학생(청소년)'} · 네 영역 정답률(%) · 예시 분류·지원 순서입니다. 실제 검사나 연령 규준 검증이 아닙니다.</p>
  {previous&&<p data-testid="external-demo-previous-preserved">이전 외부 체험 기록은 변경하지 않고 브라우저에 별도로 보존했습니다. 이번에는 D-CAS 합성 예시의 새 체험 공간으로 시작합니다. 이전 점수나 기록을 변환·합산하지 않습니다.</p>}
  <p>{DEMO_WARNING}</p>
  <p lang="en">Synthetic demo only. No live D-CAS connection, login, server storage or sync. Do not enter real personal information or assessment results. Browser inputs may persist; JSON backups are unencrypted.</p>
  <details><summary>체험 순서와 한계</summary>
   <ol>{config.steps.map(step=><li key={step}>{step}</li>)}</ol>
   <p>{config.limits}</p>
   <p>15개 언어의 외국어 번역은 AI 초안이며 원어민 검수 전입니다. 이 외부 체험 안내는 한국어로 제공하며 기존 Studio 언어 정책은 바꾸지 않습니다.</p>
  </details>
  <a href={`./demo.html?audience=${audience}`}>대상별 데모 안내로 돌아가기</a>
 </aside>;
}
