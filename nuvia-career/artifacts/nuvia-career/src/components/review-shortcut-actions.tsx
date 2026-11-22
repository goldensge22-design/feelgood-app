import { useId, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useLocation, useSearch } from 'wouter';
import { useI18n } from '@/lib/i18n';
import { requestReviewInstall, useReviewInstall } from '@/lib/review-install';
import { REVIEW_SHORTCUTS, reviewShortcutBrowser, reviewShortcutHref, type ReviewShortcut } from '@/lib/review-shortcuts';

const base = import.meta.env?.BASE_URL ?? '/';
const buttonClass = 'inline-flex min-h-11 min-w-11 items-center gap-2 rounded-lg border border-blue/20 bg-white px-3 py-2 text-start text-sm font-semibold text-blue hover:bg-blue-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue';
const linkClass = 'inline-flex min-h-11 items-center font-semibold text-blue underline underline-offset-4';

export default function ReviewShortcutActions({ placement, homeOnly=false }: { placement: 'home' | 'planner';homeOnly?:boolean }) {
  const { locale } = useI18n();
  const [path] = useLocation();
  const search = useSearch();
  const { entry, status } = useReviewInstall();
  const initial = new URLSearchParams(search).get('shortcut');
  const [open, setOpen] = useState<ReviewShortcut | null>(initial === placement ? placement : null);
  const [copy, setCopy] = useState<'ok' | 'manual' | null>(null);
  const id = useId();
  const browser = reviewShortcutBrowser(navigator.userAgent, navigator.maxTouchPoints, window.self !== window.top);
  const targets: ReviewShortcut[] = placement === 'home' ? (homeOnly?['home']:['home', 'planner']) : ['planner'];
  const samePage = (target: ReviewShortcut) => path === `/${target}` && entry === target &&
    new URLSearchParams(search).get('shortcut') === target;
  const name = open && REVIEW_SHORTCUTS[open].name;
  const href = open ? `${reviewShortcutHref(base, open)}&lang=${encodeURIComponent(locale)}` : '';
  const ownStatus = open && entry === open ? status : null;
  const external = browser === 'embedded' || window.matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone;

  function show(target: ReviewShortcut) {
    setOpen(target);
    setCopy(null);
    if (browser !== 'embedded' && samePage(target)) void requestReviewInstall(target);
  }
  async function copyLink() {
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) { setCopy('manual'); return; }
    try { await clipboard.writeText(new URL(href, window.location.origin).href); setCopy('ok'); }
    catch { setCopy('manual'); }
  }

  return (
    <section lang="ko" className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-slate-950" aria-label="홈 화면 바로가기" data-testid={`section-review-shortcuts-${placement}`}>
      <div className="flex flex-wrap gap-2">
        {targets.map(target => (
          <button key={target} type="button" className={buttonClass} aria-controls={id}
            aria-expanded={open === target} disabled={ownStatus === 'requesting' && open === target}
            onClick={() => show(target)} data-testid={`button-review-shortcut-${target}`}>
            <Smartphone className="h-4 w-4 shrink-0" aria-hidden />{REVIEW_SHORTCUTS[target].name} 홈 화면에 추가
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-slate-600" data-testid={`text-review-shortcut-storage-${placement}`}>
        검토 기록은 이 기기의 같은 브라우저에 저장돼요. 다른 브라우저·기기와는 자동 동기화되지 않아요.
      </p>
      <div id={id} hidden={!open}>
        {open && <div className="space-y-2 border-t border-slate-200 pt-3 text-sm leading-relaxed text-slate-700" data-testid="panel-review-shortcut">
          <h2 className="font-semibold text-slate-950">{name} 바로가기 추가 방법</h2>
          <p data-testid="text-review-shortcut-destination">{open === 'home' ? 'MY NUVIA 홈' : '플래너 일상기록'}이 열리는 바로가기예요.</p>
          {ownStatus === 'installed' ? (
            <p role="status" data-testid="status-review-shortcut-installed">
              브라우저에서 이 바로가기의 설치 완료를 알렸어요. 다시 추가할 필요는 없어요.
            </p>
          ) : <>
            <div role="status" data-testid="status-review-shortcut">
              {ownStatus === 'requesting' && '브라우저 확인 창에서 추가하거나 취소해 주세요.'}
              {ownStatus === 'accepted' && '브라우저에서 추가를 선택했어요. 홈 화면이나 앱 목록에서 아이콘을 확인해 주세요.'}
              {ownStatus === 'dismissed' && '추가 요청을 취소했어요. 작성 내용은 그대로예요. 나중에 다시 추가할 수 있어요.'}
              {ownStatus === 'failed' && '브라우저 설치 요청을 열지 못했어요. 아래 방법으로 이 페이지를 추가해 보세요.'}
              {ownStatus === 'available' && samePage(open) && browser !== 'embedded' &&
                '위의 ‘홈 화면에 추가’ 버튼을 누르면 브라우저가 최종 확인을 요청해요.'}
            </div>
            {browser === 'embedded' ? (
              <p data-testid="text-review-shortcut-method">앱 안의 브라우저나 미리보기에서는 설치가 제한돼요. 아래 링크를 열거나 주소를 복사한 뒤 Safari 또는 Chrome에 직접 붙여넣어 주세요.</p>
            ) : external ? (
              <p data-testid="text-review-shortcut-method">지금은 앱 창에서 보고 있어요. 이 창만으로 {name}이(가) 따로 설치돼 있는지는 확인할 수 없어요. 이미 추가했다면 기존 아이콘을 사용하고, 아직 없다면 일반 브라우저에서 주소를 열어 추가해 주세요.</p>
            ) : !samePage(open) ? (
              <p data-testid="text-review-shortcut-method">아래에서 전용 페이지를 먼저 열어 주세요. 이 탭에서 열면 작성 중인 기록은 유지돼요.</p>
            ) : (
              <p data-testid="text-review-shortcut-method">
                {browser === 'safari-ios' ? 'Safari에서 공유 → 홈 화면에 추가 → 추가를 눌러 주세요. 메뉴에 없다면 공유 메뉴의 동작 편집에서 찾아보세요.'
                  : browser === 'other-ios' ? '이 브라우저 메뉴에 홈 화면에 추가가 없다면 주소를 복사해 Safari에서 여세요. Safari에서 공유 → 홈 화면에 추가 → 추가를 눌러 주세요.'
                  : browser === 'android' ? '브라우저 메뉴(⋮)에서 홈 화면에 추가를 누르세요. 앱 설치 대신 바로가기 만들기가 보이면 이 페이지 바로가기를 선택하세요.'
                  : '브라우저 메뉴에서 이 페이지 설치 또는 바로가기 만들기를 선택하세요. 메뉴가 없으면 북마크로 저장할 수 있어요.'}
                {' '}이미 추가했다면 기존 아이콘을 사용하세요. 브라우저가 두 앱 설치를 따로 지원하지 않으면 각 페이지를 별도 바로가기 또는 북마크로 추가하세요.
              </p>
            )}
          </>}
          <div className="flex flex-wrap items-center gap-x-4">
            {(external || !samePage(open)) && (
              <a href={href} target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                className={linkClass} data-testid="link-review-shortcut-target">
                {name} {external ? '바로가기 페이지를 새 창에서 열기' : '바로가기 페이지 열기'}
              </a>
            )}
            <button type="button" onClick={() => void copyLink()} className={linkClass} data-testid="button-review-shortcut-copy">바로가기 주소 복사</button>
            <button type="button" onClick={() => setOpen(null)} className="min-h-11 text-slate-600 underline" data-testid="button-review-shortcut-close">안내 닫기</button>
          </div>
          {copy === 'ok' && <p role="status" data-testid="status-review-shortcut-copy">주소를 복사했어요.</p>}
          {copy === 'manual' && <label className="block text-xs">
            아래 주소를 길게 누르거나 선택해서 복사하세요.
            <input readOnly value={new URL(href, window.location.origin).href} onFocus={e => e.currentTarget.select()} data-testid="input-review-shortcut-copy"
              className="mt-1 block min-h-11 w-full rounded-lg border border-slate-200 p-2 text-sm" dir="ltr" />
          </label>}
        </div>}
      </div>
    </section>
  );
}
