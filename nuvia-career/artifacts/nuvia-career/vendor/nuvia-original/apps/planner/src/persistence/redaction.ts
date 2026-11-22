/**
 * 문서 §6 "저장하지 않음" 방어선.
 *
 * 타이머 매초 값 / 집중력 점수 / 인지향상 점수 / 사용자 간 순위 /
 * 재적용 자유서술 원문 / 결과지 접근 토큰 / 검사 문항 원문.
 *
 * 화면 코드가 실수로 넣어도 전송·캐시 직전에 여기서 떨어진다.
 * 정상 workspace 는 이 필터를 지나도 한 글자도 바뀌지 않아야 한다.
 */

const normalize=(key:string)=>key.toLowerCase().replace(/[^a-z0-9]/g,'');

/** 정확히 일치하면 떨어뜨리는 키 이름 (정규화 뒤 비교). */
export const BLOCKED_KEYS=new Set([
 // 타이머 매초 값
 'timertick','timerticks','tick','ticks','tickvalues','tickseries','tickcursor','timerseconds','timersamples','timerlog',
 'elapsedseconds','secondselapsed','secondsseries','secondsamples','secondlog','secondsvalues','runningseconds','remainingseconds',
 // 집중력 점수·인지향상 점수
 'focusscore','focuspoints','concentrationscore','attentionscore','cognitivescore','cognitivegain','cognitivegainscore',
 'cognitiveimprovement','cognitiveimprovementscore','improvementscore','growthscore','abilityscore','brainscore','trainingscore',
 // 사용자 간 순위
 'rank','ranking','rankamongusers','userrank','peerrank','peerpercentile','percentilerank','leaderboard','leaderboardrank','streakscore',
 // 재적용 자유서술 원문
 'freetext','freeform','freeformtext','freetextnote','narrative','narrativetext','reflectiontext','followuptext','followupnarrative',
 'reapplicationtext','verbatim','verbatimtext','rawtext','openresponse','openendedtext','writtenresponse',
 // 결과지 접근 토큰
 'token','accesstoken','reporttoken','resulttoken','sharetoken','authtoken','bearertoken','reportaccesstoken','sessiontoken',
 // 검사 문항 원문
 'itemtext','itemprompt','itemstem','itemcontent','questiontext','questionprompt','questionstem','assessmentitems','testitems','itembank',
]);

/** 이름이 조금 달라도 같은 뜻이면 떨어뜨린다. */
export const BLOCKED_PATTERNS:RegExp[]=[
 /token/,          // 접근 토큰 계열 전체
 /persecond|everysecond|secondbysecond/,
 /leaderboard/,
 /freetext|verbatim/,
 /itemtext|questiontext|itemprompt|questionprompt/,
];

export function isBlockedKey(key:string){
 const k=normalize(key);
 return BLOCKED_KEYS.has(k)||BLOCKED_PATTERNS.some(p=>p.test(k));
}

function walk(value:unknown,found:string[],depth:number):unknown {
 if(depth>16)return undefined;
 if(Array.isArray(value))return value.map(v=>walk(v,found,depth+1));
 if(value&&typeof value==='object'){
  if(value instanceof Date)return value.toISOString();
  const out:Record<string,unknown>={};
  for(const [k,v] of Object.entries(value as Record<string,unknown>)){
   if(isBlockedKey(k)){found.push(k);continue;}
   if(typeof v==='function'||typeof v==='symbol'||v===undefined)continue;
   out[k]=walk(v,found,depth+1);
  }
  return out;
 }
 if(typeof value==='number'&&!Number.isFinite(value))return null;
 return value;
}

/** 금지 항목을 떨어뜨린 사본을 돌려준다. 원본은 건드리지 않는다. */
export function redact<T>(value:T):T {
 return walk(value,[],0) as T;
}

/** 감사·테스트용. 어떤 금지 키가 들어 있었는지 알려준다. */
export function blockedKeysIn(value:unknown):string[] {
 const found:string[]=[];
 walk(value,found,0);
 return [...new Set(found)];
}
