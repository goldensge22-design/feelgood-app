/**
 * Fallback Office fixtures only. Not an authenticated UI download or a native
 * Word/Hancom opening test. Never reads any account or stored writing.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import mammoth from 'mammoth';

const out = 'generated-artifacts/scoped-qa';
await mkdir(out, { recursive: true });
const createdAt = new Date().toISOString();
const input = {
  company: '가상 문서 검증 기업 — 실제 지원 아님',
  job: 'IT 서비스기획 — 합성 입력',
  question: [
    '긴 문항: 교내 예약 안내의 차이를 어떻게 관찰하고 정리했는지, 판단 근거와 실제 행동을 구분하여 설명해 주세요.',
    ...Array.from({ length: 10 }, (_, i) =>
      `문항 ${i + 1}. 신청 순서, 비교 기준, 관찰 결과, 바꾼 점과 배운 점을 구분하세요. 문단과 줄바꿈을 유지하고 근거 없는 성과는 쓰지 마세요.`),
    '문항 끝. 이 문항과 아래 작성문 전체는 문서 표시 검증을 위한 합성 내용입니다.',
  ].join('\n'),
  text: [
    '이 글은 한국어·긴 문서 표시를 확인하기 위한 합성 작성문입니다. 실제 개인의 경험이나 검사 결과가 아닙니다.',
    '',
    ...Array.from({ length: 90 }, (_, i) => [
      `문단 ${String(i + 1).padStart(3, '0')}. 예약 신청 안내의 순서를 기록하고 서로 다른 안내에서 비교할 항목을 정했다고 가정했습니다. 이 문장은 실제 수행 사실을 주장하지 않습니다.`,
      `관찰과 배움 ${i + 1}: 안내 문구의 차이를 구분하는 연습을 했다는 합성 사례입니다. 결과를 과장하지 않고 확인한 부분과 아직 모르는 부분을 나누었습니다.`,
      i === 44 ? '중간 확인: 따옴표 “원문”, 기호 <비교> & 숫자 12345, English ABC가 빠지지 않아야 합니다.' : '',
    ].join('\n')),
    '',
    '작성문 끝. 이 마지막 문장까지 누락 없이 보여야 합니다.',
  ].join('\n\n'),
};
const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const results: Record<string, unknown>[] = [];
for (const format of ['docx', 'hwpx'] as const) {
  const response = await fetch(`${origin}/api/career/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input, format, confirmed: true,
      report: 'PRIVATE_SYNTHETIC_REPORT_DO_NOT_EXPORT',
      plannerNotes: 'PRIVATE_SYNTHETIC_NOTE_DO_NOT_EXPORT',
      coach: 'PRIVATE_SYNTHETIC_COACH_DO_NOT_EXPORT',
      internalId: 'PRIVATE_SYNTHETIC_ID_DO_NOT_EXPORT',
    }),
  });
  const type = response.headers.get('content-type') ?? '';
  if (response.status !== 200 || !type.includes(format === 'hwpx' ? 'application/hwp+zip' : 'officedocument.wordprocessingml.document')) {
    throw new Error(`Fallback ${format} export HTTP/type failed: ${response.status}`);
  }
  const file = `${out}/nuvia-office-qa.${format}`;
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(file, bytes);
  const zipCheck = spawnSync('python', ['-c', `
import sys,zipfile,xml.etree.ElementTree as ET,json
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 for n in z.namelist():
  b=z.read(n)
  assert b'PRIVATE_SYNTHETIC_' not in b
  if n.endswith(('.xml','.hpf')): ET.fromstring(b)
 if sys.argv[1].endswith('.hwpx'):
  assert z.infolist()[0].filename=='mimetype'
  assert z.infolist()[0].compress_type==zipfile.ZIP_STORED
  assert z.read('mimetype')==b'application/hwp+zip'
  expected=json.loads(sys.stdin.read())
  assert z.read('Preview/PrvText.txt').decode('utf-8')=='\\n\\n'.join(expected.values())
  root=ET.fromstring(z.read('Contents/section0.xml'))
  body='\\n'.join(''.join(p.itertext()) for p in root.iter() if p.tag.endswith('}p'))
  offset=0
  for value in expected.values():
   for line in value.splitlines():
    if line:
     index=body.find(line,offset)
     assert index>=0
     offset=index+len(line)
print('ZIP/XML/private-field check passed')
`, file], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (zipCheck.status !== 0) throw new Error(zipCheck.stderr);
  if (format === 'docx') {
    const parsed = await mammoth.extractRawText({ buffer: await readFile(file) });
    if (parsed.messages.length) throw new Error('DOCX reader warnings');
    let offset = 0;
    for (const value of Object.values(input)) {
      for (const line of value.split(/\r?\n/).filter(Boolean)) {
        const index = parsed.value.indexOf(line, offset);
        if (index < 0) throw new Error('DOCX ordered text mismatch');
        offset = index + line.length;
      }
    }
  }
  results.push({
    format, http: response.status, mime: type, bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    independentMachineReading: 'passed',
    downloadedFromAuthenticatedUi: false,
    nativeApplication: null, nativeApplicationVersion: null,
    nativeVisualOpening: 'not_run',
  });
}
await writeFile(`${out}/expected-input.json`, JSON.stringify(input, null, 2));
await writeFile(`${out}/expected-input.txt`, Object.entries(input).map(([k, v]) => `[${k}]\n${v}`).join('\n\n'));
const escape = (s: string) => s.replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
await writeFile(`${out}/office-qa-guide.html`, `<!doctype html><html lang="ko"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Word·한컴 검증 인계</title>
<style>body{font:16px/1.7 system-ui,sans-serif;max-width:960px;margin:40px auto;padding:0 20px;color:#15233b}h1,h2{line-height:1.4}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f8;padding:20px}li{margin:8px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:10px;text-align:left}</style>
<h1>Word·한컴 실제 열기: 미실행</h1><p>생성 시각: ${escape(createdAt)} UTC. 아래 두 파일은 현재 내보내기 API로 생성·다운로드한 합성 대조용입니다.
<strong>로그인 계정 화면에서 다운로드한 파일이 아닙니다.</strong> ZIP/XML·텍스트 판독은 통과했지만 Word/한컴 시각 검증을 대신하지 않습니다.</p>
<h2>실제 앱에서 기록할 것</h2><table><tr><th>앱</th><th>형식</th><th>현재 상태</th></tr>
<tr><td>Microsoft Word — 제품/버전·OS·검사 시각 기입</td><td>DOCX</td><td>미실행</td></tr>
<tr><td>한컴 한글 — 제품/버전·OS·검사 시각 기입</td><td>HWPX, 가능하면 DOCX</td><td>미실행</td></tr></table>
<ol><li>기존 라이선스가 있는 앱에서 파일을 직접 여세요. 새 계정·라이선스를 만들지 마세요.</li>
<li>복구/손상 경고 유무와 정확한 문구를 기록하세요. 인터넷 다운로드의 일반 보호된 보기와 손상 복구 경고를 구분하세요.</li>
<li>첫 페이지, 문항 끝과 작성문 시작 경계, 문단 045 및 마지막 페이지를 캡처하세요. 페이지 수·확대 비율도 기록하세요.</li>
<li>긴 한국어 문항, 문단 001~090 순서, 빈 문단·줄바꿈, “원문” 및 &lt;비교&gt; &amp; 12345 English ABC, 마지막 문장을 아래 원문과 대조하세요.</li>
<li>글꼴 대체 여부와 실제 표시 글꼴, 페이지 경계의 잘림·겹침·누락을 기록하세요. 정확한 페이지 수는 앱/글꼴에 따라 달라질 수 있습니다.</li>
<li>출력에는 아래 회사·직무·문항·작성문만 있어야 합니다. 검사결과·개인 메모·코치 대화·내부 식별자는 없어야 합니다.</li>
<li>허용된 기존 테스트 계정으로 같은 입력을 등록한 후 사실 확인을 거쳐 실제 화면에서 두 형식을 다시 다운로드하고 그 파일로 재검사하세요. 이 대조용 파일을 계정 다운로드 성공 증거로 사용하지 마세요.</li></ol>
<h2>입력 원문</h2>${Object.entries(input).map(([k, v]) => `<h3>${escape(k)}</h3><pre>${escape(v)}</pre>`).join('')}
<h2>다운로드 동일성 확인용 SHA-256</h2><pre>${escape(JSON.stringify(results, null, 2))}</pre></html>`);
await writeFile(`${out}/office-results.json`, JSON.stringify({
  createdAt, scope: 'Fallback synthetic export files ONLY; no authenticated account access or native Office execution',
  inputCharacters: { question: input.question.length, text: input.text.length },
  results,
}, null, 2));
console.log(JSON.stringify({ createdAt, out, generatedFormats: results.map(r => r.format), nativeOpening: 'NOT_RUN', accountUiDownload: 'NOT_RUN' }));
