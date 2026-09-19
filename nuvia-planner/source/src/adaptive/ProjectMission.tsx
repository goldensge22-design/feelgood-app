import React,{useEffect,useRef,useState} from 'react';
import type {Assignment,Band,TrainingRecord} from './engine';
import {dailyScenario,checkDailyPlan,DEPTH} from './dailyMission';
import './project-mission.css';
export {DEPTH};
type Props={assignment:Assignment;band:Band;onRecord:(kind:TrainingRecord['kind'],m:TrainingRecord['measures'])=>string;onComplete:()=>void};
function Button({children,onClick,id,disabled=false,secondary=false}:{children:React.ReactNode;onClick:()=>void;id?:string;disabled?:boolean;secondary?:boolean}){return <button type="button" className={`ad-btn ${secondary?'secondary':''}`} data-testid={id} disabled={disabled} onClick={onClick}>{children}</button>;}
export function ProjectMission(props:Props){const [round,setRound]=useState(0);return <DailyRound key={round} {...props} round={round} again={()=>setRound(n=>n+1)}/>;}
function DailyRound({assignment,band,onRecord,onComplete,round,again}:Props&{round:number;again:()=>void}){
 const s=dailyScenario(band,round%2),focus=assignment.target==='attention';
 const [stage,setStage]=useState<'plan'|'do'|'check'|'done'>('plan'),[order,setOrder]=useState<string[]>([]),[index,setIndex]=useState(0),[help,setHelp]=useState(false),[hints,setHints]=useState(0),[paused,setPaused]=useState(false);
 const [notice,setNotice]=useState(false),[noticeSeen,setNoticeSeen]=useState(false),[peek,setPeek]=useState(false),[delay,setDelay]=useState(0);
 const [fixed,setFixed]=useState(false),[reviewed,setReviewed]=useState(false),[sentFile,setSentFile]=useState(''),[bag,setBag]=useState<string[]>([]),[feedback,setFeedback]=useState<string[]>([]),[checked,setChecked]=useState(false),[attempts,setAttempts]=useState(0);
 const [initial,setInitial]=useState<string[]>([]),[revisions,setRevisions]=useState(0);const saved=useRef(false),events=useRef<{action:string;value:string}[]>([]);
 const task=s.tasks.find(t=>t.id===order[index]);const completed=order.slice(0,index);const used=completed.reduce((n,id)=>n+s.tasks.find(t=>t.id===id)!.minutes,0)+delay;
 function log(action:string,value:string){events.current.push({action,value});}
 function choose(id:string){setOrder(o=>o.includes(id)?o.filter(x=>x!==id):[...o,id]);setFeedback([]);log('plan_toggle',id);}
 function start(){const issues=checkDailyPlan(s,order);setAttempts(n=>n+1);if(issues.length){setFeedback(issues);log('plan_retry',JSON.stringify(order));return;}setInitial([...order]);setStage('do');setFeedback([]);log('plan_start',JSON.stringify(order));}
 function finishTask(){if(!task)return;log('task_action',task.id);setFeedback([]);setIndex(i=>i+1);if(index===order.length-1){setStage('check');return;}if(!noticeSeen){setNotice(true);setNoticeSeen(true);}}
 function toggleBag(x:string){setBag(v=>v.includes(x)?v.filter(t=>t!==x):[...v,x]);setChecked(false);log('pack_toggle',String(s.items.indexOf(x)));}
 function check(){const issues:string[]=[];if(!fixed)issues.push(`${s.missing}이 아직 비어 있어요.`);if(s.tasks.some(t=>t.kind==='review')&&!reviewed)issues.push('최신 파일 확인이 빠졌어요.');if(sentFile!==s.file)issues.push('미완성 파일을 보냈어요. 완성 파일로 바꿔요.');const missing=s.needed.filter(x=>!bag.includes(x));if(missing.length)issues.push(`${missing.join(' · ')}이 빠졌어요.`);if(bag.some(x=>!s.needed.includes(x)))issues.push('필요 없는 물건은 빼도 돼요.');setChecked(true);setFeedback(issues);log('final_check',JSON.stringify({fixed,reviewed,sentFile,bag}));if(issues.length){setRevisions(n=>n+1);return;}if(saved.current)return;saved.current=true;onRecord('rehearsal',{missionVersion:'daily-1.8',round:round+1,checks:attempts+revisions+1,hints,errors:Math.max(0,attempts-1)+revisions,trainingTarget:assignment.target,plannedMinutes:s.total,simulatedMinutes:s.total+delay,distractionMinutes:delay,plan:initial.join(','),events:JSON.stringify(events.current),structuredCriteriaPassed:s.tasks.length,revisionCompleted:revisions>0,supportFaded:round>0,rawTextStored:false});setStage('done');}
 useEffect(()=>{setFeedback([]);},[band]);
 return <section className="daily" data-testid="project-mission" data-depth={DEPTH[band].extra} data-target={assignment.target}>
 <div className="dy-top"><div><span className="ad-kicker">오늘의 짧은 연습 · {round===0?'처음 해보기':'다시 해보기'}</span><h2>{s.title}</h2></div>{stage!=='done'&&<Button secondary id="pause-project" onClick={()=>setPaused(v=>!v)}>{paused?'계속하기':'잠깐 쉬기'}</Button>}</div>
 <div className="dy-rule"><span className={stage==='plan'?'active':''}><b>1</b> 순서 고르기</span><i>→</i><span className={stage==='do'?'active':''}><b>2</b> 하나씩 하기</span><i>→</i><span className={stage==='check'||stage==='done'?'active':''}><b>3</b> 빠진 것 확인</span></div>
 {paused?<section className="ad-panel"><h3>하던 일은 그대로 있어요.</h3><p>계속하기를 누르면 이어서 할 수 있어요.</p></section>:<>
 {stage!=='done'&&<div className="dy-goal"><strong>{s.goal}</strong><span>{stage==='plan'?'오늘의 계획 20분':`계획 속 진행 ${used}분 / 20분`}</span><small>화면 속 하루를 짧게 연습해요. 실제로 20분을 기다리지 않아요.</small></div>}
 {stage==='plan'&&<section className="ad-panel dy-board"><h3>무엇부터 할까요?</h3><p>할 순서대로 카드를 눌러요. 다시 누르면 뺄 수 있어요.</p>
 <div className="dy-cards">{[...s.tasks].reverse().map(t=><button key={t.id} className={`dy-card ${order.includes(t.id)?'chosen':''}`} data-testid={`choose-${t.id}`} aria-pressed={order.includes(t.id)} onClick={()=>choose(t.id)}><span className="dy-token">{order.includes(t.id)?order.indexOf(t.id)+1:t.icon}</span><strong>{t.title}</strong><b>{t.minutes}분</b><small>{t.hint}</small></button>)}</div>
 <div className="dy-tray" aria-label="내가 정한 순서">{order.length?order.map((id,i)=><span key={id}><b>{i+1}</b>{s.tasks.find(t=>t.id===id)!.title}</span>):<p>카드를 누르면 여기에 내 순서가 생겨요.</p>}</div>
 {assignment.support==='simultaneous'&&round===0&&<div className="dy-hint">연결해서 보기 <b>{s.tasks.filter(t=>t.id!=='pack').map(t=>t.title).join(' → ')}</b><span>{s.tasks.find(t=>t.id==='pack')!.title}는 마감에 맞춰 사이 또는 뒤에 넣어요.</span></div>}
 {focus&&round===0&&<div className="dy-hint">한 번에 하나씩 <b>지금 할 일 → 끝내기 → 다음 일</b></div>}
 {feedback.length>0&&<div className="ad-feedback" role="status">{feedback.map(x=><p key={x}>{x}</p>)}</div>}
 <Button id="start-training" disabled={order.length!==s.tasks.length} onClick={start}>이 순서로 해보기 →</Button>
 </section>}
 {stage==='do'&&<section className="ad-panel dy-board">
 <div className="dy-mini-path">{order.map((id,i)=><span key={id} className={i===index?'current':''}>{i<index?'✓ ':''}{s.tasks.find(t=>t.id===id)!.title}</span>)}</div>
 {notice?<div className="dy-notice"><span>친구에게 온 메시지</span><h3>“잠깐 같이 게임할래?”</h3><p className="dy-return">하던 일의 다음 단계: <b>{task?.title}</b></p>{!peek?<div className="dy-actions"><Button id="defer-message" onClick={()=>{setNotice(false);log('distraction','deferred');}}>할 일 끝내고 보기</Button><Button secondary id="peek-message" onClick={()=>{setPeek(true);setDelay(2);log('distraction','opened');}}>잠깐 확인하기</Button></div>:<><p>확인하는 데 2분을 썼어요. 계획은 조금 늦어졌지만 이어서 마칠 수 있어요.</p><Button id="resume-project" onClick={()=>{setNotice(false);log('resume',task?.id??'');}}>{task?.title}로 돌아가기 →</Button></>}</div>:task&&<>
 <span className="ad-kicker">{index+1} / {order.length} · 지금 할 일</span><h3>{task.title}</h3>
 {task.kind==='fix'&&<><div className="dy-paper"><span>{band==='D'?'회의안':band==='C'?'발표 자료':'숙제'}</span><p>내용 작성 <b>완료 ✓</b></p><p>{s.missing} <b className={fixed?'':'dy-missing'}>{fixed?'입력됨 ✓':'비어 있음'}</b></p></div><p>마무리할 부분을 골라요.</p><div className="dy-actions"><Button id="fix-required" onClick={()=>{setFixed(true);finishTask();}}>{s.missing} 채우기</Button><Button secondary id="skip-required" onClick={finishTask}>그대로 넘어가기</Button></div></>}
 {task.kind==='review'&&<><div className="dy-note">요청: <b>방금 정리한 파일</b>을 확인받으세요.</div><Button id="review-latest" onClick={()=>{setReviewed(true);finishTask();}}>최신 파일 확인받기</Button><Button secondary id="review-old" onClick={finishTask}>지난 파일 확인으로 넘어가기</Button></>}
 {task.kind==='pack'&&<><div className="dy-note">{band==='D'?'내일 회의':round%2?'내일 체험학습':'내일 준비물'} <b>{s.needed.join(' · ')}</b></div><p>챙길 물건을 눌러요.</p><div className="dy-items">{s.items.map((x,i)=><button key={x} data-testid={`pack-${i}`} aria-pressed={bag.includes(x)} onClick={()=>toggleBag(x)}><span>{bag.includes(x)?'✓':'＋'}</span>{x}</button>)}</div><Button id="pack-finish" disabled={!bag.length} onClick={finishTask}>챙겼어요 →</Button></>}
 {task.kind==='send'&&<><div className="dy-note">보낼 파일 <b>{s.file}</b></div><p>어떤 파일을 보낼까요?</p><div className="dy-actions"><Button id="send-final" onClick={()=>{setSentFile(s.file);finishTask();}}>{s.file} ↗</Button><Button secondary id="send-draft" onClick={()=>{setSentFile(s.wrongFile);finishTask();}}>{s.wrongFile} ↗</Button></div></>}
 {focus&&<p className="dy-focus">현재 <b>{task.title}</b>{order[index+1]?` · 다음 ${s.tasks.find(t=>t.id===order[index+1])!.title}`:' · 다음 빠진 것 확인'}</p>}
 </>}
 </section>}
 {stage==='check'&&<section className="ad-panel dy-board"><h3>빠진 것 없이 준비됐나요?</h3><p>다른 부분을 찾으면 여기서 바로 고쳐요.</p><div className="dy-checkrow"><div><span>{s.missing}</span><strong>{fixed?'입력됨':'비어 있음'}</strong></div>{!fixed&&<Button secondary id="repair-name" onClick={()=>{setFixed(true);setChecked(false);log('repair','name');}}>채우기</Button>}</div>
 {s.tasks.some(t=>t.kind==='review')&&<div className="dy-checkrow"><div><span>최신 파일 확인</span><strong>{reviewed?'확인받음':'확인 안 됨'}</strong></div>{!reviewed&&<Button secondary id="repair-review" onClick={()=>{setReviewed(true);setChecked(false);}}>확인받기</Button>}</div>}
 <div className="dy-checkrow"><div><span>보낸 파일 · {s.file} 필요</span><strong>{sentFile||'아직 없음'}</strong></div>{sentFile!==s.file&&<Button secondary id="repair-file" onClick={()=>{setSentFile(s.file);setChecked(false);log('repair','file');}}>완성 파일로 바꾸기</Button>}</div>
 <div className="dy-note">필요한 물건 <b>{s.needed.join(' · ')}</b></div><div className="dy-items">{s.items.map((x,i)=><button data-testid={`check-pack-${i}`} key={x} aria-pressed={bag.includes(x)} onClick={()=>toggleBag(x)}><span>{bag.includes(x)?'✓':'＋'}</span>{x}</button>)}</div>
 {checked&&feedback.length>0&&<div className="ad-feedback" role="status">{feedback.map(x=><p key={x}>{x}</p>)}</div>}
 <Button id="finish-day" onClick={check}>준비 끝 · 확인하기 ✓</Button></section>}
 {stage==='done'&&<section className="ad-panel dy-board dy-done"><span className="dy-medal">✓</span><h3>내일 준비 끝!</h3><p>할 일을 순서대로 하고, 빠진 것까지 확인했어요.</p><div className="dy-tray">{order.map(id=><span key={id}>✓ {s.tasks.find(t=>t.id===id)!.title}</span>)}</div><p>{delay?'메시지를 본 뒤 하던 일로 돌아왔어요.':'메시지는 미루고 하던 일을 이어갔어요.'}</p><small>게임 속 수행 기록입니다. 실제 숙제 완료나 집중력 점수가 아니에요.</small><div className="dy-actions"><Button id="next-project" onClick={onComplete}>이제 내 할 일에 써보기 →</Button><Button secondary id="another-practice" onClick={again}>한 번 더 연습</Button></div></section>}
 {stage!=='done'&&<details className="dy-help" open={help} onToggle={e=>{const open=e.currentTarget.open;if(open&&!help){setHints(n=>n+1);log('help','opened');}setHelp(open);}}><summary>막히면 힌트 보기</summary><p>{stage==='plan'?'카드 아래의 “먼저”와 마감 시간을 살펴보세요.':stage==='do'?'위에 적힌 지금 할 일을 끝내고 다음으로 넘어가세요.':'필요한 물건과 챙긴 물건을 나란히 비교해 보세요.'}</p></details>}
 </>}
 </section>;
}
