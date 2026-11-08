import path from 'node:path';
import react from '@vitejs/plugin-react';
import {defineConfig,type Plugin} from 'vite';
import studioI18n from './src/studio/i18n/compiler.mjs';

const root=import.meta.dirname;
// Also used by the source boundary check: no arbitrary HTML or draft-source
// access in this preview server. This is not a security claim about old servers.
export function publicBoundary():Plugin {
 return {name:'library-public-boundary',enforce:'pre',
  configureServer(server){
   server.middlewares.use((req,res,next)=>{
    let pathname:string;
    try{pathname=decodeURIComponent(new URL(req.url??'/', 'http://local').pathname);}
    catch{res.statusCode=400;res.end('Bad path');return;}
    if(['/','/index.html','/studio.html','/demo.html'].includes(pathname)){
     res.statusCode=302;res.setHeader('Location','./library-demo.html'+new URL(req.url??'/', 'http://local').search);res.end();return;
    }
    if((pathname.endsWith('.html')&&pathname!=='/library-demo.html'&&pathname!=='/practice-compare.html')||
       /(?:^|\/)(?:api|docs|tools|handoff)(?:\/|$)/.test(pathname)||
       /\/planner-library\/(?:catalog|domain|LibraryUI)/.test(pathname)||
       /\/src\/(?:career-review|official|enhancement|personal)/.test(pathname)&&!pathname.endsWith('.ts')&&!pathname.endsWith('.tsx')||
       pathname.includes('..')){
     res.statusCode=404;res.end('Not available in public trial');return;
    }
    // No Store/restore/reset endpoint exists. Only Vite module GETs are served.
    if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.end();return;}
    next();
   });
  },
  generateBundle:{order:'post',handler(_options,bundle){
   const entry=bundle['library-demo.html'];
   if(!entry||entry.type!=='asset')this.error('Public entry HTML was not generated');
   // Real files, not a wildcard rewrite into old internal review HTML.
   for(const fileName of ['index.html','studio.html','demo.html']){
    this.emitFile({type:'asset',fileName,source:entry.source});
   }
  }},
  transformIndexHtml(html,ctx){
   if(ctx.server)return html;
   return html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">');
  },
 };
}
export default defineConfig({
 root,base:process.env.BASE_PATH??'/',
 define:{'import.meta.env.NUVIA_LIBRARY_PUBLIC':JSON.stringify('true')},
 plugins:[publicBoundary(),studioI18n(),react()],
 resolve:{alias:[
  {find:/.*\/planner-library\/domain$/,replacement:path.resolve(root,'src/library-public/domain.ts')},
  {find:/.*\/planner-library\/LibraryUI$/,replacement:path.resolve(root,'src/library-public/LibraryUI.tsx')},
 ]},
 server:{host:'0.0.0.0',port:Number(process.env.PORT??24422),strictPort:true,allowedHosts:true,
  fs:{deny:['**/planner-library/catalog/**','**/.env*','**/.git/**']}},
 build:{outDir:'dist/library-public',emptyOutDir:true,sourcemap:false,
  rollupOptions:{input:{'library-demo':path.resolve(root,'library-demo.html')}}},
});
