"""Build the self-contained review source delivery, never production files."""
from pathlib import Path
import subprocess, hashlib, json, zipfile, base64, html

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'generated-artifacts/nuvia-final'
OUT.mkdir(parents=True,exist_ok=True)
BASE='59d2e9cf8b4318c5821ac74bc0973f098a804b6a'
APP=ROOT/'artifacts/nuvia-ui-review'
def git(*args):
    return subprocess.run(['git',*args],cwd=ROOT,stdout=subprocess.PIPE,check=True).stdout
def uri(p):
    return 'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode()
approved=next((ROOT/'attached_assets').glob('ChatGPT_*1792498203160.png'),APP/'docs/approved-reference.png')
shots=ROOT/'screenshots/nuvia-final'
report='''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NUVIA 최종 작업대 검수</title><style>body{font:16px/1.65 system-ui,sans-serif;background:#f7f2e6;color:#13233f;margin:auto;max-width:1500px;padding:24px}h1,h2{line-height:1.3}section{background:#fffcf3;padding:20px;border-radius:16px;margin:20px 0;border:1px solid #d6cdb8}img{max-width:100%;height:auto;border:1px solid #ddd}.grid{display:grid;grid-template-columns:2fr 1fr;gap:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}.note{background:#e8e2f3;padding:14px}@media(max-width:700px){.grid{grid-template-columns:1fr}}@media print{body{background:white}}</style><h1>NUVIA PLANNER · 최종 작업대 검토</h1><p>승인 이미지와 실제 브라우저 캡처 비교. 합성 검토 데이터이며 운영 배포/실제 결과지 연동이 아닙니다.</p>'''
report+='<section><h2>승인 이미지</h2><img alt="사용자가 제공한 승인 시각 기준" src="'+uri(approved)+'"></section>'
report+='<section><h2>실제 구현 · 동일 합성 시나리오</h2><div class="grid">'
for name,label in [('desktop-1440','1440px 데스크톱'),('mobile-full','360px 모바일 전체')]:
    report+=f'<div><h3>{label}</h3><img alt="{label} 실제 브라우저 캡처" src="{uri(shots/(name+".png"))}"></div>'
report+='</div></section><section><h2>실제 상태별 캡처</h2><div class="grid">'
for name,label in [('desktop-running','같은 파일 안의 실행'),('desktop-completed','수동 완료 후 컬렉션'),('desktop-empty','실제 빈 상태'),('desktop-add','최소 계획 추가 폼')]:
    report+=f'<div><h3>{label}</h3><img alt="{label}" src="{uri(shots/(name+".png"))}"></div>'
report+='</div></section><section><h2>규칙별 검수·이미지 차이·남은 한계</h2><pre>'+html.escape((APP/'docs/FINAL_QA.md').read_text())+'</pre></section></html>'
(OUT/'NUVIA_FINAL_VISUAL_QA.html').write_text(report)
integration='<!doctype html><html lang="ko"><meta charset="utf-8"><title>NUVIA 결과지 연동 지시서</title><style>body{max-width:980px;margin:40px auto;padding:20px;font:16px/1.7 system-ui;color:#13233f;background:#fffcf3}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}</style><pre>'+html.escape((APP/'docs/RESULT_INTEGRATION.md').read_text())+'</pre></html>'
(OUT/'NUVIA_RESULT_INTEGRATION.html').write_text(integration)
changed=git('diff','--name-only',BASE,'--','artifacts/nuvia-ui-review','tools/nuvia-studio').decode().splitlines()
new=[x for x in git('ls-files','--others','--exclude-standard').decode().splitlines() if x.startswith(('artifacts/nuvia-ui-review/docs/','tools/nuvia-studio/'))]
patch=git('diff','--binary',BASE,'--','artifacts/nuvia-ui-review','tools/nuvia-studio')
for name in new:
    patch+=subprocess.run(['git','diff','--no-index','--binary','--','/dev/null',name],cwd=ROOT,stdout=subprocess.PIPE).stdout
