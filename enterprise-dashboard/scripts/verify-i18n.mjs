import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "locales", "manifest.json"), "utf8"));
const source = JSON.parse(fs.readFileSync(path.join(root, "locales", "ko.json"), "utf8"));
const sourceKeys = Object.keys(source.messages).sort();
const placeholderSet = (value) => [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join(",");
const errors = [];

const html = fs.readFileSync(path.join(root, "..", "FeelGood_HR_TalentAnalytics_Demo.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const referenced = new Set([
  ...[...html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)].map((match) => match[1]),
  ...[...app.matchAll(/\bt\("([^"]+)"/g)].map((match) => match[1])
]);
for (const key of referenced) if (!sourceKeys.includes(key)) errors.push(`source: referenced key missing ${key}`);

if (manifest.length !== 15) errors.push(`Expected 15 locales, found ${manifest.length}`);
if (new Set(manifest.map((entry) => entry.code)).size !== manifest.length) errors.push("Duplicate locale code");

for (const entry of manifest) {
  const file = path.join(root, "locales", entry.file);
  if (!fs.existsSync(file)) { errors.push(`${entry.code}: missing ${entry.file}`); continue; }
  const pack = JSON.parse(fs.readFileSync(file, "utf8"));
  const keys = Object.keys(pack.messages || {}).sort();
  const missing = sourceKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !sourceKeys.includes(key));
  if (missing.length) errors.push(`${entry.code}: missing ${missing.join(", ")}`);
  if (extra.length) errors.push(`${entry.code}: extra ${extra.join(", ")}`);
  for (const key of sourceKeys) {
    const value = pack.messages?.[key];
    if (typeof value !== "string" || !value.trim()) errors.push(`${entry.code}: empty ${key}`);
    if (placeholderSet(value) !== placeholderSet(source.messages[key])) errors.push(`${entry.code}: placeholder mismatch ${key}`);
  }
  if ((entry.dir === "rtl") !== (pack.direction === "rtl")) errors.push(`${entry.code}: direction mismatch`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Enterprise i18n OK: ${manifest.length} locales × ${sourceKeys.length} keys; placeholders and direction verified.`);

