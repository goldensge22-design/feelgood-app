import { currentLocale } from '../studio/i18n/runtime';
import { publicLibrary } from '../library-public/policy';
import { ko } from './ko';

export default function ReviewLink() {
  const review = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1';
  if (!review || currentLocale() !== 'ko' || publicLibrary) return null;
  return (
    <a className="st-link" data-testid="link-timed-decision-review" href={`${import.meta.env.BASE_URL}timed-decision.html?review=1`}>
      {ko.reviewLink}
    </a>
  );
}
