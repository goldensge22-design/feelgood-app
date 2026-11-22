import { MAJORS } from './catalog';
import conceptAliases from './data/bulk-concept-aliases.json';
import { OFFICIAL_PROGRAMS } from './universities';
import searchRelease from './data/catalogue-search-manifest.json';
import type { DegreeLevel, UniversityProgram } from './universities';

export interface BulkInstitution {
  id: string; name: string; displayName: string; aliases: string[];
  countryCode: string; country: string; region: string; schoolType: string;
  nameTranslation?: 'original' | 'editorial' | 'machine';
}
export interface BulkProgram {
  id: string; institutionId: string; name: string; aliases: string[]; category: string;
  level: 'listing' | 'introduction' | 'curriculum'; sourceId: string; url: string;
  academicVersion: string; language: string; lifecycle: string;
  recordType: 'department-unit' | 'degree' | 'major'; degreeLevel: DegreeLevel;
  overview: string; courses: { name: string; url: string; sourceUrl?: string }[];
  learning: string; combination: string; evidenceUrls?: string[];
  majorId?: string; facultyCommon?: boolean;
  productSummary?: boolean;
}
export interface BulkSource {
  id: string; title: string; url: string; year: string; checkedAt: string;
  reportedCount: number; importedCount: number; scope: string;
}
export interface BulkCatalogue {
  institutions: BulkInstitution[]; programs: BulkProgram[]; sources: BulkSource[];
}

export const foldSearch = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let loading: Promise<BulkCatalogue> | undefined;
export function loadBulkCatalogue(): Promise<BulkCatalogue> {
  if (!loading) loading = (async () => {
    const revision = (searchRelease as { catalogueHash?: string }).catalogueHash || 'initial';
    const response = await fetch(`${import.meta.env.BASE_URL}career-lab-original/data/public-catalogue.json.gz?v=${revision}`);
    if (!response.ok) throw new Error('공개 학과 목록을 불러오지 못했어요. 다시 시도해 주세요.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let data: BulkCatalogue;
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (!('DecompressionStream' in globalThis)) throw new Error('공개 목록을 읽으려면 최신 브라우저가 필요해요.');
      const decoded = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      data = await new Response(decoded).json();
    } else {
      // Some static hosts apply Content-Encoding before fetch exposes bytes.
      data = JSON.parse(new TextDecoder().decode(bytes));
    }
    if (!Array.isArray(data.programs) || !Array.isArray(data.institutions) || !Array.isArray(data.sources)) throw new Error('공개 목록 형식을 확인하지 못했어요.');
    // Add existing translated general-discipline names as cross-language search
    // concepts in the UI, not as university-specific curriculum assertions.
    return data;
  })().catch(error => { loading = undefined; throw error; });
  return loading;
}

