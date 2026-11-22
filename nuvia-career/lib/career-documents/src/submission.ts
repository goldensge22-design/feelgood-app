export type SafeSubmission = { company: string; job: string; question: string; text: string };

// Only confirmed document fields; never serialize the workspace or original report.
export function submissionText(input: SafeSubmission): string {
  return [input.company, input.job, input.question, input.text].join("\n\n");
}

export function assertDocumentCharacters(input: SafeSubmission): void {
  for (const value of [input.company, input.job, input.question, input.text]) {
    for (const char of value) {
      const n = char.codePointAt(0)!;
      if (!(n === 9 || n === 10 || n === 13 || (n >= 0x20 && n <= 0xd7ff)
        || (n >= 0xe000 && n <= 0xfffd) || (n >= 0x10000 && n <= 0x10ffff)))
        throw new Error("INVALID_DOCUMENT_CHARACTER");
    }
  }
}
