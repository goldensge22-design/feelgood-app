import argparse,hashlib,json,pathlib,shutil
p=argparse.ArgumentParser()
p.add_argument("--root",type=pathlib.Path,required=True)
p.add_argument("--apply",action="store_true")
p.add_argument("--backup",type=pathlib.Path)
a=p.parse_args()
here=pathlib.Path(__file__).resolve().parent
rows=json.loads((here/"SOURCE_MANIFEST.json").read_text())["files"]
root=a.root.resolve()
for row in rows:
 f=root/row["path"]
 if f.is_symlink():raise SystemExit("Stop: symlink "+str(f))
 current=hashlib.sha256(f.read_bytes()).hexdigest() if f.exists() else None
 if current!=row["before"]:raise SystemExit("Stop: baseline/new-path conflict "+row["path"])
 if hashlib.sha256((here/"payload"/row["path"]).read_bytes()).hexdigest()!=row["after"]:raise SystemExit("Stop: payload checksum")
print("Preflight PASS",len(rows),"files")
if a.apply:
 if not a.backup:raise SystemExit("--backup required")
 backup=a.backup.resolve()
 if backup==root or root in backup.parents:raise SystemExit("Backup must be outside checkout")
 backup.mkdir(parents=True,exist_ok=False)
 (backup/"MANIFEST.json").write_text(json.dumps(rows,indent=2))
 for row in rows:
  dst=root/row["path"]
  if dst.exists():
   saved=backup/row["path"];saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dst,saved)
 for row in rows:
  dst=root/row["path"];dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(here/"payload"/row["path"],dst)
 print("Applied; originals backed up at",backup)
