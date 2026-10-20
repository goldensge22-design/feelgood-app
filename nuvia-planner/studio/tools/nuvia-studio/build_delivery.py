"""Build an additive review patch and self-contained QA report; never edits app files."""
from pathlib import Path
import base64, difflib, hashlib, html, json, os, re, shutil, subprocess, tempfile, zipfile

ROOT=Path.cwd(); OUT=ROOT/'generated-artifacts/nuvia-studio'
APP=Path('artifacts/nuvia-ui-review'); TOOLS=Path('tools/nuvia-studio')
OUT.mkdir(parents=True,exist_ok=True)
packaged_head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
head=(OUT/'base-commit.txt').read_text().strip()
assert re.fullmatch(r'[0-9a-f]{40}',head),'Missing frozen starting baseline'
source=sorted([APP/'studio.html',APP/'src/studio-main.tsx',*[p for p in (APP/'src/studio').rglob('*') if p.is_file()],*[p for p in TOOLS.iterdir() if p.is_file()]])
vite=APP/'vite.config.ts'; after=vite.read_text()
before=''.join(line for line in after.splitlines(True) if "studio: path.resolve(import.meta.dirname, 'studio.html')" not in line)
assert before!=after and after.count("studio: path.resolve(import.meta.dirname, 'studio.html')")==1
patch=''.join(''.join(difflib.unified_diff([],p.read_text().splitlines(True),fromfile='/dev/null',tofile='b/'+p.as_posix())) for p in source)
patch+=''.join(difflib.unified_diff(before.splitlines(True),after.splitlines(True),fromfile='a/'+vite.as_posix(),tofile='b/'+vite.as_posix()))
(OUT/'changes.patch').write_text(patch)
(OUT/'FILES.txt').write_text('\n'.join([p.as_posix() for p in source]+[vite.as_posix()])+'\n')
deps=sorted(set([p for folder in [APP/'src/official',APP/'src/enhancement'] for p in folder.rglob('*') if p.is_file()]+[p for p in [Path('package.json'),Path('pnpm-lock.yaml'),Path('pnpm-workspace.yaml'),APP/'package.json',APP/'tsconfig.json',Path('tools/nuvia-enhancement/browser-lib.mjs')] if p.is_file()]))
manifest={p.as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in deps}
manifest[vite.as_posix()]=hashlib.sha256(before.encode()).hexdigest()
(OUT/'BASE_MANIFEST.json').write_text(json.dumps({'gitHead':head,'packagedAtHead':packaged_head,'note':'Frozen starting HEAD plus pre-existing uncommitted work; hashes are actual precondition. Packaging checkpoint is not an application baseline. defa19d unverified.','existing':manifest,'new':[p.as_posix() for p in source]},ensure_ascii=False,indent=2))
preflight='''from pathlib import Path
import hashlib,json,sys
m=json.loads((Path(__file__).parent/'BASE_MANIFEST.json').read_text())
errors=[]
if Path('artifacts/nuvia-ui-review/src/studio').exists():errors.append('New studio folder already exists. STOP; do not overwrite.')
for name,want in m['existing'].items():
 p=Path(name)
 if not p.is_file():errors.append('Missing dependency: '+name)
 elif hashlib.sha256(p.read_bytes()).hexdigest()!=want:errors.append('Different existing file: '+name)
for name in m['new']:
 if Path(name).exists():errors.append('New path already exists: '+name)
if errors:print('\\n'.join(errors));sys.exit(1)
print('Preconditions match this Replit source only. Still review latest developer contract; run git apply --check. No changes made.')
'''
(OUT/'preflight.py').write_text(preflight)
# Reconstruct only the dependencies in /tmp; check forward/reverse application there.
with tempfile.TemporaryDirectory(prefix='nuvia-studio-patch-') as tmp:
 tmp=Path(tmp)
 for p in deps:
  dest=tmp/p;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
 (tmp/vite).parent.mkdir(parents=True,exist_ok=True);(tmp/vite).write_text(before)
 check=subprocess.check_output(['python',str(OUT/'preflight.py')],cwd=tmp,text=True)
 subprocess.run(['git','apply','--check',str(OUT/'changes.patch')],cwd=tmp,check=True,capture_output=True)
 subprocess.run(['git','apply',str(OUT/'changes.patch')],cwd=tmp,check=True,capture_output=True)
 for p in source:assert (tmp/p).read_bytes()==p.read_bytes(),p
 subprocess.run(['git','apply','-R','--check',str(OUT/'changes.patch')],cwd=tmp,check=True,capture_output=True)
 subprocess.run(['git','apply','-R',str(OUT/'changes.patch')],cwd=tmp,check=True,capture_output=True)
 assert (tmp/vite).read_text()==before
 assert not (tmp/APP/'studio.html').exists()
 (OUT/'logs/patch-check.log').write_text(check+f'PASS forward check/apply/exact new content/reverse check/apply in temporary baseline. {len(source)} additions, 1 existing Vite entry edit. Live workspace not patched.\n')

