import { majorById } from './catalog';
import { productKeywordIn } from './i18n-runtime';
import type { BulkProgram } from './bulk-catalogue';
import type { UniversityProgram } from './universities';

// Programme names, NOT a university's name/homepage or a general country association.
const names: Record<string,{keywords:string[]}> = {
  'm-cs':{keywords:['컴퓨터과학','컴퓨터공학','전산','computing','computer science']},
  'm-stats':{keywords:['통계','데이터과학','데이터사이언스','data science','data analytics','statistics']},
  'm-envsci':{keywords:['환경과학','환경공학','환경학','environmental science','environmental engineering','environmental studies']},
  'm-biomed':{keywords:['생명과학','생물학','바이오','의생명','biomedical','biology','biological science']},
  'm-design':{keywords:['시각디자인','산업디자인','디자인','visual design','industrial design']},
  'm-hci':{keywords:['인간컴퓨터','인터랙션','human computer interaction','interaction design']},
  'm-edu':{keywords:['교육학','교육과','education','pedagogy']},
  'm-media':{keywords:['미디어','언론','방송','media','journalism','communication']},
  'm-sociology':{keywords:['사회학','사회조사','sociology']},
};
function nameMatches(name:string,id:string){
  const m=majorById(id);if(!m||id==='m-open')return false;
  const keywords=names[id]?.keywords||[...m.name.split('·'),...m.en.split('/')].map(x=>x.trim()).filter(x=>x.length>2);
  const compact=name.normalize('NFKC').toLowerCase().replace(/[\s·\-–/&]+/g,'');
  return keywords.some(k=>productKeywordIn(name,k)||compact.includes(k.toLowerCase().replace(/[\s·\-–/&]+/g,'')));
}
export function officialBulkOperator(p:BulkProgram,id:string){
  return !p.facultyCommon&&!['master','doctorate'].includes(p.degreeLevel)&&!/폐과|폐지|closed|discontinued|inactive|중단/i.test(p.lifecycle||'')&&!!p.sourceId&&!!p.url&&nameMatches(p.name,id);
}
export function officialProgramOperator(p:UniversityProgram,id:string){
  return p.recordKind==='official'&&!['master','doctorate'].includes(p.degreeLevel)&&p.informationScope!=='faculty-common'&&p.sources.some(x=>x.status==='verified')
    &&nameMatches(p.programOriginal,id);
}
export const OPERATOR_NOTICE='공식 학과 목록·소개·교육과정에 해당 전공명이 확인된 자료만 연결해요. 비슷한 학과명도 교육과정은 대학마다 달라요. 자료 연도 기준 정보이며 현재 운영·모집 여부와 수업 언어는 원문에서 확인하세요.';
