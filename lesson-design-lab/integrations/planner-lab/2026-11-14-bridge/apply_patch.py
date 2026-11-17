"""Version-checked additive patch. Default is inspection, never force-overwrite."""
import argparse,hashlib,json,shutil,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
here=Path(__file__).resolve().parent
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
def contained(root,relative):
    p=(root/relative).resolve()
    if not p.is_relative_to(root): raise SystemExit('Unsafe path: '+relative)
    return p
ap=argparse.ArgumentParser()
ap.add_argument('--target',required=True)
ap.add_argument('--apply',action='store_true')
ap.add_argument('--rollback',action='store_true')
args=ap.parse_args(); root=Path(args.target).resolve()
if not root.is_dir(): raise SystemExit('Target directory does not exist')
manifest=json.loads((here/'MANIFEST.json').read_text(encoding='utf-8'))
backup=contained(root,'.planner-lab-backup/20261114.1')
if args.rollback:
    log=backup/'applied.json'
    if not log.is_file(): raise SystemExit('No application record')
    applied=json.loads(log.read_text(encoding='utf-8'))
    for item in applied:
        target=contained(root,item['path'])
        if digest(target)!=item['after']: raise SystemExit('Rollback conflict: '+item['path'])
    if not args.apply: print(json.dumps({'rollbackReady':len(applied),'written':False}));raise SystemExit(0)
    for item in reversed(applied):
        target=contained(root,item['path'])
        if item['before'] is None: target.unlink()
        else: shutil.copy2(contained(backup,item['path']),target)
    log.rename(backup/'rolled-back.json')
    print(json.dumps({'rolledBack':len(applied)}));raise SystemExit(0)
changes=[]; conflicts=[]
for item in manifest['files']:
    relative=item['path']; source=contained(here/'payload',relative);target=contained(root,relative)
    if digest(source)!=item['sha256']: raise SystemExit('Corrupt payload: '+relative)
    old=digest(target)
    if old==item['sha256']: continue
    if old is not None and old!=item.get('baseSHA256'): conflicts.append(relative)
    if old is None and item.get('baseSHA256'): conflicts.append(relative+' (required base missing)')
    changes.append({'path':relative,'before':old,'after':item['sha256']})
if conflicts: print(json.dumps({'conflicts':conflicts,'written':False},ensure_ascii=False));raise SystemExit(2)
if not args.apply: print(json.dumps({'ready':len(changes),'written':False},ensure_ascii=False));raise SystemExit(0)
if (backup/'applied.json').exists(): raise SystemExit('Previous application record exists; inspect/rollback first')
backup.mkdir(parents=True,exist_ok=True)
for item in changes:
    target=contained(root,item['path'])
    if item['before'] is not None:
        saved=contained(backup,item['path']);saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,saved)
(backup/'applied.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf-8')
for item in changes:
    source=contained(here/'payload',item['path']);target=contained(root,item['path']);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
print(json.dumps({'applied':len(changes),'backup':str(backup)},ensure_ascii=False))
