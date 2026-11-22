import type { BulkCatalogue, BulkInstitution, BulkProgram } from './bulk-catalogue';
import searchManifest from './data/catalogue-search-manifest.json';

/** Search expansion is a candidate-finding aid, never a claim of equivalent majors. */
export const compactSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase()
  .normalize('NFD').replace(/(?<=[A-Za-z])\p{M}+/gu, '').normalize('NFC')
  .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
export const programmeClosed = (p: BulkProgram) => !!p.lifecycle &&
  /(closed|폐지|폐과|discontinued|inactive|募集停止|중단)/i.test(p.lifecycle);
const identityName = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
export type ProgrammeGroup = {
  row: BulkProgram; records: BulkProgram[]; inst?: BulkInstitution; memberIds: string[];
};
const depth = { curriculum: 3, introduction: 2, listing: 1 };

/** Conservative, auditable grouping: same source school/campus key + exact name.
 * No fuzzy joins of schools, campuses, admission units or differently named majors.
 * All original IDs and their source evidence remain in the catalogue.
 */
export function groupProgrammes(data: BulkCatalogue): ProgrammeGroup[] {
  const schools = new Map(data.institutions.map(i => [i.id, i]));
  const groups = new Map<string, ProgrammeGroup>();
  for (const p of data.programs) {
    const key = `${p.institutionId}\0${identityName(p.name)}`;
    let group = groups.get(key);
    if (!group) {
      group = { row: p, records: [], inst: schools.get(p.institutionId), memberIds: [] };
      groups.set(key, group);
    }
    group.records.push(p);
    group.memberIds.push(p.id);
    const preferred = (!programmeClosed(p) && programmeClosed(group.row)) ||
      (programmeClosed(p) === programmeClosed(group.row) && depth[p.level] > depth[group.row.level]);
    if (preferred) group.row = p;
  }
  return [...groups.values()];
}

export function catalogueStats(data: BulkCatalogue) {
  const groups = groupProgrammes(data);
  const active = groups.filter(g => g.records.some(p => !programmeClosed(p)));
  const onlyClosed = groups.filter(g => g.records.every(programmeClosed));
  const unique = (xs: string[]) => new Set(xs).size;
  const degreeTypes = Object.fromEntries([...new Set(data.programs.map(p => p.degreeLevel))].map(k =>
    [k, data.programs.filter(p => p.degreeLevel === k).length]));
  const recordTypes = Object.fromEntries([...new Set(data.programs.map(p => p.recordType))].map(k =>
    [k, data.programs.filter(p => p.recordType === k).length]));
  return {
    records: data.programs.length, closedRecords: data.programs.filter(programmeClosed).length,
    nonClosedRecords: data.programs.filter(p => !programmeClosed(p)).length,
    schoolCampusKeys: data.institutions.length,
    schoolsWithNonClosedRecords: unique(active.map(g => g.row.institutionId)),
    distinctOfficialSchoolNames: unique(data.institutions.map(i => `${i.countryCode}\0${identityName(i.name)}`)),
    countryCount: unique(data.institutions.map(i => i.countryCode)),
    programmeGroups: groups.length, nonClosedGroups: active.length, closedOnlyGroups: onlyClosed.length,
    repeatedNameRecords: data.programs.length - groups.length,
    confirmedBachelorGroups: groups.filter(g => g.records.some(p => p.degreeLevel === 'bachelor')).length,
    sourceBundles: data.sources.length,
    introductionRecords: data.programs.filter(p => p.level === 'introduction').length,
    curriculumRecords: data.programs.filter(p => p.level === 'curriculum').length,
    introductionGroups: groups.filter(g => g.row.level === 'introduction').length,
    curriculumGroups: groups.filter(g => g.row.level === 'curriculum').length,
    facultyCommonRecords: data.programs.filter(p => p.facultyCommon).length,
    degreeTypes, recordTypes,
  };
}

export type SearchLexicon = Record<string, string>;
let lexiconRequest: Promise<SearchLexicon> | undefined;
export function loadSearchLexicon(): Promise<SearchLexicon> {
  if (!lexiconRequest) lexiconRequest = (async () => {
    const response = await fetch(`${import.meta.env.BASE_URL}career-lab-original/data/catalogue-search.json.gz?v=${searchManifest.hash}`);
    if (!response.ok) throw Error('공개 학과 검색 자료를 불러오지 못했어요. 다시 시도해 주세요.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const data = bytes[0] === 31 && bytes[1] === 139
      ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json()
      : JSON.parse(new TextDecoder().decode(bytes));
    if (data.version !== searchManifest.version || Object.keys(data.messages || {}).length !== searchManifest.entries)
      throw Error('공개 학과 검색 자료 버전을 확인하지 못했어요. 다시 시도해 주세요.');
    return data.messages as SearchLexicon;
  })().catch(e => { lexiconRequest = undefined; throw e; });
  return lexiconRequest;
}

export function searchTerms(query: string) {
  const tokens = query.trim().split(/\s+/u).filter(Boolean);
  const qualifiers = new Set(['학과', '학부', '전공', '과']);
  const meaningful = tokens.filter(token => !qualifiers.has(token));
  return (meaningful.length ? meaningful : tokens).map(term => {
    const literal = compactSearch(term);
    const variant = compactSearch(term.replace(/(학)(과|부)$/u, '$1').replace(/전공$/u, '').replace(/(?<=.{2})과$/u, ''));
    return { literal, variant: variant.length >= 2 ? variant : literal };
  }).filter(t => t.literal);
}
export function matchesProgramme(hay: string, query: string) {
  return searchTerms(query).every(({ literal, variant }) => hay.includes(literal) || hay.includes(variant));
}
