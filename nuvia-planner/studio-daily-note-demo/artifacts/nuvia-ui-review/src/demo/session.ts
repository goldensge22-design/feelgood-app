import {AUDIENCES, audienceFrom, type Audience} from './audiences';
import {createStudio, updateStudio} from '../studio/studio-logic';
import {installAssessment} from '../studio/insights';
import {demoAssessmentEnvelope} from './assessment';
import type {PersonalState} from '../studio/model';

// A presentation route, not an authentication or authorization boundary.
export const demoAudience = audienceFrom(typeof location==='undefined'?'':location.search);
// Do not rewrite prior K-PASS fixtures, scores, history or active timers.
// A new external-only space keeps those original bytes untouched.
export const previousDemoStorageKey = (audience:Audience) => `nuvia:studio:external-demo:v1:${audience}`;
export const demoStorageKey = (audience:Audience) => `nuvia:studio:external-demo:dcas:v1:${audience}`;
export function createDemo(audience:Audience, at = new Date().toISOString()):PersonalState {
 const config = AUDIENCES[audience];
 let state = createStudio(at);
 state = updateStudio(state, {type:'studio.setup',stage:config.stage}, at);
 // Explicit entry CTA selects a synthetic example. Never copy personal/review storage.
 installAssessment(state, demoAssessmentEnvelope(audience), 'example', at);
 state = updateStudio(state, {
  type:'create', title:config.taskTitle, subject:config.subject, activity:config.activity,
  minutes:25, timeChosen:false, activityExplicit:false, scopeChosen:false,
 }, at);
 state.onboarding = true;
 return state;
}
