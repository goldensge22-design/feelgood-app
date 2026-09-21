/**
 * K-PASS 결과지 — "이런 역사적 인물과 닮아 있어요" 렌더 함수
 *
 * 데이터: kpass-historical-figures.json
 * 의존:   kpass-score-engine.js 의 classifyLevel()
 *
 * 사용법:
 *   const html = renderFigureSection({ P:145, A:131, S:117, Seq:95 }, FIGURES);
 *   document.getElementById('figureSection').innerHTML = html;
 *
 * ★ 이 파일은 81유형 전부를 커버합니다.
 *   81개 유형이 상위 2축 조합 7가지 중 하나로 떨어지기 때문에,
 *   인물 데이터는 7조합 × 2명 = 14명만 있으면 됩니다.
 */

/* ===== 1) 균형형 판정 임계값 =====
   4축 중 최고점과 최저점 차이가 이 값 미만이면 "고른 유형(BAL)"으로 봅니다.
   ★ 이 값(15)은 임시입니다. 표준점수 1SD 기준으로 잡은 것이라
     문수백 교수님 감수 시 함께 확인하세요. */
const BALANCE_THRESHOLD = 15;

/* ===== 2) 점수 4개 → 조합 키 산출 ===== */
function pickComboKey(scores) {
  const ranked = [
    { k: 'P', v: scores.P },
    { k: 'A', v: scores.A },
    { k: 'S', v: scores.S },
    { k: 'Q', v: scores.Seq },
  ].sort(function (a, b) { return b.v - a.v; });

  // 2-1. 고른 유형 먼저 판정
  if (ranked[0].v - ranked[3].v < BALANCE_THRESHOLD) return 'BAL';

  // 2-2. 상위 2축 조합 (데이터 키 순서에 맞춰 정렬: P → A → S → Q)
  const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
  const top2 = [ranked[0].k, ranked[1].k].sort(function (a, b) {
    return ORDER[a] - ORDER[b];
  });
  return top2.join('');   // 'PA' | 'PS' | 'PQ' | 'AS' | 'AQ' | 'SQ'
}

/* ===== 3) 인물 카드 1장 ===== */
function figureCard(f, tag) {
  return '' +
    '<div class="figure-card">' +
      '<span class="figure-tag">' + tag + '</span>' +
      '<h4 class="figure-name">' + f.name +
        '<span class="figure-life">' + f['생몰'] + '</span></h4>' +
      '<p class="figure-role">' + f['소개'] + '</p>' +
      '<p class="figure-story">' + f['일화'] + '</p>' +
      '<p class="figure-why"><b>왜 닮았냐면</b> ' + f['왜'] + '</p>' +
    '</div>';
}

/* ===== 4) 섹션 전체 ===== */
function renderFigureSection(scores, DATA) {
  const key = pickComboKey(scores);
  const combo = DATA.combos[key];
  if (!combo) return '';

  // 주의력 등급별 문장 — classifyLevel()은 kpass-score-engine.js
  const aLevel = classifyLevel(scores.A);              // 'H' | 'M' | 'L'
  const anchorName = combo['국내'].name;               // 국내 인물 이름을 문장에 삽입
  const aSentence = DATA['주의력_변형문장'][aLevel]
                      .replace(/\{NAME\}/g, anchorName);

  const T = DATA['안내문구'];
  const intro = T['머리말'].replace('{COMBO_LABEL}', combo.label);

  return '' +
    '<section class="figure-section">' +
      '<h3 class="figure-title">' + T['제목'] + '</h3>' +
      '<p class="figure-combo">' + combo.label + ' &middot; ' + combo['한줄'] + '</p>' +
      '<p class="figure-intro">' + intro + '</p>' +
      '<div class="figure-grid">' +
        figureCard(combo['국내'], '우리나라') +
        figureCard(combo['해외'], '해외') +
      '</div>' +
      '<p class="figure-attention">' + aSentence + '</p>' +
      '<p class="figure-outro">' + T['꼬리말'] + '</p>' +
    '</section>';
}

/* ===== 5) 적용 방법 =====
 *
 * 1. report.kpass.final.html 에서 지금 "송서우" 기준으로 고정돼 있는
 *    역사적 인물 블록을 통째로 <section id="figureSection"></section> 으로 교체.
 *
 * 2. 데이터 로드 후 호출:
 *      const FIGURES = <kpass-historical-figures.json 내용>;
 *      document.getElementById('figureSection').innerHTML =
 *        renderFigureSection(scores, FIGURES);
 *
 * 3. renderScores() 호출 직후에 같이 부르면 점수와 인물이 항상 일치합니다.
 *
 * ===== 6) 확인 필요 =====
 * - BALANCE_THRESHOLD(15)가 실제 검사 데이터 분포에서 적절한지.
 *   너무 크면 대부분이 세종대왕/다빈치로 몰리고, 너무 작으면 BAL이 안 나옵니다.
 *   실제 검사 결과 샘플 100건 정도에 돌려서 조합별 분포를 먼저 확인하세요.
 * - 동점 처리: 현재는 sort 결과를 그대로 씁니다. 2위와 3위가 동점일 때
 *   어느 쪽을 택할지 규칙이 필요하면 추가하세요.
 */
