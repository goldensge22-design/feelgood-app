import {asset} from '../app/assets';
const boxSvg=asset('shared.canvas-box');
const treeSvg=asset('shared.canvas-tree');
const arrowSvg=asset('shared.canvas-arrow');
const bubbleSvg=asset('shared.canvas-bubble');
const typeSvg=asset('shared.canvas-type');
const pressSvg=asset('shared.canvas-press');
const workshop=asset('shared.workshop');
const atlas=asset('shared.condition-objects-v1');
const cast=asset('shared.cast');
import type {StickerId} from './canvasModel';
export interface StickerAsset{id:StickerId;category:'people'|'objects'|'nature'|'effects';url:string;crop?:[number,number,number,number];width:number;height:number;dedicated?:boolean;}
// Code-native shared illustrations: transparent SVG, shallow painted shading, no external resources.
export const canvasBackground=workshop;
export const stickerAssets:StickerAsset[]=[
 {id:'person',category:'people',url:cast,crop:[2/3,0,1/3,1],width:85,height:175},
 {id:'book',category:'objects',url:atlas,crop:[.5,0,.5,.5],width:155,height:105},
 {id:'paper',category:'objects',url:atlas,crop:[0,.5,.5,.5],width:130,height:85},
 {id:'table',category:'objects',url:atlas,crop:[0,0,.5,.5],width:190,height:130},
 {id:'box',category:'objects',width:105,height:105,url:boxSvg},
 {id:'tree',category:'nature',width:140,height:180,url:treeSvg},
 {id:'arrow',category:'effects',width:110,height:70,url:arrowSvg},
 {id:'bubble',category:'effects',width:140,height:100,url:bubbleSvg},
 {id:'type',category:'objects',dedicated:true,width:130,height:90,url:typeSvg},
 {id:'press',category:'objects',dedicated:true,width:180,height:180,url:pressSvg},
];
const cache=new Map<string,Promise<HTMLImageElement>>();
export function loadImage(url:string){if(!cache.has(url))cache.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{cache.delete(url);reject(new Error('image failed'));};image.src=url;}));return cache.get(url)!;}

export const availableStickers=(condition:'paper'|'access')=>stickerAssets.filter(a=>condition==='paper'?a.id!=='box':a.id!=='type');

export interface StoryCanvasConfig{eventId:string;background:string;stickers:StickerAsset[];palette:(condition:'paper'|'access')=>StickerAsset[];promptKey:(condition:'paper'|'access')=>string;}
export const gutenbergCanvasConfig:StoryCanvasConfig={eventId:'gutenberg',background:canvasBackground,stickers:stickerAssets,palette:availableStickers,promptKey:condition=>`canvas.condition.${condition}`};