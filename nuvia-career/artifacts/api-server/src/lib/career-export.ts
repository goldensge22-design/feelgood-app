import { Document, Packer, Paragraph, TextRun } from "docx";

export type SafeSubmission = { company: string; job: string; question: string; text: string };

// An explicit allowlist: never serialize application/workspace/report objects here.
export function submissionText(input: SafeSubmission): string {
  return [input.company, input.job, input.question, input.text].join("\n\n");
}

export async function submissionDocx(input: SafeSubmission): Promise<Buffer> {
  const values = [input.company, input.job, input.question, input.text];
  const paragraphs = values.flatMap((value, index) => [
    ...value.split(/\r?\n/).map((line) => new Paragraph({
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
  const doc = new Document({
    sections: [{ children: paragraphs }],
  });
  return Packer.toBuffer(doc);
}
