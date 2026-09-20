import React from 'react';
import {SceneFrame} from '../ui/history/HistoryUI';
import {asset} from './assets';
import {PictureArt} from './PictureArt';
import {ui} from './text';

// W24-specific asset adapter; never used as an image fallback for other missions.
// Existing semantic clue drawings stay visible. No new image or historical claim.
export function W24Illustration({kind='book',active=false,portrait=false,clue=true}:{kind?:string;active?:boolean;portrait?:boolean;clue?:boolean}){
 const style={'--atlas':'url("'+asset('shared.condition-objects-v1')+'")','--cast':'url("'+asset('shared.cast')+'")'} as React.CSSProperties;
 return <div className="w24-illustration" data-play-visual data-kind={kind} data-active={active} data-portrait={portrait}>
 <SceneFrame src={asset('shared.workshop')} alt={ui('illustration')} style={style}>
 <div className="scene-objects" aria-hidden="true"><span className="scene-book"/><span className="scene-paper"/>{['share','access','tell','ask','time','fewer','printer'].includes(kind)&&<span className="scene-person"/>}</div>
 </SceneFrame>{clue&&<div className="scene-symbol"><PictureArt kind={kind} active={active}/></div>}</div>;
}
