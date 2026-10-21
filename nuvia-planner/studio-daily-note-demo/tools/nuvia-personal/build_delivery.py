"""Generate ignored review deliverables; never changes original sources or Git branches."""
import base64, hashlib, html, json, pathlib, re, shutil, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
APP=ROOT/'artifacts/nuvia-ui-review'
OUT=ROOT/'generated-artifacts/nuvia-personal'
PATCH=OUT/'NUVIA_PLANNER_personal_monthly_additive_candidate'
PATCH.mkdir(parents=True,exist_ok=True)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
added={}
sources=[APP/'personal-monthly.html',APP/'src/personal-main.tsx']+sorted((APP/'src/personal').glob('*'))
for src in sources:
 if src.suffix not in ['.ts','.tsx','.css','.html']:continue
 rel=src.relative_to(APP);dest=PATCH/'payload'/rel;dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(src.read_text().replace('../enhancement/','../personal-core/').replace('../official/adaptive/','../adaptive/'))
 added[str(rel)]=digest(dest)
for name in ['model.ts','domain.ts','persistence.ts','Glyph.tsx']:
 dest=PATCH/'payload/src/personal-core'/name;dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text((APP/'src/enhancement'/name).read_text().replace('../official/adaptive/','../adaptive/'))
 added[str(dest.relative_to(PATCH/'payload'))]=digest(dest)
guards={f'src/adaptive/{name}':digest(APP/'src/official/adaptive'/name) for name in ['engine.ts','brandAssets.ts']}
manifest={'title':'NUVIA PLANNER 개인 사용·월간 조정 추가형 후보','officialOriginCommit':'defa19d7c7601157b47ddb10cf4d62fdf9bebf82','replitPackagingHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'latestDeveloperIntegrationVerified':False,'existingFilesAutomaticallyModified':[],'guards':guards,'addedFiles':added,'storageMigrationIncluded':False,'publicDeploymentPerformed':False}
(PATCH/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
installer=(ROOT/'tools/nuvia-enhancement/install.py').read_text().replace("RECEIPT='.nuvia-enhancement-receipt.json'","RECEIPT='.nuvia-personal-monthly-receipt.json'")
(PATCH/'install.py').write_text(installer)
for name in ['APPLY_GUIDE.md','QA_REPORT.md']:shutil.copyfile(ROOT/'tools/nuvia-personal'/name,PATCH/name)
tests=PATCH/'verification';tests.mkdir(exist_ok=True)
for name in ['check.ts','browser.mjs','supplemental.mjs','check_package.py']:shutil.copyfile(ROOT/'tools/nuvia-personal'/name,tests/name)
# Verification scripts are workspace runners; not advertised as standalone app dependencies.
shutil.copytree(OUT/'logs',PATCH/'verification-logs',dirs_exist_ok=True)
catalog=[]
for src in (APP/'src/personal').glob('*.ts*'):
 for line_no,line in enumerate(src.read_text().splitlines(),1):
  for m in re.finditer(r"""['"]([^'"\n]*[가-힣][^'"\n]*)['"]""",line):
   catalog.append({'source':str(src.relative_to(APP)),'line':line_no,'text':m.group(1),'status':'한국어 후보; 전문 번역 검수 미완료'})
(PATCH/'new-copy-translation-candidates.json').write_text(json.dumps({'notApprovedTranslations':True,'scope':'new personal candidate only; existing translations untouched','items':catalog},ensure_ascii=False,indent=2))
report=(ROOT/'tools/nuvia-personal/QA_REPORT.md').read_text()
report+='\n\n## 정확한 추가 파일 목록\n'+'\n'.join('- '+f for f in added)+'\n\n기존 파일 자동 수정: 0개. 독립 호환 코어는 검토 시점 사본이며 기존 코어를 교체하지 않습니다.\n'
(PATCH/'QA_REPORT.md').write_text(report)
gallery=[]
for p in sorted((ROOT/'screenshots/personal').glob('*')):
 if p.suffix not in ['.png','.jpg']:continue
 gallery.append('<figure><figcaption>'+html.escape(p.stem)+' — 실제 브라우저 캡처 / 합성 검수 데이터</figcaption><img src="data:image/'+('jpeg' if p.suffix=='.jpg' else 'png')+';base64,'+base64.b64encode(p.read_bytes()).decode()+'" alt="'+html.escape(p.stem)+'"></figure>')
(OUT/'NUVIA_PLANNER_personal_monthly_review_report.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NUVIA 개인 사용·월간 검토</title><style>body{max-width:1100px;margin:24px auto;padding:20px;background:#fbf6ea;color:#172c4e;font:16px/1.7 system-ui}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;background:#fffdf6;padding:20px;border-radius:12px}figure{margin:24px 0}img{max-width:100%;height:auto}figcaption{font-weight:bold}</style><body><h1>NUVIA PLANNER 개인 사용·월간 조정 후보</h1><pre>'+html.escape(report)+'</pre>'+''.join(gallery)+'</body></html>')
def archive(folder,dest):
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
  for f in sorted(folder.rglob('*')):
   if f.is_file():z.write(f,str(f.relative_to(folder)))
archive(PATCH,OUT/(PATCH.name+'.zip'))
archive(ROOT/'screenshots/personal',OUT/'NUVIA_PLANNER_personal_monthly_actual_captures.zip')
print(json.dumps({'zip':str((OUT/(PATCH.name+'.zip')).relative_to(ROOT)),'addedFiles':len(added),'existingAutomaticEdits':0},ensure_ascii=False))
