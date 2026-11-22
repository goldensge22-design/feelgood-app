import { Document, Packer, Paragraph, TextRun } from "docx";
import { assertDocumentCharacters, type SafeSubmission } from "./submission";
export { submissionText, type SafeSubmission } from "./submission";

function submissionDocument(input: SafeSubmission): Document {
  assertDocumentCharacters(input);
  const values = [input.company, input.job, input.question, input.text];
  const paragraphs = values.flatMap((value, index) => [
    ...value.split(/\r\n?|\n/).map((line) => new Paragraph({
      bidirectional: /[\u0600-\u06ff]/.test(line),
      spacing: { after: 140 },
      children: [new TextRun({
        text: line,
        bold: index < 2,
        size: index < 2 ? 28 : 22,
        font: "Arial",
      })],
    })),
    new Paragraph(""),
  ]);
  return new Document({ sections: [{ children: paragraphs }] });
}

export function submissionDocx(input: SafeSubmission): Promise<Buffer> {
  return Packer.toBuffer(submissionDocument(input));
}

export function submissionDocxBlob(input: SafeSubmission): Promise<Blob> {
  return Packer.toBlob(submissionDocument(input));
}
