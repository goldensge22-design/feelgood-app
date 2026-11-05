// One-shot codemod: wraps Korean UI text in T(...). Idempotent (skips existing T() args).
import ts from '../../../node_modules/typescript/lib/typescript.js';
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('src');
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) { if (!p.includes('components/ui') && !p.includes('i18n') && !p.includes('data')) walk(p); } else if (p.endsWith('.tsx')) files.push(p); });
walk(root);
const HAN = /[\uac00-\ud7a3]/;
const SKIP_ATTR = new Set(['key', 'value', 'data-testid', 'id', 'className', 'href', 'tone', 'variant', 'type', 'name']);
const ALLOW_CALL = new Set(['toast', 'confirm', 'alert', 'T']);
const keys = new Set(JSON.parse(fs.existsSync('src/i18n/ui-source-keys.json') ? fs.readFileSync('src/i18n/ui-source-keys.json', 'utf8') : '[]'));
const q = (s) => JSON.stringify(s);
const calleeName = (c) => (ts.isIdentifier(c.expression) ? c.expression.text : ts.isPropertyAccessExpression(c.expression) ? c.expression.name.text : '');
function shouldWrap(node) {
  const p = node.parent;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return false;
  if (ts.isPropertyAssignment(p) && p.name === node) return false;
  if (ts.isElementAccessExpression(p) || ts.isCaseClause(p) || ts.isLiteralTypeNode(p)) return false;
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) return false;
  if (ts.isCallExpression(p) && p.arguments.includes(node)) { const n = calleeName(p); if (n === 'T') return false; if (!ALLOW_CALL.has(n)) return false; return true; }
  for (let a = p; a; a = a.parent) {
    if (ts.isJsxAttribute(a)) return !SKIP_ATTR.has(a.name.getText());
    if (ts.isJsxExpression(a)) return true;
    if (ts.isCallExpression(a) && ALLOW_CALL.has(calleeName(a))) return calleeName(a) !== 'T';
    if (ts.isCallExpression(a) && a !== p) return false;
    if (ts.isFunctionLike(a) || ts.isSourceFile(a)) return false;
  }
  return false;
}
let total = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const visit = (n) => {
    if (ts.isJsxText(n) && HAN.test(n.text)) {
      const raw = n.getFullText(); const core = raw.trim().replace(/\s+/g, ' ');
      const lead = /^[^\S\n]+$/.test(raw.match(/^\s*/)[0]) ? "{' '}" : ''; const trail = /^[^\S\n]+$/.test(raw.match(/\s*$/)[0]) ? "{' '}" : '';
      keys.add(core); edits.push([n.getStart(sf), n.getEnd(), `${lead}{T(${q(core)})}${trail}`]); return;
    }
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && HAN.test(n.text) && shouldWrap(n)) {
      keys.add(n.text);
      const inAttr = ts.isJsxAttribute(n.parent);
      edits.push([n.getStart(sf), n.getEnd(), inAttr ? `{T(${q(n.text)})}` : `T(${q(n.text)})`]); return;
    }
    if (ts.isTemplateExpression(n) && HAN.test(n.getText()) && shouldWrap(n)) {
      let key = n.head.text; const args = [];
      n.templateSpans.forEach((s, i) => { key += `{${i}}` + s.literal.text; args.push(s.expression.getText(sf)); });
      keys.add(key); edits.push([n.getStart(sf), n.getEnd(), `T(${q(key)}, ${args.join(', ')})`]); return;
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  if (!edits.length) continue;
  let out = src; edits.sort((a, b) => b[0] - a[0]).forEach(([s, e, r]) => { out = out.slice(0, s) + r + out.slice(e); });
  if (!/import \{[^}]*\bT\b[^}]*\} from '@\/i18n\/tx'/.test(out)) out = `import { T } from '@/i18n/tx';\n` + out;
  fs.writeFileSync(f, out); total += edits.length; console.log(path.relative(root, f), edits.length);
}
fs.writeFileSync('src/i18n/ui-source-keys.json', JSON.stringify([...keys].sort(), null, 1));
console.log('edits', total, 'keys', keys.size);
