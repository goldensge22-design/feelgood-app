import {gutenbergCanvasConfig,type StoryCanvasConfig,loadImage} from './canvasArt';
import type {CanvasScene,StickerId} from './canvasModel';
export async function renderScene(canvas:HTMLCanvasElement,scene:CanvasScene,selected?:StickerId,config:StoryCanvasConfig=gutenbergCanvasConfig){
 const stickerAssets=config.stickers;
 const bg=await loadImage(config.background),assets=await Promise.all(scene.stickers.map(s=>loadImage(stickerAssets.find(a=>a.id===s.id)!.url)));
 const ctx=canvas.getContext('2d')!;ctx.clearRect(0,0,800,500);const zoom=Math.max(800/bg.width,500/bg.height);
 if(scene.background==='door'){const height=bg.height*.72,width=height*1.6;ctx.drawImage(bg,Math.max(0,bg.width-width),bg.height*.13,width,height,0,0,800,500);}else ctx.drawImage(bg,(800-bg.width*zoom)/2,(500-bg.height*zoom)/2,bg.width*zoom,bg.height*zoom);
 ctx.fillStyle='#f8eed533';ctx.fillRect(0,0,800,500);
 scene.stickers.forEach((s,i)=>{const a=stickerAssets.find(a=>a.id===s.id)!,w=a.width*s.scale,h=a.height*s.scale;
  ctx.save();ctx.translate(s.x,s.y+h*.43);ctx.scale(1,.28);const ground=ctx.createRadialGradient(0,0,2,0,0,w*.42);ground.addColorStop(0,'#1e17105c');ground.addColorStop(.62,'#34251c31');ground.addColorStop(1,'#34251c00');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(0,0,w*.42,Math.max(16,h*.18),0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.save();ctx.translate(s.x,s.y);ctx.scale(s.flip?-1:1,1);ctx.filter='saturate(.82) contrast(.94) brightness(.92) sepia(.08)';ctx.shadowColor='#261b145f';ctx.shadowBlur=7;ctx.shadowOffsetY=5;const im=assets[i];if(a.crop){const [x,y,cw,ch]=a.crop;ctx.drawImage(im,im.width*x,im.height*y,im.width*cw,im.height*ch,-w/2,-h/2,w,h);}else ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();});
 const ink=document.createElement('canvas');ink.width=800;ink.height=500;const pen=ink.getContext('2d')!;
 scene.strokes.forEach(s=>{pen.globalCompositeOperation=s.erase?'destination-out':'source-over';pen.strokeStyle=s.color;pen.lineWidth=s.width;pen.lineCap='round';pen.lineJoin='round';pen.beginPath();s.points.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));if(s.points.length===1)pen.lineTo(s.points[0][0]+.1,s.points[0][1]);pen.stroke();});ctx.drawImage(ink,0,0);
 const s=scene.stickers.find(s=>s.id===selected);if(s){const a=stickerAssets.find(a=>a.id===s.id)!;ctx.strokeStyle='#ee9d4c';ctx.lineWidth=3;ctx.setLineDash([8,4]);ctx.strokeRect(s.x-a.width*s.scale/2-5,s.y-a.height*s.scale/2-5,a.width*s.scale+10,a.height*s.scale+10);ctx.setLineDash([]);}
}

