import { FlaskConical, CalendarPlus } from 'lucide-react';
import type { SourceType } from '@/vendor/career-lab/lib/types';
import { requestPracticeLink } from '@/vendor/career-lab/lib/practice';
export function TryActions(p:{sourceType:SourceType;sourceId:string;sourceLabel:string;suggestion:string}){
  const open=()=>requestPracticeLink({sourceType:p.sourceType,sourceId:p.sourceId,sourceLabel:p.sourceLabel,text:p.sourceType==='program'?'공식 자료·과목 목록 읽고 질문 3개 적기':p.suggestion});
  return <div className="flex flex-wrap gap-2">
    <button onClick={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground" data-testid={`button-try-${p.sourceId}`}><FlaskConical className="h-3.5 w-3.5"/>직접 해보기</button>
    <button onClick={open} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 px-3 py-2 text-xs font-semibold text-primary" data-testid={`button-plan-${p.sourceId}`}><CalendarPlus className="h-3.5 w-3.5"/>내 플래너에 담기</button>
  </div>;
}
