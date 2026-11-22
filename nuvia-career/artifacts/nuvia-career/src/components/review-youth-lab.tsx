import { useState } from 'react';
import { Link } from 'wouter';
import { loadJSON, saveJSON } from '@/lib/career';
import { useI18n } from '@/lib/i18n';
import { REVIEW_ROLES, type ReviewRoleId } from '@/lib/review-everyday-model';
import { useEveryday } from '@/lib/review-everyday-store';
import { presentHomeReport, reviewHomeFixture } from '@/lib/review-home-profile';
import { reviewHomeAction } from './review-home';

export function ReviewYouthLab({onSave}:{onSave:(id:ReviewRoleId)=>boolean}) {
  const {t,locale}=useI18n();
  const {value}=useEveryday();
  const [selected,setSelected]=useState(()=>loadJSON<ReviewRoleId>('review:youth-career-draft:v1'));
  const [failed,setFailed]=useState(false);
  const jobs=presentHomeReport(reviewHomeFixture(value.choice.trait,value.choice.focus)).topJobs;
  const chosen=REVIEW_ROLES.find(role=>role.id===selected);
  return <div className="mx-auto max-w-4xl space-y-4" data-testid="view-review-youth-lab">
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">{t('audience.career')}</h1>
      <p className="text-sm">{t('audience.youthLabIntro')}</p>
      <p className="text-sm text-muted-foreground">{t('audience.youthSource')}</p>
    </header>
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 font-bold">{t('audience.youthChoice')}</legend>
      {jobs.map(job=>{
        const role=REVIEW_ROLES.find(item=>item.id===job.reviewRole);
        if(!role)return null;
        const need=role.needs[0];
        return <label key={job.id} lang="ko" className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-white p-3 has-[:checked]:border-blue has-[:checked]:bg-blue-soft" data-testid={`card-review-career-${role.id}`}>
          <input type="radio" value={role.id} name="review-career" checked={selected===role.id} onChange={()=>{
            setSelected(role.id);
            setFailed(!saveJSON('review:youth-career-draft:v1',role.id));
          }} className="mt-1 h-5 w-5 shrink-0"/>
          <span className="space-y-1">
            <strong className="block">{job.title}</strong>
            <span className="block text-sm font-semibold text-blue">{need.keyword}</span>
            <span className="block text-sm text-muted-foreground">{need.reason}</span>
          </span>
        </label>;
      })}
    </fieldset>
    {failed&&<p role="alert" className="text-sm text-destructive">{t('daily.failed')}</p>}
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={`${reviewHomeAction} disabled:opacity-50`} disabled={!chosen} onClick={()=>{
        if(chosen&&(!saveJSON('review:youth-career-draft:v1',chosen.id)||!onSave(chosen.id)))setFailed(true);
      }} data-testid="button-review-career-save">{t('audience.youthSave')}</button>
      <Link href="/planner" className="inline-flex min-h-11 items-center px-2 font-semibold text-blue underline" data-testid="link-review-career-activity">{t('audience.activity')}</Link>
    </div>
    {locale!=='ko'&&<p className="text-xs text-muted-foreground">The fictional career examples are in Korean.</p>}
  </div>;
}