def markup(s):
 s=html.escape(s);s=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',s);s=re.sub(r'`([^`]+)`',r'<code>\1</code>',s);return s
def md(text):
 out=[];table=False;fence=False
 for line in text.splitlines():
  if line.startswith('```'):
   if table:out.append('</tbody></table></div>');table=False
   out.append('</pre>' if fence else '<pre>');fence=not fence;continue
  if fence:out.append(html.escape(line)+'\n');continue
  if line.startswith('|'):
   if re.match(r'^\|[-| :]+\|$',line):continue
   cells=line.strip('|').split('|')
   if not table:out.append('<div class="table"><table><tbody>');table=True
   out.append('<tr>'+''.join('<td>'+markup(x.strip())+'</td>' for x in cells)+'</tr>');continue
  if table:out.append('</tbody></table></div>');table=False
  match=re.match(r'^(#{1,3}) (.*)',line)
  if match:out.append(f'<h{len(match[1])}>{markup(match[2])}</h{len(match[1])}>')
  elif line.startswith('- '):out.append('<p class="bullet">• '+markup(line[2:])+'</p>')
  elif line:out.append('<p>'+markup(line)+'</p>')
 if table:out.append('</tbody></table></div>')
 return '\n'.join(out)
domain=os.environ['REPLIT_DEV_DOMAIN'];url='https://'+domain+'/studio.html'
pics=[
 ('comparison-previous','이전 화면 · 동일한 합성 과제 데이터'),
 ('comparison-studio','새 작업대 · 동일한 합성 과제 데이터'),
 ('desktop-desk','작업대 · 명시적 시작 전'),
 ('mobile-execution','360px · 현재 행동 우선 실행'),
 ('tablet-desk','768px 태블릿'),
 ('many-long-mobile','긴 제목·다수·같은 제목 선택'),
 ('archive-reminder','보관 7일 · 한 번의 비차단 안내'),
 ('activity-planning','실제 분량·시간 계획 확정'),
 ('activity-attention','실제 현재 행동 선택'),
 ('activity-simultaneous','실제 두 항목과 관계 확인'),
 ('activity-successive','실제 단계 작성·한 단계 진행'),
 ('roadmap-desktop','원본 연결 경험·문장별 확인/선택'),
 ('rendered-report-1440','실제 렌더된 월간 보고서'),
 ('rendered-report-360','360px 실제 보고서'),
 ('next-month','다음 달 · 수정·수락 전'),
 ('next-month-mobile','360px 다음 달 제안')]
figures=[]
for name,label in pics:
 p=ROOT/'screenshots/studio'/f'{name}.png'
 if not p.exists():raise RuntimeError('Missing actual capture: '+str(p))
 figures.append(f'<figure><img alt="{html.escape(label)}" src="data:image/png;base64,{base64.b64encode(p.read_bytes()).decode()}"><figcaption>{html.escape(label)} · 실제 브라우저 / 합성 검수 기록</figcaption></figure>')
logs=[]
for name in ['core','browser','activity-browser','previous-regression','insights-regression','types','build','patch-check']:
 p=OUT/'logs'/f'{name}.log';logs.append(f'<details><summary>{name} 실행 로그</summary><pre>{html.escape(p.read_text())}</pre></details>')
