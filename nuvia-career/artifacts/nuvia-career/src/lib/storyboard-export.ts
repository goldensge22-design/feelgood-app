import { storyboardText, type StoryboardDraft } from './storyboard';
import { REVIEW_DEMO } from './public-demo';

export function estimateStoryboardPages(draft: StoryboardDraft): number {
  // Advisory only; the PDF renderer uses actual DOM measurements and wraps.
  const lines = draft.sections.reduce((n, s) => n + s.split('\n').reduce((m, line) => m + Math.max(1, Math.ceil(Array.from(line).length / 48)), 0), 0);
  return Math.max(1, Math.ceil((lines + 14) / 43));
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * PDF uses the browser's font shaping (Arabic/Thai/Khmer included) and renders
 * at fixed readable 12pt size. No external conversion/upload service, no text
 * interpolated as HTML. Overflow produces more pages rather than lost text.
 * PDF is an image-backed document; DOCX/HWPX remain the editable alternatives.
 */
async function pdfBlob(draft: StoryboardDraft, labels: readonly string[], locale: string): Promise<Blob> {
  const { jsPDF }=await import('jspdf');
  const family=getComputedStyle(document.body).fontFamily;
  const sample=[...labels,...draft.sections,draft.company,draft.job].join(' ').slice(0,8000);
  // Only wait for the two fonts we need; a missing remote font must not
  // leave the entire document export waiting on a cloned iframe.
  let timer=0;
  try { await Promise.race([Promise.all([document.fonts.load(`400 16px ${family}`,sample),document.fonts.load(`700 18px ${family}`,sample)]),
    new Promise<void>(resolve=>{timer=window.setTimeout(resolve,3500);})]); }
  catch { /* Browser fallback fonts still shape the text. */ }
  finally { window.clearTimeout(timer); }
  const width=796,height=1126,margin=68,bottom=1052, lineHeight=27;
  const pdf=new jsPDF({unit:'mm',format:'a4',compress:true});
  pdf.setProperties({title:labels[0],author:'',creator:'NUVIA'});
  const canvas=document.createElement('canvas');
  canvas.width=width*2;canvas.height=height*2;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('PDF_CANVAS_UNAVAILABLE');
  ctx.scale(2,2);
  const rtl=locale==='ar';
  let y=margin, pages=0;
  const clear=()=>{ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#16243b';y=margin;};
  const save=()=>{if(pages++)pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');clear();};
  const words=new Intl.Segmenter(locale,{granularity:'word'});
  const glyphs=new Intl.Segmenter(locale,{granularity:'grapheme'});
  const max=width-2*margin;
  clear();
  ctx.textBaseline='top';
  const line=(str:string)=>{
    if(y+lineHeight>bottom)save();
    ctx.direction=rtl?'rtl':'ltr';ctx.textAlign=rtl?'right':'left';
    ctx.fillText(str,rtl?width-margin:margin,y);y+=lineHeight;
  };
  const paragraph=(str:string,heading=false)=>{
    ctx.font=`${heading?700:400} ${heading?18:16}px ${family}`;
    if(heading && y+2*lineHeight>bottom)save();
    for(const part of str.split('\n')){
      let pending='';
      for(const word of words.segment(part)){
        if(ctx.measureText(pending+word.segment).width<=max){pending+=word.segment;continue;}
        if(pending)line(pending);
        pending='';
        for(const g of glyphs.segment(word.segment)){
          if(pending && ctx.measureText(pending+g.segment).width>max){line(pending);pending='';}
          pending+=g.segment;
        }
      }
      line(pending);
    }
    if(heading)y+=4;
  };
  paragraph(labels[0] ?? '',true);
  if(draft.company||draft.job)paragraph([draft.company,draft.job].filter(Boolean).join(' · '));
  draft.sections.forEach((text,i)=>{if(!text&&!labels[i+1])return;y+=9;if(labels[i+1])paragraph(labels[i+1],true);if(text)paragraph(text);});
  save();
  return pdf.output('blob');
}

export async function downloadStoryboard(draft: StoryboardDraft, labels: readonly string[], format: 'pdf' | 'txt' | 'docx' | 'hwpx', locale: string, stillApproved = () => true): Promise<void> {
  const deliver = (blob:Blob) => {
    if (!stillApproved()) throw new Error('EXPORT_STALE');
    try { saveBlob(blob, `NUVIA-storyboard.${format}`); }
    catch { throw new Error('EXPORT_DOWNLOAD'); }
  };
  if (format === 'pdf') {
    let blob:Blob;
    try { blob=await pdfBlob(draft, labels, locale); }
    catch { throw new Error('EXPORT_PDF_RENDER'); }
    deliver(blob); return;
  }
  if (format === 'txt') {
    deliver(new Blob([storyboardText(draft, labels)], { type: 'text/plain;charset=utf-8' })); return;
  }
  const submission = {
    company: draft.company, job: draft.job, question: labels[0] ?? '',
    text: draft.sections.map((s, i) => labels[i+1]?`${labels[i+1]}\n${s}`:s).filter(Boolean).join('\n\n'),
  };
  const validateAndDeliver = async (blob: Blob) => {
    const pk = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
    if (pk[0] !== 80 || pk[1] !== 75 || pk[2] !== 3 || pk[3] !== 4) throw new Error('EXPORT_INVALID_DOCUMENT');
    deliver(blob);
  };
  if (REVIEW_DEMO) {
    const { reviewDocument } = await import('./storyboard-review-document').catch(() => { throw new Error('EXPORT_LOCAL_RENDER'); });
    await validateAndDeliver(await reviewDocument(submission, format));
    return;
  }
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), 30000);
  let blob:Blob;
  try {
    const response = await fetch(`${base}/api/career/export`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, signal:timeout.signal,
      body: JSON.stringify({ ...submission, format, confirmed: true }),
    });
    if (!response.ok) throw new Error(`EXPORT_${response.status}`);
    blob = await response.blob();
  } catch (err) {
    if (timeout.signal.aborted) throw new Error('EXPORT_TIMEOUT');
    if (err instanceof Error && /^EXPORT_\d{3}$/.test(err.message)) throw err;
    throw new Error('EXPORT_CONNECTION');
  } finally { window.clearTimeout(timer); }
  await validateAndDeliver(blob);
}
