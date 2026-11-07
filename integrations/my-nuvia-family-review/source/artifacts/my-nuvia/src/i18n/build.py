import re, sys, json, os
here = os.path.dirname(__file__)
keys = re.findall(r"^  '([^']+)':", open(os.path.join(here, 'ko.ts')).read(), re.M)
names = {'en':'en','ja':'ja','zh-CN':'zhCN','zh-TW':'zhTW','mn':'mn','th':'th','vi':'vi','ar':'ar','ru':'ru','km':'km','es':'es','fr':'fr','it':'it','az':'az'}
ok = True
for code, var in names.items():
    p = os.path.join(here, 'src', code + '.txt')
    if not os.path.exists(p):
        print('missing', code); ok = False; continue
    lines = [l for l in open(p, encoding='utf-8').read().split('\n')]
    while lines and lines[-1] == '': lines.pop()
    if len(lines) != len(keys):
        print(code, 'line count', len(lines), 'expected', len(keys)); ok = False; continue
    out = ["import type { Dict } from './ko';", '', f'export const {var}: Dict = {{']
    for k, v in zip(keys, lines):
        v = v.replace('\\n', '\n')
        ph_ko = set(re.findall(r'\{\w+\}', open(os.path.join(here,'ko.ts')).read().split(f"'{k}':")[1].split('\n')[0]))
        ph = set(re.findall(r'\{\w+\}', v))
        if ph_ko != ph: print(code, k, 'placeholder mismatch', ph_ko, ph); ok = False
        out.append(f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},')
    out.append('};')
    open(os.path.join(here, code + '.ts'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('ok' if ok else 'errors')
