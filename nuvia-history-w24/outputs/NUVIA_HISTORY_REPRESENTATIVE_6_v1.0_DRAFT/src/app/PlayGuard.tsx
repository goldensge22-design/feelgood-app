import React,{useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {inspectPreschoolText,PRESCHOOL_POLICY} from '../core/preschoolPolicy';
import {PictureArt} from './PictureArt';

// This boundary wraps every preschool stage, including future stages and new=1.
// No CSS-only hiding: rejected content is hidden before paint and cannot be played.
export function PlayGuard({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null),[issues,setIssues]=useState<string[]>([]);
 useLayoutEffect(()=>{
  const root=ref.current!;
  const check=()=>{
   root.hidden=false;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const texts:string[]=[];let node:Node|null;
   while((node=walker.nextNode())){const parent=node.parentElement;if(parent&&!parent.closest('[data-user-content],textarea,script,style')&&parent.getClientRects().length&&getComputedStyle(parent).visibility!=='hidden'&&!parent.closest('details:not([open]) :not(summary)'))texts.push(node.textContent??'');}
   const prompts=[...root.querySelectorAll('[data-play-prompt]')].filter(el=>el.getClientRects().length).map(el=>el.textContent??'');
   const errors=inspectPreschoolText(texts.join(' '),prompts);for(const group of root.querySelectorAll('.kid-choices')){const count=group.querySelectorAll(':scope > button').length;if(count<PRESCHOOL_POLICY.minChoices||count>PRESCHOOL_POLICY.maxChoices)errors.push('CHOICE_COUNT');}root.hidden=errors.length>0;
   root.dataset.policy=errors.length?'fail':'pass';root.dataset.policyErrors=errors.join(',');
   setIssues(prev=>prev.join()===errors.join()?prev:errors);
  };
  check();const observer=new MutationObserver(check);observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open']});return()=>observer.disconnect();
 },[children]);
 return <><div ref={ref} data-preschool-play data-student-play>{children}</div>{issues.length>0&&<section className="kid-policy-stop" role="alert"><h1>잠깐 쉬어요</h1><PictureArt/></section>}</>;
}
