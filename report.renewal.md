# K-PASS 결과지 서버 연동 설계 명세서

> 목적: "AI는 81유형 콘텐츠를 최초 1회씩만 생성 → DB에 저장 → 이후 모든 요청은 저장된 콘텐츠 재사용"
> 구조로 만들어, 매 요청마다 AI 비용이 발생하지 않도록 설계한다.
> 점수(숫자)는 항상 개인별로 실시간 계산되고, 콘텐츠(문장)는 81가지 중 하나를 그대로 불러온다.

---

## 0. 전체 아키텍처

```
[검사 완료 → 4개 점수 입력]
        │
        ▼
① 점수 → 81유형 코드 변환 (순수 계산, AI 불필요, 매번 즉시 실행)
        │
        ▼
② DB 조회: 이 유형 코드의 콘텐츠가 이미 저장되어 있는가?
        │
   ┌────┴────┐
  YES        NO
   │          │
   │          ▼
   │    ③ AI에게 이 유형 콘텐츠 생성 요청 (최초 1회만)
   │          │
   │          ▼
   │    ④ 생성 결과를 DB에 저장 (이후 영구 재사용)
   │          │
   └────┬─────┘
        ▼
⑤ 저장된 콘텐츠(문장) + 실시간 계산된 점수(숫자)를 합쳐서 화면 렌더링
```

**핵심 원칙**
- 81유형 중 하나가 이미 DB에 있으면 **AI 호출 자체가 발생하지 않는다.**
- 이론상 AI 호출은 서비스 전체 수명 동안 **최대 81번**만 일어난다 (81유형 전체를 미리 배치로 생성해두면 0번도 가능).
- 점수·백분위·신뢰구간 같은 숫자는 절대 DB에 텍스트로 저장하지 않는다 — 항상 공식으로 실시간 계산한다 (이유: 재검사마다 점수가 달라지므로).

---

## 1. 데이터 스키마

### 1-1. ChildScoreInput (개인별 입력값 — 매번 다름)

```json
{
  "childId": "uuid",
  "name": "송서우",
  "gender": "여",
  "ageLabel": "만 9세 10개월",
  "testDate": "2023-02-27",
  "scores": {
    "P": 145,
    "A": 131,
    "S": 117,
    "Seq": 95
  }
}
```

### 1-2. TypeContentRecord (81유형 콘텐츠 — DB에 캐시, AI가 유형당 1회만 생성)

기본 키(Primary Key)는 `typeCode` (4축 H/M/L 조합, 예: `"P:H_A:H_S:M_Seq:M"`). 81개 레코드가 존재해야 시스템이 완전해진다.

```json
{
  "typeCode": "P:H_A:H_S:M_Seq:M",
  "baseCharacter": "밸런스4",
  "characterTitle": "프로 비전 전문가",
  "attentionEpithet": "집중의 화살",
  "displayName": "집중의 화살 · 프로 비전 전문가",
  "hashtags": ["#강한계획력", "#몰입주의력", "#안정적균형감각"],
  "oneLiner": "안정적인 균형 감각 위에 강한 계획력과 몰입력을 더한, 믿음직한 전략가형이에요.",

  "temperament": {
    "intro": "두 문단, 이 유형의 전반적 기질 서술",
    "traitCards": [
      { "title": "반응 강도", "strength": ["...", "..."], "growth": ["...", "..."] },
      { "title": "적응성",   "strength": ["...", "..."], "growth": ["...", "..."] },
      { "title": "기분의 질", "strength": ["...", "..."], "growth": ["...", "..."] },
      { "title": "사고양식", "strength": ["...", "..."], "growth": ["...", "..."] }
    ],
    "socialCard": "친구 관계에서의 모습 서술",
    "roleModelCard": "닮은 인물/롤모델 서술"
  },

  "learning": {
    "methods": [ { "title": "...", "body": "...", "howTo": "..." } ],
    "playByCategory": {
      "strengthBoost": [ { "name": "...", "desc": "..." } ],
      "strengthApply": [ { "name": "...", "desc": "..." } ],
      "growthTrain":   [ { "name": "...", "desc": "..." } ]
    },
    "habits": [ { "icon": "🌅", "title": "...", "body": "...", "freq": "..." } ],
    "bySubject": [ { "subject": "국어", "body": "...", "tip": "..." } ],
    "brainScience": "전전두엽 등 뇌과학 근거 서술",
    "parentScripts": [ { "situation": "...", "script": "..." } ]
  },

  "strength": {
    "matrixNote": "재능 매트릭스 위 설명 문구",
    "shineExamples": ["...", "...", "..."],
    "roadmap": [ { "stage": "1단계", "period": "...", "body": "..." } ]
  },

  "expertOpinion": "검사자 총평 2문단",

  "career": {
    "tags": ["...", "...", "..."],
    "roadmapByAge": [ { "stage": "초등 저학년", "body": "..." } ],
    "activities": ["...", "..."]
  },

  "growth": {
    "framingNote": "약점을 성장지점으로 재구성하는 서술",
    "atHome": ["...", "..."],
    "atInstitution": ["...", "..."]
  },

  "parentGuide": {
    "tellChild": "...",
    "changeAcademy": "...",
    "comparison": "...",
    "teacherMessage": "...",
    "commonMistakes": ["...", "...", "..."]
  }
}
```

