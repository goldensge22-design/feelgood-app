// Comparison-only, disposable in-frame storage. Never reads or writes a student's records.
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('compare') !== '1') return;
  const scene = params.get('scene') || 'entry';
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const now = Date.now();
  const iso = ms => new Date(ms).toISOString();
  const block = (startTime, minutes) => ({
    startTime, phase: 'ready', segments: [], runningSince: '', endedAt: '',
    completed: null, covered: '', nextStart: '', comparison: '',
    prepared: false, chosenStepId: '', availableUntil: '',
    handoffNote: '', budgetMinutes: minutes,
  });
  const specs = [
    ['math', '수학 문제집 1~20번', '수학', '문제집 1~20번', 10, '16:00'],
    ['korean', '국어 독서 기록 정리', '국어', '읽은 내용 세 문장', 25, '16:10'],
    ['english', '영어 단어 35개 복습', '영어', '교재 3쪽까지', 35, '16:35'],
    ['science', '과학 실험 보고서 초안', '과학', '관찰 결과와 결론', 45, '17:10'],
  ];
  const tasks = specs.map(([id, title, subject, scope, minutes, startTime]) => ({
    id: `compare-${id}`, title, subject, learningScope: scope,
    domain: '학습', date, minutes, owner: '나', dependsOn: '', waiting: false,
    focusRoute: 'subject_scope', routeConfirmed: false, remainingScope: '',
    nextTenAction: '', steps: [{ id: `compare-step-${id}`, title: scope, done: false, date: '' }],
    materials: [], status: 'planned', resumeNote: '', startedAt: '', completedAt: '',
    actualMinutes: null, help: 'none', adjustment: '', timeBlock: block(startTime, minutes),
  }));
  if (scene === 'empty') tasks.length = 0;
  if (scene === 'long') tasks[0].title = '수학 문제집의 긴 제목도 끝까지 확인하기 · 1단원부터 4단원까지 여러 문장으로 적은 실제 과제 이름';
  function paused(task) {
    task.status = 'paused';
    task.startedAt = iso(now - 600000);
    task.resumeNote = '11번 문제부터';
    task.nextTenAction = '11번 문제 풀기';
    task.timeBlock.phase = 'paused';
    task.timeBlock.segments = [{ start: iso(now - 600000), end: iso(now - 420000) }];
    task.timeBlock.nextStart = '11번 문제부터';
    task.timeBlock.covered = '10번 문제까지';
  }
  function completed(task) {
    task.status = 'done';
    task.startedAt = iso(now - 1800000);
    task.completedAt = iso(now - 600000);
    task.actualMinutes = 20;
    task.steps.forEach(s => { s.done = true; });
    task.timeBlock.phase = 'closed';
    task.timeBlock.completed = true;
    task.timeBlock.covered = task.learningScope;
    task.timeBlock.endedAt = iso(now - 600000);
    task.timeBlock.segments = [{ start: iso(now - 1800000), end: iso(now - 600000) }];
  }
  if (scene === 'running') {
    tasks[0].status = 'active';
    tasks[0].startedAt = iso(now - 60000);
    tasks[0].timeBlock.phase = 'running';
    tasks[0].timeBlock.runningSince = iso(now - 60000);
  } else if (scene === 'paused' || scene === 'return') {
    paused(tasks[0]);
  } else if (scene === 'review') {
    paused(tasks[0]);
    tasks[0].status = 'paused';
    tasks[0].actualMinutes = 3;
    tasks[0].timeBlock.phase = 'review';
    tasks[0].timeBlock.endedAt = tasks[0].timeBlock.segments[0].end;
  } else if (scene === 'report') {
    completed(tasks[0]);
    paused(tasks[1]);
  } else if (scene === 'reordered') {
    [tasks[0], tasks[1]] = [tasks[1], tasks[0]];
    let minute = 16 * 60;
    for (const task of tasks) {
      task.timeBlock.startTime = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      minute += task.minutes;
    }
  }
  const memory = new Map();
  const storage = {
    get length() { return memory.size; },
    key: n => [...memory.keys()][n] || null,
    getItem(k) {
      if (memory.has(k)) return memory.get(k);
      if (k === 'nuvia:desk-color:v1' && scene === 'color') return '#c0d7ed';
      if (k.startsWith('nuvia-planner:2.0:')) {
        return JSON.stringify({
          schemaVersion: '2.0', scope: k.slice('nuvia-planner:2.0:'.length),
          tasks, records: [], dailyCapacity: scene === 'over' ? 60 : 120, weeklyNote: '다음에는 큰 일을 두 번으로 나누어 보기',
        });
      }
      return null;
    },
    setItem(k, v) { memory.set(String(k), String(v)); },
    removeItem(k) { memory.delete(String(k)); },
    clear() { memory.clear(); },
  };
  const session = {
    ...storage,
    getItem(k) {
      const stage = params.get('band');
      const band = ['A', 'B', 'C', 'D'].includes(stage) ? stage : 'B';
      return k === 'nuvia:demo-view'
        ? JSON.stringify({ demo: 1, band, lower: band === 'A' && params.get('lower') === '1' })
        : storage.getItem(k);
    },
  };
  // If a browser disallows replacement, do not boot a frame against real storage.
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
    Object.defineProperty(window, 'sessionStorage', { configurable: true, value: session });
    if (window.localStorage !== storage || window.sessionStorage !== session) throw Error('isolated storage unavailable');
  } catch (error) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.replaceChildren('비교용 저장 공간을 분리하지 못했어요. 이 브라우저에서는 비교를 열지 않습니다.');
    });
    window.addEventListener('error', event => event.preventDefault(), true);
    throw error;
  }
})();