const conceptRules: [RegExp, string][] = [
  [/간호|nurs/i, 'm-nursing'], [/사회복지|social work/i, 'm-socwel'],
  [/심리|psycholog/i, 'm-psych'], [/교육|유아|보육|education|teaching|pedagog/i, 'm-edu'],
  [/역사|고고|사학|history|archaeolog/i, 'm-history'], [/철학|종교|philosoph|religio/i, 'm-philosophy'],
  [/음악|실용음악|music/i, 'm-music'], [/미술|조형|회화|fine art/i, 'm-art'],
  [/디자인|만화|뷰티|미용|design/i, 'm-design'], [/체육|스포츠|재활|물리치료|sport|rehabilit/i, 'm-sport'],
  [/컴퓨터|소프트웨어|인공지능|정보통신|컴퓨팅|computer|software|artificial intelligence/i, 'm-cs'],
  [/경영|경상|회계|금융|호텔|관광|business|accounting|finance|management|tourism/i, 'm-biz'],
  [/경제|economic/i, 'm-econ'], [/정치|행정|politic|government/i, 'm-polsci'],
  [/법학|법률|경찰|\blaw\b|legal/i, 'm-law'], [/사회학|sociolog/i, 'm-sociology'],
  [/영어|불어|독어|일어|일본|중어|언어|문학|language|literature|linguist|english|french|spanish|japanese/i, 'm-languages'],
  [/수학|mathematic/i, 'm-math'], [/물리|천문|physics|astronomy/i, 'm-physics'],
  [/통계|데이터|statistics|data science/i, 'm-stats'], [/건축|실내건축|architect/i, 'm-arch'],
  [/토목|도시|civil|urban/i, 'm-civil'], [/기계|자동차|전기|전자|로봇|mechanical|electrical|robot/i, 'm-mech'],
  [/화학|재료|chemical|chemistry|materials/i, 'm-chem'], [/환경|조경|원예|산림|environment|forestry/i, 'm-envsci'],
  [/생명|보건|의학|치기공|치위생|임상|약학|동물|biology|health|medicine|biomedical|dent|pharm/i, 'm-biomed'],
  [/영상|방송|영화|연기|film|cinema|theatre/i, 'm-film'], [/미디어|언론|media|journalis/i, 'm-media'],
  [/국제|지역학|international|global studies/i, 'm-intl'],
];
/** Broad LAB reading-guide routing, never a university assertion or suitability verdict. */
export function bulkMajorId(row: BulkProgram): string {
  return row.majorId || conceptRules.find(([r]) => r.test(row.name))?.[1] || 'm-open';
}
export function bulkToProgram(row: BulkProgram, catalogue: BulkCatalogue): UniversityProgram {
  const original = OFFICIAL_PROGRAMS.find(p => p.id === row.id);
  if (original) return original;
  const institution = catalogue.institutions.find(i => i.id === row.institutionId);
  const source = catalogue.sources.find(s => s.id === row.sourceId);
  if (!institution || !source) throw new Error('공식 자료의 대학 연결을 확인하지 못했어요.');
  const urls = row.evidenceUrls?.length ? row.evidenceUrls : [row.level === 'listing' ? source.url : row.url];
  const sources = [...new Set(urls)].map((url, i) => ({
    id: `${row.id}:source:${i}`, url, title: source.title,
    academicVersion: row.academicVersion, checkedAt: source.checkedAt, language: row.language, status: 'verified' as const,
  }));
  const sourceId = sources[0].id;
  const originalFact = (value: string, evidence?: string) => ({
    text: value, sourceId: sources.find(s => s.url === evidence)?.id || sourceId, status: 'verified' as const,
    originalLanguage: row.language,
  });
  const pending = (value: string) => ({ text: value, status: 'pending' as const });
  return {
    id: row.id, majorId: bulkMajorId(row),
    universityOriginal: institution.name, universityDisplay: institution.displayName || institution.name,
    programOriginal: row.name, programDisplay: row.name, nameTranslation: institution.nameTranslation || 'original',
    countryCode: institution.countryCode, country: institution.country, region: institution.region,
    degreeLevel: row.degreeLevel, teachingLanguages: [], schoolType: institution.schoolType, area: institution.region,
    recordKind: 'official', verificationLevel: row.level,
    informationScope: row.facultyCommon ? 'faculty-common' : 'program', sources,
    curriculum: row.overview ? [originalFact(row.overview)] : row.courses.length
      ? [{text:'공식 자료에서 교과목 목록을 확인했어요. 아래 과목과 원문 이수 요건을 함께 읽어 보세요.',sourceId,status:'verified'}]
      : [pending('공식 학과 목록만 확인했어요. 교육 목표와 수업 내용은 원문에서 추가 확인해야 해요.')],
    courses: row.courses.map(c => originalFact(c.name, c.sourceUrl)),
    // Learning Outcomes are goals, not evidence of teaching methods/projects.
    // The goals remain in the overview; unverified methods stay unconfirmed.
    learning: [],
    selection: row.combination ? [originalFact(row.combination)] : row.level === 'listing'
      ? [pending('학과·모집단위와 실제 전공의 구분, 현재 모집 여부는 대학 공식 안내를 확인해 주세요.')] : [],
    fusion: [],
    note: row.lifecycle === '폐과'
      ? '공식 목록에서 폐과로 표시된 이력 자료예요. 현재 모집 중인 학과로 안내하지 않아요.'
      : row.recordType === 'department-unit'
        ? '공식 학과·모집단위 안내예요. 명칭만으로 학위나 현재 모집 여부를 확정하지 않아요.'
        : '공식 학부 카탈로그의 과정·전공 자료예요. 수업 언어와 현재 입학 조건은 별도 확인이 필요해요.',
  };
}

/** UI-language synonyms augment original text without rewriting its contents. */
export function programmeConcepts(row: BulkProgram) {
  const m = MAJORS.find(m => m.id === bulkMajorId(row));
  const aliases: Record<string, string[]> = conceptAliases;
  return m ? aliases[m.id] || [m.name, m.en] : [];
}
