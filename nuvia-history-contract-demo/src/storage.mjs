import {validateRun} from './contracts.mjs';
export const KEY='nuviaHistory.contractDemo.v1';
export function load(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v){validateRun(v);return v;}}catch(e){console.warn('DEMO_RESTORE_FAILED',e)}return null;}
export function save(run){validateRun(run);localStorage.setItem(KEY,JSON.stringify(run));return run;}
