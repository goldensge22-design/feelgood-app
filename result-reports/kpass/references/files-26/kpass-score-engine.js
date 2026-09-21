/**
 * K-PASS 결과지 — 점수→시각요소 자동 계산 엔진
 *
 * 목적: 지금은 계획력 145 같은 점수가 히어로 카드 텍스트·나침반 SVG 좌표·
 * 막대그래프 width%·정규분포 마커 위치 등 5~6군데에 각각 손으로 박혀 있음.
 * 이 파일 하나로 점수 4개만 넣으면 모든 시각 요소가 자동 계산되게 만든다.
 *
 * 사용법:
 *   const scores = { P: 145, A: 131, S: 117, Seq: 95 };
 *   renderScores(scores);   // 페이지의 모든 관련 DOM을 이 점수 기준으로 갱신
 *
 * ★★ CRITICAL_VALUES 관련 경고 ★★
 * 개인내적 강약 판정에 쓰는 임계값(순차/동시=7, 계획/주의=9)은 기존 예시
 * (송서우 사례)에서 쓰인 값을 그대로 가져온 것입니다. 정식 서비스 적용 전
 * (주)필굿 기술 매뉴얼 원본에서 척도별 정확한 임계값을 재확인하고, 문수백
 * 교수님 감수를 받으세요. 확인 없이 그대로 배포하지 마세요.
 */

/* ===== 1) 표준점수 → 백분위 (정규분포 누적확률, M=100 SD=15) ===== */
function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741,
        a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
function scoreToPercentile(score) {
  const z = (score - 100) / 15;
  return (0.5 * (1 + erf(z / Math.SQRT2))) * 100; // 0~100
}

/* ===== 2) 표준점수 → 막대그래프 너비 % (스케일 40~160) ===== */
function scoreToBarWidth(score) {
  return Math.max(0, Math.min(100, (score - 40) / 120 * 100));
}

/* ===== 3) 표준점수 → 인지나침반 SVG 좌표 (스케일 55~150, 반경 20~100) ===== */
function scoreToCompassRadius(score) {
  const norm = Math.max(0, Math.min(1, (score - 55) / 95));
  return 20 + norm * 80;
}
function compassPoint(score, angleDeg, cx, cy) {
  cx = cx || 150; cy = cy || 150;
  const r = scoreToCompassRadius(score);
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}
// 사용 예: P=0°(상단), S=90°(우측), Seq=180°(하단), A=270°(좌측)

/* ===== 4) 81유형 H/M/L 등급 ===== */
function classifyLevel(score) {
  if (score >= 120) return 'H';
  if (score <= 85) return 'L';
  return 'M';
}

/* ===== 5) 규준적 강/약 (또래 대비) ===== */
function normativeStatus(score) {
  if (score > 115) return 'NS';   // 규준적 강점
  if (score < 85) return 'NW';    // 규준적 약점
  return 'AVG';
}

/* ===== 6) 개인내적 강/약 (자기 자신 대비) =====
   ⚠️ 아래 임계값은 재확인 필요 (파일 상단 경고 참고) */
const CRITICAL_VALUES = { P: 9, A: 9, S: 7, Seq: 7 };   // ★ 재확인 필요

function personalStatus(scores) {
  const mean = (scores.P + scores.A + scores.S + scores.Seq) / 4;
  const result = {};
  ['P', 'A', 'S', 'Seq'].forEach((key) => {
    const diff = scores[key] - mean;
    const cv = CRITICAL_VALUES[key];
    result[key] = {
      diff: Math.round(diff),
      status: Math.abs(diff) < cv ? 'FLAT' : (diff > 0 ? 'PS' : 'PW'),  // PS=개인내적강점 PW=개인내적약점
    };
  });
  return { mean: Math.round(mean), byAxis: result };
}

/* ===== 7) 81유형 코드 산출 ===== */
function computeTypeCode(scores) {
  return {
    P: classifyLevel(scores.P),
    A: classifyLevel(scores.A),
    S: classifyLevel(scores.S),
    Seq: classifyLevel(scores.Seq),
  };
}
// baseCharacter 조회: (Seq, S, P) 3축 조합으로 27종 중 매핑 — 02번 명칭표 참고
// attentionEpithet 조회: A레벨(H/M/L) + 그룹 내 순번으로 조회 — 02번 명칭표 참고

/* ===================================================================
   8) 통합 렌더 함수 — 이 하나만 호출하면 페이지의 모든 시각 요소 갱신
   =================================================================== */
function renderScores(scores) {
  // scores = { P, A, S, Seq } 표준점수 4개

  // 8-1. 막대그래프
  ['P', 'A', 'S', 'Seq'].forEach((key) => {
    const bar = document.getElementById('bar_' + key);
    if (bar) bar.style.width = scoreToBarWidth(scores[key]) + '%';
    const label = document.getElementById('score_' + key);
    if (label) label.textContent = scores[key];
  });

  // 8-2. 인지나침반 SVG 폴리곤
  const angles = { P: 0, S: 90, Seq: 180, A: 270 };
  const points = ['P', 'S', 'Seq', 'A'].map((key) => {
    const pt = compassPoint(scores[key], angles[key]);
    return pt.x + ',' + pt.y;
  }).join(' ');
  const poly = document.getElementById('compassPolygon');
  if (poly) poly.setAttribute('points', points);

  // 8-3. 정규분포 마커 (백분위 위치)
  ['P', 'A', 'S', 'Seq'].forEach((key) => {
    const marker = document.getElementById('distMarker_' + key);
    if (marker) {
      const pct = scoreToPercentile(scores[key]);
      marker.style.left = pct + '%';
    }
  });

  // 8-4. 81유형 코드·등급 배지
  const typeCode = computeTypeCode(scores);
  const pStatus = personalStatus(scores);
  ['P', 'A', 'S', 'Seq'].forEach((key) => {
    const badge = document.getElementById('levelBadge_' + key);
    if (badge) badge.textContent = typeCode[key];
    const normBadge = document.getElementById('normBadge_' + key);
    if (normBadge) normBadge.textContent = normativeStatus(scores[key]);
    const persBadge = document.getElementById('personalBadge_' + key);
    if (persBadge) persBadge.textContent = pStatus.byAxis[key].status;
  });

  return { typeCode, personalStatus: pStatus };
}

/**
 * 적용 방법:
 * 1. 01_결과지_완성본.html에서 지금 하드코딩된 값들
 *    (히어로 카드 텍스트, SVG points, bar width%, 정규분포 마커 위치)의
 *    HTML에 위 함수가 찾는 id(bar_P, score_P, compassPolygon,
 *    distMarker_P, levelBadge_P 등)를 붙인다. 실제 id 네이밍은
 *    프로젝트 컨벤션에 맞춰 바꿔도 되고, 이 파일의 id 문자열만 맞추면 됨.
 * 2. 페이지 로드 시 renderScores({P:145, A:131, S:117, Seq:95}) 처럼
 *    실제 검사 결과 점수로 한 번 호출.
 * 3. 이후 다른 아이 데이터를 넣을 때는 renderScores() 호출 시 점수 4개만
 *    바꾸면 됨 — 여러 곳을 찾아다니며 수동으로 고칠 필요 없음.
 */
