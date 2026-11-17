import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [catalogPath, labelsPath, supplementPath, outputPath] = process.argv.slice(2);
if (!catalogPath || !labelsPath || !supplementPath || !outputPath) {
  throw new Error('Usage: node build-aviation-jobs-ko.mjs <LAB catalog.json> <localized-labels.json> <lecture-supplement.ko.json> <output.js>');
}

const read = path => readFileSync(resolve(path));
const source = read(catalogPath);
const localized = read(labelsPath);
const supplementSource = read(supplementPath);
const catalog = JSON.parse(source.toString('utf8'));
const labels = JSON.parse(localized.toString('utf8'));
const supplement = JSON.parse(supplementSource.toString('utf8'));
const majorKeys = {
  'aviation-security': 'security',
  'aviation-transport': 'traffic',
  'aviation-language': 'language',
  'airport-administration': 'administration',
};
const majorProfileIds = Object.fromEntries(Object.entries(majorKeys).map(([major, department]) => [
  major,
  catalog.profiles.filter(profile => profile.departments.includes(department)).map(profile => profile.id),
]));
const allIds = [...new Set(Object.values(majorProfileIds).flat())];
const expected = [18, 29, 20, 29];
if (Object.values(majorProfileIds).some((ids, index) => ids.length !== expected[index]) ||
    allIds.length !== 64 || Object.values(majorProfileIds).flat().length !== 96) {
  throw new Error('Expected 18/29/20/29 department links, 64 distinct profiles, 96 total links');
}
const namesKo = Object.fromEntries(allIds.map(id => {
  const sourceName = catalog.profiles.find(profile => profile.id === id)?.name;
  const localizedName = labels.profiles.ko[id];
  if (!sourceName || sourceName !== localizedName) throw new Error(`Korean label mismatch: ${id}`);
  return [id, sourceName];
}));
if (supplement.additionalRoles.length !== 15 ||
    new Set(supplement.additionalRoles.map(role => role.id)).size !== 15 ||
    supplement.additionalRoles.some(role => !role.nameKo || !role.pages?.length || Object.values(namesKo).includes(role.nameKo))) {
  throw new Error('Expected 15 distinct lecture roles with source pages and no duplicate catalog label');
}
if (supplement.lectureCompetencies.length !== 9 ||
    new Set(supplement.lectureCompetencies.map(item => item.id)).size !== 9 ||
    supplement.lectureCompetencies.some(item => !item.nameKo || !item.practiceKo)) {
  throw new Error('Expected nine distinct general lecture competencies with Korean practice examples');
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const result = {
  version: 'aviation-report-profiles/2026-11-17.1',
  catalogVersion: catalog.version,
  sourceSha256: sha256(source),
  localizedLabelsSha256: sha256(localized),
  lectureSupplementSha256: sha256(supplementSource),
  translationStatus: 'ko-only',
  majorProfileIds,
  namesKo,
  lectureRoles: supplement.additionalRoles.map(({id, nameKo, pages}) => ({id, nameKo, pages})),
  lectureCompetencies: supplement.lectureCompetencies.map(({id, nameKo, practiceKo}) => ({id, nameKo, practiceKo})),
};
writeFileSync(resolve(outputPath), `/* Generated from the LAB competency catalog; do not assign PASS fit scores to these exploration profiles. */\nwindow.DCasAviationJobProfiles = Object.freeze(${JSON.stringify(result, null, 2)});\n`, 'utf8');
console.log(`Built ${allIds.length} Korean job profiles, 96 major links, 15 lecture roles, and nine general competencies`);
