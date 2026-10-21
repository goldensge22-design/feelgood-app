import {useState} from 'react';
import {locales,localeOf} from './i18n/config';
import type {Stage} from '../enhancement/model';
import type {Action,PersonalState} from './model';
import {stageNames} from './domain';
import ProfileControls from './ProfileControls';

export default function ReviewPanel({state,act,backup}:{state:PersonalState;act:(a:Action)=>boolean;backup:(s:'personal'|'workspace')=>void}){
 const [confirm,setConfirm]=useState<''|'monthly'|'same-data'|'board'|'empty'>('');
 const s=state.lab.students['student-a'];
 return <section className="pm-block p" aria-label="검토 관리" data-testid="review-panel">
  <p className="pm-eye">검토 모드 전용</p><h2>검토 관리</h2>
  <h4>나이 단계</h4>
  <div className="pm-chips">{(['middle','high','adult'] as Stage[]).map(k=><button key={k} aria-pressed={s.stage===k} onClick={()=>act({type:'stage',stage:k})}>{stageNames[k]}</button>)}</div>
  <ProfileControls act={act}/>
  <h4>합성 예시 (이 후보 데이터만 바꿉니다)</h4>
  <div className="pm-row"><button data-testid="studio-board-fixture" onClick={()=>setConfirm('board')}>승인 이미지 작업대 예시</button><button data-testid="studio-empty-fixture" onClick={()=>setConfirm('empty')}>빈 작업대 확인</button><button onClick={()=>setConfirm('monthly')}>월간 예시 불러오기</button><button onClick={()=>setConfirm('same-data')}>이전 화면과 같은 데이터</button></div>
  {confirm&&<div className="pm-banner warn" role="alertdialog">지금 후보 데이터가 합성 예시로 바뀝니다. 계속할까요?
   <div className="pm-row"><button className="pm-primary" data-testid="fixture-confirm" onClick={()=>{act({type:'review.fixture',scenario:confirm});setConfirm('');}}>바꾸기</button><button onClick={()=>setConfirm('')}>취소</button></div></div>}
  <h4>언어 확인 (AI 초안, 사람 검수 전)</h4>
  <details className="pm-fold"><summary>월간 비교 예시 (완료된 두 달)</summary><p>이 검토 공간만 합성 기록으로 교체합니다. 실제 학생의 변화가 아닙니다. 불러온 뒤 보고서의 달을 지난달로 선택하세요.</p><button data-testid="insights-fixture" onClick={()=>{if(window.confirm('현재 검토 공간을 합성 비교 예시로 교체할까요? 개인 기본 공간은 바뀌지 않습니다.'))act({type:'review.insights-example'});}}>비교 예시 불러오기</button></details>
  <div className="pm-chips">{locales.map(l=><button key={l} aria-pressed={localeOf(state)===l} onClick={()=>act({type:'studio.locale',locale:l})}>{l}</button>)}</div>
  <p className="pm-note">새 번역은 AI 초안이며 사람 검수 전입니다. 언어를 바꾸어도 입력·시간·회차는 유지됩니다.</p>
  <div className="pm-row"><button data-testid="workspace-backup" onClick={()=>backup('workspace')}>전체 작업공간 백업</button><a href="./enhancement.html?qa=1" className="pm-note">이전 교사 기능 열기</a></div>
 </section>;
}
