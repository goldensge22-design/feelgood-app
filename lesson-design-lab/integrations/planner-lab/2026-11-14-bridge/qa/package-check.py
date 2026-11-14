from pathlib import Path
import hashlib,json,shutil,subprocess,sys,zipfile,uuid
here=Path(__file__).resolve().parent.parent
root=here.parent.parent
fixture=here/'qa/apply-fixture'/uuid.uuid4().hex
fixture.mkdir(parents=True,exist_ok=True)
manifest=json.loads((here/'MANIFEST.json').read_text(encoding='utf-8'))
studio='artifacts/nuvia-ui-review/src/studio/StudioApp.tsx'
target=fixture/studio;target.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(root/'outputs/NUVIA_학생실습교안_20261113/patch-review/planner-p2'/studio,target)
def run(*args,expected=0):
    r=subprocess.run([sys.executable,str(here/'apply_patch.py'),'--target',str(fixture),*args],capture_output=True,text=True,encoding='utf-8')
    assert r.returncode==expected,(r.returncode,r.stdout,r.stderr)
    return json.loads(r.stdout)
assert run()['ready']==len(manifest['files'])
assert run('--apply')['applied']==len(manifest['files'])
assert run()['ready']==0
saved=target.read_bytes();target.write_bytes(saved+b'\n// intentional conflict test\n')
assert run(expected=2)['written']==False
target.write_bytes(saved)
assert run('--rollback')['rollbackReady']==len(manifest['files'])
assert run('--rollback','--apply')['rolledBack']==len(manifest['files'])
assert hashlib.sha256(target.read_bytes()).hexdigest()==next(i['baseSHA256'] for i in manifest['files'] if i['path']==studio)
zipname=here/'NUVIA_PLANNER_LAB_연결패치_20261114.zip'
with zipfile.ZipFile(zipname) as z:
    assert z.testzip() is None
    for item in manifest['files']:assert hashlib.sha256(z.read('payload/'+item['path'])).hexdigest()==item['sha256']
    assert all('synthetic.sqlite' not in n and '/preview/app.js' not in n for n in z.namelist())
    unpack=fixture/'unpacked';z.extractall(unpack)
report={'dryRun':True,'apply':True,'idempotentInspection':True,'conflictRefusal':True,'rollback':True,'restoredBaseline':True,'zipIntegrity':True,'payloadHashes':len(manifest['files']),'noQaDatabaseInZip':True}
(here/'qa/package-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report))
