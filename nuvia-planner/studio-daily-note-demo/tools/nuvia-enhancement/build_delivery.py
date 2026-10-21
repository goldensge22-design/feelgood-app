import base64, hashlib, html, json, pathlib, re, shutil, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
APP=ROOT/'artifacts/nuvia-ui-review'
OUT=ROOT/'generated-artifacts/nuvia-enhancement'
PATCH=OUT/'NUVIA_PLANNER_Bv2_personalization_additive_review'
PATCH.mkdir(parents=True,exist_ok=True)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
sources=[APP/'enhancement.html',APP/'src/enhancement-main.tsx']+sorted((APP/'src/enhancement').glob('*'))
added={}
for src in sources:
 if src.suffix not in ['.ts','.tsx','.css','.html']:continue
 rel=src.relative_to(APP);dest=PATCH/'payload'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(src.read_text().replace('../official/adaptive/','../adaptive/'))
 added[str(rel)]=digest(dest)
guards={f'src/adaptive/{name}':digest(APP/'src/official/adaptive'/name) for name in ['engine.ts','brandAssets.ts']}
manifest={'title':'NUVIA PLANNER B형 v2 개인화·수업/캠프 추가형 검토 패치','officialOriginCommit':'defa19d7c7601157b47ddb10cf4d62fdf9bebf82','replitReviewSnapshot':'ddc5e70947d6f80215209ac79689712b7c1cf204','latestDeveloperIntegrationVerified':False,'existingFilesAutomaticallyModified':[],'guards':guards,'addedFiles':added}
(PATCH/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
for src,name in [(ROOT/'tools/nuvia-enhancement/install.py','install.py'),(ROOT/'tools/nuvia-enhancement/APPLY_GUIDE.md','APPLY_GUIDE.md'),(ROOT/'tools/nuvia-enhancement/QA_REPORT.md','QA_REPORT.md')]:shutil.copyfile(src,PATCH/name)
catalog=[]
for src in sorted((APP/'src/enhancement').glob('*.ts*')):
 for line_no,line in enumerate(src.read_text().splitlines(),1):
  for m in re.finditer(r"""['"]([^'"\n]*[가-힣][^'"\n]*)['"]""",line):
   catalog.append({'source':str(src.relative_to(APP)),'line':line_no,'text':m.group(1),'status':'source candidate; en/km/ar professional review pending'})
(PATCH/'new-copy-translation-candidates.json').write_text(json.dumps({'scope':'new enhancement code only; machine-extracted candidates, not approved translations','items':catalog},ensure_ascii=False,indent=2))
if (OUT/'logs').exists():shutil.copytree(OUT/'logs',PATCH/'verification-logs',dirs_exist_ok=True)
tests=PATCH/'verification';tests.mkdir(exist_ok=True)
for src in (ROOT/'tools/nuvia-enhancement').glob('*'):
 if src.suffix in ['.ts','.mjs']:shutil.copyfile(src,tests/src.name)
def archive(folder,dest):
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(folder.rglob('*')):
   if f.is_file():z.write(f,str(f.relative_to(folder)))
report=(ROOT/'tools/nuvia-enhancement/QA_REPORT.md').read_text()
report+='\n\n## 정확한 추가 파일 목록\n'+'\n'.join('- '+name for name in added)+'\n\n기존 파일 자동 수정: 0개. 의존 해시 검사: '+', '.join(guards)+'.\n'
(PATCH/'QA_REPORT.md').write_text(report)
gallery=[]
for name in ['same-data-approved-b-v2','same-data-enhancement','target-planning','target-attention','target-simultaneous','target-successive','mobile-normal-full','plan-360','execution-360','teacher-shared-1440']:
 f=ROOT/'screenshots/enhancement'/f'{name}.png'
 if not f.exists():f=f.with_suffix('.jpg')
 if f.exists():gallery.append(f'<figure><figcaption>{html.escape(name)} — 실제 브라우저 캡처·합성 데이터</figcaption><img src="data:image/{"jpeg" if f.suffix==".jpg" else "png"};base64,{base64.b64encode(f.read_bytes()).decode()}" alt="{name}"></figure>')
(OUT/'NUVIA_PLANNER_enhancement_review_report.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><title>NUVIA 보강 검토 결과</title><style>body{max-width:1100px;margin:32px auto;padding:20px;font:16px/1.7 system-ui;color:#192c4b;background:#faf6e9}pre{white-space:pre-wrap;font:inherit;background:#fff;padding:24px;border-radius:12px}figure{margin:32px 0}img{max-width:100%;height:auto;border:1px solid #bbc5d5}figcaption{font-weight:700}</style><body><h1>NUVIA PLANNER 보강 검토 결과</h1><pre>'+html.escape(report)+'</pre>'+''.join(gallery)+'</body></html>')
archive(PATCH,OUT/(PATCH.name+'.zip'))
archive(ROOT/'screenshots/enhancement',OUT/'NUVIA_PLANNER_enhancement_browser_captures.zip')
print(json.dumps({'zip':str((OUT/(PATCH.name+'.zip')).relative_to(ROOT)),'additions':len(added),'existing_auto_modified':0,'output':str(OUT.relative_to(ROOT))},ensure_ascii=False))
