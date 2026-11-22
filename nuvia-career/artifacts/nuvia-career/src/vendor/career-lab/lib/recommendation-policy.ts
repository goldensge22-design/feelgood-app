/** This is an exploration policy, not an admission/ability assessment. */
export const RECOMMENDATION_NOTICE = '이 LAB은 강점·관심사·활동 경험을 바탕으로 탐색할 학과와 해당 학과를 운영하는 대학을 안내합니다. 성적과 합격 가능성은 추천에 반영하지 않습니다. 성적에 따른 지원 대학·전형 판단은 상담교사와 상담해 결정하세요.';

// Conservative cross-language exclusion. Never retain removed material in another profile/log.
const assessment = /내신|수능|모의고사|등급|석차|시험\s*성적|학업\s*성적|성적|합격|입시|\d+(?:\.\d+)?\s*점|偏差値|評定|成績|成绩|分数|高考|录取|錄取|คะแนนสอบ|เกรด|điểm\s*(thi|số|trung bình)|học lực|معدل|درجات|القبول|оценк|балл|экзамен|дүн|шалгалт|ពិន្ទុ|ប្រឡង|calificaci[oó]n|nota[s]?\b|admisión|moyenne|notes?\s*(scolaires|examen)|voti|esame|qiymət|imtahan|\b(?:GPA|I[.]?Q[.]?|SAT|ACT|ATAR|GCSE|A[- ]?levels?|grades?|scores?|rank(?:ing)?|admission|acceptance|exam|test\s*results?)\b/i;
export function qualitativeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  const assessed=(s:string)=>assessment.test(s.replace(/\b(?:sat|act)\b(?!\s*[:=]?\s*\d)/g,''))||/\b(?:GPA|I[.]?Q[.]?|SAT|ACT|ATAR|GCSE)\s*[:=]?\s*\d/i.test(s);
  const normalized=input.normalize('NFKC');
  if (!assessed(normalized)) return input.trim();
  // Remove labelled score fragments rather than suppressing an independent qualitative phrase.
  const fragments=normalized.replace(/\b(?:GPA|I[.]?Q[.]?|SAT|ACT|ATAR|GCSE)\s*[:=]?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?/gi,'')
    .replace(/(?:내신|수능|모의고사|학업\s*성적|시험\s*성적|석차)\s*[:=]?\s*\d+(?:\.\d+)?\s*(?:등급|점|위)?/g,'')
    .replace(/\d+(?:\.\d+)?\s*(?:등급|점)/g,'');
  return fragments.normalize('NFKC')
    .replace(/\([^)]*\)|（[^）]*）/g, s => assessed(s) ? '' : s)
    .split(/[\n。！？!?;；,，]+|[.]\s+/u)
    .filter(s => !assessed(s))
    .join(' · ').trim();
}
export function stripAssessmentData(value: unknown): unknown {
  if (typeof value === 'string') return qualitativeText(value);
  if (Array.isArray(value)) return value.map(stripAssessmentData);
  if (!value || typeof value !== 'object') return typeof value==='number' ? undefined : value;
  return Object.fromEntries(Object.entries(value).filter(([k]) =>
    !/score|gpa|rank|admission|exam|result|image|photo|attachment|raw|document|^iq$|^sat$|^act$|^grades?$|성적|등급|석차/i.test(k.normalize('NFKC')))
    .map(([k,v]) => [k, stripAssessmentData(v)]));
}
