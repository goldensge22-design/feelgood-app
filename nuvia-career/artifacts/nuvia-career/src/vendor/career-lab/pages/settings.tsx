import { Download, Trash2, FlaskConical, ShieldAlert, PlugZap, RotateCcw } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { RECOMMENDATION_NOTICE } from '@/vendor/career-lab/lib/recommendation-policy';
import { gradeLabel, type Grade } from '@/vendor/career-lab/lib/types';
import { PageHeader, Panel, Confirm, Tag } from '@/vendor/career-lab/components/lab/ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { useToast } from '@/vendor/career-lab/hooks/use-toast';
import { cn } from '@/vendor/career-lab/lib/utils';
import { useLocale, localeExportMetadata } from '@/vendor/career-lab/lib/locale';
import { formatMessage } from '@/vendor/career-lab/lib/i18n-runtime';
import { LanguageSettings } from '@/vendor/career-lab/components/lab/language-controls';

const CHECKLIST = [
  '계정·로그인', '검사 결과', '관심사', '분야·학과', '플래너', '경험 기록', '첨부 파일', '진로 지도', '나의 이야기', '버전 기록', '근거 연결', '내보내기', '삭제',
];

const ok = (r: unknown) => r !== false;

export default function Settings() {
  const { state: s, update, mode, setMode, resetUser, resetDemo, lastSaved } = useLab();
  const { toast } = useToast();
  const locale = useLocale();
  const { requestedLocale } = locale;
  const demo = mode === 'demo';
  const exportJson = () => {
    try {
      const payload = { app: 'career-lab', mode, kind: demo ? 'demo-example' : 'local-temporary-draft', serverSynced: false, locale: localeExportMetadata(requestedLocale, s.story.writingLanguage), exportedAt: new Date().toISOString(), note: demo ? '가상 예시 데이터입니다.' : '서버에 저장되지 않은 브라우저 임시 초안입니다.', state: s };
      const b = new Blob([JSON.stringify({...payload,recommendationNotice:locale.t(RECOMMENDATION_NOTICE)}, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = formatMessage('진로탐색LAB_{0}.json', [locale.t(demo ? '예시' : '임시초안')]); a.click(); URL.revokeObjectURL(a.href);
    } catch { toast({ title: '파일을 만들지 못했어요', description: '브라우저가 다운로드를 막았을 수 있어요.', variant: 'destructive' }); }
  };
  const doResetUser = () => {
    if (ok(resetUser() as unknown)) toast({ title: '이 브라우저의 임시 초안을 삭제했어요', description: '예시 체험 데이터는 그대로예요.' });
    else toast({ title: '삭제하지 못했어요', description: '브라우저 설정에서 사이트 데이터를 직접 지워 주세요.', variant: 'destructive' });
  };
  const doResetDemo = () => {
    if (ok(resetDemo() as unknown)) toast({ title: '예시를 처음 상태로 되돌렸어요', description: '임시 초안은 그대로예요.' });
    else toast({ title: '예시를 초기화하지 못했어요', description: '브라우저 저장소가 막혀 있을 수 있어요.', variant: 'destructive' });
  };
  return (
    <div className="max-w-3xl">
      <PageHeader title="설정·데이터" desc="연결 상태, 저장 위치, 예시 체험과 이 브라우저의 기록 관리." />
      <div className="space-y-6">
        <Panel tone="teal" title="기존 서버 연결 대기 중" hint="결과·플래너·이야기·AI는 운영 중인 기존 서버와 나중에 연결될 예정이에요.">
          <ul className="list-disc space-y-1.5 pl-5 text-sm" data-testid="text-architecture">
            <li>실제 연동은 담당 개발자가 나중에 진행해요. 이 화면은 그 전까지 쓰는 <b>임시 작성 공간</b>이에요.</li>
            <li>서버 주소, 로그인 방식, 데이터 형식은 아직 정해지지 않았어요. 그래서 여기에는 서버 설정 항목을 두지 않아요.</li>
            <li>서버 저장·불러오기·AI 요청은 모두 <b>연결 대기</b> 상태예요. 지금은 어떤 기록도, AI 요청도 외부로 전송되지 않아요.</li>
            <li>로그인된 사용자가 없어요. 여기서 쓴 내용이 서버 계정으로 옮겨지거나 자동 업로드되지 않아요.</li>
          </ul>
        </Panel>

        <Panel title="연동 체크리스트" hint="기존 서버와 연결해야 할 항목. 현재 모두 대기 상태예요.">
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="list-integration">
            {CHECKLIST.map(c => (
              <li key={c} className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
                <span>{c}</span><Tag tone="outline"><PlugZap className="h-3 w-3" />연결 대기</Tag>
              </li>
            ))}
          </ul>
        </Panel>

        <LanguageSettings />

        <Panel title="학년" hint="설명 문구의 깊이를 정하는 값이에요. 모든 기능은 학년과 관계없이 쓸 수 있어요.">
          <div className="flex flex-wrap gap-2">{(['', 'middle', 'high'] as Grade[]).map(g => <button key={g} onClick={() => update(d => { d.grade = g; })} aria-pressed={s.grade === g} className={cn('rounded-full px-5 py-2 text-sm', s.grade === g ? 'bg-foreground text-background' : 'border hover:bg-muted')} data-testid={`button-grade-${g || 'none'}`}>{gradeLabel[g]}</button>)}</div>
        </Panel>

        <Panel title="기록은 어디에 저장되나요?">
          <p className="mb-3 text-sm">지금 보고 있는 공간: <Tag tone={demo ? 'coral' : 'navy'}>{demo ? '예시 체험 (가상 학생)' : '임시 작성 초안'}</Tag>{lastSaved && <span className="ml-2 text-xs text-muted-foreground">브라우저 저장 {lastSaved}</span>}</p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            <li><b>예시 체험</b>과 <b>임시 작성 초안</b>은 서로 다른 저장 칸을 써요. 한쪽을 지워도 다른 쪽은 그대로예요.</li>
            <li>두 공간 모두 <b>이 브라우저에만</b> 남아요. 다른 기기와 동기화되지 않고, 계정별로 나뉘지도 않아요.</li>
            <li>이전에 쓴 기록은 임시 초안으로 그대로 남아 있지만, 서버로 옮겨지지는 않아요.</li>
            <li className="flex gap-1.5 font-semibold text-accent-foreground"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />실명, 연락처, 실제 검사 결과지처럼 민감한 학생 정보는 입력하지 마세요. 같은 브라우저를 쓰는 사람이 볼 수 있어요.</li>
          </ul>
        </Panel>

        <Panel title="예시 체험" hint="가상의 학생 기록이에요. 모두 고쳐 볼 수 있고, 임시 초안과 섞이지 않아요.">
          <div className="flex flex-wrap gap-2">
            {!demo ? <Button variant="outline" onClick={() => setMode('demo')} data-testid="button-enter-demo"><FlaskConical className="h-4 w-4" />예시 체험 시작</Button> : <Button onClick={() => setMode('user')} data-testid="button-exit-demo">예시 나가기 · 연결 대기 공간으로</Button>}
            <Confirm destructive={false} confirmLabel="예시 초기화" title="예시 체험을 처음 상태로 되돌릴까요?" desc="예시 공간에서 바꾼 내용만 지워져요. 임시 작성 초안은 건드리지 않아요." onConfirm={doResetDemo} trigger={o => <Button variant="ghost" onClick={o} data-testid="button-reset-demo"><RotateCcw className="h-4 w-4" />예시 초기화</Button>} />
          </div>
        </Panel>

        <Panel title="내보내기·삭제" hint="모두 이 브라우저 안에서만 일어나요. 서버 기록에는 영향이 없어요.">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson} data-testid="button-export"><Download className="h-4 w-4" />{demo ? '예시 기록' : '임시 초안'} 내보내기 (JSON)</Button>
            <Confirm title="이 브라우저의 임시 작성 초안을 모두 삭제할까요?" desc="임시 초안의 강점·관심사·플래너·회고·이야기·버전이 이 브라우저에서 영구히 지워져요. 되돌릴 수 없어요. 예시 체험 데이터는 지워지지 않아요." confirmLabel="임시 초안 삭제" onConfirm={doResetUser}
              trigger={o => <Button variant="destructive" onClick={o} data-testid="button-delete-all"><Trash2 className="h-4 w-4" />임시 작성 초안 삭제</Button>} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">내보낸 파일은 보관용이에요. 지금은 파일을 다시 불러오거나 서버로 올리는 기능이 없어요.</p>
        </Panel>
      </div>
    </div>
  );
}