(OUT/'CHANGES.patch').write_bytes(patch)
pre={}
for name in sorted(set(changed+new)):
    old=subprocess.run(['git','show',BASE+':'+name],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
    pre[name]=hashlib.sha256(old.stdout).hexdigest() if old.returncode==0 else None
(OUT/'PATCH_PRECONDITIONS.json').write_text(json.dumps({'localBaseline':BASE,'remoteReported':'811609f (not fetched/verified)','files':pre},indent=2))
verify="""import json,hashlib,sys,pathlib
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.')
m=json.loads(pathlib.Path(__file__).with_name('PATCH_PRECONDITIONS.json').read_text())
errors=[]
for name,expected in m['files'].items():
 p=root/name
 if expected is None:
  if p.exists():errors.append(name+': new path already exists')
 elif not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:errors.append(name+': baseline mismatch')
print('\\n'.join(errors) if errors else 'Preconditions match; still run git apply --check and integration QA.')
sys.exit(1 if errors else 0)
"""
(OUT/'verify_preconditions.py').write_text(verify)
files={}
for folder in [APP,ROOT/'lib/api-client-react',ROOT/'tools/nuvia-studio']:
    for p in folder.rglob('*'):
        if p.is_file() and not any(x in {'node_modules','.git','dist'} for x in p.relative_to(folder).parts) and not p.name.endswith(('.tsbuildinfo','.pyc')) and not p.name.startswith('.env'):
            files[p.relative_to(ROOT).as_posix()]=p
for name in ['package.json','pnpm-workspace.yaml','pnpm-lock.yaml','tsconfig.base.json','tsconfig.json','tools/nuvia-enhancement/browser-lib.mjs']:
    files[name]=ROOT/name
standalone=json.loads((ROOT/'package.json').read_text())
standalone['scripts'].update({'dev':'pnpm --filter @workspace/nuvia-ui-review dev','typecheck:libs':'tsc --build lib/api-client-react','typecheck':'pnpm run typecheck:libs && pnpm --filter @workspace/nuvia-ui-review typecheck','build':'pnpm run typecheck && pnpm --filter @workspace/nuvia-ui-review build'})
(OUT/'source-package.json').write_text(json.dumps(standalone,indent=2)+'\n')
(OUT/'source-tsconfig.json').write_text(json.dumps({'files':[],'references':[{'path':'./lib/api-client-react'}]},indent=2)+'\n')
files['package.json']=OUT/'source-package.json'
files['tsconfig.json']=OUT/'source-tsconfig.json'
for p in shots.glob('*.png'):files[p.relative_to(ROOT).as_posix()]=p
files['artifacts/nuvia-ui-review/docs/approved-reference.png']=approved
for p in OUT.glob('*.log'):files['artifacts/nuvia-ui-review/docs/qa-logs/'+p.name]=p
for name in ['CHANGES.patch','PATCH_PRECONDITIONS.json','verify_preconditions.py']:
    files['handoff/'+name]=OUT/name
files['README.md']=APP/'docs/RUN_AND_APPLY.md'
manifest={name:hashlib.sha256(p.read_bytes()).hexdigest() for name,p in sorted(files.items())}
zip_path=OUT/'NUVIA_PLANNER_FINAL_FULL_SOURCE_20261020_QA_FIXED.zip'
with zipfile.ZipFile(zip_path,'w',zipfile.ZIP_DEFLATED) as z:
    for name,p in sorted(files.items()):z.write(p,'NUVIA-review-source/'+name)
    z.writestr('NUVIA-review-source/SHA256SUMS.json',json.dumps(manifest,indent=2))
print(json.dumps({'zip':str(zip_path.relative_to(ROOT)),'files':len(files),'bytes':zip_path.stat().st_size,'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest()},indent=2))
