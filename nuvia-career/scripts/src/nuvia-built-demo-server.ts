/** Local-only production-asset verification server. NOT a deployment or public share. */
import {createServer,request} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('artifacts/nuvia-career/dist/public');
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 const url=new URL(req.url??'/','http://localhost');
 if(url.pathname.startsWith('/api/')){
  const upstream=request({hostname:'127.0.0.1',port:8080,path:req.url,method:req.method,headers:req.headers},r=>{
   res.writeHead(r.statusCode??502,r.headers);r.pipe(res);
  });
  upstream.on('error',()=>{res.writeHead(502);res.end('API unavailable');});req.pipe(upstream);return;
 }
 try{
  let file=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+'/')&&file!==root){res.writeHead(403);res.end();return;}
  try{if(!(await stat(file)).isFile())file=resolve(root,'index.html');}
  catch{file=resolve(root,'index.html');}
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(500);res.end('Local test server error');}
}).listen(4319,'127.0.0.1',()=>console.log('Local built-asset QA only: http://127.0.0.1:4319/demo'));
