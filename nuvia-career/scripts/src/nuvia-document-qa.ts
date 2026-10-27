/** Synthetic HTTP document round-trip checks. No account or user data is read. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import mammoth from 'mammoth';

const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const out = 'generated-artifacts/final-qa/documents';
await mkdir(out, { recursive: true });
const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az'];
const results: unknown[] = [];
const sample = {
  company: '가상 문서 QA 기업 · NOT A REAL APPLICATION',
  job: 'IT 서비스기획',
  question: '어떤 근거로 판단했나요?\n<원문 보존> & "인용" · 日本語 العربية ไทย ខ្មែរ 𠮷',
  text: '사용자가 직접 작성했다고 가정한 합성 문서 시험입니다.\n실제 행동이나 성과가 아닙니다.\n\n',
};
for (const [index, locale] of [...locales, 'ko-long'].entries()) {
  const input = { ...sample, text: sample.text.repeat(index === 15 ? 160 : 1) + locale };
  const response = await fetch(`${origin}/api/career/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input, confirmed: true, format: 'hwpx',
      report: 'PRIVATE-REPORT-MUST-NOT-EXPORT', plannerNotes: 'PRIVATE-NOTE-MUST-NOT-EXPORT',
      coach: 'PRIVATE-COACH-MUST-NOT-EXPORT', internalId: 'PRIVATE-ID-MUST-NOT-EXPORT',
    }),
  });
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('application/hwp+zip')) {
    throw new Error(`HWPX HTTP/type failure: ${response.status}`);
  }
  const file = `${out}/${locale}.hwpx`;
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  const inspection = spawnSync('python', ['-c', `
import sys,json,zipfile,xml.etree.ElementTree as ET
expected=json.loads(sys.stdin.read())
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 first=z.infolist()[0]
 assert first.filename=='mimetype' and first.compress_type==zipfile.ZIP_STORED
 assert z.read('mimetype')==b'application/hwp+zip'
 for name in z.namelist():
  if name.endswith(('.xml','.hpf')): ET.fromstring(z.read(name))
 content=ET.fromstring(z.read('Contents/content.hpf'))
 ids={e.attrib['id'] for e in content.iter() if e.tag.endswith('}item') and 'id' in e.attrib}
 for e in content.iter():
  if e.tag.endswith('}itemref'): assert e.attrib['idref'] in ids
 preview=z.read('Preview/PrvText.txt').decode('utf-8')
 assert preview=='\\n\\n'.join([expected['company'],expected['job'],expected['question'],expected['text']])
 section=ET.fromstring(z.read('Contents/section0.xml'))
 body='\\n'.join(''.join(p.itertext()) for p in section.iter() if p.tag.endswith('}p'))
 for value in expected.values():
  for line in value.splitlines():
   if line: assert line in body
 for name in z.namelist():
  if not name.endswith('/'):
   assert b'PRIVATE-' not in z.read(name)
print(json.dumps({'zipCRC':True,'xmlParsing':True,'manifestReferences':True,'bodyRoundTrip':True,'privateFieldsExcluded':True}))
`, file], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (inspection.status !== 0) throw new Error(`HWPX inspection failed: ${inspection.stderr}`);
  results.push({ case: locale, http: response.status, ...JSON.parse(inspection.stdout) });
}
const input = { ...sample, text: sample.text.repeat(160) };
const response = await fetch(`${origin}/api/career/export`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...input, confirmed: true, format: 'docx', internalId: 'PRIVATE-ID-MUST-NOT-EXPORT' }),
});
if (response.status !== 200) throw new Error(`DOCX HTTP failure: ${response.status}`);
const file = `${out}/long-korean.docx`;
await writeFile(file, Buffer.from(await response.arrayBuffer()));
const parsed = await mammoth.extractRawText({ buffer: await readFile(file) });
for (const value of Object.values(input)) {
  for (const line of value.split('\n').filter(Boolean)) {
    if (!parsed.value.includes(line)) throw new Error('DOCX text round-trip mismatch');
  }
}
if (parsed.messages.length || parsed.value.includes('PRIVATE-')) throw new Error('DOCX warnings or private field leak');
await writeFile('generated-artifacts/final-qa/document-results.json', JSON.stringify({
  createdAt: new Date().toISOString(), scope: 'Synthetic HTTP download + independent machine reading only',
  hwpx: results, docx: { http: response.status, mammothWarnings: parsed.messages, bodyRoundTrip: true },
  nativeWordHancomVisualOpening: false, officialFullHwpxXsdValidation: false,
}, null, 2));
console.log('PASS: 16 HWPX HTTP/ZIP/XML/body + DOCX HTTP/Mammoth; native Office opening NOT executed.');
