import records from '../content/assets.json';
import {AssetRegistry,type AssetRecord} from '../core/assetRegistry';
export const assets=new AssetRegistry(records as AssetRecord[]);
export const asset=(id:string)=>new URL(import.meta.env.BASE_URL+assets.resolve(id).path,location.href).href;
// Keep already supplied local pictures in the document's decoded-image cache.
// A connection loss while saving a reason must not blank the following result scene.
const retainedImages:HTMLImageElement[]=[];
let retained:Promise<void>|undefined;
export function retainLocalImages():Promise<void>{
 return retained??=Promise.all(records.filter(r=>r.state==='existing'&&(r.kind==='background'||r.kind==='sticker')).map(r=>new Promise<void>((resolve,reject)=>{
  const image=new Image();retainedImages.push(image);image.onload=()=>resolve();image.onerror=()=>reject(Error('LOCAL_ASSET_UNAVAILABLE'));image.src=asset(r.id);
 }))).then(()=>{}).catch(e=>{retained=undefined;throw e;});
}