> ⚠️ 위 필드는 "무엇을 채워야 하는지"의 스펙입니다. 81개 전부를 완전히 새로 쓰는 대신, **아래 3번(문장뱅크 조합) 방식과 병행**하면 AI 생성량과 검수 부담을 크게 줄일 수 있습니다.

---

## 2. 점수 → 화면 요소 계산 모듈 (AI 불필요, 순수 함수)

모든 시각 요소(막대 길이, 나침반 좌표, 백분위, 평균선 위치)는 **하드코딩 금지**, 아래 공식으로 매 요청마다 계산합니다.

```javascript
// ===== 1) 표준점수 → 백분위 (정규분포 누적확률, M=100 SD=15) =====
function erf(x) {
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const sign = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1/(1+p*x);
  const y = 1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign*y;
}
function scoreToPercentile(score) {
  const z = (score - 100) / 15;
  return (0.5 * (1 + erf(z / Math.SQRT2))) * 100; // 0~100
}

// ===== 2) 표준점수 → 막대 그래프 너비 % (스케일 40~160) =====
function scoreToBarWidth(score) {
  return Math.max(0, Math.min(100, (score - 40) / 120 * 100));
}

// ===== 3) 표준점수 → 인지나침반 SVG 반지름 (스케일 55~150, 기준 반경 20~100) =====
function scoreToCompassRadius(score) {
  const norm = Math.max(0, Math.min(1, (score - 55) / 95));
  return 20 + norm * 80;
}
function compassPoint(score, angleDeg, cx = 150, cy = 150) {
  const r = scoreToCompassRadius(score);
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}
// 사용 예: P=0°(상단), S=90°(우측), Seq=180°(하단), A=270°(좌측)

// ===== 4) 81유형 H/M/L 분류 =====
function classifyLevel(score) {
  if (score >= 120) return 'H';
  if (score <= 85) return 'L';
  return 'M';
}

// ===== 5) 규준적 강/약 판정 (또래 대비) =====
function normativeStatus(score) {
  if (score > 115) return 'NS'; // 규준적 강
  if (score < 85) return 'NW';  // 규준적 약
  return 'AVG';
}

// ===== 6) 개인내적 강/약 판정 (자기 자신 대비) =====
// ⚠️ criticalValue(7, 9)는 K-PASS 기술 매뉴얼의 신뢰도 기반 상수입니다.
//    송서우 사례에서 순차/동시=7, 계획/주의=9로 쓰였으나, 정식 서비스 적용 전
//    (주)필굿 기술 매뉴얼 원본에서 정확한 척도별 임계값을 재확인해야 합니다.
const CRITICAL_VALUES = { P: 9, A: 9, S: 7, Seq: 7 }; // 재확인 필요

function personalStatus(scores) {
  const mean = (scores.P + scores.A + scores.S + scores.Seq) / 4;
  const result = {};
  for (const key of ['P', 'A', 'S', 'Seq']) {
    const diff = scores[key] - mean;
    const cv = CRITICAL_VALUES[key];
    result[key] = {
      diff: Math.round(diff),
      status: Math.abs(diff) < cv ? 'FLAT' : (diff > 0 ? 'PS' : 'PW')
    };
  }
  return { mean: Math.round(mean), byAxis: result };
}

// ===== 7) 81유형 코드 산출 (베이스 캐릭터 매핑용) =====
function computeTypeCode(scores) {
  return {
    P: classifyLevel(scores.P),
    A: classifyLevel(scores.A),
    S: classifyLevel(scores.S),
    Seq: classifyLevel(scores.Seq)
  };
}
// baseCharacter 조회: (Seq레벨, S레벨, P레벨) 3축으로 27종 중 매핑 (02번 명칭표 참고)
// attentionEpithet 조회: A레벨(H/M/L) + 그룹 내 순번으로 조회 (02번 명칭표 참고)
```

---

## 3. 문장뱅크 조합 방식 (AI 생성량을 줄이는 권장 방법)

81개를 전부 완전히 새로 쓰는 대신, **"공통 모듈 + 유형별 변수"** 조합으로 설계하면 AI가 만들 분량이 크게 줄고 품질도 균일해집니다.

