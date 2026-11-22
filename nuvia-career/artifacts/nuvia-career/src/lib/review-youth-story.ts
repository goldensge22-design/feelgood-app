/** A deterministic preview using only two sources: selected records and the student's words. */
export function youthStoryPreview(input:{
  lang:string; actions:readonly {text:string;thought:boolean}[]; keyword:string; body:string; thought:string;
}, mode:'generate'|'refine'):string {
  if(mode==='refine')return input.body.trim()&&input.thought.trim()?[input.body.trim(),input.thought.trim()].join('\n\n'):'';
  const ko=input.lang==='ko';
  const lines=input.actions.flatMap(({text,thought})=>text.trim()
    ? [`${thought?(ko?'가정 상황에서 적은 생각: ':'My notes on a hypothetical situation: '):(ko?'내가 기록한 활동: ':'Activity I recorded: ')}${text.trim()}`] : []);
  if(!lines.length)return '';
  if(input.keyword.trim())lines.push(`${ko?'더 탐색하고 싶은 진로 키워드: ':'Career keyword I want to explore: '}${input.keyword.trim()}`);
  return lines.join('\n\n');
}
