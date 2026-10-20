import {BookOpen,FlaskConical,Landmark,House,Briefcase,FileText} from 'lucide-react';
/** Presentation only: keeps the existing math/language/life/work family, no record reclassification. */
export function subjectVisual(subject:string,domain:string){
 if(domain==='생활')return {kind:'life',tone:'orange',Icon:House};
 if(domain==='업무')return {kind:'work',tone:'sky',Icon:Briefcase};
 if(/수학/.test(subject))return {kind:'math',tone:'purple',Icon:BookOpen};
 if(/과학|물리|화학|생물|생명|지구/.test(subject))return {kind:'science',tone:'orange',Icon:FlaskConical};
 if(/역사|한국사|세계사|사회/.test(subject))return {kind:'history',tone:'sky',Icon:Landmark};
 return {kind:subject?'language':'other',tone:'blue',Icon:subject?BookOpen:FileText};
}
export default function SubjectSymbol({subject,domain}:{subject:string;domain:string}){
 const v=subjectVisual(subject,domain);
 return <span className={`st-subject-symbol subject-${v.kind}`} data-subject-icon={v.kind} aria-hidden="true"><v.Icon strokeWidth={1.8}/></span>;
}
