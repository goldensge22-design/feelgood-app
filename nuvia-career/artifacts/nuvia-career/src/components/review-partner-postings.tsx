import { BriefcaseBusiness, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { approvedPublicPartnerPostings, matchingPartnerPosting, officialHttps, partnerCalendarDate, partnerPostingStatus, partnerWatchlist } from '@/lib/review-partner-postings';
import { validDailyDate } from '@/lib/review-daily-model';
import { publicSourceRef, recordReviewAction } from '@/lib/review-trail';

export default function ReviewPartnerPostings({onExplore}:{onExplore:(recruiter:string,role:string)=>void}) {
  const {t}=useI18n();
  const today=partnerCalendarDate();
  return <section className="space-y-3 rounded-xl border border-[#F4A418]/45 bg-[#fff8eb] p-4 sm:p-5" data-testid="view-partner-postings">
    <h1 className="flex items-center gap-2 text-xl font-bold"><BriefcaseBusiness className="h-5 w-5 shrink-0 text-[#805100]" aria-hidden/>{t('daily.partners.title')}</h1>
    <div className="space-y-1 text-sm leading-relaxed text-slate-700" data-testid="text-partner-hiring-notice">
      <h2 className="font-semibold">{t('daily.partners.hiringTitle')}</h2>
      <p>{t('daily.partners.hiringNotice')}</p>
    </div>
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {partnerWatchlist.map(site=>{
        const posting=approvedPublicPartnerPostings.find(p=>matchingPartnerPosting(site,p) && validDailyDate(p.checkedOn));
        const status=partnerPostingStatus(posting,today);
        const trace={siteId:site.id,company:site.recruiter,postingRef:publicSourceRef(posting?.sourceUrl??''),checkedOn:posting?.checkedOn??'',status};
        const fields=[
          [t('daily.partners.site'),site.site],
          [t('daily.partners.service'),site.service],
          [t('daily.partners.role'),posting?.role],
          [t('daily.partners.region'),posting?.region],
          [t('daily.partners.shift'),posting?.schedule],
          [t('daily.lab.required'),posting?.required],
          [t('daily.lab.preferred'),posting?.preferred],
          [t('daily.lab.posted'),posting?.postedOn],
          [t('daily.lab.deadline'),posting?.ongoing?t('daily.partners.ongoing'):posting?.closesOn],
          [t('daily.lab.source'),posting?.sourceUrl],
          [t('daily.lab.check'),posting?.checkedOn],
        ];
        return <li className="min-w-0 rounded-xl border border-[#eddbb7] bg-white p-3" key={site.id} data-testid={`card-partner-${site.id}`}>
          <h2 className="break-words text-sm font-bold">{site.label}</h2>
          <p className="mt-1 text-xs text-slate-700" data-testid="text-partner-recruiter">{t('daily.partners.recruiter')}: <strong>{site.recruiter}</strong></p>
          <p className="mt-2" data-testid="text-partner-status"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${status==='open'?'bg-blue-soft text-blue':'bg-[#fff3db] text-[#714700]'}`}>{t(`daily.partners.${status}`)}</span></p>
          {posting&&<p className="mt-2 text-xs text-slate-600" data-testid="text-partner-checked">{t('daily.lab.check')} {posting.checkedOn} · {t('daily.partners.recheck')}</p>}
          <details className="mt-2 border-t border-slate-100" onToggle={e=>{if(e.currentTarget.open)recordReviewAction('lab.partner.detail-opened',posting?'public-partner-posting':'unverified-watchlist',trace);}}>
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-blue">{t('daily.partners.details')}</summary>
            <dl className="space-y-1 text-xs text-slate-700">{fields.map(([label,value])=>
              <div key={label} className="break-words"><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap [overflow-wrap:anywhere]">{value||t('daily.lab.none')}</dd></div>)}</dl>
          </details>
          <div className="flex flex-wrap gap-x-3">
            {posting&&<a className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-blue underline"
              href={officialHttps(posting.sourceUrl) ?? undefined} target="_blank" rel="noreferrer" onClick={()=>recordReviewAction('lab.partner.open-attempt','public-partner-posting',trace)}>{t('daily.partners.origin')}<ExternalLink className="h-4 w-4" aria-hidden/></a>}
            <button type="button" className="min-h-11 text-start text-sm font-semibold text-blue underline"
              onClick={()=>{recordReviewAction('lab.partner.explore','partner-list',trace);onExplore(site.recruiter,[site.site,site.service].filter(Boolean).join(' '));}} data-testid="button-partner-explore">
              {t('daily.partners.find')}
            </button>
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
