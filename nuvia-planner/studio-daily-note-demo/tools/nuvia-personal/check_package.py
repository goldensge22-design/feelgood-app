"""Exercise generated installer only inside disposable /tmp repositories."""
import hashlib,json,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
PACKAGE=ROOT/'generated-artifacts/nuvia-personal/NUVIA_PLANNER_personal_monthly_additive_candidate'
manifest=json.loads((PACKAGE/'manifest.json').read_text());checks=0
def run(args,cwd=None):return subprocess.run(args,cwd=cwd,text=True,capture_output=True)
def check(ok,label):
 global checks
 assert ok,label
 checks+=1
with tempfile.TemporaryDirectory(prefix='nuvia-personal-package-') as tmp:
 root=pathlib.Path(tmp)/'source';root.mkdir()
 for name in manifest['guards']:
  p=root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/'artifacts/nuvia-ui-review/src/official/adaptive'/p.name,p)
 (root/'package.json').write_text(json.dumps({'dependencies':{'react':'19','react-dom':'19','zod':'4'}}))
 for args in [['init','-q','-b','review-personal-monthly'],['config','user.email','test@example.invalid'],['config','user.name','Synthetic installer check'],['add','.'],['commit','-qm','temporary fixture']]:
  check(run(['git',*args],root).returncode==0,'temporary git fixture')
 head=run(['git','rev-parse','HEAD'],root).stdout.strip()
 def install(action,*flags):return run(['python',str(PACKAGE/'install.py'),action,'--root',str(root),'--reviewed-head',head,*flags])
 check(install('check').returncode==0,'clean exact reviewed head check')
 check(install('apply').returncode!=0,'no silent approval')
 check(install('apply','--ack-latest-review').returncode==0,'additions apply')
 for name,h in manifest['addedFiles'].items():check(hashlib.sha256((root/name).read_bytes()).hexdigest()==h,'payload hash '+name)
 check(install('apply','--ack-latest-review').returncode!=0,'duplicate apply refused')
 first=root/next(iter(manifest['addedFiles']));original=first.read_bytes();first.write_bytes(original+b'\nchanged')
 check(install('rollback').returncode!=0,'modified addition rollback refused')
 first.write_bytes(original);check(install('rollback').returncode==0,'exact additions rollback')
 check(all(not(root/name).exists() for name in manifest['addedFiles']),'all additions removed, originals retained')
 guard=root/next(iter(manifest['guards']));guard.write_bytes(guard.read_bytes()+b'\nchanged')
 check(install('check').returncode!=0,'mismatched engine or dirty tree refused')
 run(['git','restore','.'],root);run(['git','branch','-m','main'],root)
 check(install('check').returncode!=0,'main protected')
 check(run(['git','rev-parse','HEAD'],root).stdout.strip()==head,'source commit not changed by installer')
 compile_root=pathlib.Path(tmp)/'canonical'
 shutil.copytree(PACKAGE/'payload',compile_root)
 for name in manifest['guards']:
  p=compile_root/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,p)
 (compile_root/'node_modules').symlink_to(ROOT/'artifacts/nuvia-ui-review/node_modules',target_is_directory=True)
 tsc=next((ROOT/'node_modules/.pnpm').glob('typescript@*/node_modules/typescript/bin/tsc'))
 compiled=run(['node',str(tsc),'--strict','--skipLibCheck','--esModuleInterop','--target','ES2022','--lib','ES2022,DOM,DOM.Iterable','--module','ESNext','--moduleResolution','bundler','--jsx','react-jsx','--noEmit',str(compile_root/'src/personal-main.tsx')],compile_root)
 check(compiled.returncode==0,'canonical rewritten package typecheck:\n'+compiled.stdout+compiled.stderr)
print(f'PASS package {checks} checks: additions/check/approval/hashes/collision/modified rollback/rollback/engine guard/main protection.')
