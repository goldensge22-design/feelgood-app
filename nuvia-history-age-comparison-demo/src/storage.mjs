import {validateRun} from './contracts.mjs';
export const KEY='nuviaHistory.ageComparisonDemo.v1';
const pathKey=(path,ageBand)=>`${KEY}.${ageBand}.${path}`;
export function load(path='planning',ageBand='preschool'){try{const v=JSON.parse(localStorage.getItem(pathKey(path,ageBand))||'null');if(v){validateRun(v);return v;}}catch(e){console.warn('DEMO_RESTORE_FAILED',e)}return null;}
export function save(run){validateRun(run);localStorage.setItem(pathKey(run.path,run.ageBand),JSON.stringify(run));return run;}
