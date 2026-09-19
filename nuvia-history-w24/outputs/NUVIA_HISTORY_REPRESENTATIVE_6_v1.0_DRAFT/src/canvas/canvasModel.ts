export type Condition='paper'|'access';
export type CanvasAge='early'|'primary12'|'older';
export type StickerId='person'|'book'|'paper'|'table'|'box'|'tree'|'arrow'|'bubble'|'type'|'press';
export interface PlacedSticker{id:StickerId;x:number;y:number;scale:number;flip:boolean;}
export interface Stroke{color:string;width:number;erase:boolean;points:[number,number][];}
export interface CanvasScene{id:string;background:'workshop'|'door';stickers:PlacedSticker[];strokes:Stroke[];text:string;audio:string;transcript:string;preview:string;}
export interface CanvasStory{version:1;id:string;resultId?:string;eventId:string;condition:Condition;age:CanvasAge;plan:StickerId[];scenes:CanvasScene[];completed:boolean;updatedAt:string;events:{type:string;at:string;data:Record<string,unknown>}[];}
export const freshScene=():CanvasScene=>({id:crypto.randomUUID(),background:'workshop',stickers:[],strokes:[],text:'',audio:'',transcript:'',preview:''});
export const freshCanvas=(id:string,condition:Condition,age:CanvasAge,resultId?:string):CanvasStory=>({version:1,id,...(resultId?{resultId}:{}),eventId:'gutenberg',condition,age,plan:[],scenes:[{...freshScene(),background:condition==='access'?'door':'workshop'},...(age==='primary12'?[freshScene()]:[])],completed:false,updatedAt:new Date().toISOString(),events:[]});
const stickerSlots:[[number,number],[number,number],[number,number],[number,number],[number,number],[number,number]]=[[400,260],[280,315],[520,315],[205,225],[595,225],[400,390]];
export function addSticker(scene:CanvasScene,id:StickerId):CanvasScene{if(scene.stickers.some(s=>s.id===id))return scene;const [x,y]=stickerSlots[scene.stickers.length%stickerSlots.length];return {...scene,stickers:[...scene.stickers,{id,x,y,scale:1,flip:false}]};}
export function moveSticker(scene:CanvasScene,id:StickerId,x:number,y:number):CanvasScene{return {...scene,stickers:scene.stickers.map(sticker=>sticker.id===id?{...sticker,x:Math.max(25,Math.min(775,x)),y:Math.max(25,Math.min(475,y))}:sticker)};}
export const sceneReady=(scene:CanvasScene,plan:StickerId[])=>plan.length===3&&plan.every(id=>scene.stickers.some(s=>s.id===id))&&scene.stickers.some(s=>s.id==='book'||s.id==='paper');
export function canvasReady(story:CanvasStory){return story.scenes.length>=(story.age==='primary12'?2:1)&&story.scenes.length<=(story.age==='primary12'?3:1)&&story.scenes.every(s=>sceneReady(s,story.plan));}
export function validateCanvas(s:CanvasStory){if(s?.version!==1||typeof s.eventId!=='string'||!['paper','access'].includes(s.condition)||!['early','primary12','older'].includes(s.age)||!Array.isArray(s.scenes)||s.scenes.length<1||s.scenes.length>3)throw new Error('invalid canvas');for(const scene of s.scenes){if(new Set(scene.stickers.map(x=>x.id)).size!==scene.stickers.length)throw new Error('duplicate sticker');}if(s.completed&&!canvasReady(s))throw new Error('unfinished canvas');}
export interface CanvasRepository{load(id:string):Promise<CanvasStory|null>;save(story:CanvasStory):Promise<void>;remove(id:string):Promise<void>;}
export const canvasRepository:CanvasRepository={async load(){throw Error('REPOSITORY_REQUIRED');},async save(){throw Error('REPOSITORY_REQUIRED');},async remove(){throw Error('REPOSITORY_REQUIRED');}};
export function moveScene(scenes:CanvasScene[],index:number,delta:number){const next=[...scenes],target=index+delta;if(target<0||target>=scenes.length)return scenes;[next[index],next[target]]=[next[target],next[index]];return next;}


