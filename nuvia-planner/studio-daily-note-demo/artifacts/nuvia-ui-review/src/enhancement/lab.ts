import {useLab} from './store';
export type Lab=ReturnType<typeof useLab>;
export const today=()=>new Date().toISOString().slice(0,10);
export const fmt=(s:number)=>{const m=Math.floor(Math.abs(s)/60),x=Math.floor(Math.abs(s)%60);return (s<0?'+':'')+m+':'+String(x).padStart(2,'0');};
