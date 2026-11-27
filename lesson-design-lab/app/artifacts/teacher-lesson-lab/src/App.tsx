import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/shell';
import { useApp } from '@/lib/store';
import Dashboard from '@/pages/dashboard';
import Lessons from '@/pages/lessons';
import LessonEditor from '@/pages/lesson-editor';
import Worksheets from '@/pages/worksheets';
import WorksheetDetail from '@/pages/worksheet-detail';
import Students from '@/pages/students';
import Cards from '@/pages/cards';
import Camp from '@/pages/camp';
import Supports from '@/pages/supports';
import Rules from '@/pages/rules';
import Materials from '@/pages/materials';
import NotFound from '@/pages/not-found';
import StudioCourses from '@/pages/studio/courses';
import StudioResults from '@/pages/studio/results';
import StudioSources from '@/pages/studio/sources';
import StudioAgenda from '@/pages/studio/agenda';
import StudioLive from '@/pages/studio/live';
import StudioPrint from '@/pages/studio/print';
import StudioWriting from '@/pages/studio/writing';
import StudioInterview from '@/pages/studio/interview';
import StudioStatus from '@/pages/studio/status';
import { teacherOnly } from '@/pages/studio/guard';

const GLessons = teacherOnly(Lessons), GLessonEditor = teacherOnly(LessonEditor), GStudents = teacherOnly(Students), GMaterials = teacherOnly(Materials), GCards = teacherOnly(Cards);

function Router(_props: { lang: string }) {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/lessons" component={GLessons} />
          <Route path="/lessons/:id" component={GLessonEditor} />
          <Route path="/worksheets" component={Worksheets} />
          <Route path="/worksheets/:id" component={WorksheetDetail} />
          <Route path="/students" component={GStudents} />
          <Route path="/materials" component={GMaterials} />
          <Route path="/cards" component={GCards} />
          <Route path="/camp" component={Camp} />
          <Route path="/supports" component={Supports} />
          <Route path="/rules" component={Rules} />
          <Route path="/studio" component={StudioCourses} />
          <Route path="/studio/results" component={StudioResults} />
          <Route path="/studio/sources" component={StudioSources} />
          <Route path="/studio/agenda" component={StudioAgenda} />
          <Route path="/studio/live" component={StudioLive} />
          <Route path="/studio/print" component={StudioPrint} />
          <Route path="/studio/writing" component={StudioWriting} />
          <Route path="/studio/interview" component={StudioInterview} />
          <Route path="/studio/status" component={StudioStatus} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  // Subscribing here re-renders (never remounts) the whole tree on language change, so T() re-reads the
  // active dictionary while routes, open dialogs and unsaved form drafts keep their state.
  const lang = useApp((s) => s.lang);
  return (
    <>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router lang={lang} />
      </WouterRouter>
      <Toaster />
    </>
  );
}

export default App;
