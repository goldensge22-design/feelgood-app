import { majorById } from './catalog';
import type { LabState, UniLink } from './types';
import verifiedPrograms from './data/verified-university-programs.json';

export type DegreeLevel = 'associate' | 'bachelor' | 'master' | 'doctorate' | 'other' | 'unknown';
export const degreeLabels: Record<DegreeLevel, string> = { associate: '준학사', bachelor: '학사', master: '석사', doctorate: '박사', other: '기타', unknown: '미확인' };
export interface OfficialSource {
  id: string; url: string; title: string; academicVersion: string;
  checkedAt: string; language: string; status: 'verified' | 'student-confirmed' | 'pending';
}
export interface CurriculumFact { text: string; sourceId?: string; status: 'verified' | 'pending'; originalLanguage?: string }
export interface UniversityProgram {
  id: string; majorId: string;
  universityOriginal: string; universityDisplay: string;
  programOriginal: string; programDisplay: string;
  nameTranslation: 'original' | 'editorial' | 'official' | 'machine' | 'student-provided';
  countryCode: string; country: string; region: string; degreeLevel: DegreeLevel;
  teachingLanguages: string[]; teachingLanguageSourceId?: string;
  sources: OfficialSource[]; curriculum: CurriculumFact[]; courses: CurriculumFact[];
  learning: CurriculumFact[]; selection: CurriculumFact[]; fusion: CurriculumFact[];
  note?: string; recordKind: 'official' | 'student-link';
  verificationLevel?: 'listing' | 'introduction' | 'curriculum'; schoolType?: string; area?: string;
  informationScope?: 'program' | 'faculty-common';
}

const pending = (text: string): CurriculumFact => ({ text, status: 'pending' });
const fact = (text: string, sourceId: string): CurriculumFact => ({ text, sourceId, status: 'verified' });

/**
 * Only the two official pages actually read on 2026-10-27 are included.
 * The archive/2025 roadmap is NOT a claim about the current curriculum.
 * Source language does not establish teaching language.
 */
export const OFFICIAL_PROGRAMS: UniversityProgram[] = [
  {
    id: 'kaist-cs-roadmap-2025', majorId: 'm-cs',
    universityOriginal: 'KAIST', universityDisplay: 'KAIST',
    programOriginal: '전산학부', programDisplay: '전산학부', nameTranslation: 'original',
    countryCode: 'KR', country: '대한민국', region: '아시아', degreeLevel: 'bachelor',
    teachingLanguages: [],
    recordKind: 'official',
    sources: [{
      id: 'kaist-roadmap', url: 'https://cs.kaist.ac.kr/content?menu=320',
      title: 'KAIST 전산학부 학사과정 로드맵 소개', academicVersion: '2025년 기준 로드맵',
      checkedAt: '2026-10-27', language: 'ko', status: 'verified',
    }],
    curriculum: [fact('기초에서 심화로 이어지는 9개 핵심 분야별 로드맵을 제공해요. 데이터 과학, 소프트웨어 디자인, 인공지능 등으로 확장돼요.', 'kaist-roadmap')],
    courses: [fact('프로그래밍 기초(CS101), 이산구조(CS204), 데이터구조(CS206), 알고리즘 개론(CS300), 운영체제(CS330)', 'kaist-roadmap')],
    learning: [fact('로드맵은 선수 과목 관계와 개설 학기·학점(강의/실험/학점)을 안내해요.', 'kaist-roadmap'), pending('개별 수업의 프로젝트·평가 방식은 공식 강의계획서 연결 대기')],
    selection: [pending('입학 후 전공 선택 시기·방식은 공식 자료 연결 대기')],
    fusion: [fact('로드맵에 주전공·복수전공·부전공의 별도 이수 요건이 안내되어 있어요. 적용 대상과 최신 요건을 다시 확인하세요.', 'kaist-roadmap')],
    note: '페이지가 명시한 2025년 기준 자료예요. 현재 학사 요건·수업 언어를 보장하지 않아요.',
  },
  {
    id: 'mit-cs-2024-2025', majorId: 'm-cs',
    universityOriginal: 'MIT', universityDisplay: 'MIT',
    programOriginal: 'Computer Science and Engineering (Course 6-3)',
    programDisplay: '컴퓨터 과학·공학 (Course 6-3)', nameTranslation: 'editorial',
    countryCode: 'US', country: '미국', region: '북아메리카', degreeLevel: 'bachelor',
    teachingLanguages: [], recordKind: 'official',
    sources: [{
      id: 'mit-6-3-2024', url: 'https://catalog.mit.edu/archive/2024-2025/degree-charts/computer-science-engineering-course-6-3/',
      title: 'Computer Science and Engineering (Course 6-3)', academicVersion: '2024–2025 보관 학사 카탈로그',
      checkedAt: '2026-10-27', language: 'en', status: 'verified',
    }],
    curriculum: [fact('Bachelor of Science 학위 과정으로 컴퓨터 과학 요건과 선택 과목을 안내해요. 최신 과정이 아닌 보관본이에요.', 'mit-6-3-2024')],
    courses: [fact('Fundamentals of Programming (6.1010), Software Construction (6.1020), Mathematics for Computer Science (6.1200), Introduction to Algorithms (6.1210)', 'mit-6-3-2024')],
    learning: [fact('실험 요건과 전공 내 communication-intensive 과목 이수 요건이 포함돼요. Independent Inquiry 과목 요건도 있어요.', 'mit-6-3-2024'), pending('개별 프로젝트 내용은 해당 학기 공식 강의계획서 연결 대기')],
    selection: [pending('입학 후 전공 선언 시기·선발 방식은 공식 자료 연결 대기')],
    fusion: [fact('컴퓨터 과학 트랙 외에 인공지능·의사결정 또는 전기공학 트랙의 선택 과목을 포함할 수 있어요.', 'mit-6-3-2024'), pending('복수전공 정책 자체는 이 자료만으로 확인하지 않았어요. 공식 자료 연결 대기')],
    note: '이 전공명과 설명은 앱의 편집 요약이며 대학의 공식 번역이 아니에요. 원문을 함께 확인하세요.',
  },
  ...verifiedPrograms as UniversityProgram[],
];

