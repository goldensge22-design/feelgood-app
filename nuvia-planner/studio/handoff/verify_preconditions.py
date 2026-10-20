import json,hashlib,sys,pathlib
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '.')
m=json.loads(pathlib.Path(__file__).with_name('PATCH_PRECONDITIONS.json').read_text())
errors=[]
for name,expected in m['files'].items():
 p=root/name
 if expected is None:
  if p.exists():errors.append(name+': new path already exists')
 elif not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected:errors.append(name+': baseline mismatch')
print('\n'.join(errors) if errors else 'Preconditions match; still run git apply --check and integration QA.')
sys.exit(1 if errors else 0)
