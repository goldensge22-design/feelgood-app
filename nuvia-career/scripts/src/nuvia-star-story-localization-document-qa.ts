/** Independent machine-readable verification for localized UI downloads. */
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import mammoth from 'mammoth';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(workspaceRoot, 'generated-artifacts/job-connection-star-qa-20261110');
const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az'];
const questions: Record<string, string> = {
  ko: '지원 동기를 말씀해 주세요.', en: 'Why do you want to join this company?', ja: '志望動機を教えてください。',
  'zh-CN': '请说明你的求职动机。', 'zh-TW': '請說明你的求職動機。', mn: 'Ажилд орох шалтгаанаа тайлбарлана уу。',
  th: 'โปรดอธิบายแรงจูงใจในการสมัคร', vi: 'Hãy nêu động lực ứng tuyển của bạn.', ar: 'يرجى توضيح الدافع للتقديم.',
  ru: 'Расскажите о мотивации.', km: 'សូមពន្យល់ពីមូលហេតុដាក់ពាក្យ។', es: 'Explica tu motivación para postularte.',
  fr: 'Expliquez votre motivation.', it: 'Spiega la tua motivazione.', az: 'Müraciət motivasiyanızı izah edin.',
};
const results: any[] = [];

for (const locale of locales) {
  const expected = {
    company: `Motivation ${locale}`,
    job: 'Service planning',
    question: questions[locale],
    text: `My own draft ${locale}: simulation practice, not employment.\nVersion A ${locale}`,
  };
  const txt = await readFile(resolve(out, `${locale}.txt`), 'utf8');
  for (const value of Object.values(expected)) assert(txt.includes(value.replaceAll('\n', '\n')), `${locale} TXT missing expected text`);
  assert(!txt.includes(`STAR-KEEP-${locale}`), `${locale} TXT contains device-only STAR note`);

  const docx = await mammoth.extractRawText({ buffer: await readFile(resolve(out, `${locale}.docx`)) });
  assert.deepEqual(docx.messages, [], `${locale} DOCX parser warnings`);
  for (const [key, value] of Object.entries(expected)) {
    for (const line of value.split('\n').filter(Boolean)) assert(docx.value.includes(line), `${locale} DOCX missing ${key}`);
  }
  assert(!docx.value.includes(`STAR-KEEP-${locale}`), `${locale} DOCX contains device-only STAR note`);

  const hwpx = spawnSync('python3', ['-c', `
import sys,zipfile,xml.etree.ElementTree as ET
vals=sys.stdin.read().split('\\0')
company,job,question,text,marker=vals
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None
    assert z.infolist()[0].filename == 'mimetype'
    assert z.infolist()[0].compress_type == zipfile.ZIP_STORED
    assert z.read('mimetype') == b'application/hwp+zip'
    for name in z.namelist():
        if name.endswith(('.xml','.hpf')): ET.fromstring(z.read(name))
    expected='\\n\\n'.join([company,job,question,text])
    preview=z.read('Preview/PrvText.txt').decode('utf-8')
    assert preview == expected, (preview, expected)
    root=ET.fromstring(z.read('Contents/section0.xml'))
    body='\\n'.join(''.join(x.itertext()) for x in root.iter() if x.tag.endswith('}p'))
    for val in [company,job,question,*text.splitlines()]:
        if val: assert val in body, val
    assert marker not in body
print('PASS')
  `, resolve(out, `${locale}.hwpx`)], {
    input: `${expected.company}\0${expected.job}\0${expected.question}\0${expected.text}\0STAR-KEEP-${locale}`,
    encoding: 'utf8',
  });
  assert.equal(hwpx.status, 0, `${locale} HWPX: ${hwpx.stderr}`);
  results.push({ locale, status: 'passed', txt: true, docx: true, hwpx: true, matchedExpectedInput: true, excludedDeviceOnlySTAR: true });
}

await writeFile(resolve(out, 'document-checks.json'), JSON.stringify({
  checkedAt: new Date().toISOString(),
  source: 'actual files downloaded by the 360px synthetic-demo browser journey; not authenticated account exports',
  officeApplicationOpen: 'not_run',
  nativeWordOpen: 'not_run',
  nativeHancomOpen: 'not_run',
  locales: results,
  passed: results.length,
  failed: 0,
}, null, 2));
console.log(`PASS ${results.length} locales × TXT/DOCX/HWPX content and structure; native Word/Hancom open not run`);
