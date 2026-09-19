import React,{useRef,useState} from 'react';
import {t} from './i18n';
export function AudioPlayback({src}:{src:string}){
 const audio=useRef<HTMLAudioElement>(null),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[seconds,setSeconds]=useState(0);
 async function toggle(){const a=audio.current;if(!a)return;setFailed(false);try{if(a.paused)await a.play();else a.pause();}catch{setFailed(true);}}
 return <div className="audio-playback"><audio ref={audio} src={src} preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>setFailed(true)} onTimeUpdate={()=>setSeconds(Math.floor(audio.current?.currentTime??0))}/><button type="button" onClick={()=>void toggle()}>{t(playing?'voice.pause':'voice.play')}</button><span aria-live="off">{seconds}s</span><a href={src} download="nuvia-voice">{t('voice.download')}</a>{failed&&<p role="alert">{t('voice.playError')}</p>}</div>;
}
