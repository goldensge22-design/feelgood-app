import { T } from '@/i18n/tx';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="font-mono text-sm text-[hsl(var(--sidebar-primary))]">404</div>
      <h1 className="mt-2 text-2xl font-bold">{T("이 페이지는 수업 계획에 없습니다")}</h1>
      <Link href="/" className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-home">{T("대시보드로")}</Link>
    </div>
  );
}
