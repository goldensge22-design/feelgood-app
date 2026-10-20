"""Read the official workbook; generate a reproducible, code-keyed job catalog."""
import hashlib
import json
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent
source = ROOT / 'source/KECO_2025_MOEL.xlsx'
assert hashlib.sha256(source.read_bytes()).hexdigest() == 'b8b52f438772d695470c09cfe3ca30b6200062fd70f835004bc603fd0aad1362'
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
groups, occupations, labels = {}, [], {}
parents = {}
for row in workbook.worksheets[0].iter_rows(min_row=4, values_only=True):
    for offset, size in [(0, 1), (2, 2), (4, 3)]:
        if row[offset] is not None and row[offset + 1]:
            code = str(row[offset]).strip().zfill(size)
            parents[size] = code
            groups[code] = {'code': code, 'parent': parents.get(size - 1) if size > 1 else None}
            labels['occupation.' + code] = str(row[offset + 1]).strip()
    if row[6] is not None and row[7]:
        code = str(row[6]).strip().zfill(4)
        if not code.isdigit() or len(code) != 4:
            continue
        occupations.append({'code': code, 'major': parents[1], 'middle': parents[2], 'group': parents[3]})
        labels['occupation.' + code] = str(row[7]).strip()
assert len({o['code'] for o in occupations}) == len(occupations)
catalog = {'version': 'KECO-2025', 'source': 'https://www.moel.go.kr/info/lawinfo/instruction/view.do?bbs_seq=20241200770',
           'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'groups': list(groups.values()), 'occupations': occupations}
(ROOT / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
(ROOT / 'catalog.js').write_text('(function(g){g.DCasOccupationCatalog=' + json.dumps(catalog, ensure_ascii=False) + ';})(typeof window!=="undefined"?window:globalThis);\n', encoding='utf-8', newline='\n')
(ROOT / 'catalog.ko.json').write_text(json.dumps(labels, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(json.dumps({'groups': {n: sum(len(k) == n for k in groups) for n in [1,2,3]}, 'occupations': len(occupations)}))
