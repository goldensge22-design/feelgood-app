/** Checks the bytes downloaded by UI QA, not new API-generated fixtures. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import mammoth from 'mammoth';
import assert from 'node:assert/strict';
const out=fileURLToPath(new URL(process.argv.includes('--public')?'../../generated-artifacts/public-demo-qa':'../../generated-artifacts/provenance-qa',import.meta.url));
const results=[];
for(const name of (await readdir(out)).filter(n=>/^ko-1440-(actual|simulation)\.(docx|hwpx)$/.test(n))){
 const input=JSON.parse(await readFile(`${out}/${name.replace(/\.(docx|hwpx)$/,'-input.json')}`,'utf8'));
 const file=`${out}/${name}`;
 if(name.endsWith('.docx')){
  const text=await mammoth.extractRawText({buffer:await readFile(file)});
  assert.deepEqual(text.messages,[]);
  for(const field of ['company','job','question','text']) for(const line of input[field].split('\n').filter(Boolean)) assert(text.value.includes(line),`DOCX missing ${field}`);
  assert(!text.value.includes('sourceRevision')&&!text.value.includes('syntheticKey'));
  results.push({file:name,status:'passed',method:'Mammoth independent DOCX body reading',bodyMatchesInput:true});
 }else{
  const result=spawnSync('python',['-c',`
import sys,json,zipfile,xml.etree.ElementTree as E
v=json.loads(sys.stdin.read())
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 first=z.infolist()[0]
 assert first.filename=='mimetype' and first.compress_type==zipfile.ZIP_STORED
 assert z.read('mimetype')==b'application/hwp+zip'
 for n in z.namelist():
  if n.endswith(('.xml','.hpf')): E.fromstring(z.read(n))
 expect='\\n\\n'.join(v[k] for k in ['company','job','question','text'])
 assert z.read('Preview/PrvText.txt').decode('utf-8')==expect
 root=E.fromstring(z.read('Contents/section0.xml'))
 body='\\n'.join(''.join(x.itertext()) for x in root.iter() if x.tag.endswith('}p'))
 for k in ['company','job','question','text']:
  for line in v[k].splitlines():
   if line: assert line in body
 for bad in ['sourceRevision','syntheticKey','PRIVATE-NOTE','PRIVATE-COACH']:
  assert bad not in body
print('PASS')
`,file],{input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  results.push({file:name,status:'passed',method:'ZIP CRC, mimetype, XML, body and Preview round-trip',bodyMatchesInput:true});
 }
}
assert.equal(results.length,4);
await writeFile(`${out}/document-checks.json`,JSON.stringify({
 checkedAt:new Date().toISOString(),scope:process.argv.includes('--public')?'Actual production-build downloads from tab-isolated synthetic PUBLIC-DEMO journey, NOT authenticated account':'Actual downloads from synthetic DEVICE-ONLY screen journey, NOT authenticated account',
 results,nativeWord:'not_run: no accessible licensed Microsoft Word environment',nativeHancom:'not_run: no accessible licensed Hancom environment',
 formalFullHwpxSchemaValidation:'not_run',
},null,2));
console.log('PASS four UI-downloaded DOCX/HWPX actual/simulation synthetic documents; native Office NOT RUN');