export function studentProgram(link: UniLink): UniversityProgram {
  const major = majorById(link.majorId);
  return {
    id: `student:${link.id}`, majorId: link.majorId,
    universityOriginal: link.universityOriginal || link.university, universityDisplay: link.university,
    programOriginal: link.programOriginal || '', programDisplay: link.programOriginal || major?.name || '전공 미입력',
    nameTranslation: link.universityOriginal && link.universityOriginal !== link.university ? 'student-provided' : 'original', countryCode: link.countryCode || (['한국', '대한민국'].includes(link.country) ? 'KR' : ''),
    country: link.country, region: link.region || '미입력', degreeLevel: link.degreeLevel || 'unknown',
    teachingLanguages: link.teachingLanguages || [], recordKind: 'student-link', note: link.note,
    sources: [{ id: `link:${link.id}`, url: link.url, title: '학생이 직접 저장한 링크', academicVersion: link.academicVersion || '',
      checkedAt: link.verified ? link.verifiedDate : '', language: link.sourceLanguage || '',
      status: link.verified ? 'student-confirmed' : 'pending' }],
    curriculum: [pending('공식 자료 연결 대기 — 학생 링크는 운영자의 공식 자료 검증과 달라요.')],
    courses: [pending('공식 자료 연결 대기')], learning: [pending('공식 자료 연결 대기')],
    selection: [pending('공식 자료 연결 대기')], fusion: [pending('공식 자료 연결 대기')],
  };
}

export function programsFor(s: LabState) {
  return [...OFFICIAL_PROGRAMS, ...(s.publicPrograms || []).filter(p => !OFFICIAL_PROGRAMS.some(o => o.id === p.id)), ...s.uniLinks.map(studentProgram)];
}
export function rememberPublicProgram(d: LabState, p: UniversityProgram) {
  if (p.recordKind !== 'official' || OFFICIAL_PROGRAMS.some(o => o.id === p.id)) return;
  d.publicPrograms ||= [];
  if (!d.publicPrograms.some(o => o.id === p.id)) d.publicPrograms.push(structuredClone(p));
}
export function programById(s: LabState, id: string) { return programsFor(s).find(p => p.id === id); }
export function chooseProgram(d: LabState, p: UniversityProgram) {
  rememberPublicProgram(d, p);
  d.tempProgram = p.id;
  d.tempMajor = p.majorId;
  d.savedPrograms = Array.from(new Set([...(d.savedPrograms || []), p.id]));
  if (!d.savedMajors.includes(p.majorId)) d.savedMajors.push(p.majorId);
  d.tempHistory.push({ majorId: p.majorId, date: new Date().toISOString().slice(0, 10) });
}