| 방식 | 설명 | 적용 추천 필드 |
|---|---|---|
| **완전 생성형** | 유형마다 통째로 다른 문장 | `temperament.intro`, `expertOpinion`, `parentGuide.*` |
| **템플릿+변수형** | 문장 틀은 고정, 핵심 단어만 유형별로 치환 | `learning.habits`, `growth.atHome/atInstitution` |
| **태그 조합형** | 축별 미리 정의된 태그 풀에서 조합 | `hashtags`, `career.tags` |

예: `career.tags`는 81개를 다 새로 짓지 말고, **P/A/S/Seq 각 축의 H/M/L에 매핑된 직업 키워드 풀**을 만들어 조합하면 AI 호출 없이도 생성 가능합니다.

---

## 4. AI 배치 생성 파이프라인 (개발자 실행 절차)

1. **사전 준비**: `computeTypeCode()`로 가능한 81개 조합 리스트 생성
2. **배치 실행**: 81개 코드를 순회하며 아래 프롬프트로 1회씩 Claude/GPT API 호출
3. **저장**: 응답을 `TypeContentRecord` 스키마로 파싱해 DB(`type_content` 테이블, PK=`typeCode`)에 저장
4. **검수**: 사람이 81개를 훑어보며 톤·안전성 확인 (아동 대상 콘텐츠이므로 필수)
5. **서비스 반영**: 이후 모든 결과지 요청은 DB에서 `typeCode`로 조회만 함 — AI 재호출 없음

### 배치 생성용 AI 프롬프트 템플릿

```
당신은 아동 인지검사(K-PASS) 결과지 콘텐츠 작가입니다.
아래 유형 코드에 해당하는 아동을 위한 결과지 콘텐츠를 JSON으로 작성하세요.

유형 코드: {{typeCode}}  (P:{{P}} A:{{A}} S:{{S}} Seq:{{Seq}})
베이스 캐릭터: {{baseCharacter}} "{{characterTitle}}"

규칙:
- 대상은 초등학생 자녀를 둔 학부모입니다. 쉽고 따뜻하되 전문성 있는 톤을 유지하세요.
- 약점은 "부족함"이 아니라 "성장 포인트"로 표현하세요. 낙인 표현(장애, 무능, 열등 등) 금지.
- 모든 서술은 "~할 수 있어요/경향이 있어요" 같은 확률적 어조를 쓰고, 단정적 표현을 피하세요.
- 특정 실존 인물을 근거 없이 정신질환·장애와 연결짓지 마세요.
- 출력은 아래 JSON 스키마를 정확히 따르세요. (스키마 첨부: 위 1-2절 TypeContentRecord)
```

---

## 5. 화면 렌더링 시 결합 로직 (의사코드)

```javascript
async function renderReport(childScoreInput) {
  const levels = computeTypeCode(childScoreInput.scores);
  const typeCode = `P:${levels.P}_A:${levels.A}_S:${levels.S}_Seq:${levels.Seq}`;

  let content = await db.typeContent.findOne({ typeCode });
  if (!content) {
    content = await generateWithAI(typeCode);       // 최초 1회만 실행
    await db.typeContent.save({ typeCode, ...content });
  }

  const computed = {
    percentiles: mapValues(childScoreInput.scores, scoreToPercentile),
    barWidths: mapValues(childScoreInput.scores, scoreToBarWidth),
    compassPoints: {
      P: compassPoint(childScoreInput.scores.P, 0),
      S: compassPoint(childScoreInput.scores.S, 90),
      Seq: compassPoint(childScoreInput.scores.Seq, 180),
      A: compassPoint(childScoreInput.scores.A, 270)
    },
    normative: mapValues(childScoreInput.scores, normativeStatus),
    personal: personalStatus(childScoreInput.scores)
  };

  return template({ child: childScoreInput, content, computed });
}
```

---

## 6. 개발자 확인 필요 항목

1. **개인내적강약 임계값(7, 9)** — 정식 K-PASS 기술 매뉴얼에서 척도별 정확한 신뢰도 기반 임계값 재확인
2. **81유형 캐릭터 원화** — 03번 문서(BrainMap 확장 작업지시서)의 27베이스+주의력 변형 완료 후 `baseCharacter` 필드에 이미지 URL 연결
3. **DB 테이블 설계** — `type_content`(81행), `child_reports`(아동별 점수+생성일시), 두 테이블 조인 구조 권장
4. **AI 배치 생성 시점** — 서비스 오픈 전 81개 전량 사전 생성 권장 (실시간 첫 요청에서 생성하면 그 아동만 로딩 지연 발생)
