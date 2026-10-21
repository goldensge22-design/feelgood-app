export function keyFor(s:string):string;
export function transformStudio(code:string,file:string,collect?:((key:string,text:string,file:string,offset:number)=>void),compile?:boolean):string;
export default function studioI18n():import('vite').Plugin;
