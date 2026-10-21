#!/usr/bin/env python3
"""Additions only. No Git writes, pushes, config replacement or database operations."""
import argparse, hashlib, json, pathlib, subprocess, sys

HERE=pathlib.Path(__file__).resolve().parent
RECEIPT='.nuvia-enhancement-receipt.json'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stop(message):raise RuntimeError(message)
def git(root,*args):return subprocess.check_output(['git','-C',str(root),*args],text=True,stderr=subprocess.DEVNULL).strip()
def safe(root,name):
 p=root/name
 if not p.resolve().is_relative_to(root):stop('경로/심볼릭 링크가 검토 범위를 벗어납니다: '+name)
 return p
def main():
 p=argparse.ArgumentParser(description='최신 기준을 개발자가 검토한 별도 브랜치에서만 사용하세요.')
 p.add_argument('action',choices=['check','apply','rollback'])
 p.add_argument('--root',required=True,help='기존 NUVIA PLANNER source 디렉터리')
 p.add_argument('--reviewed-head',help='개발자가 최신 연동과 충돌 검토를 마친 정확한 대상 HEAD')
 p.add_argument('--ack-latest-review',action='store_true')
 args=p.parse_args();root=pathlib.Path(args.root).resolve()
 if not root.is_dir():stop('대상 폴더가 없습니다.')
 branch=git(root,'branch','--show-current')
 if not branch or branch in ['main','master']:stop('main/master/분리 HEAD에서는 적용·복구하지 않습니다. 별도 검토 브랜치를 만드세요.')
 receipt=root/RECEIPT
 if args.action=='rollback':
  if not receipt.is_file():stop('이 검토본의 추가 파일 명세가 없습니다.')
  r=json.loads(receipt.read_text());files=r['addedFiles']
  for name,h in files.items():
   target=safe(root,name)
   if not target.is_file() or digest(target)!=h:stop('추가 후 수정/누락된 파일이 있어 자동 복구 중단: '+name)
  for name in files:safe(root,name).unlink()
  receipt.unlink()
  print('추가 파일만 제거했습니다. 기존 소스·브라우저 저장 자료·서버는 변경하지 않았습니다.');return
 if not args.reviewed_head or git(root,'rev-parse','HEAD')!=args.reviewed_head:stop('--reviewed-head가 현재 HEAD와 정확히 같아야 합니다.')
 if git(root,'status','--porcelain'):stop('작업 트리가 깨끗하지 않습니다. 변경을 먼저 검토·보관하세요. 덮어쓰지 않습니다.')
 manifest=json.loads((HERE/'manifest.json').read_text())
 for name,h in manifest['guards'].items():
  target=safe(root,name)
  if not target.is_file() or digest(target)!=h:stop('B형 v2 의존 파일 불일치. 최신 결과지 연동과 수동 충돌 검토 필요: '+name)
 pkg=json.loads((root/'package.json').read_text());deps={**pkg.get('dependencies',{}),**pkg.get('devDependencies',{})}
 if not all(x in deps for x in ['react','react-dom','zod']):stop('react/react-dom/zod 의존성을 먼저 개발자가 검토해야 합니다. package.json을 자동 교체하지 않습니다.')
 additions=manifest['addedFiles']
 if receipt.exists():stop('기존 적용 명세가 있습니다. 중복 적용하지 않습니다.')
 for name,h in additions.items():
  target=safe(root,name);source=safe(HERE/'payload',name)
  if target.exists():stop('파일 충돌. 하나도 덮어쓰지 않습니다: '+name)
  if not source.is_file() or digest(source)!=h:stop('패치 산출물이 손상되었습니다: '+name)
 print('추가 파일 검증 통과:',len(additions),'개')
 print('공식 원출처:',manifest['officialOriginCommit'])
 print('현재 대상:',args.reviewed_head,'/ 최신 개발자 연동 호환성은 별도 검토 사항입니다.')
 print('기존 파일 자동 수정 0개. Vite 다중 진입점 연결·타입/빌드·실제 연동 검수는 별도로 해야 합니다.')
 if args.action=='check':return
 if not args.ack_latest_review:stop('실제 최신 기준과 충돌 검토 후 --ack-latest-review를 명시하세요.')
 written=[]
 try:
  for name in additions:
   target=safe(root,name);target.parent.mkdir(parents=True,exist_ok=True)
   with target.open('xb') as out:out.write((HERE/'payload'/name).read_bytes())
   written.append(name)
  with receipt.open('x') as out:json.dump({'reviewedHead':args.reviewed_head,'addedFiles':additions},out,indent=2)
 except Exception:
  for name in written:
   target=safe(root,name)
   if target.is_file() and digest(target)==additions[name]:target.unlink()
  raise
 print('검토용 추가 파일만 설치했습니다. 공식 적용·서버 연결·배포·push는 하지 않았습니다.')
if __name__=='__main__':
 try:main()
 except Exception as e:print('중단:',str(e),file=sys.stderr);sys.exit(1)