document=f'''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NUVIA PLANNER 작업대 · 검수와 인계</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#f6f1e6;color:#182b49;font:16px/1.7 system-ui,sans-serif}}main{{max-width:1300px;margin:auto;padding:24px}}h1{{font-size:30px}}h2{{margin-top:32px;border-top:2px solid #cbd1dd;padding-top:18px}}a{{color:#124a9b}}.warning{{padding:18px;background:#fff1df;border-left:5px solid #bd681f;border-radius:10px}}.links a{{display:inline-block;padding:12px;margin:5px;background:#183254;color:white;border-radius:8px}}table{{border-collapse:collapse;width:100%;font-size:14px;background:#fffdf7}}td{{vertical-align:top;border:1px solid #ccd2db;padding:10px;overflow-wrap:anywhere}}tr:first-child{{font-weight:bold;background:#e5eaf1}}.table{{overflow-x:auto}}pre{{background:#fffdf7;padding:16px;border-radius:10px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 system-ui}}code{{overflow-wrap:anywhere}}.captures{{display:grid;grid-template-columns:1fr 1fr;gap:18px}}figure{{margin:0;background:#fffdf7;border-radius:10px;padding:10px}}img{{width:100%;height:auto;display:block}}figcaption{{font-size:14px}}details{{margin:12px 0;background:white;padding:12px}}summary{{cursor:pointer;min-height:44px}}.bullet{{margin:5px 0}}@media(max-width:700px){{main{{padding:14px}}.captures{{grid-template-columns:1fr}}}}@media print{{.captures{{grid-template-columns:1fr}}figure,details{{break-inside:avoid}}}}
</style><main><h1>NUVIA PLANNER · 내 하루 작업대</h1><p>독립 후보의 기능·저장·검수·추가 패치 인계. 연구나 운영 배포 결과가 아닙니다.</p><p class="warning"><b>정식 서버/인증/동기화는 미연결.</b> 기존 기준본과 개인 월간은 보존합니다. 개발자 최신 결과지 연동본 defa19d와의 병합·호환은 미검증입니다. 덮어쓰지 말고 충돌 시 중단하세요.</p><div class="links"><a href="{html.escape(url)}">새 작업대 직접 실행</a><a href="{html.escape(url+'?review=1')}">합성 월간 검토 모드</a></div><p>임시 개발 미리보기입니다. 서버 종료 시 열리지 않으며 공개 운영 URL이 아닙니다.</p>{md((TOOLS/'QA_REPORT.md').read_text())}<h2>실제 화면 캡처</h2><div class="captures">{''.join(figures)}</div>{md((TOOLS/'APPLY_GUIDE.md').read_text())}{md((TOOLS/'TRANSLATION_REVIEW.md').read_text())}<h2>정확한 변경 파일 목록</h2><pre>{html.escape((OUT/'FILES.txt').read_text())}</pre><h2>실행 로그</h2>{''.join(logs)}</main></html>'''
(OUT/'NUVIA_STUDIO_QA.html').write_text(document)
zipname=OUT/f'NUVIA_STUDIO_REVIEW_additive_{head[:8]}.zip'
with zipfile.ZipFile(zipname,'w',zipfile.ZIP_DEFLATED) as z:
 for name in ['changes.patch','FILES.txt','BASE_MANIFEST.json','preflight.py','NUVIA_STUDIO_QA.html']:
  z.write(OUT/name,name)
 for name in ['QA_REPORT.md','APPLY_GUIDE.md','TRANSLATION_REVIEW.md']:z.write(TOOLS/name,name)
 for p in (OUT/'logs').glob('*'):
  if p.is_file():z.write(p,'evidence/logs/'+p.name)
 for p in (ROOT/'screenshots/studio').glob('*.png'):z.write(p,'evidence/screenshots/'+p.name)
 pdf=OUT/'synthetic-monthly-print.pdf'
 if pdf.exists():z.write(pdf,'evidence/synthetic-monthly-print.pdf')
 old=ROOT/'generated-artifacts/nuvia-personal/logs/original-regression.log'
 if old.exists():z.write(old,'evidence/prior-original-regression-4-known.log')
print(json.dumps({'zip':str(zipname.relative_to(ROOT)),'report':str((OUT/'NUVIA_STUDIO_QA.html').relative_to(ROOT)),'newFiles':len(source),'modifiedFiles':1,'base':head,'zipBytes':zipname.stat().st_size},ensure_ascii=False))
