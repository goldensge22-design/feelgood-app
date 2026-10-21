"""Persist a validated translation batch without rewriting large files through tool IO."""
import json,sys,re,pathlib,hashlib
root=pathlib.Path('artifacts/nuvia-ui-review/src/studio/i18n')
locale,batch=sys.argv[1:3]
source=json.loads((root/'locales/ko.json').read_text())
path=root/'locales'/f'{locale}.json'
saved=json.loads(path.read_text()) if path.exists() else {}
saved={k:v for k,v in saved.items() if k in source}
rows=json.loads(pathlib.Path(batch).read_text())
errors=[]
markers=lambda s: sorted(re.findall(r'\{([A-Za-z][A-Za-z0-9_]*)\}',s))
tags=lambda s: re.findall(r'</?[A-Za-z][^>]*>',s)
for key,text in rows.items():
    if key not in source or not isinstance(text,str) or not text.strip():
        errors.append([key,'key/empty']);continue
    # The runtime sets html lang/dir. Keep the resource's markup byte-identical.
    if source[key].startswith('<!doctype html><html lang="ko">'):
        text=re.sub(r'<html lang="[^"]+">','<html lang="ko">',text,count=1)
    if re.search('[가-힣]',text) or markers(text)!=markers(source[key]) or tags(text)!=tags(source[key]):
        errors.append([key,'Hangul/placeholders/HTML']);continue
    saved[key]=text
path.write_text(json.dumps(saved,ensure_ascii=False,indent=2)+'\n')
locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az']
progress={}
for loc in locales:
    p=root/'locales'/f'{loc}.json'
    count=len(json.loads(p.read_text())) if p.exists() else 0
    progress[loc]={'done':count,'total':len(source),'status':'SOURCE' if loc=='ko' else 'AI_DRAFT_COMPLETE' if count==len(source) else 'INCOMPLETE'}
(root/'translation-status.json').write_text(json.dumps({'schema':1,'sourceLocale':'ko','status':'AI_DRAFT_NOT_HUMAN_REVIEWED','sourceSHA256':hashlib.sha256((root/'locales/ko.json').read_bytes()).hexdigest(),'locales':progress},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'locale':locale,'saved':len(saved),'total':len(source),'rejected':errors}))
