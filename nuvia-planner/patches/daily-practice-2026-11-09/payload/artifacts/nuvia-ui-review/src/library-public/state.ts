import type {PersonalState,Action} from '../studio/model';
import {demoAssessmentEnvelope} from '../demo/assessment';
import type {Audience} from '../demo/audiences';
import {libText} from '../planner-library/i18n';
import {localeOf} from '../studio/i18n/config';

export function publicActionAllowed(action:Action){
 return !action.type.startsWith('assessment.')&&!action.type.startsWith('review.')&&
  !action.type.startsWith('library.')&&action.type!=='stage'&&action.type!=='studio.setup'&&
  !(action.type==='legacy'&&['profile','assessment','student','role','stage'].includes(action.command.type));
}
// Backup upload is not an assessment intake: only this synthetic audience's
// original assessment may be restored. Workspace ownership is checked separately.
export function validatePublicState(state:PersonalState,audience:Audience){
 const expected=demoAssessmentEnvelope(audience);
 const labAssessment={...structuredClone(expected.assessment),subjectId:'student-a',assessmentId:'synthetic-student-a'};
 const sources=[...(state.insights?.sources??[]),...Object.values(state.insights?.contexts??{}).flatMap(c=>c.source?[c.source]:[])];
 if(state.mode!=='personal'||state.lab.students[state.studentId].stage!==(audience==='school'?'middle':'adult')||
  Object.keys(state.studio?.libraryAttachments??{}).length||
  sources.length===0||sources.some(source=>source.mode!=='example'||
   JSON.stringify(source.assessment)!==JSON.stringify(expected.assessment))||
  !state.insights?.source||JSON.stringify(state.insights.source.assessment)!==JSON.stringify(expected.assessment)||
  JSON.stringify(state.lab.students[state.studentId].assessment)!==JSON.stringify(labAssessment)||
  state.assessmentHistory.some(h=>h.assessment!==null&&JSON.stringify(h.assessment)!==JSON.stringify(labAssessment))){
  throw Error(libText(localeOf(state),'unavailable'));
 }
 for(const a of Object.values(state.studio?.practice?.attachments??{})){
  if(a.stage!==labAssessment.educationStage||a.basis==='result'&&JSON.stringify(a.source)!==JSON.stringify(labAssessment))throw Error(libText(localeOf(state),'unavailable'));
 }
 return state;
}
