(function () {
  'use strict';

  const list = items => '<ul class="content-list">' + items.map(item => '<li>' + item + '</li>').join('') + '</ul>';
  const cards = items => '<div class="info-grid three">' + items.map(item => '<article><span>' + item[0] + '</span><h3>' + item[1] + '</h3><p>' + item[2] + '</p></article>').join('') + '</div>';
  const note = (title, body, tone = '') => '<aside class="guide-note ' + tone + '"><h3>' + title + '</h3><p>' + body + '</p></aside>';
  const page = (id, title, eyebrow, intro, content) => ({id, title, eyebrow, intro, content});

  const assessment = {
    id: 'assessment',
    title: '검사 소개',
    pages: [
      page('assessment', '여는 글', 'ASSESSMENT · OPENING', '검사는 학생을 분류하는 결론이 아니라, 현재의 인지처리 경향과 교육적 지원 방향을 이해하는 출발점입니다.',
        '<section class="chapter-opening" aria-labelledby="openingTitle">' +
          '<div class="opening-copy">' +
            '<p class="eyebrow">COGNITIVE MAP · 교사용 인지 지도</p>' +
            '<p class="lead">점수에서 이해로, 이해에서 성장으로.</p>' +
            '<h2 id="openingTitle" class="opening-title"><span>다르게 생각하는 힘을,</span><span>다르게 성장하는 기회로.</span></h2>' +
            '<p>결과지의 인지 강점과 지원 필요를 읽고, 학생마다 다른 정보처리 방식을 이해합니다. 이를 수업·상담·자기관리와 NUVIA 훈련으로 연결합니다.</p>' +
            '<p>이 가이드는 학생을 점수나 유형으로 규정하지 않습니다. 학생에게 맞는 배움과 지원 방향을 찾기 위한 교사의 인지 지도입니다.</p>' +
            '<div class="actions"><button class="button gold" type="button" data-go="assessment-ages">검사별 가이드 보기</button><button class="button line" type="button" data-go="school-instruction">결과를 수업에 연결하기</button></div>' +
          '</div>' +
          '<div class="cognitive-art" role="img" aria-label="계획, 주의, 동시처리, 순차처리로 구성된 PASS 네 영역 인지 지도">' +
            '<i class="orbit one" aria-hidden="true"></i><i class="orbit two" aria-hidden="true"></i><i class="link l1" aria-hidden="true"></i><i class="link l2" aria-hidden="true"></i>' +
            '<div class="pass-node plan"><span>Plan</span>계획</div><div class="pass-node attention"><span>Attention</span>주의</div><div class="pass-node simultaneous"><span>Simultaneous</span>동시처리</div><div class="pass-node successive"><span>Successive</span>순차처리</div>' +
          '</div>' +
        '</section>'),
      page('assessment-tests', 'K-PASS와 D-CAS란?', 'ASSESSMENT · TESTS', '두 검사는 PASS 인지처리 이론을 바탕으로 하되 연령과 활용 맥락이 다릅니다.',
        '<div class="comparison-grid"><article class="accent-purple"><b>K-PASS</b><h3>아동 인지처리 검사</h3><p>아동의 과제 시작, 집중, 관계 통합, 순서 처리 경향을 이해하고 교실·가정의 지원 방향을 찾습니다.</p></article><article class="accent-blue"><b>D-CAS</b><h3>청소년·성인 인지처리 검사</h3><p>학습·진로 탐색·직무 수행과 자기관리 맥락에서 인지처리 전략을 이해합니다.</p></article></div>' + note('공통 원칙', '두 검사 모두 학생이나 성인의 가치를 서열화하는 검사가 아닙니다. 실제 수행, 흥미, 성취, 경험, 환경 및 면담 자료와 함께 해석합니다.')),
      page('assessment-pass', 'PASS 인지처리 이론', 'ASSESSMENT · PASS THEORY', 'PASS는 지적 활동을 계획, 주의, 동시처리, 순차처리의 상호작용으로 이해합니다.',
        cards([
          ['P', 'Planning · 계획', '목표를 세우고 전략을 선택하며 수행을 점검·수정하는 과정입니다.'],
          ['A', 'Attention · 주의', '필요한 자극에 집중하고 방해 자극을 조절하며 집중을 유지하는 과정입니다.'],
          ['S', 'Simultaneous · 동시처리', '여러 정보를 관계와 전체 구조로 통합해 의미를 파악하는 과정입니다.'],
          ['Q', 'Successive · 순차처리', '정보의 순서와 계열, 절차를 유지하며 처리하는 과정입니다.']
        ]) + note('네 영역은 함께 작동합니다', '한 영역만으로 학생을 설명하지 않습니다. 과제의 종류에 따라 요구되는 영역이 달라지고, 같은 학생도 환경과 컨디션에 따라 다른 수행을 보일 수 있습니다.')),
      page('assessment-domains', '계획·주의·동시처리·순차처리의 의미', 'ASSESSMENT · FOUR PROCESSES', '각 영역은 성격표나 직업표가 아니라, 과제를 처리할 때 필요한 인지적 조건을 설명합니다.',
        '<div class="pass-grid"><article class="pass-card plan"><b>계획</b><h3>무엇을 어떻게 할지 정하기</h3><p>과제 시작, 방법 선택, 오류 점검, 전략 수정에서 관찰됩니다.</p></article><article class="pass-card attention"><b>주의</b><h3>중요한 정보에 머물기</h3><p>지시 유지, 세부 확인, 방해 자극 조절, 정확성에서 관찰됩니다.</p></article><article class="pass-card simultaneous"><b>동시처리</b><h3>부분을 관계와 전체로 묶기</h3><p>그림·도형·문맥·개념 연결과 전체 구조 이해에서 관찰됩니다.</p></article><article class="pass-card successive"><b>순차처리</b><h3>순서와 절차를 유지하기</h3><p>긴 지시, 음운, 연산 절차, 이야기 순서와 단계 수행에서 관찰됩니다.</p></article></div>'),
      page('assessment-expertise', '검사 개발 전문성', 'ASSESSMENT · EXPERTISE', '교육심리학, 심리측정, 응용통계, 인지과학 및 디지털 기술을 함께 고려해 개발·해석합니다.',
        list(['검사 문항은 측정하려는 인지처리 과정과 연령 적합성을 함께 검토합니다.', '규준과 신뢰도·타당도 자료는 적용 대상과 검사 버전에 맞는 범위에서 사용합니다.', '디지털 반응 데이터는 점수만이 아니라 과제 수행 과정의 일관성을 살피는 데 활용합니다.', '새로운 규준이나 해석 기준은 표본 대표성과 전문가 검토 없이 자동 적용하지 않습니다.']) + note('전문성은 과장 없는 경계에서 시작합니다', 'K-PASS와 D-CAS를 다른 검사와 동일하다고 보거나, 관련 연구의 절단점을 그대로 옮겨 진단 기준처럼 사용하지 않습니다.')),
      page('assessment-digital', '디지털 검사 및 게임형 상호작용', 'ASSESSMENT · DIGITAL EXPERIENCE', '게임형 상호작용은 참여를 돕고 반응을 정교하게 기록하기 위한 방식이며, 오락 점수나 성격 게임이 아닙니다.',
        cards([
          ['01', '표준화된 제시', '문항 순서와 제시 조건을 일정하게 유지해 검사자 차이를 줄입니다.'],
          ['02', '반응 과정 기록', '정답 여부와 함께 반응 시간, 수정, 과제 진행 패턴을 확인할 수 있습니다.'],
          ['03', '연령 친화적 참여', '아동과 청소년이 지시를 이해하고 과제에 참여하도록 상호작용을 단순하게 설계합니다.']
        ]) + note('검사 환경 확인', '기기 오류, 소음, 피로, 긴장, 언어 이해, 동기와 중단 여부는 결과 해석 전에 반드시 확인합니다.', 'warning')),
      page('assessment-evidence', '신뢰도·타당도·표준화', 'ASSESSMENT · EVIDENCE', '숫자는 검사의 범위와 불확실성을 설명하기 위해 사용합니다.',
        '<div class="evidence-grid"><article><strong>2,700명</strong><span>2023년 전국 4–12세 K-PASS 표준화 표본</span></article><article><strong>27개</strong><span>3개월 단위 연령집단</span></article><article><strong>.91–.95</strong><span>하위척도 반분·재검사 신뢰도</span></article><article><strong>GFI .97</strong><span>확인적 요인분석 적합도</span></article></div><details open><summary>표준화·신뢰도·타당도 상세</summary><p>각 연령은 300명, 남녀 각 150명으로 구성하고 전국 15개 지역 분포를 고려했습니다. 전체척도 반분 신뢰도는 .95–.96, 270명을 평균 20일 뒤 다시 검사한 하위척도 재검사 신뢰도는 .91–.95로 보고되었습니다.</p><p>KABC-II 준거 관련 타당도 비교는 7–12세 40명 표본에서 전체척도 약 .71–.72로 보고되었습니다. 95% 신뢰구간, 영역 간 패턴, 교사의 실제 관찰을 함께 봅니다.</p></details>' + note('적용 범위', '이 근거는 K-PASS 4–12세 자료에 적용됩니다. D-CAS 청소년·성인용 근거로 자동 확대하지 않습니다.', 'warning')),
      page('assessment-ages', '아동용·청소년용·성인용 검사 구분', 'ASSESSMENT · AGE PATHS', '같은 점수라도 발달 단계와 생활 맥락에 따라 질문과 지원 방향이 달라집니다.',
        '<div class="report-grid"><article class="report-card kpass"><span>K-PASS</span><h3>아동용</h3><p>교실 참여, 학습 기초, 보호자 지원과 발달 맥락을 중심으로 봅니다.</p></article><article class="report-card teen"><span>D-CAS</span><h3>청소년용</h3><p>학습 전략, 진로 탐색, 자기관리와 학교생활의 맥락을 함께 봅니다.</p></article><article class="report-card adult"><span>D-CAS</span><h3>성인용</h3><p>대학 학습, 프로젝트, 직무 수행, 생활 리듬과 환경 조건을 함께 봅니다.</p></article></div>'),
      page('assessment-report', '결과지 보는 방법', 'ASSESSMENT · REPORT READING', '전체 점수 하나보다 네 영역의 패턴, 신뢰구간, 실제 관찰과 학생의 설명을 함께 봅니다.',
        '<ol class="flow compact-flow"><li><b>검사 조건</b><span>피로·긴장·언어·기기 환경 확인</span></li><li><b>전체 경향</b><span>한 점수가 아닌 범위로 확인</span></li><li><b>네 영역</b><span>높고 낮은 영역의 조합 확인</span></li><li><b>교실 관찰</b><span>실제 과제 장면과 비교</span></li><li><b>지원 실험</b><span>한 번에 한 가지 조정 후 기록</span></li></ol>' + note('결과지는 대화의 시작', '학생에게 결과를 설명할 때 “너는 이런 유형”이라고 고정하지 않고, “이런 조건에서 더 편했는지 함께 확인해 보자”라고 질문합니다.')),
      page('assessment-levels', '규준적 강약과 개인 내 강약', 'ASSESSMENT · TWO PERSPECTIVES', '규준적 비교와 개인 안의 상대적 차이는 서로 다른 질문에 답합니다.',
        '<div class="comparison-grid"><article><b>규준적 강약</b><h3>또래 규준과 비교</h3><p>같은 연령 규준에서 현재 수행이 어느 범위에 있는지 봅니다. 검사 조건과 신뢰구간을 함께 확인합니다.</p></article><article><b>개인 내 강약</b><h3>학생 안의 상대적 차이</h3><p>네 영역 가운데 상대적으로 편한 과정과 더 많은 지원이 필요한 과정을 봅니다. 규준 점수가 평균이어도 개인 내 차이는 클 수 있습니다.</p></article></div>' + note('둘 중 하나만 보지 않습니다', '규준적 위치, 개인 내 패턴, 실제 교실 수행을 함께 보며 한 영역의 높고 낮음만으로 전체 능력을 단정하지 않습니다.')),
      page('assessment-profiles', '81가지 인지특성', 'ASSESSMENT · 81 PROFILES', 'PASS 네 영역의 상·중·하 조합 81가지를 생성형 AI 없이 로컬 규칙으로 설명합니다.', '<div data-profile-explorer></div>'),
      page('assessment-reports', '검사 결과지 바로가기', 'ASSESSMENT · SAMPLE REPORTS', '실제 결과지는 새 탭으로 열립니다. 외부 결과지 링크는 전자책 내부 목차 동작과 분리되어 있습니다.', '<div data-report-links></div>'),
      page('assessment-cautions', '검사 활용 시 주의사항', 'ASSESSMENT · ETHICS', '검사 결과는 지원을 설계하기 위한 보조 자료이며 학생의 가능성을 제한하는 근거가 아닙니다.',
        list(['검사 결과만으로 장애·질환·ADHD·SLD·영재·2E를 진단하거나 판정하지 않습니다.', '학생을 서열화하거나 반 편성, 낙인, 교육 기회의 제한에 사용하지 않습니다.', '진로와 직업 적합성을 확정하지 않고 흥미·가치관·성취·경험·면담 자료와 함께 봅니다.', '낮은 수행은 피로·긴장·언어 이해·환경·참여 상태를 먼저 확인합니다.', '지원 후 실제 참여와 전략 변화가 있었는지 관찰하고 필요할 때 전문가와 협의합니다.']) + note('핵심 문장', '검사 결과는 현재의 인지처리 경향과 지원 방향을 이해하기 위한 참고자료입니다. 학생의 능력·성격·진로를 확정하지 않습니다.', 'warning'))
    ]
  };

  const school = {
    id: 'school',
    title: '학교 제안',
    pages: [
      page('school', '학교에서 검사가 필요한 이유', 'SCHOOL · WHY', '같은 목표를 서로 다른 방식으로 배우는 학생을 이해하고, 설명·자료·시간·피드백을 조정하기 위해 검사를 활용합니다.',
        cards([['01', '보이지 않는 처리 차이', '성적만으로는 과제를 이해하고 수행하는 과정의 차이를 알기 어렵습니다.'],['02', '지원의 구체화', '“더 열심히” 대신 전체 구조, 단계, 핵심 표시, 점검 루틴처럼 구체적인 도움을 설계합니다.'],['03', '변화 확인', '검사, 수업 관찰, 상담, 재검사를 연결해 지원 후 변화를 확인합니다.']]) + note('학교 활용 원칙', '검사는 선발이나 낙인이 아니라 수업 접근성을 높이고 지원의 우선순위를 협의하는 자료입니다.')),
      page('school-individual', '개인 학생 결과 활용', 'SCHOOL · INDIVIDUAL', '학생의 네 영역 조합과 실제 과제 장면을 함께 보며 한 번에 한 가지 지원을 실험합니다.',
        '<ol class="flow compact-flow"><li><b>결과 확인</b><span>규준적 위치와 개인 내 차이</span></li><li><b>학생 대화</b><span>편한 방식과 어려운 조건 묻기</span></li><li><b>수업 관찰</b><span>과제 시작·집중·통합·순서 기록</span></li><li><b>지원 적용</b><span>설명·자료·시간 중 한 가지 조정</span></li><li><b>변화 확인</b><span>2–4주 후 참여와 전략 재검토</span></li></ol>'),
      page('school-dashboard', '학급 두뇌 데이터 대시보드', 'SCHOOL · CLASS DASHBOARD', '개인 결과를 학급 수준에서 통합해 공통 강점과 지원 필요 영역을 수업 설계에 활용합니다.', '<div data-class-dashboard></div>'),
      page('school-levels', '규준적 강약과 개인 내 강약 비교', 'SCHOOL · COMPARISON', '학급 평균과 학생 개인의 패턴을 혼동하지 않도록 두 관점을 나누어 확인합니다.',
        '<div class="comparison-grid"><article><b>학급·규준 관점</b><h3>공통 지원 설계</h3><p>학급에서 상대적으로 낮은 영역이 있으면 설명식·시각식·단계식 활동의 비율과 공통 보조를 조정합니다.</p></article><article><b>개인 내 관점</b><h3>학생별 접근 조정</h3><p>같은 학급 안에서도 학생마다 편한 처리 방식이 다르므로 과제 난이도와 제시 방식을 개별 조정합니다.</p></article></div>'),
      page('school-strengths', 'PASS 영역별 뛰어난 분야 분석', 'SCHOOL · STRENGTH CONDITIONS', '뛰어난 분야는 직업이나 진로를 확정하는 말이 아니라, 더 효과적인 수행이 기대되는 과제 조건과 정보처리 환경을 뜻합니다.', '<div data-strength-analysis></div>'),
      page('school-profiles', '81가지 특성별 학생 이해', 'SCHOOL · PROFILE COMBINATIONS', '네 영역의 조합과 개인 내 차이를 함께 읽어 학생에게 맞는 과제 조건을 탐색합니다.',
        list(['한 영역의 강점만 강조하지 않고 다른 세 영역과의 조합을 함께 봅니다.', '같은 프로필 코드라도 흥미, 경험, 정서, 언어, 과제 친숙도에 따라 수행은 달라질 수 있습니다.', '프로필 설명은 관찰 가설이며 학생의 성격이나 정체성이 아닙니다.', '진로·적성은 흥미, 가치관, 성취도, 경험, 환경 및 면담 자료와 함께 해석합니다.']) + '<div class="actions"><button class="button gold" type="button" data-go="assessment-profiles">81가지 규칙 설명 열기</button></div>'),
      page('school-instruction', '수업 설계와 과제 조정', 'SCHOOL · INSTRUCTION', '공통 학습목표는 유지하면서 정보 제시 방식, 단계 수, 도움의 양과 점검 시점을 조정합니다.',
        cards([['P', '계획 지원', '목표 한 문장, 선택 가능한 전략, 중간 점검, 오류 수정 시간을 제공합니다.'],['A', '주의 지원', '핵심 표시, 짧은 활동 구간, 방해 자극 감소, 정확성 확인 루틴을 제공합니다.'],['S', '동시처리 지원', '전체 지도, 완성 예시, 그림·도식·마인드맵과 관계 비교를 제공합니다.'],['Q', '순차처리 지원', '번호 단계, 절차표, 체크리스트, 시범→함께→혼자 수행을 제공합니다.']]) + note('한 번에 한 가지를 바꿉니다', '난이도, 설명 방식, 시간, 피드백을 동시에 모두 바꾸면 어떤 도움이 효과적이었는지 알기 어렵습니다.')),
      page('school-counseling', '상담 및 학부모 소통', 'SCHOOL · CONVERSATION', '점수나 유형을 전달하기보다 실제 장면, 도움이 된 조건, 다음 지원을 함께 이야기합니다.',
        '<div class="script-card"><h3>먼저 전할 문장</h3><p>“이 결과는 잘하고 못하는 순위를 정하는 점수가 아니라, 어떤 설명과 연습이 더 잘 맞는지 함께 찾기 위한 자료입니다.”</p></div><div class="script-card"><h3>함께 정할 질문</h3><p>“학교와 가정에서 과제를 시작하기 편했던 때는 언제였나요? 어떤 설명이나 자료가 도움이 되었나요?”</p></div>'),
      page('school-followup', '지원이 필요한 학생의 후속 조치', 'SCHOOL · FOLLOW-UP', '낮은 점수를 곧바로 진단으로 연결하지 않고 검사 조건과 반복 관찰을 확인한 뒤 단계적으로 협의합니다.',
        '<ol class="flow compact-flow"><li><b>재확인</b><span>기기·피로·긴장·언어·참여 상태</span></li><li><b>교실 지원</b><span>구체적인 설명·자료·단계 조정</span></li><li><b>기록</b><span>여러 수업에서 반복되는지 관찰</span></li><li><b>학교 협의</b><span>상담·특수·전문 인력과 공유</span></li><li><b>보호자 협의</b><span>필요 시 종합평가와 지원 연결</span></li></ol>' + note('학생을 먼저 보호합니다', '위험이나 의료적 문제가 의심되면 학교 위기 대응 절차와 지역 전문기관 지침을 우선하며 교사가 단독으로 판단하지 않습니다.', 'warning')),
      page('school-nuvia', 'NUVIA 가정훈련 연계', 'SCHOOL · NUVIA HOME PRACTICE', '교사가 검사와 관찰을 함께 보고 짧은 가정과제를 추천하며, 수행률과 부담을 확인해 난이도와 빈도를 조정합니다.',
        list(['한 번에 한 가지 인지전략 목표를 정합니다.', '8–12분, 주 2–3회처럼 짧고 지속 가능한 분량부터 시작합니다.', '학생이 가정에서 수행하고 보호자는 독촉보다 환경과 시간 확보를 돕습니다.', '교사는 수행률, 도움 사용, 수업에서의 전략 변화를 분리해 확인합니다.', '부담이 크거나 변화가 없으면 분량·빈도·과제를 조정하거나 중단합니다.']) + note('자동 처방이 아닙니다', 'NUVIA는 질환을 치료하거나 지능 향상을 보장하지 않습니다. 인지처리 전략을 연습하고 학습 수행을 지원하는 교육 프로그램입니다.'))
    ]
  };

  const business = {
    id: 'business', title: '기업 제안', pages: [
      page('business', '기업에서 인지처리 검사가 필요한 이유', 'BUSINESS · WHY', '구성원의 우열을 가르는 대신 문제를 이해하고 실행하는 방식의 다양성을 교육·협업 환경 설계에 활용합니다.', cards([['01','수행 방식 이해','같은 목표에 접근하는 전략·집중·통합·절차 처리의 차이를 이해합니다.'],['02','교육 최적화','연수 자료와 실습 순서를 다양한 정보처리 방식에 맞게 설계합니다.'],['03','협업 지원','팀의 인지 다양성을 역할 고정이 아닌 상호 보완의 관점에서 봅니다.']]) + note('채용 자동 결정 금지', '검사 결과만으로 채용·배치·승진 여부를 자동 결정하지 않습니다. 직무 경험, 역량, 성과, 면담과 함께 제한적으로 참고합니다.', 'warning')),
      page('business-workstyle', '직무 수행 방식 이해', 'BUSINESS · WORK STYLE', '계획·주의·동시처리·순차처리는 일을 시작하고 유지하며 정보를 통합하고 절차를 수행하는 조건을 이해하는 언어입니다.', list(['계획: 목표 설정, 전략 선택, 우선순위, 자기점검', '주의: 핵심 자극 선택, 집중 유지, 오류 발견', '동시처리: 복합정보 통합, 전체 맥락과 관계 파악', '순차처리: 단계, 절차, 계열 정보의 안정적 수행'])),
      page('business-learning', '교육 및 연수 설계', 'BUSINESS · LEARNING DESIGN', '한 가지 강의 방식만 사용하지 않고 전체 구조, 시각 자료, 단계 안내, 실습과 피드백을 조합합니다.', cards([['P','전략 설계','목표와 선택 기준을 제시하고 계획을 설명하게 합니다.'],['A','집중 환경','핵심 정보와 오류 점검 기준을 명확하게 제공합니다.'],['S','전체 맥락','업무 흐름도와 시스템 관계를 먼저 보여 줍니다.'],['Q','절차 숙달','체크리스트와 단계별 시범으로 반복 연습합니다.']])),
      page('business-team', '팀 인지 다양성 분석', 'BUSINESS · TEAM DIVERSITY', '팀 수준 데이터는 다양한 접근 방식을 이해하는 참고자료이며 개인의 역할을 고정하는 기준이 아닙니다.', list(['프로젝트 단계별로 필요한 인지과정을 함께 정의합니다.', '서로 다른 강점을 가진 구성원이 설명 방식을 교차 검토합니다.', '회의에서는 전체 구조와 단계별 실행안을 모두 기록합니다.', '검사 유형으로 리더·검토자·실행자 역할을 고정하지 않습니다.'])),
      page('business-collaboration', '문제 해결과 협업 지원', 'BUSINESS · COLLABORATION', '문제 정의, 정보 통합, 대안 비교, 실행 절차와 회고를 명시해 협업 마찰을 줄입니다.', '<ol class="flow compact-flow"><li><b>문제 정의</b><span>목표와 제약 확인</span></li><li><b>정보 통합</b><span>전체 맥락과 관계 시각화</span></li><li><b>대안 비교</b><span>전략의 장단점 검토</span></li><li><b>실행</b><span>단계와 책임 확인</span></li><li><b>회고</b><span>오류와 개선 전략 기록</span></li></ol>'),
      page('business-selfmanagement', '자기관리 및 업무전략 지원', 'BUSINESS · SELF MANAGEMENT', '검사 결과를 개인의 실행 루틴을 조정하는 대화에 활용합니다.', list(['업무 시작 신호와 첫 행동을 작게 정합니다.', '집중 구간과 회복 시간을 함께 계획합니다.', '전체 구조와 완료 기준을 먼저 확인합니다.', '복잡한 절차는 체크리스트와 중간 점검으로 나눕니다.'])),
      page('business-ethics', '검사 활용 시 윤리 원칙', 'BUSINESS · ETHICS', '인지처리 결과는 인사 의사결정을 대신하지 않으며 불이익이나 감시의 근거로 사용하지 않습니다.', list(['검사 목적과 활용 범위를 사전에 설명하고 동의를 확인합니다.', '원점수와 개인 결과의 접근 권한을 최소화합니다.', '채용·배치·승진을 검사 결과만으로 자동 결정하지 않습니다.', '직무 경험, 역량, 성과, 면담, 환경 요인과 함께 검토합니다.', '결과에 이의를 제기하고 설명을 요청할 기회를 제공합니다.']) + note('고정된 적성표가 아닙니다', 'PASS 영역은 직업 적성을 직접 확정하지 않습니다. 수행 환경과 과제 조건을 이해하기 위한 보조 자료입니다.', 'warning'))
    ]
  };

  const military = {
    id: 'military-police', title: '군·경찰 제안', pages: [
      page('military-police', '군·경찰 조직에서의 활용 목적', 'MILITARY & POLICE · PURPOSE', '선발 탈락이나 위험성 판정이 아니라 교육·훈련과 수행환경 지원을 위한 보조 자료로 활용합니다.', cards([['01','훈련 설계','인지 요구가 다른 과제를 단계적으로 설계합니다.'],['02','팀 지원','복합 상황에서 정보 공유와 점검 방식을 조정합니다.'],['03','수행환경','주의 분산, 절차 복잡성, 정보량 같은 환경 조건을 개선합니다.']]) + note('단일 기준 사용 금지', '검사 결과는 선발 탈락, 위험성, 신뢰성 또는 임무 적합성을 단독으로 판정하는 기준이 아닙니다.', 'warning')),
      page('military-attention', '주의통제와 상황 판단', 'MILITARY & POLICE · ATTENTION', '중요 자극을 선택하고 방해 자극을 조절하는 능력은 피로, 스트레스, 환경 조건과 함께 관찰합니다.', list(['핵심 신호와 비핵심 자극을 구분하는 훈련', '짧은 고집중 구간과 회복 루틴', '오류를 발견하고 보고하는 이중 확인 절차', '야간·소음·다중과제 환경에서의 추가 관찰'])),
      page('military-sequence', '절차 수행과 순차처리', 'MILITARY & POLICE · SUCCESSIVE', '복잡한 절차를 안정적으로 수행할 수 있도록 단계, 복창, 체크리스트와 시범을 제공합니다.', list(['절차를 의미 단위로 나누고 번호를 부여합니다.', '시범→복창→함께 수행→독립 수행 순으로 연습합니다.', '분기 조건과 예외 상황을 별도 카드로 제공합니다.', '속도보다 정확성과 점검을 먼저 안정화합니다.'])),
      page('military-integration', '복합정보 통합과 동시처리', 'MILITARY & POLICE · SIMULTANEOUS', '지도, 시각 신호, 상황 맥락과 여러 정보원의 관계를 전체 구조로 통합하는 조건을 설계합니다.', list(['상황도와 전체 임무 구조를 먼저 공유합니다.', '정보원의 위치·시간·신뢰도를 함께 표시합니다.', '부분 정보가 전체 판단에 미치는 영향을 토의합니다.', '공간·관계 정보는 도식과 시뮬레이션으로 반복합니다.'])),
      page('military-planning', '계획과 자기점검', 'MILITARY & POLICE · PLANNING', '목표, 제약, 대안, 중간 점검과 사후 회고를 명시해 전략 수정 과정을 훈련합니다.', '<ol class="flow compact-flow"><li><b>목표</b><span>완료 기준 합의</span></li><li><b>제약</b><span>시간·안전·자원 확인</span></li><li><b>대안</b><span>두 가지 이상 전략 비교</span></li><li><b>점검</b><span>중단·수정 기준 설정</span></li><li><b>회고</b><span>판단 근거와 오류 기록</span></li></ol>'),
      page('military-training', '교육·훈련 설계', 'MILITARY & POLICE · TRAINING', '설명식·시각식·단계식 훈련을 조합하고 인지 부하를 점진적으로 높입니다.', cards([['P','계획','대안 비교와 중간 점검을 포함한 시나리오'],['A','주의','방해 자극 속 핵심 신호 탐지와 오류 확인'],['S','동시처리','지도·상황도·복합정보 관계 통합'],['Q','순차처리','표준 절차, 체크리스트, 예외 분기 수행']])),
      page('military-team', '조직 및 팀 단위 분석', 'MILITARY & POLICE · TEAM', '팀 결과는 역할을 고정하기보다 브리핑, 교차 확인, 정보 공유 방식을 조정하는 데 사용합니다.', list(['팀의 공통 강점과 지원 필요를 훈련 설계에 반영합니다.', '서로 다른 정보처리 방식이 검토 과정에서 보완되도록 합니다.', '개인의 프로필과 민감정보는 최소한으로 공유합니다.', '팀 평균으로 개인을 평가하거나 반대로 개인 결과로 팀을 일반화하지 않습니다.'])),
      page('military-caution', '고위험 의사결정 시 주의사항', 'MILITARY & POLICE · HIGH-STAKES ETHICS', '고위험 결정은 검사의 오차와 맥락 영향을 고려해 여러 자료와 독립적인 전문 판단을 결합해야 합니다.', list(['검사 결과 하나로 선발 탈락·위험성·임무 부적합을 판정하지 않습니다.', '실제 수행평가, 훈련 기록, 경험, 면담, 건강과 환경 조건을 함께 봅니다.', '검사 목적과 이의 제기 절차, 데이터 보관·접근 범위를 명확히 합니다.', '낮은 결과는 낙인보다 재검 조건과 교육적 지원 가능성을 먼저 검토합니다.']) + note('안전과 권리의 균형', '검사는 안전 판단을 대신하지 않습니다. 조직의 공식 절차와 자격을 갖춘 전문가의 종합 판단을 우선합니다.', 'warning'))
    ]
  };

  const nuvia = {
    id: 'nuvia', title: '인지훈련 프로그램', pages: [
      page('nuvia', 'NUVIA란?', 'NUVIA COGNITIVE TRAINING', 'NUVIA 인지훈련 시리즈는 검사 결과와 교사의 관찰을 바탕으로 인지처리 전략을 짧게 연습하고 학습 수행을 지원하는 프로그램입니다.', '<div class="nuvia-grid"><article><span class="program-tag">유아·초등</span><h3>NUVIA KIDS</h3><p>계획·주의·동시·순차 전략을 연령에 맞는 활동으로 연습합니다.</p></article><article><span class="program-tag">자료 기반 사고</span><h3>NUVIA HISTORY</h3><p>조건·근거·원인·결과를 비교하고 판단을 수정합니다.</p></article><article><span class="program-tag">초4–성인</span><h3>NUVIA PLANNER</h3><p>과제 착수·집중·시간·회복·점검을 생활 과제에 연결합니다.</p></article></div>' + note('훈련의 범위', 'NUVIA는 질환을 치료하거나 지능 향상을 보장하지 않습니다. 정규수업을 대체하지 않고 인지전략 연습을 지원합니다.')),
      page('nuvia-connection', '검사와 훈련의 연결', 'NUVIA · CONNECTION', '검사 결과를 자동 처방으로 사용하지 않고 실제 수업 관찰과 학생의 목표를 확인해 훈련을 추천합니다.', '<ol class="flow compact-flow"><li><b>검사</b><span>K-PASS 또는 D-CAS</span></li><li><b>이해</b><span>강점과 지원 영역 확인</span></li><li><b>추천</b><span>교사가 한 가지 과제 선택</span></li><li><b>가정훈련</b><span>짧게 반복하고 부담 기록</span></li><li><b>조정</b><span>수행률·관찰 후 난이도 조정</span></li></ol>'),
      page('nuvia-domains', '계획·주의·동시처리·순차처리별 훈련', 'NUVIA · FOUR SERIES', '영역별 활동은 점수를 올리기 위한 반복이 아니라 전략을 말하고 선택하고 점검하는 경험을 제공합니다.', cards([['P','계획 훈련','목표 세우기, 전략 비교, 중간 점검, 오류 수정'],['A','주의 훈련','핵심 자극 찾기, 방해 조절, 정확성 확인, 회복 루틴'],['S','동시처리 훈련','패턴·관계·전체 구조 통합, 시각적 조직화'],['Q','순차처리 훈련','순서 기억, 절차 실행, 계열화, 단계별 설명']])),
      page('nuvia-personal', '학생별 맞춤 과제 추천', 'NUVIA · PERSONAL ASSIGNMENT', '교사는 결과와 관찰, 학생의 관심과 생활 여건을 함께 확인해 과제를 선택합니다.', list(['강점 확장과 지원 필요 중 현재 우선 목표를 하나 정합니다.', '학생이 성공할 수 있는 난이도와 짧은 시간으로 시작합니다.', '선호하는 소재와 활동 방식을 반영하되 특정 유형에 과제를 고정하지 않습니다.', '부담, 도움 사용, 수행 전략을 과제 점수와 분리해 기록합니다.'])),
      page('nuvia-home', '가정훈련 운영 방법', 'NUVIA · HOME PRACTICE', '가정에서는 짧고 예측 가능한 루틴으로 운영하고 보호자는 정답 지도보다 환경 지원을 맡습니다.', list(['정해진 요일과 시간에 8–12분부터 시작합니다.', '집중 가능한 장소와 기기를 준비합니다.', '보호자는 독촉보다 시작 신호와 마무리 확인을 돕습니다.', '피로·거부가 크면 즉시 분량을 줄이거나 쉬어갑니다.', '주간 기록은 교사에게 수행률과 부담 정도만 간단히 공유합니다.'])),
      page('nuvia-week', '주간 훈련 계획', 'NUVIA · WEEKLY PLAN', '짧은 반복과 충분한 회복을 포함해 학교생활을 침해하지 않는 계획을 세웁니다.', '<div class="week-plan"><article><b>월</b><span>8분 · 새 전략 익히기</span></article><article><b>수</b><span>10분 · 같은 전략 변형</span></article><article><b>금</b><span>8분 · 스스로 적용</span></article><article><b>주말</b><span>휴식 또는 선택 활동</span></article></div>' + note('기본값이 의무는 아닙니다', '학생의 피로와 일정에 따라 주 1–2회로 줄이거나 일시 중단할 수 있습니다.')),
      page('nuvia-dashboard', '교사용 진행 대시보드', 'NUVIA · TEACHER DASHBOARD', '교사는 점수 경쟁이 아니라 수행률, 도움 사용, 난이도 적합성과 수업에서의 전략 변화를 확인합니다.', cards([['01','수행률','배정한 과제를 무리 없이 이어가고 있는지 봅니다.'],['02','도움 사용','힌트와 중단, 재시도 패턴을 확인합니다.'],['03','난이도','정답률보다 좌절·지루함·집중 부담을 함께 봅니다.'],['04','수업 전이','훈련 전략이 실제 과제에 사용되는지 관찰합니다.']])),
      page('nuvia-feedback', '학생과 학부모 피드백', 'NUVIA · FEEDBACK', '결과를 칭찬이나 비판으로 단순화하지 않고 사용한 전략과 도움이 된 조건을 구체적으로 이야기합니다.', '<div class="script-card"><h3>학생 피드백</h3><p>“이번에는 시작 전에 순서를 적어서 중간에 멈추지 않았구나. 다음 과제에서도 같은 방법을 시험해 보자.”</p></div><div class="script-card"><h3>보호자 안내</h3><p>“정답 수보다 짧게 꾸준히 참여하고 어떤 도움을 사용했는지 확인해 주세요. 부담이 커지면 즉시 알려 주세요.”</p></div>'),
      page('nuvia-effect', '훈련 효과 확인', 'NUVIA · REVIEW', '훈련 화면의 수행 변화와 교실·생활 변화를 분리해서 확인한 뒤 교육적 의미를 판단합니다.', list(['훈련 과제의 정확도·시간·도움 사용 변화', '수업에서 과제 시작과 지속, 전략 사용 변화', '학생이 느끼는 부담과 자신감', '교사·보호자의 반복 관찰', '일정 기간 후 필요 시 같은 조건의 재평가']) + note('과도한 일반화 금지', '특정 활동의 향상이 지능 전체, 질환 치료 또는 모든 학업 수행의 향상을 보장하지 않습니다.')),
      page('nuvia-safety', '과도한 훈련 방지 원칙', 'NUVIA · SAFE PRACTICE', '훈련은 학생의 수면, 정규학습, 놀이와 관계를 침해하지 않는 범위에서 운영합니다.', list(['피로·두통·불안·거부가 반복되면 중단하고 원인을 확인합니다.', '연속 수행 시간과 주간 빈도에 상한을 둡니다.', '벌이나 보상의 조건으로 사용하지 않습니다.', '성적이나 지능 향상을 약속하지 않습니다.', '학생의 동의와 보호자의 이해를 확인하고 언제든 조정할 수 있게 합니다.']) + note('지원이 우선입니다', '훈련을 더 많이 시키는 것이 항상 도움이 되는 것은 아닙니다. 환경 조정, 휴식, 상담과 다른 교육 지원을 함께 고려합니다.', 'warning'))
    ]
  };

  window.FEELGOOD_GUIDE_DATA = {groups: [assessment, school, business, military, nuvia]};
})();
