"""Full runnable review source, scoped patch, resources and reproducible QA evidence."""
import pathlib,subprocess,json,hashlib,zipfile,html,datetime,os,difflib
os.environ['GIT_OPTIONAL_LOCKS']='0'
R=pathlib.Path(__file__).resolve().parents[2]; O=R/'generated-artifacts/studio-i18n';BASE='b60f130a8818362b57621051ba58d8e5968deb61'
files={}
for folder in ['artifacts/nuvia-ui-review','lib/api-client-react','tools/nuvia-studio']:
 for p in (R/folder).rglob('*'):
  if p.is_file() and not set(p.relative_to(R).parts)&{'node_modules','dist','.git'} and not p.name.startswith('.env') and not p.name.endswith('.tsbuildinfo'):files[str(p.relative_to(R))]=p
for name in ['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json','tsconfig.json','tools/nuvia-enhancement/browser-lib.mjs']:files[name]=R/name
pkg=json.loads((R/'package.json').read_text());pkg['scripts'].update({'dev':'pnpm --filter @workspace/nuvia-ui-review dev','typecheck:libs':'tsc --build lib/api-client-react','typecheck':'pnpm run typecheck:libs && pnpm --filter @workspace/nuvia-ui-review typecheck','build':'pnpm run typecheck && pnpm --filter @workspace/nuvia-ui-review build'})
(O/'source-package.json').write_text(json.dumps(pkg,indent=2));files['package.json']=O/'source-package.json'
(O/'source-tsconfig.json').write_text(json.dumps({'files':[],'references':[{'path':'./lib/api-client-react'}]}));files['tsconfig.json']=O/'source-tsconfig.json'
for p in O.glob('*.log'):files['qa/'+p.name]=p
for p in O.glob('*results.json'):files['qa/'+p.name]=p
if (O/'resource-validation.json').exists():files['qa/resource-validation.json']=O/'resource-validation.json'
for folder,prefix in [('screenshots/studio-i18n','qa/screenshots'),('generated-artifacts/studio-i18n/print','qa/print')]:
 for p in (R/folder).glob('*'):
  if p.is_file():files[prefix+'/'+p.name]=p
git=lambda *a:subprocess.check_output(['git','--no-optional-locks','-c','diff.autoRefreshIndex=false',*a],cwd=R)
# Read objects, never the index: git diff may refresh the workspace index.
tree={}
for row in git('ls-tree','-rz',BASE).split(b'\0'):
 if not row:continue
 meta,name=row.split(b'\t',1);mode,kind,sha=meta.split()
 n=name.decode()
 if n.startswith(('artifacts/nuvia-ui-review/','tools/nuvia-studio/')):tree[n]=sha.decode()
current={n:p for n,p in files.items() if n.startswith(('artifacts/nuvia-ui-review/','tools/nuvia-studio/'))}
patch=b'';pre={}
for n in sorted(set(tree)|set(current)):
 data=current[n].read_bytes() if n in current else b''
 blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 if tree.get(n)==blob:continue
 old=git('cat-file','blob',tree[n]) if n in tree else b''
 pre[n]=hashlib.sha256(old).hexdigest() if n in tree else None
 header='diff --git a/'+n+' b/'+n+'\n'
 if n not in tree:header+='new file mode 100644\n'
 elif n not in current:header+='deleted file mode 100644\n'
 patch+=(header+''.join(difflib.unified_diff(old.decode().splitlines(keepends=True),data.decode().splitlines(keepends=True),fromfile='a/'+n if n in tree else '/dev/null',tofile='b/'+n if n in current else '/dev/null'))).encode()
(O/'CHANGES.patch').write_bytes(patch);files['handoff/CHANGES.patch']=O/'CHANGES.patch'
(O/'PATCH_PRECONDITIONS.json').write_text(json.dumps({'localBaseline':BASE,'files':pre},indent=2));files['handoff/PATCH_PRECONDITIONS.json']=O/'PATCH_PRECONDITIONS.json'
verify="""import pathlib,json,hashlib,sys
r=pathlib.Path(sys.argv[1]);m=json.loads(pathlib.Path(__file__).with_name('PATCH_PRECONDITIONS.json').read_text());bad=[]
for n,h in m['files'].items():
 p=r/n
 if h is None:
  if p.exists():bad.append(n+': path already exists')
 elif not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=h:bad.append(n+': baseline mismatch')
print('\\n'.join(bad) if bad else 'Preconditions match; still run git apply --check and integration QA.')
sys.exit(bool(bad))
"""
(O/'verify_preconditions.py').write_text(verify);files['handoff/verify_preconditions.py']=O/'verify_preconditions.py'
build={'baseline':BASE,'snapshotHEAD':git('rev-parse','HEAD').decode().strip(),'workingTreeIncluded':True,'id':'STUDIO_I18N_15LOCALES_20261021','resourceKeys':len(json.loads((R/'artifacts/nuvia-ui-review/src/studio/i18n/locales/ko.json').read_text())),'translationReview':'AI_DRAFT_NOT_HUMAN_REVIEWED','officialRemoteCompatibility':'NOT_VERIFIED'}
(O/'BUILD.json').write_text(json.dumps(build,indent=2));files['BUILD.json']=O/'BUILD.json'
files['README.md']=R/'artifacts/nuvia-ui-review/docs/STUDIO_I18N_HANDOFF.md'
report=(R/'artifacts/nuvia-ui-review/docs/STUDIO_I18N_QA.md').read_text()
document='<!doctype html><html lang="en"><meta charset="utf-8"><title>Studio i18n QA</title><style>body{font:16px/1.7 system-ui;max-width:1000px;margin:30px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%;border:1px solid #ddd}</style><h1>Studio i18n · AI draft QA</h1><pre>'+html.escape(report)+'</pre>'
import base64
for loc in ['en','ar','km','th','mn']:
 for width in [1440,360]:
  p=R/f'screenshots/studio-i18n/{loc}-{width}.png'
  if p.exists():document+=f'<h2>{loc} · {width}px</h2><img src="data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()+'">'
(O/'STUDIO_I18N_QA.html').write_text(document);files['qa/STUDIO_I18N_QA.html']=O/'STUDIO_I18N_QA.html'
manifest={n:hashlib.sha256(p.read_bytes()).hexdigest() for n,p in files.items()}
zipname=O/'NUVIA_STUDIO_I18N_15LOCALES_FULL_SOURCE_20261021.zip'
with zipfile.ZipFile(zipname,'w',zipfile.ZIP_DEFLATED)as z:
 for n,p in sorted(files.items()):z.write(p,'NUVIA-studio-i18n/'+n)
 z.writestr('NUVIA-studio-i18n/SHA256SUMS.json',json.dumps(manifest,indent=2))
print(json.dumps({'zip':str(zipname.relative_to(R)),'files':len(files),'sha256':hashlib.sha256(zipname.read_bytes()).hexdigest(),'bytes':zipname.stat().st_size}))
