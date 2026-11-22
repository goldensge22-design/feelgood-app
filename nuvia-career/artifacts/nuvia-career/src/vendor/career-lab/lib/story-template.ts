import { storyReflection, actualLabReflection } from './practice';
import { majorById } from './catalog';
import { strengthsOf } from './links';
import { uid, type LabState, type StoryParagraph, type ProductMessage } from './types';
import { qualitativeText } from './recommendation-policy';

/** 예시 공간 전용 편집 틀. 생성형 AI가 아니며 현재 예시 입력을 그대로 인용합니다. */
export function exampleStoryTemplate(s: LabState, preserveOriginals: string[] = []): StoryParagraph[] {
  // Only the explicit example proposal is filtered; never overwrite the student's draft.
  s=structuredClone(s);
  s.tests=s.tests.map(t=>({...t,strengths:t.strengths.filter(x=>x.fit==='similar'||x.fit==='partial').map(x=>({...x,text:qualitativeText(x.text)})).filter(x=>x.text)}));
  s.interests=s.interests.map(i=>({...i,text:qualitativeText(i.text),reason:qualitativeText(i.reason)})).filter(i=>i.text);
  s.reflections=s.reflections.filter(r=>storyReflection(r,s)&&actualLabReflection(s,r))
    .map(r=>({...r,did:qualitativeText(r.did),role:qualitativeText(r.role),learned:qualitativeText(r.learned),question:qualitativeText(r.question)})).filter(r=>r.did);
  s.activities=s.activities.map(a=>({...a,title:qualitativeText(a.title)})).filter(a=>a.title);
  const out: StoryParagraph[] = [];
  const part = (source: string, values: (string | ProductMessage)[] = []): ProductMessage => ({ source, values });
  const add = (heading: string, text: string, evidence: string[], displayParts: ProductMessage[]) => out.push({
    id: uid(), heading, text, evidence, origin: 'example-template', preserveOriginals, displayParts,
  });
  const strengths = strengthsOf(s);
  if (strengths.length) add('나의 특징', `제가 확인하고 적은 강점은 ${strengths.map(x => `“${x.text}”`).join(', ')}입니다. 검사 결과는 정답이나 진단이 아니라 저를 이해하는 참고 자료로 보고 있습니다.`, strengths.map(x => `str:${x.id}`),
    [part('제가 확인하고 적은 강점은 {0}입니다. 검사 결과는 정답이나 진단이 아니라 저를 이해하는 참고 자료로 보고 있습니다.', [strengths.map(x => `“${x.text}”`).join(', ')])]);
  if (s.interests.length) add('관심과 탐색', s.interests.map(i => `저는 “${i.text}”에 관심이 있습니다.${i.reason ? ` 제가 적은 계기는 “${i.reason}”입니다.` : ' 관심을 갖게 된 계기는 더 생각해 보고 싶습니다.'}`).join('\n'), s.interests.map(i => `int:${i.id}`),
    s.interests.map((i, index) => ({ ...part('저는 “{0}”에 관심이 있습니다.{1}', [i.text, i.reason ? part(' 제가 적은 계기는 “{0}”입니다.', [i.reason]) : part(' 관심을 갖게 된 계기는 더 생각해 보고 싶습니다.')]), separator: index ? '\n' : '' })));
  for (const r of s.reflections) {
    if(r.practiceMode==='simulation'){
      add('가상 직무 상황 연습',`가상 상황 연습에서 실제로 해 본 행동은 “${r.did}”입니다. 실제 기업 근무 경험은 아닙니다.`,[`ref:${r.id}`],
        [part('가상 상황 연습에서 실제로 해 본 행동은 “{0}”입니다. 실제 기업 근무 경험은 아닙니다.',[r.did])]);
      continue;
    }
    if(r.practiceCardKeys?.length){
      add('일상 탐색·연습',`일상 탐색·연습에서 실제로 해 본 행동은 “${r.did}”입니다.${r.learned?` 배운 점은 “${r.learned}”입니다.`:''} 이 기록을 기업 근무 경험으로 바꾸어 쓰지 않습니다.`,[`ref:${r.id}`],
        [part('일상 탐색·연습에서 실제로 해 본 행동은 “{0}”입니다.{1} 이 기록을 기업 근무 경험으로 바꾸어 쓰지 않습니다.',[r.did,r.learned?part(' 배운 점은 “{0}”입니다.',[r.learned]):''])]);
      continue;
    }
    add('실제 경험과 배움', `실제로 한 일은 “${r.did}”입니다.${r.role ? ` 맡은 역할은 “${r.role}”입니다.` : ''}${r.learned ? ` 그 경험에서 배운 점은 “${r.learned}”입니다.` : ''}${r.question ? ` 새로 생긴 질문은 “${r.question}”입니다.` : ''}`, [`ref:${r.id}`],
      [part('실제로 한 일은 “{0}”입니다.{1}{2}{3}', [r.did, r.role ? part(' 맡은 역할은 “{0}”입니다.', [r.role]) : '', r.learned ? part(' 그 경험에서 배운 점은 “{0}”입니다.', [r.learned]) : '', r.question ? part(' 새로 생긴 질문은 “{0}”입니다.', [r.question]) : ''])]);
  }
  const m = majorById(s.tempMajor);
  const plans = s.activities.filter(a => a.status !== 'done' && a.status !== 'hold');
  add('아직 탐색 중인 선택과 계획', `${m ? `현재 임시로 선택한 학과는 ${m.name}입니다. 확정한 진로는 아니며 비교하며 바꿀 수 있습니다.` : '전공은 아직 미정이며 탐색하고 있습니다.'}${plans.length ? ` 앞으로 해 볼 계획으로 ${plans.map(a => `“${a.title}”`).join(', ')}을 적었습니다. 아직 실제 경험이나 성과로 쓰지 않습니다.` : '앞으로의 활동 계획은 직접 적어 보려고 합니다.'}`, [...(m ? [`maj:${m.id}`] : []), ...plans.map(a => `act:${a.id}`)],
    [m ? part('현재 임시로 선택한 학과는 {0}입니다. 확정한 진로는 아니며 비교하며 바꿀 수 있습니다.', [m.name]) : part('전공은 아직 미정이며 탐색하고 있습니다.'), plans.length ? part(' 앞으로 해 볼 계획으로 {0}을 적었습니다. 아직 실제 경험이나 성과로 쓰지 않습니다.', [plans.map(a => `“${a.title}”`).join(', ')]) : part('앞으로의 활동 계획은 직접 적어 보려고 합니다.')]);
  return out;
}
