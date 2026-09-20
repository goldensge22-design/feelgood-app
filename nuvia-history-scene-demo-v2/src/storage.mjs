import {validateRun} from './contracts.mjs';
export const KEY='nuviaHistory.contractDemo.v1';
const pathKey=path=>`${KEY}.${path}`;
export function load(path='attention'){try{const v=JSON.parse(localStorage.getItem(pathKey(path))||'null');if(v){validateRun(v);return v;}}catch(e){console.warn('DEMO_RESTORE_FAILED',e)}return null;}
export function save(run){validateRun(run);localStorage.setItem(pathKey(run.path),JSON.stringify(run));return run;}
