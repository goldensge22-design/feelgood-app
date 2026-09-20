const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const app=path.resolve(__dirname,'..'),root=path.resolve(app,'../..'),repo=path.resolve(root,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'comparison-free/protected-sha256.json'),'utf8'));
const tracked=new Set(execFileSync('git',['ls-tree','-r','--name-only','571a515'],{cwd:repo,encoding:'utf8'}).trim().split(/\r?\n/));
const rows=manifest.map(x=>{const relative=x.file.replaceAll('\\','/'),file=path.join(root,relative),exists=fs.existsSync(file),hash=exists?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null;return {file:relative,expected:x.after,actual:hash,status:!exists?'MISSING':hash===x.after?'SAME':'DIFFERENT',presentInRecoveryCommit:tracked.has('nuvia-history-w24/'+relative)};});
const result={manifest:'qa/comparison-free/protected-sha256.json',base:'571a515',total:rows.length,same:rows.filter(x=>x.status==='SAME').length,different:rows.filter(x=>x.status==='DIFFERENT').length,missing:rows.filter(x=>x.status==='MISSING').length,missingButTrackedAtBase:rows.filter(x=>x.status==='MISSING'&&x.presentInRecoveryCommit).length,rows};
fs.mkdirSync(path.join(__dirname,'four-paths'),{recursive:true});fs.writeFileSync(path.join(__dirname,'four-paths/protected-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({...result,rows:undefined}));
