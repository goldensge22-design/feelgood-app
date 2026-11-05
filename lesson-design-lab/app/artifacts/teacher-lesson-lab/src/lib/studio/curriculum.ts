import { T } from '@/i18n/tx';
import { displayAppText } from '@/i18n/authored';
import { formatNumber } from '@/i18n/format';
import type { AgendaRow, Course } from './types';

const PHASES = [
  ['intro', '안내', '수업설계LAB', '시간표·진행안', '오늘은 학생이 직무와 과제를 직접 선택합니다.', '오늘의 목표와 필요한 도움을 고른다.', '나의 목표', '목표와 도움 선택', '결과지가 없으면 관심 탐색으로 시작한다.'],
  ['report', '결과 해석', '결과지', '학생 결과 요약', '네 점수와 유형은 원본 해석이며 직무의 제한이 아닙니다.', '점수 척도를 확인하고 TOP5 원순위와 자신의 관심을 대조한다.', '관심 직무와 질문', '검사와 자기 진술 구분', '원본이 없으면 점수나 유형을 추정하지 않는다.'],
  ['planner', '플래너 기본 연습', '플래너', '개인 활동지·플래너 카드', '작은 실제 행동을 한 번 계획하고 실행·기록해 봅시다.', '자료 준비 또는 자리 정리 한 가지를 3분 실행하고 실제 행동을 쓴다.', '기본 사용 연습 기록', '계획과 실제 행동 별도 기록', '미연동이면 종이 또는 로컬 기록을 사용한다.'],
  ['lab', 'LAB 탐색', '진로탐색LAB / 기업·직무LAB', '기업·직무 자료 / 현장 운영', '기업 검색은 학생 LAB의 역할입니다. 출처와 요구 행동을 기록하세요.', '학생이 오늘 탐색할 직무·질문·업무·이유·출처를 선택한다.', '탐색 기록', 'TOP5 밖 관심도 이유와 함께 허용', '공식 자료가 없으면 일반 직무 연습으로 표시한다.'],
  ['card', '직무 활동카드 선택·등록', '수업설계LAB / 플래너', '현장 운영', '후보를 비교하고 목표와 첫 행동을 직접 수정하세요.', '남은 시간과 도구에 맞는 후보를 선택하고 범위를 확인해 담는다.', '확정 개인 활동카드', '학생 선택·범위 확인·등록 상태 확인', '자료 부족과 범위 초과는 교사 검토 대기로 보낸다.'],
  ['perform', '실제 수행·기록', '플래너', '현장 운영', '완료 버튼이 아니라 실제 행동과 결과가 필요합니다.', '모의 또는 실제 활동을 수행하고 행동·결과물·바꾼 방법·회고를 기록한다.', '실행 기록과 결과물', '모의 과제와 실제 경험 구분', '일부 수행도 보존하고 도움을 요청한다.'],
  ['experience', '경험 확인', '플래너 경험 기록', '현장 운영 / 자소서·면담', '확인한 행동·결과·배운 점만 글에 사용할 수 있습니다.', '활용할 실제 사실을 선택하고 학생 본인이 확인한다.', '확인된 경험', '행동·결과·배운 점·학생 확인', '기존 실제 경험을 추가하되 가정 답변은 제외한다.'],
  ['writing', '글 작성·수정·저장', '수업설계LAB / AI자소서 연결 대기', '자소서·면담', 'AI 미연결 상태에서는 수동 작성과 규칙 기반 질문을 사용합니다.', '문항·직무·분량과 확인 사실을 선택해 V1 작성, 점검, 수정, V2 저장한다.', 'V1·V2와 확인표', '학생 원문 보존·사실 확인·학생 검토·저장', '전원 개인 면담이 아니라 자기·짝 점검으로 진행할 수 있다.'],
  ['closing', '다음 실행·마감', '플래너', '모의면접·후속계획', '수업 후 다음 7일에 할 일을 정하세요.', '다음 실행과 도움 요청을 기록하고 자료를 내보낸다.', '다음 실행 계획', '날짜·첫 행동·확인 방법', '추가 면담은 후속 일정으로 분리한다.'],
  ['break', '휴식', '', '', '휴식 시간은 교육 시간과 구분합니다.', '쉬고 다음 자료를 준비한다.', '', '휴식 포함 총합 확인', '면담 예약과 겹치지 않도록 한다.'],
];
const DAY: Record<string, number[]> = { '180': [10,20,15,25,15,25,10,40,10,10], '240': [10,30,20,35,20,40,15,50,10,10], '300': [10,40,25,45,25,50,20,55,10,20] };
export function buildAgenda(c: Course): AgendaRow[] {
  let source: { phase: string[]; minutes: number; session: number }[] = [];
  if (c.period === 'day') {
    if (c.preset === '300-counseling') {
      source = [10,25,15,35,15,35,10].map((minutes,i) => ({ phase: PHASES[i], minutes, session: 0 }));
      source.push({ phase: [...PHASES[7].slice(0),], minutes: 35, session: 0 }); source.at(-1)!.phase[0] = 'v1'; source.at(-1)!.phase[1] = T('V1 작성');
      source.push({ phase: ['consult', T('면담 순환'), '수업설계LAB', T('자소서·면담'), T('예약 학생은 면담, 대기 학생은 질문·근거 준비, 마친 학생은 수정합니다.'), T('공유된 V1의 실제 행동을 구체화하고 추가 사실을 확인한다.'), T('면담 메모와 사실 후보'), T('면담 완료와 글 완료는 다르다.'), T('수용량이 부족하면 후속 면담 또는 상담자를 추가한다.')], minutes: 60, session: 0 });
      source.push({ phase: ['revise', T('V2 수정·저장'), ...PHASES[7].slice(2)], minutes: 25, session: 0 }, { phase: PHASES[8], minutes: 15, session: 0 }, { phase: PHASES[9], minutes: 20, session: 0 });
    } else source = (DAY[c.preset] ?? DAY['180']).map((minutes,i) => ({ phase: [...PHASES[i]], minutes, session: 0 }));
    if(c.preset==='180') {
      const writing=source.find((x)=>x.phase[0]==='writing');
      if(writing)writing.phase[5]=T('V1 작성 20분 → 자기·짝 점검 8분 → 수정·저장 12분. 전원 개인 면담이 아닙니다.');
    }
  } else {
    // Calendar length is not instructional duration. Every scheduled meeting has its own real minutes.
    const plans = c.sessions >= 8
      ? [[0,1,2],[3],[3,4],[5],[5,6],[7],[10],[11,8]]
      : [[0,1,2],[3,4],[5,6,7],[10,11,8]];
    for (let session = 0; session < c.sessions; session++) {
      const seq = plans[Math.min(session,plans.length-1)], available = c.sessionMinutes - 10;
      let remaining = available;
      seq.forEach((p,i) => {
        const minutes = i === seq.length-1 ? remaining : Math.floor(available/seq.length); remaining -= minutes;
        const phase = p === 10 ? ['consult', T('면담 순환'), '수업설계LAB', T('자소서·면담'), ...PHASES[7].slice(4)] : p === 11 ? ['revise', T('V2 수정·모의면접 선택'), ...PHASES[7].slice(2)] : PHASES[p];
        source.push({ phase, minutes, session });
      });
      source.push({ phase: PHASES[9], minutes: 10, session });
    }
  }
  // Put breaks between learning stages, never inside a student's counseling booking.
  const br = source.findIndex((x) => x.phase[0] === 'break' && x.session === 0);
  if (br >= 0 && c.period === 'day') { const [rest] = source.splice(br,1); source.splice(Math.min(6,source.length),0,rest); }
  if (c.testMinutes > 0) source.unshift({ phase: ['test', T('현장 검사 · 별도 추가'), T('외부 검사'), T('검사 프로그램'), T('검사 종류와 실제 시행 시간을 확인합니다.'), T('동의한 검사를 시행한다.'), T('원본 결과지'), T('기본 수업 시간과 별도 합산'), T('검사 미실시 시 관심 탐색으로 진행')], minutes: c.testMinutes, session: 0 });
  const clock = new Map<number,number>();
  return source.map(({phase,minutes,session}, i) => {
    const start = clock.get(session) ?? session*1440; clock.set(session,start+minutes);
    return { id: `${phase[0]}-${session}-${i}`, phase: displayAppText(phase[1]), minutes, start, end: start+minutes, session,
      program: displayAppText(phase[2]), screen: displayAppText(phase[3]), teacher: displayAppText(phase[4]), student: displayAppText(phase[5]), deliverable: displayAppText(phase[6]), completion: displayAppText(phase[7]), alternative: displayAppText(phase[8]) };
  });
}
export function courseStats(c: Course) {
  const a=buildAgenda(c), breaks=a.filter((x)=>x.id.startsWith('break')).reduce((t,x)=>t+x.minutes,0);
  const total=a.reduce((t,x)=>t+x.minutes,0);
  return { instruction: total-breaks-c.testMinutes, breaks, test:c.testMinutes, total, sessions:c.period==='day'?1:c.sessions };
}
export function formatOffset(offset: number, course?: Course) {
  const day = Math.floor(offset/1440), local=offset%1440;
  const [h,m]=(course?.startTime ?? '09:00').split(':').map(Number), value=h*60+m+local;
  return `${T('{0}회차',day+1)} ${formatNumber(Math.floor(value/60)%24).padStart(2,'0')}:${formatNumber(value%60).padStart(2,'0')} · UTC`;
}
