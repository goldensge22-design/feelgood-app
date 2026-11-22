/** Downloads from the real review UI in a disposable Chromium context. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const out = resolve(import.meta.dirname, '../../generated-artifacts/nuvia-review-demo-qa');
const sections = [
  '모의 실습에서 다르게 적힌 안내를 확인했습니다.\n비교 기준을 먼저 정했습니다.',
  '교내 예약 안내를 이해하기 쉬운 순서로 설명하는 일에 관심이 있습니다.',
  '두 안내의 자격과 마감을 대조해 차이를 확인 질문으로 남겼습니다.',
  '확정 사실과 질문을 구분해 전달해야 함을 배웠습니다.',
];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE ?? '/repl/tools/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  await mkdir(out, { recursive: true });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 360, height: 800 } });
  await ctx.addCookies([{ name: 'review_qa_cookie', value: 'synthetic-cookie', url: root }]);
  const page = await ctx.newPage();
  await page.goto(`${root}/demo/review?lang=ko`);
  const by = (id: string) => page.getByTestId(id);
  await by('button-review-start').click();
  await by('link-review-report').click();
  await by('link-review-lab').click();
  await by('option-review-education').click();
  await by('checkbox-review-record').click();
  await by('button-review-continue').click();
  for (let i = 0; i < sections.length; i++) await by(`input-section-${i + 1}`).fill(sections[i]);
  await by('checkbox-fact').click();
  await by('checkbox-use').click();
  await by('button-confirm-storyboard').click();
  await by('status-confirmed').waitFor();
  const downloads: string[] = [];
  for (const format of ['txt', 'docx', 'hwpx', 'pdf']) {
    await by(`option-format-${format}`).click();
    const network = ['docx', 'hwpx'].includes(format)
      ? page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/career/export'))
      : null;
    const [file] = await Promise.all([
      page.waitForEvent('download', { timeout: 35000 }),
      by('button-download').click(),
    ]);
    if (network) {
      const request = await network;
      const headers = await request.allHeaders();
      assert.equal(headers.cookie, undefined, `${format} request must omit browser cookies`);
      const body = request.postDataJSON();
      assert.deepEqual(Object.keys(body).sort(), ['company', 'confirmed', 'format', 'job', 'question', 'text']);
    }
    assert.equal(await file.failure(), null);
    assert.equal(file.suggestedFilename(), `NUVIA-storyboard.${format}`);
    await file.saveAs(`${out}/synthetic-storyboard.${format}`);
    downloads.push(format);
  }
  const txt = await readFile(`${out}/synthetic-storyboard.txt`, 'utf8');
  assert(txt.includes('새봄교육 (가상) · 교육 운영 지원'));
  for (const section of sections) assert(txt.includes(section));
  const inspect = spawnSync('python', ['-c', `
import json,sys,zipfile,xml.etree.ElementTree as ET
lines=json.loads(sys.stdin.read())
for ext,entry in [('docx','word/document.xml'),('hwpx','Contents/section0.xml')]:
 with zipfile.ZipFile(sys.argv[1]+'/synthetic-storyboard.'+ext) as z:
  assert z.testzip() is None
  if ext=='hwpx': assert z.read('mimetype') == b'application/hwp+zip'
  root=ET.fromstring(z.read(entry))
  text='\\n'.join(e.text or '' for e in root.iter() if e.tag.endswith('}t'))
  for line in lines: assert line in text, (ext,line)
  assert 'review-demo-booking-simulation-v1' not in text
  assert 'review-sample-v1' not in text
`, out], { encoding: 'utf8', input: JSON.stringify(['새봄교육 (가상)', '교육 운영 지원', ...sections.flatMap((s) => s.split('\n'))]) });
  assert.equal(inspect.status, 0, inspect.stderr);
  const pdfPath = `${out}/synthetic-storyboard.pdf`;
  assert((await readFile(pdfPath)).subarray(0, 5).equals(Buffer.from('%PDF-')));
  const pdf = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  assert.equal(pdf.status, 0, pdf.stderr);
  assert.match(pdf.stdout, /Pages:\s+1\b/);
  assert.match(pdf.stdout, /Page size:.*A4/);
  const png = spawnSync('pdftoppm', ['-f', '1', '-l', '1', '-r', '100', '-singlefile', '-png', pdfPath, `${out}/synthetic-storyboard-pdf`]);
  assert.equal(png.status, 0);
  const result = {
    atUtc: new Date().toISOString(), browser: browser.version(), status: 'PASS', downloads,
    engine: 'disposable Chromium, 360×800', sections, docxHwpxBodyCheck: true, exportCookiesOmitted: true,
    pdf: 'A4, one page; raster output has separately rendered PNG', nativeOffice: 'not executed',
  };
  await writeFile(`${out}/download-results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
