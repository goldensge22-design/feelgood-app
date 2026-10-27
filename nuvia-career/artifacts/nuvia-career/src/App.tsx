import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { koKR, enUS, jaJP, zhCN, zhTW, mnMN, thTH, viVN, arSA, ruRU, esES, frFR, itIT } from '@clerk/localizations';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Switch, useLocation, useSearch, Router as WouterRouter } from 'wouter';
import { kmAuth } from '@/lib/auth-locales/km';
import { azAuth } from '@/lib/auth-locales/az';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { I18nProvider, useI18n } from '@/lib/i18n';
import { WorkspaceProvider } from '@/lib/workspace';
import { AppShell, LanguageSwitcher } from '@/components/shell';
import OverviewPage from '@/pages/overview';
import CriteriaPage from '@/pages/criteria';
import ExperiencesPage from '@/pages/experiences';
import ActivitiesPage from '@/pages/activities';
import QuestionsPage from '@/pages/questions';
import WritePage from '@/pages/write';
import VersionsPage from '@/pages/versions';
import ExportPage from '@/pages/export';
import ConnectionsPage from '@/pages/connections';
import JourneyPage from '@/pages/journey';
import { PUBLIC_DEMO } from '@/lib/public-demo';

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
// Vendor dictionaries are used as delivered, not regenerated. Clerk ships no
// Khmer or Azerbaijani dictionary, so km/az use NUVIA machine-draft dictionaries
// (src/lib/auth-locales) layered over enUS. Review pending; not native-reviewed.
const authLocales = { ko: koKR, en: enUS, ja: jaJP, 'zh-CN': zhCN, 'zh-TW': zhTW, mn: mnMN, th: thTH, vi: viVN, ar: arSA, ru: ruRU, es: esES, fr: frFR, it: itIT, km: kmAuth, az: azAuth };

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(21 90% 41%)',
    colorForeground: 'hsl(222 40% 14%)',
    colorMutedForeground: 'hsl(220 14% 40%)',
    colorDanger: 'hsl(356 70% 44%)',
    colorBackground: 'hsl(210 40% 99.5%)',
    colorInput: 'hsl(216 28% 97%)',
    colorInputForeground: 'hsl(222 40% 14%)',
    colorNeutral: 'hsl(222 30% 30%)',
    fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
    borderRadius: '0.625rem',
  },
  elements: {
    rootBox: '!min-w-0 !w-full !max-w-full flex justify-center',
    cardBox: 'bg-[hsl(210_40%_99.5%)] rounded-2xl !w-full !max-w-[440px] min-w-0 overflow-hidden border border-[hsl(218_24%_88%)] shadow-lg',
    card: '!min-w-0 !w-full !max-w-full !px-5 sm:!px-8 !shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[hsl(222_40%_14%)] font-bold',
    headerSubtitle: 'text-[hsl(220_14%_40%)]',
    socialButtonsBlockButtonText: 'text-[hsl(222_40%_14%)] font-medium',
    formFieldLabel: 'text-[hsl(222_40%_14%)] font-medium',
    footerActionLink: 'text-[hsl(214_80%_42%)] font-semibold',
    footerActionText: 'text-[hsl(220_14%_40%)]',
    dividerText: 'text-[hsl(220_14%_40%)]',
    identityPreviewEditButton: 'text-[hsl(214_80%_42%)]',
    formFieldSuccessText: 'text-[hsl(158_62%_30%)]',
    alertText: 'text-[hsl(222_40%_14%)]',
    logoBox: 'h-10 justify-center',
    logoImage: 'h-10',
    socialButtonsBlockButton: 'min-h-11 border border-[hsl(218_22%_84%)] bg-white/60',
    formButtonPrimary: 'min-h-11 bg-[hsl(21_90%_41%)] text-white font-semibold',
    formFieldInput: 'min-h-11 border-[hsl(218_20%_82%)]',
    footerAction: 'justify-center',
    dividerLine: 'bg-[hsl(218_22%_87%)]',
    alert: 'border border-[hsl(356_70%_44%/0.3)]',
    otpCodeFieldInput: 'border-[hsl(218_20%_82%)]',
    formFieldRow: 'gap-3',
    main: 'gap-5',
  },
};

function AuthFrame({ children }: { children: ReactNode }) {
  const { t, dir } = useI18n();
  return (
    <div className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" dir="ltr">
      <aside className="header-glow relative hidden min-w-0 flex-col justify-between p-10 text-white lg:flex" dir={dir}>
        <Link href="/" className="font-display text-lg font-bold tracking-[0.14em]">NUVIA</Link>
        <div className="max-w-md">
          <p className="eyebrow text-amber-300">FeelGood</p>
          <h1 className="mt-3 text-3xl font-bold leading-snug">{t('auth.heroTitle')}</h1>
          <p className="mt-4 text-white/70">{t('auth.heroBody')}</p>
        </div>
        <p className="text-xs text-white/50">{t('auth.heroFoot')}</p>
      </aside>
      <div className="flex min-w-0 flex-col" dir={dir}>
        <div className="flex min-w-0 items-center justify-between gap-2 p-4" dir="ltr">
          <Link href="/" className="tap inline-flex items-center text-sm text-muted-foreground hover:text-foreground" data-testid="link-auth-back">{t('auth.back')}</Link>
          <LanguageSwitcher onDark={false} />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-4 pb-10">{children}</div>
      </div>
    </div>
  );
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  const search = useSearch();
  if (!PUBLIC_DEMO && isLoaded && isSignedIn && !new URLSearchParams(search).has('view')) return <Redirect to="/experiences" />;
  return <OverviewPage />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function AppRoutes() {
  const { userId, isLoaded } = useAuth();
  return (
    <WorkspaceProvider key={PUBLIC_DEMO ? 'public-demo' : !isLoaded ? 'pending' : userId ?? 'public'}>
      <AppShell>
        <RoutedErrorBoundary>
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/experiences" component={ExperiencesPage} />
            <Route path="/criteria" component={CriteriaPage} />
            <Route path="/questions" component={QuestionsPage} />
            <Route path="/write" component={WritePage} />
            <Route path="/versions" component={VersionsPage} />
            <Route path="/export" component={ExportPage} />
            <Route path="/journey" component={JourneyPage} />
            <Route path="/connections" component={ConnectionsPage} />
            <Route path="/activities" component={ActivitiesPage} />
            <Route component={NotFound} />
          </Switch>
        </RoutedErrorBoundary>
      </AppShell>
    </WorkspaceProvider>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  const { t, locale } = useI18n();
  const authLocale = authLocales[locale];
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        ...authLocale,
        signIn: { ...authLocale.signIn, start: { ...authLocale.signIn?.start, title: t('auth.signInTitle'), subtitle: t('auth.signInSub') } },
        signUp: { ...authLocale.signUp, start: { ...authLocale.signUp?.start, title: t('auth.signUpTitle'), subtitle: t('auth.signUpSub') } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/sign-in/*?">{PUBLIC_DEMO ? <Redirect to="/" /> : <SignInPage />}</Route>
            <Route path="/sign-up/*?">{PUBLIC_DEMO ? <Redirect to="/" /> : <SignUpPage />}</Route>
            <Route component={AppRoutes} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <WouterRouter base={`${basePath}${PUBLIC_DEMO ? '/demo' : ''}`}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </I18nProvider>
  );
}

export default App;
