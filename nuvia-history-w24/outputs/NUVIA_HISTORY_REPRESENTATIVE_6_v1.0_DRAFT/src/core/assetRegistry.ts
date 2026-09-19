import {need} from './contracts';
export interface AssetRecord {id:string;kind:'background'|'sticker'|'font'|'audio';state:'existing'|'referenceOnly';path?:string;bytes?:number;sha256?:string;}
export class AssetRegistry {
 private records=new Map<string,AssetRecord>();
 constructor(records:AssetRecord[]){for(const r of records){need(!this.records.has(r.id),'DUPLICATE_ASSET');if(r.state==='existing')need(r.path&&!/^https?:/i.test(r.path)&&r.sha256&&Number.isInteger(r.bytes),'ASSET_METADATA_REQUIRED');this.records.set(r.id,{...r});}}
 resolve(id:string){const item=this.records.get(id);need(item,'ASSET_NOT_FOUND');need(item.state==='existing','ASSET_NOT_PROVIDED');return {...item};}
 inspect(id:string){const item=this.records.get(id);return item?{...item}:null;}
}
