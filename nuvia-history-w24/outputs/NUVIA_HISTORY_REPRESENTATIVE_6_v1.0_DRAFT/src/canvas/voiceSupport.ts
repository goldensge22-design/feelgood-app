export function microphoneError(error:unknown):string {
 const name=error instanceof Error?error.name:'';
 return ({NotAllowedError:'voice.denied',SecurityError:'voice.denied',NotFoundError:'voice.missing',NotReadableError:'voice.busy',TimeoutError:'voice.timeout'} as Record<string,string>)[name]??'voice.failed';
}
export async function requestMicrophone(getMedia:()=>Promise<MediaStream>,timeoutMs=15000):Promise<MediaStream>{
 let expired=false;let timer:ReturnType<typeof setTimeout>;
 const request=getMedia().then(media=>{if(expired){media.getTracks().forEach(track=>track.stop());throw new DOMException('Timeout','TimeoutError');}return media;});
 try{return await Promise.race([request,new Promise<never>((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(new DOMException('Timeout','TimeoutError'));},timeoutMs);})]);}finally{clearTimeout(timer!);}
}
