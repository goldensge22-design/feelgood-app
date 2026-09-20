// Every new student-facing phrase has an ID. No unapproved locale fallback.
export const kidKo={
 makePlace:'어디서 책을 만들까?',makeMethod:'책을 어떻게 만들까?',findReader:'누가 책을 봤을까?',maker:'누가 책을 만들까?',printer:'책 찍는 사람',try:'해 볼래',backToQuestion:'다시 해 볼래',
 intro:'책을 만나러 가요!',historyPaper:'구텐베르크가 책을 찍어요',historyFriends:'사람들이 책을 함께 봐요',condition:'어느 이야기를 바꿀까?',prediction:'어떻게 될까?',complete:'내 이야기가 완성됐어!',
 contextPaper:'종이가 조금 남았어.',contextFriends:'책을 못 보는 친구가 있어.',goal:'어떤 일을 해 볼까?',methodPaper:'책을 어떻게 만들까?',methodFriends:'책 이야기를 어떻게 나눌까?',outcome:'이렇게 될 수 있어!',revise:'어떻게 해 볼까?',sequence:'어떤 차례로 해 볼까?',linkPerson:'누구에게 책이 갈까?',linkPlace:'어디서 함께 볼까?',linkMethod:'책 이야기를 어떻게 전할까?',scene:'내가 이은 모습은?',findPerson:'누가 책을 보고 있을까?',findPaper:'남은 종이는 어느 쪽일까?',findTime:'책을 볼 때는 언제일까?',applyPaper:'어느 종이에 찍을까?',applyTime:'언제 함께 볼까?',reason:'왜 그렇게 골랐을까?',story:'어떤 이야기를 만들까?',compare:'무엇이 달라 보일까?',
 helpGoal:'해 보고 싶은 그림을 눌러요.',helpMethod:'해 보고 싶은 방법을 눌러요.',helpSequence:'끝에 할 일은 무엇일까?',helpLink:'그림과 어울리는 짝을 눌러요.',helpAttention:'책 옆의 그림을 살펴요.',tryAgain:'그림을 다시 살펴볼까?',
 start:'시작',resume:'이어서',next:'다음',observe:'살펴봤어',save:'저장',later:'나중에',other:'다른 방법',write:'짧게 쓰기',voice:'말',draw:'그림',listen:'듣기',record:'녹음',stop:'멈춤',retry:'다시 눌러요',unknown:'모르겠어',help:'도와줘',back:'다시 놓기',keep:'그대로 할래',change:'바꿔 볼래',past:'옛날',imagine:'상상',myStory:'내 이야기',myPrediction:'처음 생각',paper:'종이',friends:'친구',adult:'보호자 기록',stored:'저장했어',
 goalMake:'책을 만들어요',goalChoose:'종이를 아껴요',goalHear:'함께 들어요',goalSee:'함께 봐요',
 content:'찍을 내용을 골라요',paperCheck:'남은 종이를 살펴요',order:'찍을 차례를 정해요',tell:'이야기를 들려줘요',time:'함께 볼 때를 정해요',ask:'봐도 되는지 물어봐요',
 read:'책을 봐요',invite:'친구를 불러요',tellEnd:'이야기를 들려줘요',askFirst:'먼저 물어봐요',meet:'함께 모여요',seeEnd:'책을 함께 봐요',findTimeStep:'볼 때를 정해요',checkPaper:'종이를 살펴요',chooseContent:'찍을 것을 골라요',print:'책을 찍어요',setOrder:'찍을 차례를 골라요',
 reader:'책 보는 친구',listener:'이야기 듣는 친구',book:'책',place:'함께 앉는 곳',press:'책 찍는 곳',day:'낮에 봐요',night:'밤에 봐요',oneSheet:'한 장에 찍어요',threeSheets:'세 장에 찍어요',sun:'해가 떴을 때',moon:'달이 떴을 때',
 predictContent:'중요한 것만 찍어요',predictFewer:'조금만 찍어요',predictTurns:'차례로 봐요',predictShare:'함께 볼 길을 찾아요',
 resultContent:'고른 내용을 종이에 찍어 봐요.',resultPaper:'남은 종이에 찍을 곳을 나눠 봐요.',resultOrder:'고른 차례대로 책을 찍어 봐요.',resultTell:'책 본 친구가 이야기를 들려줘요.',resultTime:'정한 때에 모여 책을 함께 봐요.',resultAsk:'봐도 되는지 물은 뒤 함께 봐요.'
} as const;
export type KidKey=keyof typeof kidKo;
export const KID_SUPPORTED_LOCALES=['ko'] as const;
export const KID_PLANNED_LOCALES=['ko','en','zh','ja','vi','th','mn','ru','ar','es','fr'] as const;
export function kidText(key:KidKey,locale='ko'):string {if(locale!=='ko')throw Error('TRANSLATION_MISSING:'+locale+':'+key);return kidKo[key];}
export const kidTranslationAudit=(locale:string)=>({locale,missing:locale==='ko'?[]:Object.keys(kidKo),supported:locale==='ko'});
