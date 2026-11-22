// A compile-time capability, never granted by query parameters or stored data.
export const publicLibrary = import.meta.env?.NUVIA_LIBRARY_PUBLIC === 'true';
export const publicPath = '/library-demo.html';
export function publicAudience(search:string):'university'|'school'|'enterprise'{
 const params=new URLSearchParams(search);
 for(const key of ['demo','audience']){
  const value=params.get(key);
  if(value==='university'||value==='school'||value==='enterprise')return value;
 }
 return 'university';
}
