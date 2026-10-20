"""QA only: inspect every rasterized PDF page without changing the source PDF."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageStat
import json
from pypdf import PdfReader

root = Path(__file__).resolve().parent / 'qa'
page_count = len(PdfReader(root / 'employed-download.pdf').pages)
files = [root / f'pdf-all-{i:02d}.png' for i in range(1, page_count + 1)]
assert files
sheet = Image.new('RGB', (720, ((len(files) + 3) // 4) * 280), '#ddd')
draw = ImageDraw.Draw(sheet)
results = []
for i, file in enumerate(files):
    with Image.open(file) as original:
        gray = original.convert('L')
        assert ImageStat.Stat(gray).stddev[0] > 5, f'Blank PDF page: {file.name}'
        thumb = original.convert('RGB')
        thumb.thumbnail((170, 250))
        x, y = (i % 4) * 180, (i // 4) * 280
        sheet.paste(thumb, (x, y + 20))
        draw.text((x + 5, y + 2), str(i + 1), fill='black')
        results.append({'page': i + 1, 'notBlank': True})
sheet.save(root / 'pdf-contact.png')
(root / 'pdf-pages.json').write_text(json.dumps({'pages': len(files), 'checks': results}, indent=2) + '\n', encoding='utf-8', newline='\n')
