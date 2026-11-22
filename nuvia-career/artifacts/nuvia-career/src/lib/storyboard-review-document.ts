import { ExportCareerDocumentBody } from '@workspace/api-zod';
import type { SafeSubmission } from '@workspace/career-documents/docx';
import templateUrl from '@workspace/career-documents/template?url&inline';

/** The review demo never sends a participant's confirmed storyboard to a server. */
export async function reviewDocument(input: SafeSubmission, format: 'docx' | 'hwpx'): Promise<Blob> {
  const { success } = ExportCareerDocumentBody.safeParse({ ...input, format, confirmed: true });
  if (!success) throw new Error('EXPORT_LOCAL_INPUT');
  try {
    if (format === 'docx') {
      const { submissionDocxBlob } = await import('@workspace/career-documents/docx');
      return await submissionDocxBlob(input);
    }
    const { buildHwpx } = await import('@workspace/career-documents/hwpx');
    const template = () => Promise.resolve(Uint8Array.from(window.atob(templateUrl.split(',')[1]!), char => char.charCodeAt(0)));
    return await (await buildHwpx(input, template)).generateAsync({
      type: 'blob', mimeType: 'application/hwp+zip', compression: 'DEFLATE', compressionOptions: { level: 6 },
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.message === 'INVALID_DOCUMENT_CHARACTER' ?
      'EXPORT_LOCAL_INPUT' : 'EXPORT_LOCAL_RENDER');
  }
}
