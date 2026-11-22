import { buildHwpx, type SafeSubmission } from "@workspace/career-documents/hwpx";
import { readFile } from "node:fs/promises";
export { assertDocumentCharacters } from "@workspace/career-documents/hwpx";

async function loadTemplate() {
  try { return await readFile(new URL("./assets/skeleton.hwpx", import.meta.url)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // Unit tests execute the source rather than the bundle and its copied asset.
    return readFile(new URL(import.meta.resolve("@workspace/career-documents/template")));
  }
}

export async function submissionHwpx(input: SafeSubmission): Promise<Buffer> {
  const zip = await buildHwpx(input, loadTemplate);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
