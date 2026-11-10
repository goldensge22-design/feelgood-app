import express from 'express';
import path from 'node:path';
import router from './src/routes/index';
const app=express();
app.use(express.json({limit:'4mb'}));
app.use('/api', (req,res,next)=> {
  if (!['/career/overview','/career/example','/career/export'].includes(req.path)) {
    res.status(403).json({error:'QA_PUBLIC_ROUTES_ONLY'}); return;
  }
  next();
}, router);
const dist=path.resolve(import.meta.dirname,'../nuvia-career/dist/public');
app.use(express.static(dist));
app.use((req,res)=>res.sendFile('index.html',{root:dist}));
app.listen(4191,'127.0.0.1',()=>console.log('QA public source router + production UI at http://127.0.0.1:4191; account routes blocked; no real database'));
