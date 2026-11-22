const root = document.getElementById('root')!;
function reportFailure() {
  root.dataset.reviewStudio = 'failed';
  root.replaceChildren(Object.assign(document.createElement('p'), {
    textContent: '작업대를 열지 못했어요. 이 탭에서 다시 열어 주세요. 작성한 내용은 지우지 않았어요.',
  }));
  root.firstElementChild?.setAttribute('role', 'alert');
  if (window.parent !== window) window.parent.postMessage({ type: 'nuvia-career-studio', status: 'failed' }, location.origin);
}
// This module stays small so it can surface a failed planner bundle or an optimization error.
void import('./review-studio-main').catch(reportFailure);
