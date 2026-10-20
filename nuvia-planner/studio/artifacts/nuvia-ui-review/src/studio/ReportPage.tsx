import {useMemo,useState} from 'react';

type Fields={summary:boolean;evidence:boolean;methods:boolean;outputs:boolean;assessment:boolean};
const LABELS:Record<keyof Fields,string>={summary:'다음 한 가지와 다음 달 초안',evidence:'영역별 목표·수행·근거·실행 변화',methods:'방법 사용과 선택적 응답',outputs:'결과물과 느낌',assessment:'검사 출발점 상세 (점수·단위·검사일)'};

export default function ReportPage({month,report}:{month:string;report:(m:string,f:Fields,d?:boolean)=>string}){
 const [f,setF]=useState<Fields>({summary:true,evidence:true,methods:true,outputs:true,assessment:true});
 const [share,setShare]=useState<Fields>({summary:false,evidence:false,methods:false,outputs:false,assessment:false});
 const [preview,setPreview]=useState(false);
 const full=useMemo(()=>report(month,f),[month,f,report]);
 const shared=useMemo(()=>preview?report(month,share):'',[month,share,preview,report]);
 const boxes=(v:Fields,set:(x:Fields)=>void,p:string)=><div className="pm-chips">{(Object.keys(LABELS) as (keyof Fields)[]).map(k=><label key={k} className="pm-check pm-chip" style={{border:'1px solid var(--line)'}}><input type="checkbox" data-testid={`${p}-${k}`} checked={v[k]} onChange={e=>set({...v,[k]:e.target.checked})}/>{LABELS[k]}</label>)}</div>;
 return <div className="pm-page">
  <section className="pm-block" aria-label="월간 보고서">
   <p className="pm-eye">{month} 보고서</p><h2>한 달 돌아보기</h2>
   <p className="pm-note">개인 메모 원문은 자동 포함하지 않아요. 검사 상세는 선택한 경우에만 넣습니다. 아래 공유 항목은 별도로 골라 미리 확인하세요.</p>
   {boxes(f,setF,'report')}
   <iframe className="pm-iframe" title="보고서 미리보기" sandbox="" srcDoc={full} data-testid="report-preview"/>
   <div className="pm-row"><button onClick={()=>{const url=URL.createObjectURL(new Blob([full],{type:'text/html'}));window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000);}} data-testid="report-print">인쇄용 문서 열기</button><button className="pm-primary" data-testid="report-download" onClick={()=>report(month,f,true)}>HTML 내려받기</button></div>
   <p className="pm-note">인쇄용 문서가 새 탭에 열리면 브라우저의 인쇄를 선택하세요. 미리보기 틀에 잘리지 않은 전체 보고서이며 외부로 전송하지 않습니다.</p>
  </section>
  <section className="pm-block p" aria-label="골라서 보여 주기">
   <h2>골라서 보여 주기</h2>
   <p className="pm-note">보여 줄 항목만 고르고 미리 확인하세요. 전송은 하지 않아요. 확인한 뒤 내려받아 직접 전달합니다.</p>
   {boxes(share,setShare,'share')}
   <div className="pm-row"><button onClick={()=>setPreview(!preview)} aria-expanded={preview} data-testid="share-preview">{preview?'미리보기 닫기':'미리보기'}</button>
    <button disabled={!preview} onClick={()=>report(month,share,true)} data-testid="share-download">이 항목만 내려받기</button></div>
   {preview&&<iframe className="pm-iframe" title="공유 미리보기" sandbox="" srcDoc={shared}/>}
  </section>
  <div className="pm-print" dangerouslySetInnerHTML={{__html:full}}/>
 </div>;
}
