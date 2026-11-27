import { useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { I18nProvider, useI18n } from '@/i18n';
import { FamilyShell } from '@/components/shell';
import TodayPage from '@/pages/today';
import PlannerPage from '@/pages/planner';
import HistoryPage from '@/pages/history';
import StoryPage from '@/pages/story';
import WeeklyPage from '@/pages/weekly';
import ReviewPage from '@/pages/review';
import TeacherPage from '@/pages/teacher';
import LoginPage from '@/pages/login';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true } } });

function Missing() {
  const { t } = useI18n();
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-3xl font-bold">{t('nf.title')}</h1>
      <Link href="/" className="tap mt-6 inline-flex items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
        {t('nf.back')}
      </Link>
    </div>
  );
}

function Router() {
  const [loc] = useLocation();
  const { t } = useI18n();
  useEffect(() => {
    const key = loc === '/planner' ? 'nav.planner' : loc === '/history' ? 'nav.history' : loc === '/story' ? 'nav.story' : loc === '/weekly' ? 'weekly.title' : loc === '/teacher' ? 'teacher.title' : loc === '/review' ? 'review.title' : loc === '/login' ? 'login.title' : 'nav.today';
    document.title = `${t(key)} · MY NUVIA`;
  }, [loc, t]);
  if (loc === '/teacher' || loc.startsWith('/teacher/')) {
    return (
      <RoutedErrorBoundary>
        <TeacherPage />
      </RoutedErrorBoundary>
    );
  }
  return (
    <FamilyShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={TodayPage} />
          <Route path="/planner" component={PlannerPage} />
          <Route path="/history" component={HistoryPage} />
          <Route path="/story" component={StoryPage} />
          <Route path="/weekly" component={WeeklyPage} />
          <Route path="/review" component={ReviewPage} />
          <Route path="/login" component={LoginPage} />
          <Route component={Missing} />
        </Switch>
      </RoutedErrorBoundary>
    </FamilyShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <I18nProvider>
            <Router />
          </I18nProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
