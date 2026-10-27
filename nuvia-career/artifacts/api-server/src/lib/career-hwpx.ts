import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { submissionText, type SafeSubmission } from "./career-export";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
let template: Promise<{ header: string; root: string; sectionProperties: string; column: string }> | undefined;

// Invalid XML characters must fail visibly, not silently disappear from a
// user's submitted writing. Unicode supplementary characters remain intact.
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

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

function formattingTemplate() {
  template ??= (async () => {
    const bytes = await readFile(new URL("./assets/skeleton.hwpx", import.meta.url));
    const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
    const header = await zip.file("Contents/header.xml")!.async("string");
    const section = await zip.file("Contents/section0.xml")!.async("string");
    const root = section.match(/<hs:sec\b[^>]*>/)?.[0];
    const sectionProperties = section.match(/<hp:secPr\b[\s\S]*?<\/hp:secPr>/)?.[0];
    const column = section.match(/<hp:ctrl>[\s\S]*?<\/hp:ctrl>/)?.[0];
    if (!root || !sectionProperties || !column) throw new Error("INVALID_HWPX_TEMPLATE");
    return { header, root, sectionProperties, column };
  })();
  return template;
}

/** Real OWPML/HWPX package, not DOCX/HTML renamed with a different extension. */
export async function submissionHwpx(input: SafeSubmission): Promise<Buffer> {
  assertDocumentCharacters(input);
  const { header, root, sectionProperties, column } = await formattingTemplate();
  const text = submissionText(input).replace(/\r\n?/g, "\n");
  const paragraphs = text.split("\n").map((line, i) =>
    `<hp:p id="${i}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + (i === 0 ? `<hp:run charPrIDRef="0">${sectionProperties}${column}</hp:run>` : "")
    + `<hp:run charPrIDRef="0"><hp:t>${escapeXml(line)}</hp:t></hp:run></hp:p>`,
  ).join("");
  // No lineseg cache: a native reader must calculate wrapping for the new text.
  const zip = new JSZip();
  zip.file("mimetype", "application/hwp+zip", { compression: "STORE" });
  zip.file("version.xml", XML + '<hv:HCFVersion xmlns:hv="http://www.hancom.co.kr/hwpml/2011/version" tagetApplication="WORDPROCESSOR" major="5" minor="1" micro="1" buildNumber="0" os="1" xmlVersion="1.5" application="NUVIA" appVersion="1.0"/>');
  zip.file("Contents/header.xml", header);
  zip.file("Contents/section0.xml", XML + root + paragraphs + "</hs:sec>");
  zip.file("Contents/content.hpf", XML + '<opf:package xmlns:opf="http://www.idpf.org/2007/opf/" version="" unique-identifier="" id="">'
    + '<opf:metadata><opf:title/><opf:language>und</opf:language></opf:metadata>'
    + '<opf:manifest><opf:item id="header" href="Contents/header.xml" media-type="application/xml"/>'
    + '<opf:item id="section0" href="Contents/section0.xml" media-type="application/xml"/>'
    + '<opf:item id="settings" href="settings.xml" media-type="application/xml"/></opf:manifest>'
    + '<opf:spine><opf:itemref idref="header" linear="yes"/><opf:itemref idref="section0" linear="yes"/></opf:spine></opf:package>');
  zip.file("settings.xml", XML + '<ha:HWPApplicationSetting xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app"><ha:CaretPosition listIDRef="0" paraIDRef="0" pos="0"/></ha:HWPApplicationSetting>');
  zip.file("META-INF/container.xml", XML + '<ocf:container xmlns:ocf="urn:oasis:names:tc:opendocument:xmlns:container"><ocf:rootfiles>'
    + '<ocf:rootfile full-path="Contents/content.hpf" media-type="application/hwpml-package+xml"/>'
    + '<ocf:rootfile full-path="Preview/PrvText.txt" media-type="text/plain"/>'
    + '<ocf:rootfile full-path="META-INF/container.rdf" media-type="application/rdf+xml"/>'
    + '</ocf:rootfiles></ocf:container>');
  zip.file("META-INF/manifest.xml", XML + '<odf:manifest xmlns:odf="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>');
  zip.file("META-INF/container.rdf", XML + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="">'
    + '<rdf:type rdf:resource="http://www.hancom.co.kr/hwpml/2016/meta/pkg#Document"/>'
    + '</rdf:Description></rdf:RDF>');
  // This preview contains only the same explicit four-field allowlist.
  zip.file("Preview/PrvText.txt", text);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
