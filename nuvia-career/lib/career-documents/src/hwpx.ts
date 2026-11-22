import JSZip from "jszip";
import { assertDocumentCharacters, submissionText, type SafeSubmission } from "./submission";
export { assertDocumentCharacters, type SafeSubmission } from "./submission";

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
type Template = { header: string; root: string; sectionProperties: string; column: string };
const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

let template: Promise<Template> | undefined;
function formattingTemplate(load: () => Promise<ArrayBuffer | Uint8Array>): Promise<Template> {
  template ??= (async () => {
    const zip = await JSZip.loadAsync(await load(), { checkCRC32: true });
    const header = await zip.file("Contents/header.xml")!.async("string");
    const section = await zip.file("Contents/section0.xml")!.async("string");
    const root = section.match(/<hs:sec\b[^>]*>/)?.[0];
    const sectionProperties = section.match(/<hp:secPr\b[\s\S]*?<\/hp:secPr>/)?.[0];
    const column = section.match(/<hp:ctrl>[\s\S]*?<\/hp:ctrl>/)?.[0];
    if (!root || !sectionProperties || !column) throw new Error("INVALID_HWPX_TEMPLATE");
    return { header, root, sectionProperties, column };
  })().catch((error: unknown) => { template = undefined; throw error; });
  return template;
}

/** Builds an editable OWPML document; the server and the demo use the same renderer. */
export async function buildHwpx(input: SafeSubmission, load: () => Promise<ArrayBuffer | Uint8Array>): Promise<JSZip> {
  assertDocumentCharacters(input);
  const { header, root, sectionProperties, column } = await formattingTemplate(load);
  const text = submissionText(input).replace(/\r\n?/g, "\n");
  const paragraphs = text.split("\n").map((line, i) =>
    `<hp:p id="${i}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">`
    + (i === 0 ? `<hp:run charPrIDRef="0">${sectionProperties}${column}</hp:run>` : "")
    + `<hp:run charPrIDRef="0"><hp:t>${escapeXml(line)}</hp:t></hp:run></hp:p>`,
  ).join("");
  // No lineseg cache: a native reader calculates wrapping for the new text.
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
  zip.file("Preview/PrvText.txt", text);
  return zip;
}
