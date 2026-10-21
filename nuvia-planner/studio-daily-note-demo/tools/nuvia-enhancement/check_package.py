import hashlib, json, pathlib, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
PATCH=ROOT/'generated-artifacts/nuvia-enhancement/NUVIA_PLANNER_Bv2_personalization_additive_review'
M=json.loads((PATCH/'manifest.json').read_text())
def run(*args,ok=True):
 p=subprocess.run(list(map(str,args)),capture_output=True,text=True)
 assert (p.returncode==0)==ok,(args,p.stdout,p.stderr)
 return p.stdout+p.stderr
def fixture(root):
 root.mkdir();run('git','init','-b','review-fixture',root)
 for target in M['guards']:
  p=root/target;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((ROOT/'artifacts/nuvia-ui-review/src/official/adaptive'/pathlib.Path(target).name).read_bytes())
 (root/'package.json').write_text(json.dumps({'dependencies':{'react':'^19.1.0','react-dom':'^19.1.0','zod':'^4.0.0'}}))
 commit(root)
def commit(root):
 run('git','-C',root,'add','.')
 run('git','-C',root,'-c','user.name=Review Fixture','-c','user.email=review@example.invalid','commit','-m','Isolated synthetic fixture')
 return run('git','-C',root,'rev-parse','HEAD').strip()
def install(root,action,ok=True,ack=False):
 head=run('git','-C',root,'rev-parse','HEAD').strip()
 cmd=['python3',PATCH/'install.py',action,'--root',root,'--reviewed-head',head]
 if ack:cmd+=['--ack-latest-review']
 return run(*cmd,ok=ok)
with tempfile.TemporaryDirectory(prefix='nuvia-additive-package-') as d:
 root=pathlib.Path(d)/'happy';fixture(root)
 before={name:(root/name).read_bytes() for name in M['guards']}
 install(root,'check');assert not (root/'enhancement.html').exists()
 install(root,'apply',ok=False);assert not (root/'enhancement.html').exists()
 install(root,'apply',ack=True)
 for name,h in M['addedFiles'].items():assert hashlib.sha256((root/name).read_bytes()).hexdigest()==h
 assert all((root/name).read_bytes()==v for name,v in before.items())
 selected=next(iter(M['addedFiles']));original=(root/selected).read_bytes();(root/selected).write_bytes(original+b'\nchanged')
 install(root,'rollback',ok=False);assert (root/selected).exists()
 (root/selected).write_bytes(original);install(root,'rollback')
 assert all(not (root/name).exists() for name in M['addedFiles'])
 assert all((root/name).read_bytes()==v for name,v in before.items())
 collision=pathlib.Path(d)/'collision';fixture(collision)
 (collision/'enhancement.html').write_text('existing file must remain');commit(collision)
 assert '충돌' in install(collision,'check',ok=False)
 assert (collision/'enhancement.html').read_text()=='existing file must remain'
 mismatch=pathlib.Path(d)/'mismatch';fixture(mismatch)
 f=mismatch/next(iter(M['guards']));f.write_bytes(f.read_bytes()+b'\nnew integration change');commit(mismatch)
 assert '불일치' in install(mismatch,'check',ok=False);assert not (mismatch/'enhancement.html').exists()
 print('PASS package: manifest/payload hashes; dry check; explicit approval; additions-only apply; changed-file rollback refusal; clean rollback; collision and guard mismatch stop before writes. Only /tmp synthetic fixture repositories used.')
