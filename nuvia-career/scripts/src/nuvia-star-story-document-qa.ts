/** Independent content/structure check of documents downloaded by the STAR UI QA. */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import mammoth from 'mammoth';
import assert from 'node:assert/strict';

const out = 'generated-artifacts/star-story-qa';
const input = JSON.parse(await readFile(`${out}/ko-1440-docx-input.json`, 'utf8'));
const secretSidecarText = '모의 화면에서 신청 안내가 서로 달랐다.';
const docxText = await mammoth.extractRawText({ buffer: await readFile(`${out}/ko-1440-synthetic.docx`) });
assert.deepEqual(docxText.messages, []);
for (const key of ['company', 'job', 'question', 'text']) {
  for (const line of input[key].split('\n').filter(Boolean)) assert(docxText.value.includes(line), `DOCX missing ${key}`);
}
assert(!docxText.value.includes(secretSidecarText));

const hwpxInput = JSON.parse(await readFile(`${out}/ko-1440-hwpx-input.json`, 'utf8'));
const hwpx = spawnSync('python', ['-c', `
import sys,json,zipfile,xml.etree.ElementTree as ET
v=json.loads(sys.stdin.read())
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None
    assert z.infolist()[0].filename == 'mimetype'
    assert z.infolist()[0].compress_type == zipfile.ZIP_STORED
    assert z.read('mimetype') == b'application/hwp+zip'
    for name in z.namelist():
        if name.endswith(('.xml','.hpf')): ET.fromstring(z.read(name))
    expected='\\n\\n'.join(v[k] for k in ['company','job','question','text'])
    assert z.read('Preview/PrvText.txt').decode('utf-8') == expected
    root=ET.fromstring(z.read('Contents/section0.xml'))
    body='\\n'.join(''.join(x.itertext()) for x in root.iter() if x.tag.endswith('}p'))
    for key in ['company','job','question','text']:
        for line in v[key].splitlines():
            if line: assert line in body, (key,line)
    assert ${JSON.stringify(secretSidecarText)} not in body
print('PASS')
`, `${out}/ko-1440-synthetic.hwpx`], { input: JSON.stringify(hwpxInput), encoding: 'utf8' });
assert.equal(hwpx.status, 0, hwpx.stderr);

const result = {
  checkedAt: new Date().toISOString(),
  source: 'actual downloads from local production-build public synthetic demo; not an authenticated account',
  docx: { status: 'passed', method: 'Mammoth independent body extraction', matchesInput: true, nativeWordOpen: 'not_run' },
  hwpx: { status: 'passed', method: 'ZIP CRC, MIME, XML parsing, section body and Preview round-trip', matchesInput: true, nativeHancomOpen: 'not_run' },
  excluded: ['device-only STAR situation/role notes'],
};
await writeFile(`${out}/document-checks.json`, JSON.stringify(result, null, 2));
console.log('PASS synthetic DOCX/HWPX content and structure; Microsoft Word and Hancom visual open not run');
