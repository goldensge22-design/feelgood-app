import { Component, useEffect, type ReactNode } from 'react';

class ScreenErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Planner preview could not render:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="review-error" role="alert">
          <h2>플래너 화면을 열지 못했어요</h2>
          <p>연결이 잠시 끊겼을 수 있습니다. 다시 시도해 주세요. 계속되면 잠시 후 이 링크를 다시 열어 주세요.</p>
          <button type="button" onClick={() => window.location.reload()}>다시 시도</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ before, previous = false, children }: { before: boolean; previous?: boolean; children: ReactNode }) {
  const comparison = new URLSearchParams(window.location.search).get('compare') === '1'
    && new URLSearchParams(window.location.search).get('student') !== '1';
  useEffect(() => {
    document.documentElement.dataset.nuviaReady = 'true';
    const help = document.getElementById('app-boot-help');
    if (help) help.hidden = true;
  }, []);

  return (
    <>
      {comparison && <div className="review-ribbon" role="note">
        <strong>NUVIA PLANNER · 독립 UI 검토</strong>
        <span>기준: defa19d · 예시 결과 · 정식 제품 아님</span>
        <nav aria-label="화면 비교">
          <a href="./before.html" aria-current={before ? 'page' : undefined}>기존 기준본</a>
          <a href="./previous.html" aria-current={previous ? 'page' : undefined}>이전 후보</a>
          <a href="./" aria-current={!before && !previous ? 'page' : undefined}>새 후보</a>
        </nav>
      </div>}
      <ScreenErrorBoundary>{children}</ScreenErrorBoundary>
    </>
  );
}