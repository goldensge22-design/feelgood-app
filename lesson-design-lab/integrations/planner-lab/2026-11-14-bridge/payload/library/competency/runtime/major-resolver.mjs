import catalog from './catalog.mjs';
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').replace(/학과$/,'');
const four={security:['항공보안','항공보안학과'],traffic:['항공교통물류','항공교통물류학과'],language:['항공외국어','항공외국어학과'],administration:['공항행정','공항행정학과']};
export function resolveMajor(name){
 const n=norm(name);if(!n)return {status:'needs_curation',name,profileIds:[]};
 for(const [id,aliases] of Object.entries(four))if(aliases.some(a=>norm(a)===n))return {status:'mapped',id,name:catalog.departments[id],coverageStatus:'four_department_review',profileIds:catalog.profiles.filter(p=>p.departments.includes(id)).map(p=>p.id)};
 const m=catalog.resultMajors.find(m=>m.aliases.some(a=>norm(a)===n));
 return m?{status:'mapped',...m}:{status:'needs_curation',name,profileIds:[],reason:'정확히 연결된 학과 자료가 없어 추가 보강이 필요합니다. 비슷한 이름으로 임의 연결하지 않습니다.'};
}
export function resolveResultMajors(names){
 if(!Array.isArray(names)||names.length>20||names.some(n=>typeof n!=='string'||n.length>200))throw Error('INVALID_MAJOR_LIST');
 return names.map(resolveMajor);
}
export function catalogSummary(){return {version:catalog.version,departments:catalog.departments,profiles:catalog.profiles.map(p=>({id:p.id,name:p.name,departments:p.departments,coverage:p.coverage,readiness:p.readiness})),resultMajors:catalog.resultMajors};}
