import {useEffect} from 'react';
import type {Audience} from '../../demo/audiences';
import {previousDemoStorageKey} from '../../demo/session';
import '../../demo/notice.css';

// Azerbaijani AI draft, not native-speaker reviewed. No assessment data is rewritten.
export const azDemoWarning='Süni məlumatlarla nümayiş · Faktiki D-CAS nəticə xidməti, giriş, serverdə saxlama və cihazlararası sinxronizasiya yoxdur. Həqiqi şagird, tələbə və ya işçi haqqında şəxsi məlumatları və sınaq nəticələrini daxil etməyin. Daxil etdiyiniz məlumatlar bu brauzerdə qala bilər; JSON ehtiyat nüsxələri şifrələnməmiş mətndir. Göstərilən ballar süni nümunədir, koqnitiv qabiliyyətin artmasına və ya effektivliyə sübut deyil.';
export const azDemoReportNotice=`<aside lang="az" style="border:2px solid #9b4b13;padding:12px;margin:12px 0;color:#182742;background:#fff5e7"><strong>${azDemoWarning}</strong></aside>`;
const copy={
 enterprise:{label:'Müəssisələr',population:'Böyüklər',steps:['İşinizi kiçik tapşırıqlara bölüb iş masasına qoyun.','Görüşdən sonra yaranan növbəti işləri arxivdə saxlayıb bir-bir davam etdirin.','Günün sonunda istəsəniz şəxsi qeydinizi yazın.'],limits:'İşçiləri qiymətləndirmək, işə davamiyyəti izləmək və ya nəticələrə bal vermək üçün deyil. Rəhbər paneli və komanda üzrə ümumi hesabat yoxdur.'},
 university:{label:'Universitetlər',population:'Tələbələr və böyüklər',steps:['Seminarda iş masası ilə tanış olun.','Sonra ixtisas tapşırığınızı kiçik addımlara bölüb müstəqil davam edin.','Aylıq yol xəritəsində təcrübələrinizi və növbəti addımı nəzərdən keçirin.'],limits:'Qiymət, davamiyyət və ya məsləhət qeydlərini əvəz etmir. Universitetin şəxsi qeydləri topladığı funksiya yoxdur.'},
 school:{label:'Orta məktəblər',population:'Yeniyetmələr',steps:['Bugünkü dərs tapşırığını iş masasına qoyub ayrıca başladın.','Lazım olduqda fasilə verin və qayıtdıqda davam edin.','İcranı bitirdikdən sonra növbəti planınızı tənzimləyin.'],limits:'Şagirdləri izləmək və ya qiymətlərini proqnozlaşdırmaq üçün deyil. Müəllim və məktəb şəxsi qeydləri görə bilmir.'},
} as const;
export default function AzDemoNotice({audience}:{audience:Audience}){
 const c=copy[audience];
 let previous=false;
 try{previous=localStorage.getItem(previousDemoStorageKey(audience))!==null;}catch{/* Existing store handles persistence errors. */}
 useEffect(()=>{
  document.title=`NUVIA PLANNER · ${c.label} · Süni məlumatlarla nümayiş`;
  const meta=document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';
  document.head.append(meta);return()=>meta.remove();
 },[c.label]);
 return <aside className="external-demo-notice" aria-label="Xarici nümayişdən istifadə qaydaları" data-testid="external-demo-notice" lang="az" dir="ltr">
  <strong>Süni məlumatlarla nümayiş · {c.label}</strong>
  <p data-testid="external-demo-assessment">D-CAS · {c.population} · Dörd sahə üzrə düzgün cavab faizi (%). Səviyyələr və dəstək ardıcıllığı süni nümunədir; faktiki sınaq və yaş normalarının yoxlanılması deyil.</p>
  {previous&&<p>Əvvəlki nümayiş qeydləri dəyişdirilmədən brauzerdə ayrıca saxlanılır. Bu yeni D-CAS nümunəsi əvvəlki balları və qeydləri çevirmir və birləşdirmir.</p>}
  <p>{azDemoWarning}</p>
  <details><summary>İstifadə ardıcıllığı və məhdudiyyətlər</summary><ol>{c.steps.map(step=><li key={step}>{step}</li>)}</ol><p>{c.limits}</p><p>İlkin sınaq mənbəyinin xüsusi adları və istifadəçinin yazdıqları dəyişdirilmir.</p></details>
  <a href={`./demo.html?audience=${audience}`}>Bu qrup üçün nümayiş haqqında məlumata qayıt</a>
 </aside>;
}
