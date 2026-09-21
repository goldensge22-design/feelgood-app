/**
 * dcas-i18n-bank.js — 개인화 문구의 "언어별 사전"
 *
 * ===== 이 파일이 존재하는 이유 =====
 * 기존 구조: 언어마다 JS 로직에 isEn 삼항연산자로 문구가 하드코딩되어 있었음.
 *   setText('pf-temp-adapt' + sfx, isEn ? '...영어 문장...' : '...한국어 문장...');
 * → 언어를 10개로 늘리면 이 삼항연산자를 9번 더 늘려써야 하고,
 *   실수로 하나라도 빠뜨리면 그 언어만 "조용히 고정 문구"가 되는 사고가 반복됨.
 *   (실제로 이번 감사에서 영어판 학습방안 섹션이 이런 식으로 통째로 안 걸려있었음)
 *
 * 새 구조: "어떤 문구를 보여줄지 고르는 로직"과 "그 문구 자체"를 분리한다.
 *   - 로직(점수 → 어느 축이 강점/약점인지, 어느 tier인지 판단)은 언어와 무관하게 딱 1벌만 존재.
 *   - 문구(실제 텍스트)만 이 파일에 언어별로 쌓는다.
 * 언어를 추가할 때 할 일: 이 파일에 새 언어 키(예: ja, zh, es...)를 하나 추가하고
 * 번역만 채워 넣으면 끝. JS 로직도, HTML도 건드릴 필요가 없다.
 *
 * ===== 사용법 =====
 *   const T = DCasI18n.get(currentLang);   // currentLang이 'ja'인데 ja가 없으면 자동으로 ko로 폴백
 *   T.axisLabel.P                          // '계획력' / 'Planning' / ...
 *   T.tempCard.react.high[0]               // 배열(강점 bullet들)
 *   T.tempCard.mood.top('계획력')           // 함수형 템플릿 — 축 이름을 그 언어 어순에 맞게 삽입
 *
 * ===== 언어 추가 예시 (일본어) =====
 *   1. 아래 BANK 객체에 `ja: { ... }` 블록을 하나 추가한다 (ko 블록을 복사해서 번역).
 *   2. 끝. render() 쪽 코드는 한 줄도 안 바뀐다.
 */
(function (global) {
  'use strict';

  function hasBatchimLocal(str) {
    const ch = str.charCodeAt(str.length - 1);
    if (ch < 0xAC00 || ch > 0xD7A3) return false;
    return (ch - 0xAC00) % 28 !== 0;
  }

  const BANK = {
    ko: {
      axisLabel: { P: '계획력', A: '주의력', S: '동시처리', Q: '순차처리' },
      josaEunNeun: function (word) { return word; }, // 실제 조사 처리는 기존 hasBatchim/josa 유틸 재사용

      tempCard: {
        react: {
          high: [['새로운 상황도 침착하게 받아들이고, 낯선 과제에도 바로 뛰어들어요.', '다소 지루한 과제에서도 흔들림 없이 집중을 이어가는 편이에요.']],
          mid:  [['새 환경, 낯선 과제에도 위축되지 않고 바로 시도해봐요.', '흥미가 옅은 반복 과제에서는 집중이 쉽게 흐트러질 수 있어요.']],
          low:  [['새로운 자극에는 빠르게 반응하고 일단 시도해보는 편이에요.', '하나의 과제에 오래 집중을 유지하는 데는 의식적인 노력이 조금 더 필요해요.']]
        },
        adapt: {
          high: [['새 환경에서도 스스로 목표를 세우고 아주 빠르게 자리를 잡아요.', '상황이 바뀌어도 계획을 유연하게 조정하는 편이에요.']],
          mid:  [['새 환경에서도 스스로 목표를 세우고 비교적 빠르게 자리를 잡아요.', '세운 계획이 갑자기 틀어지면 잠시 흔들릴 수 있어요 — "계획이 바뀌어도 괜찮다"는 경험이 도움이 돼요.']],
          low:  [['나만의 속도로 새 환경에 적응해가는 편이에요.', '예상 밖 변수가 생기면 더 크게 흔들릴 수 있어, 미리 대안을 하나 정해두는 게 도움이 돼요.']]
        },
        thinkS: ['흩어진 정보를 빠르게 하나의 그림으로 묶어내는 힘이 강해요.', '결론까지 가는 과정을 단계별로 점검하는 습관을 붙이면 실수가 줄어요.'],
        thinkQ: ['순서를 놓치지 않고 절차대로 꼼꼼히 처리하는 힘이 강해요.', '결론부터 먼저 큰 그림을 그려보는 연습을 더하면 이 강점이 한층 완성돼요.'],
        thinkBal: ['전체를 종합하는 힘과 순서대로 처리하는 힘을 비슷한 수준으로 갖추고 있어요.', '두 방식을 상황에 맞게 골라 쓰는 연습을 하면 이 균형이 더 뚜렷한 강점이 돼요.'],
        mood: {
          top: function (axisLabel) { return '가장 강한 영역(' + axisLabel + ')' + (hasBatchimLocal(axisLabel)?'을':'를') + ' 발휘해 목표를 이뤘을 때 뚜렷한 성취감을 느끼고, 다음 도전으로 잘 이어가요.'; },
          weak: function (axisLabel) { return axisLabel + (hasBatchimLocal(axisLabel)?'이':'가') + ' 뜻대로 안 될 때 기분이 크게 가라앉을 수 있어요 — 그 영역만큼은 "70%도 충분하다" 기준을 연습해보세요.'; }
        },
        titles: { react: ['빠른 상황 대처', '세부 지속력'], adapt: ['목표 지향적 적응', '계획 밖 변수'], thinkS: ['직관적 종합 사고', '절차 검증'], thinkQ: ['세부 지향적 꼼꼼함', '전체 우선순위 조망'], thinkBal: ['균형적 사고 전환', '상황별 적용'], mood: ['성취 기반의 안정감', '완벽 기준'] }
      },

      growthStep: {
        step1: { P: '기획·실행', A: '몰입·심화', S: '전체 설계', Q: '절차 정리', BAL_LOW: '기초 다지기', BAL_MID: '상황별 대응', BAL_HIGH: '통합 활용' },
        step2: { P: '계획력을 발휘할 수 있는 새 프로젝트(공모전, 동아리 기획)에 도전', A: '오래 몰입할 수 있는 새 프로젝트(공모전, 심화 탐구)에 도전', S: '전체 그림을 설계하는 새 프로젝트(공모전, 동아리 기획)에 도전', Q: '단계가 뚜렷한 새 프로젝트(공모전, 탐구일지)에 도전', BAL_LOW: '짧고 부담 없는 새 프로젝트(교내 소모임, 짧은 탐구활동)에 도전해 완료 경험 쌓기', BAL_MID: '여러 접근 방식을 오갈 수 있는 새 프로젝트(공모전, 동아리 기획)에 도전', BAL_HIGH: '여러 역량이 함께 요구되는 새 프로젝트(전국 단위 공모전, 팀 프로젝트 리드)에 도전' },
        step3: { P: '짧은 계획 세우기 루틴을 반복 훈련', A: '25분 몰입 루틴으로 짧고 반복적으로 훈련', S: '마인드맵으로 전체 그림 점검을 짧고 반복적으로 훈련', Q: '순서형 체크리스트로 절차 과제를 짧고 반복적으로 훈련', BAL_LOW: '네 영역 모두 짧고 쉬운 과제부터 하나씩 완료하는 루틴을 반복 훈련', BAL_MID: '매번 다른 접근 방식을 시도해보는 루틴을 짧고 반복적으로 훈련', BAL_HIGH: '여러 접근 방식을 한 과제 안에서 함께 활용해보는 루틴을 반복 훈련' }
      },

      learningSubject: {
        kor: {
          P: '목차·마인드맵으로 학습 계획을 먼저 세운 뒤 순서대로 읽어나가요. 단원별 목표를 스스로 정하고 체크하면 계획력이 그대로 학습 성과로 이어져요.<br><b>추천 도서</b> 인물평전(계획·실행형 인물), 자기계발서',
          A: '하루 20분씩 짧고 몰입해서 읽는 루틴이 잘 맞아요. 흥미가 확 붙는 지문을 골라 깊게 파고드는 방식이 오래 남아요.<br><b>추천 도서</b> 몰입도 높은 장편 소설',
          S: '목차·마인드맵으로 전체 구조를 먼저 그린 뒤 세부 정독. 문단별 소제목을 스스로 붙여 요약노트를 만들면 전체-부분 연결이 강해져요.<br><b>추천 도서</b> 추리·미스터리(구조적 서사)',
          Q: '문단을 순서대로 하나씩 정독하고, 앞뒤 문단의 연결 관계를 화살표로 표시하며 읽으면 이해가 깊어져요.<br><b>추천 도서</b> 순차적 전개가 뚜렷한 성장 서사',
          BAL_LOW: '아직 나에게 맞는 읽기 방식을 찾아가는 중이니, 짧은 지문을 여러 방식으로 나눠 읽어보며 부담 없이 시도해보세요.<br><b>추천 도서</b> 짧고 쉬운 단편 위주로',
          BAL_MID: '지문 성격에 따라 계획을 세우거나, 전체 구조부터 보거나, 순서대로 정독하는 등 방식을 바꿔가며 읽는 게 잘 맞아요.<br><b>추천 도서</b> 장르를 가리지 않고 다양하게',
          BAL_HIGH: '지문 성격에 따라 계획·구조 파악·정독을 매끄럽게 통합해서 읽는 힘이 강해요. 긴 호흡의 심화 지문에도 도전해보세요.<br><b>추천 도서</b> 여러 장르를 넘나드는 심화 도서'
        },
        math: {
          P: '단원별 학습 계획표를 먼저 짜고, 하루 분량을 정해 순서대로 풀어나가는 방식이 잘 맞아요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          A: '한 문제 유형에 몰입해서 깊게 파고드는 방식이 잘 맞아요. 어려운 심화 문제 1개를 오래 붙잡는 것도 좋아요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          S: '문제 유형별 "접근 전략"을 1줄로 먼저 적는 전략노트가 강점을 극대화해요. 여러 개념을 하나의 그림으로 묶어보는 연습이 도움돼요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          Q: '오답노트를 "어떤 단계를 건너뛰었는지" 기준으로 분류하면 강점이 그대로 학습 성과로 이어져요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          BAL_LOW: '쉬운 문제부터 짧게 반복해서 풀어보며 나에게 맞는 방식을 하나씩 찾아가는 게 잘 맞아요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          BAL_MID: '문제 유형에 따라 계획을 세우거나, 전략을 먼저 적거나, 오답을 단계별로 분류하는 등 여러 방식을 오가며 푸는 게 잘 맞아요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교',
          BAL_HIGH: '여러 풀이 전략을 상황에 맞게 통합해서 쓰는 힘이 강해요. 여러 단원이 얽힌 복합 문제에 도전해보세요.<br><b>검산 3단계</b> ①재계산 ②역연산으로 확인 ③추정치와 비교'
        },
        eng: {
          P: '주간 단어·문법 학습 계획을 세우고 매일 체크하는 방식이 잘 맞아요. 하루 20분씩 꾸준히가 핵심이에요.',
          A: '짧고 자주보다 하루 20분 깊게 몰입하는 편이 잘 맞아요. 관심 있는 주제의 지문을 골라 파고들면 오래 남아요.',
          S: '리스닝은 먼저 통으로 들어 전체 맥락을 파악(동시처리 활용)한 뒤 스크립트로 세부 확인. 단어는 스토리 맥락 안에서 외우면 오래 남아요.',
          Q: '문장을 앞에서부터 순서대로 끊어 읽는 연습이 잘 맞아요. 단어도 예문 순서대로 반복하며 외우면 오래 남아요.',
          BAL_LOW: '짧은 지문으로 부담 없이 여러 학습 방식을 시도해보며 나에게 맞는 방법을 찾아가는 게 잘 맞아요.',
          BAL_MID: '지문·문제 유형에 따라 계획적으로 학습하거나, 전체 맥락을 먼저 파악하거나, 순서대로 끊어 읽는 등 방식을 바꿔가며 학습하는 게 잘 맞아요.',
          BAL_HIGH: '여러 학습 방식을 상황에 맞게 통합해서 쓰는 힘이 강해요. 긴 지문·심화 문제에도 자신있게 도전해보세요.'
        },
        sci: {
          P: '실험 전 가설·절차·예상결과를 미리 계획서로 작성해두면 실험이 훨씬 수월해져요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          A: '관심 있는 주제 하나를 깊게 파고드는 자유탐구가 특히 잘 맞아요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          S: '가설 → 계획 → 실행 → 분석 흐름을 직접 설계하는 프로젝트형 학습에서 강점이 크게 드러나요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          Q: '실험 절차를 순서대로 빠짐없이 기록하는 습관이 강점으로 이어져요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          BAL_LOW: '간단한 실험부터 순서대로 하나씩 따라 하며 익숙해지는 게 잘 맞아요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          BAL_MID: '실험 단계마다 계획·설계·기록 등 필요한 방식을 유연하게 오가며 접근하는 게 잘 맞아요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.',
          BAL_HIGH: '여러 방식을 통합해 스스로 실험을 설계하고 이끄는 힘이 강해요. 여러 변인을 동시에 다루는 심화 실험에 도전해보세요.<br>실험보고서는 순서 체크리스트를 항상 옆에 두고 작성하세요.'
        }
      },

      parentGuide: {
        planTag: { P:'계획이 틀어졌을 때', A:'몰입이 흐트러졌을 때', S:'생각이 정리 안 될 때', Q:'순서를 놓쳤을 때', BAL_LOW:'뭘 어떻게 시작해야 할지 막막할 때', BAL_MID:'어떤 방식이 맞을지 헷갈릴 때', BAL_HIGH:'여러 방식을 동시에 다루다 버거울 때' },
        planBody: {
          P:'"그러게 계획을 왜 그렇게 세웠어" 대신 — "계획이 바뀐 것도 정보야. 다시 세워볼까?"',
          A:'"왜 이렇게 집중을 못해" 대신 — "지금 어떤 부분이 지루하게 느껴져? 잠깐 쉬었다 할까?"',
          S:'"생각 좀 정리해서 말해봐" 대신 — "머릿속에 있는 걸 하나씩 적어보면서 정리해볼까?"',
          Q:'"순서를 왜 빼먹었어" 대신 — "다음엔 어떤 순서로 하면 안 놓칠 것 같아?"',
          BAL_LOW:'"왜 이렇게 오래 걸려" 대신 — "오늘은 이만큼 해낸 것도 잘한 거야, 다음엔 어떻게 해볼까?"',
          BAL_MID:'"그때그때 왜 방식이 달라" 대신 — "이번엔 어떤 방식이 더 잘 맞을 것 같아?"',
          BAL_HIGH:'"한 번에 다 하려니 힘들지" 대신 — "어떤 부분부터 나눠서 맡아볼까?"'
        },
        planTip: {
          P:'계획 수정 자체를 실패가 아니라 자연스러운 과정으로 다뤄주세요.',
          A:'몰입이 흐트러지는 걸 의지 부족이 아니라 훈련으로 늘어가는 근육으로 봐주세요.',
          S:'생각을 정리하는 데 시간이 걸리는 걸 기다려주는 것만으로도 큰 도움이 돼요.',
          Q:'체크리스트를 함께 만들어보는 것도 좋은 방법이에요.',
          BAL_LOW:'작은 성공 경험을 자주 인정해주는 게 큰 힘이 돼요.',
          BAL_MID:'매번 다른 방식을 시도해보는 걸 일관성 부족이 아니라 유연함으로 봐주세요.',
          BAL_HIGH:'여러 가지를 한 번에 해내려는 부담을 덜어주는 것도 도움이 돼요.'
        },
        mistake3: {
          P:'한 번의 검사 결과를 고정된 것으로 여기기 — 계획력처럼 훈련으로 개선되는 영역은 다음 검사에서 충분히 달라질 수 있어요',
          A:'한 번의 검사 결과를 고정된 것으로 여기기 — 주의력처럼 훈련으로 개선되는 영역은 다음 검사에서 충분히 달라질 수 있어요',
          S:'한 번의 검사 결과를 고정된 것으로 여기기 — 동시처리처럼 훈련으로 개선되는 영역은 다음 검사에서 충분히 달라질 수 있어요',
          Q:'한 번의 검사 결과를 고정된 것으로 여기기 — 순차처리처럼 훈련으로 개선되는 영역은 다음 검사에서 충분히 달라질 수 있어요',
          BAL_LOW:'한 번의 검사 결과를 고정된 것으로 여기기 — 지금은 네 영역이 함께 발달하는 출발점일 뿐, 훈련에 따라 다음 검사에서 크게 달라질 수 있어요',
          BAL_MID:'한 번의 검사 결과를 고정된 것으로 여기기 — 지금의 균형잡힌 프로파일도 훈련 방향에 따라 다음 검사에서 달라질 수 있어요',
          BAL_HIGH:'한 번의 검사 결과를 고정된 것으로 여기기 — 지금의 고른 고역량도 어떤 분야에 집중하느냐에 따라 다음 검사에서 강점 축이 더 뚜렷해질 수 있어요'
        },
        homeHelp: {
          P:'거창한 계획보다 짧고 반복 가능한 것이 오래가요. "오늘 계획한 대로 됐어?" 한마디, 완료했을 때 "역시 계획 세우는 거 진짜 잘한다" 같은 구체적 인정 한마디면 충분해요.',
          A:'짧은 몰입을 자주 인정해주는 게 오래가요. "이번엔 얼마나 집중했어?" 한마디, 25분이라도 몰입했을 때 "그 집중력 진짜 대단하다" 같은 구체적 인정 한마디면 충분해요.',
          S:'전체 그림을 그려보는 걸 자주 물어봐주는 게 도움이 돼요. "오늘 배운 거 한 문장으로 요약해볼까?" 한마디, 스스로 정리했을 때 "전체를 이렇게 잘 엮어내다니" 같은 구체적 인정 한마디면 충분해요.',
          Q:'거창한 계획보다 짧고 반복 가능한 것이 오래가요. "오늘 순서표 확인해봤어?" 한마디, 완료했을 때 "순서대로 잘 챙겼네" 같은 구체적 인정 한마디면 충분해요.',
          BAL_LOW:'작은 완료 하나하나를 인정해주는 게 오래가요. "오늘은 뭘 끝까지 해봤어?" 한마디, 작은 걸 완료했을 때 "끝까지 해낸 게 대단하다" 같은 구체적 인정 한마디면 충분해요.',
          BAL_MID:'한 가지 방식을 강요하지 않는 게 오래가요. "이번엔 어떤 방식으로 해봤어?" 한마디, 상황에 맞게 방식을 바꿨을 때 "그때그때 방법을 잘 찾아내네" 같은 구체적 인정 한마디면 충분해요.',
          BAL_HIGH:'여러 역할을 동시에 잘 해내는 걸 자주 인정해주는 게 오래가요. "이번엔 몇 가지를 한 번에 해냈네" 같은 구체적 인정 한마디면 충분해요.'
        }
      },

      hook: {
        1: { P:'계획은 완벽하게 세우는데, 막상 결과물을 보면 마감 직전에 항상 뭔가 빠져있다', A:'분명 재밌게 시작했는데, 흥미가 옅어지면 끝까지 못 밀어붙이고 흐지부지된다', S:'전체 그림은 금방 그리는데, 막상 세부 단계로 옮기려면 어디서부터 시작해야 할지 막막하다', Q:'순서대로 차근차근 하는 건 잘하는데, 여러 정보를 한 번에 종합해야 할 땐 버벅인다', BAL_LOW:'이것저것 다 해보고는 있는데, 뭘 하나 제대로 끝까지 해낸 느낌이 잘 안 든다', BAL_MID:'상황마다 다른 방식으로 접근하는 편인데, 정작 어떤 방식이 진짜 내 강점인지는 스스로도 헷갈린다', BAL_HIGH:'여러 가지를 동시에 잘 해내는 편인데, 정작 어디에 제일 집중해야 할지 우선순위를 정하기 어렵다' },
        2: { P:'해야 할 건 다 아는데, 막상 실행 계획을 세우려면 어디서부터 손대야 할지 모르겠다', A:'재미없는 반복 작업은 오래 붙잡고 있기가 유독 힘들다', S:'여러 정보를 한 번에 종합해서 큰 그림을 그리는 게 잘 안 될 때가 있다', Q:'순서를 지켜서 차근차근 처리하는 게 어려워서, 중간에 꼬여버릴 때가 있다', BAL_LOW:'뭘 시작해도 끝까지 못 가고 중간에 흐지부지될 때가 많다', BAL_MID:'이것저것 웬만큼 다 하는데, 정작 어디에 집중해야 할지 갈피를 못 잡을 때가 있다', BAL_HIGH:'여러 일을 한 번에 처리하다 보니 가끔 어느 하나에도 충분히 몰입하지 못한 느낌이 든다' }
      }
    },

    en: {
      axisLabel: { P: 'Planning', A: 'Attention', S: 'Simultaneous processing', Q: 'Successive processing' },
      josaEunNeun: function (word) { return word; },

      tempCard: {
        react: {
          high: [['Stays composed and jumps right into new environments or unfamiliar tasks.', 'Even briefly slower tasks rarely shake your focus much.']],
          mid:  [['Jumps into new environments or unfamiliar tasks without much hesitation.', 'Focus can slip on repetitive tasks with low personal interest.']],
          low:  [['Reacts quickly to new stimuli and tries things right away.', 'Sustaining focus on one task for a long stretch takes more conscious effort.']]
        },
        adapt: {
          high: [['Sets clear personal goals and settles into new environments very quickly.', 'Adjusts plans smoothly even when circumstances shift.']],
          mid:  [['Sets personal goals and settles into new environments reasonably quickly.', 'Can be briefly thrown off when a plan suddenly changes — practicing "it\'s okay if the plan changes" helps.']],
          low:  [['Adapts to new environments in your own way and pace.', 'Unplanned changes can be more unsettling, so preparing a rough backup plan in advance helps.']]
        },
        thinkS: ['Strong at quickly weaving scattered information into one coherent picture.', 'Checking each step on the way to a conclusion reduces mistakes.'],
        thinkQ: ['Strong at following a process step by step without missing details.', 'Deliberately practicing "zooming out" to see the big picture first helps round out this strength.'],
        thinkBal: ['Holds synthesizing-the-whole and working-step-by-step at a similar level.', 'Practicing when to use each style makes this balance an even clearer strength.'],
        mood: {
          top: function (axisLabel) { return 'Feels clear satisfaction after using your strongest skill (' + axisLabel + '), which fuels the next challenge.'; },
          weak: function (axisLabel) { return 'Mood can dip when ' + axisLabel + ' doesn\'t go as planned — try practicing a "70% is enough" mindset for that area.'; }
        },
        titles: { react: ['Quick response', 'Detail persistence'], adapt: ['Goal-driven adaptation', 'Unplanned changes'], thinkS: ['Intuitive synthesis', 'Process verification'], thinkQ: ['Procedural rigor', 'Big-picture view'], thinkBal: ['Balanced thinking switch', 'Situational use'], mood: ['Achievement-based stability', 'Perfectionist standards'] }
      },

      growthStep: {
        step1: { P: 'planning/execution', A: 'focused, deep-dive', S: 'big-picture design', Q: 'step-by-step', BAL_LOW: 'foundation-building', BAL_MID: 'situational', BAL_HIGH: 'integrated' },
        step2: { P: 'Take on a new project (contest, club initiative) that lets planning strength shine', A: 'Take on a project that needs long focus (contest, research) to put attention strength to use', S: 'Take on a project that needs big-picture design (contest, club planning) to put simultaneous-processing strength to use', Q: 'Take on a project with a clear step-by-step process (contest, research log) to put successive-processing strength to use', BAL_LOW: 'Take on a short, low-pressure project (a small club activity, a brief inquiry task) to build a completed-task experience', BAL_MID: 'Take on a new project (contest, club initiative) that lets you switch between different approaches as needed', BAL_HIGH: 'Take on a project that calls for several abilities at once (a national-level contest, leading a team project)' },
        step3: { P: 'Use short, repeated planning-practice routines to train the growth area', A: 'Use 25-minute focus blocks to train the growth area in short, repeated sessions', S: 'Use mind-map style big-picture check-ins to train the growth area in short, repeated sessions', Q: 'Use sequential checklists to train procedural tasks in short, repeated sessions', BAL_LOW: 'Practice completing one small, easy task at a time across all four areas, in short, repeated sessions', BAL_MID: 'Practice deliberately trying a different approach each time, in short, repeated sessions', BAL_HIGH: 'Practice combining more than one approach within a single task, in short, repeated sessions' }
      },

      learningSubject: {
        kor: {
          P: 'Plan out a reading schedule with a table of contents or mind map first, then read in order. Setting and checking your own per-chapter goals turns planning strength directly into results.<br><b>Recommended reading</b> biographies of planner-executor figures, self-development books',
          A: 'A focused 20-minute daily block works well. Pick a passage that genuinely interests you and dig deep — it sticks better that way.<br><b>Recommended reading</b> immersive long-form novels',
          S: 'Map the whole structure first with a table of contents or mind map, then read closely. Writing your own section summary headings strengthens the whole-to-part connection.<br><b>Recommended reading</b> mystery/detective fiction (structured narrative)',
          Q: 'Read each paragraph closely in order, marking the connections between adjacent paragraphs with arrows to deepen understanding.<br><b>Recommended reading</b> coming-of-age stories with clear sequential plots',
          BAL_LOW: 'Still finding what works — try splitting a short passage into a few small ways of reading it, without pressure.<br><b>Recommended reading</b> short, easy short stories',
          BAL_MID: 'Switch approaches depending on the passage — sometimes planning ahead, sometimes mapping the whole structure first, sometimes reading straight through in order.<br><b>Recommended reading</b> a mix of genres',
          BAL_HIGH: 'Smoothly combine planning, structure-mapping, and close reading depending on the passage. Take on longer, denser reading with confidence.<br><b>Recommended reading</b> longer, cross-genre works'
        },
        math: {
          P: 'Plan a unit-by-unit study schedule first, then solve problems in that set order each day.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          A: 'Immersing deeply in one problem type at a time works well — spending a long stretch on one tough problem is great too.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          S: 'A strategy notebook — writing a one-line "approach" for each problem type — plays to this strength. Practice grouping several concepts into one big picture.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          Q: 'Sort your error log by "which step got skipped" — this turns the strength directly into results.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          BAL_LOW: 'Start with easy problems solved in short repeated sessions to find what approach works for you.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          BAL_MID: 'Switch between planning ahead, writing out a strategy first, or sorting errors by step depending on the problem type.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate',
          BAL_HIGH: 'Integrate multiple strategies smoothly depending on the problem. Take on multi-unit, compound problems.<br><b>3-step double-check</b> ① recalculate ② verify with the inverse operation ③ compare against an estimate'
        },
        eng: {
          P: 'Plan a weekly vocabulary/grammar schedule and check it off daily. Consistency — 20 minutes a day — is the key.',
          A: 'One focused 20-minute block beats short, frequent sessions. Pick topics you genuinely care about and dig in.',
          S: 'For listening, take in the whole passage first (simultaneous-processing strength), then check details against the script. Vocabulary sticks best learned in story context.',
          Q: 'Practice reading sentences in order, chunk by chunk from the start. Repeating vocabulary in example-sentence order also helps it stick.',
          BAL_LOW: 'Try a few short, low-pressure approaches with short passages to find what fits you best.',
          BAL_MID: 'Switch between planning study time, grasping the whole passage first, or working through it in order, depending on what the material calls for.',
          BAL_HIGH: 'Smoothly integrate multiple study approaches depending on the material. Take on longer passages and harder problems with confidence.'
        },
        sci: {
          P: 'Write out the hypothesis, procedure, and expected results as a plan before the experiment — it makes the whole process far smoother.<br>Always keep the procedure checklist beside you when writing lab reports.',
          A: 'Independent, open-ended inquiry into one topic you find genuinely interesting fits especially well.<br>Always keep the procedure checklist beside you when writing lab reports.',
          S: 'Strength shows strongly in experiment/project-based learning — design your own hypothesis → plan → execute → analyze cycle.<br>Always keep the procedure checklist beside you when writing lab reports.',
          Q: 'Recording the experimental procedure in exact order, without missing a step, plays directly to this strength.<br>Always keep the procedure checklist beside you when writing lab reports.',
          BAL_LOW: 'Follow simple experiments step by step to build familiarity.<br>Always keep the procedure checklist beside you when writing lab reports.',
          BAL_MID: 'Flexibly switch between planning, designing, and recording as each stage of the experiment calls for it.<br>Always keep the procedure checklist beside you when writing lab reports.',
          BAL_HIGH: 'Integrate multiple approaches to design and lead your own experiments. Take on experiments with several variables at once.<br>Always keep the procedure checklist beside you when writing lab reports.'
        }
      },

      parentGuide: {
        planTag: { P:'When a plan falls apart', A:'When focus slips', S:'When thoughts feel jumbled', Q:'When a step gets missed', BAL_LOW:'When it\'s unclear how to even start', BAL_MID:'When it\'s unclear which approach to use', BAL_HIGH:'When juggling several approaches feels like a lot' },
        planBody: {
          P:'Instead of "Well, why did you plan it that way?" — try "A changed plan is just new information. Want to rebuild it together?"',
          A:'Instead of "Why can\'t you focus?" — try "What part feels boring right now? Want to take a short break?"',
          S:'Instead of "Just organize your thoughts and tell me" — try "Want to write things down one by one to sort them out?"',
          Q:'Instead of "Why did you skip that step?" — try "What order do you think would help you not miss it next time?"',
          BAL_LOW:'Instead of "Why is this taking so long?" — try "What you got done today counts. What should we try next?"',
          BAL_MID:'Instead of "Why do you keep switching how you do things?" — try "Which way do you think will work better this time?"',
          BAL_HIGH:'Instead of "You\'re trying to do too much at once" — try "Which part should we split off first?"'
        },
        planTip: {
          P:'Treat revising a plan as a normal part of the process, not a failure.',
          A:'See wandering focus as a muscle that grows with practice, not a lack of willpower.',
          S:'Just giving them time to organize their thoughts is already a big help.',
          Q:'Building a checklist together can help too.',
          BAL_LOW:'Recognizing small completed wins often helps most.',
          BAL_MID:'See trying a different approach each time as flexibility, not inconsistency.',
          BAL_HIGH:'Helping ease the pressure of trying to do everything at once also helps.'
        },
        mistake3: {
          P:'Treating one test result as fixed — areas like planning that respond to training can look quite different at the next test',
          A:'Treating one test result as fixed — areas like attention that respond to training can look quite different at the next test',
          S:'Treating one test result as fixed — areas like simultaneous processing that respond to training can look quite different at the next test',
          Q:'Treating one test result as fixed — areas like successive processing that respond to training can look quite different at the next test',
          BAL_LOW:'Treating one test result as fixed — this is just a starting point where all four areas are developing together, and training can shift it a lot by the next test',
          BAL_MID:'Treating one test result as fixed — even a well-balanced profile like this one can shift by the next test depending on how training goes',
          BAL_HIGH:'Treating one test result as fixed — even this evenly high profile can sharpen into a clearer strength depending on what gets focused on next'
        },
        homeHelp: {
          P:'Small and repeatable beats big and occasional. A simple "did things go as planned today?" or a specific "you\'re really good at planning" after something goes well is often enough.',
          A:'Recognizing short bursts of focus often works best. A simple "how focused were you this time?" or a specific "that focus was impressive" after even 25 minutes of it is often enough.',
          S:'Asking them to sketch the big picture often helps. A simple "can you sum up what you learned today in one sentence?" or a specific "you tied that all together so well" is often enough.',
          Q:'Small and repeatable beats big and occasional. A simple "did you check your order list today?" or a specific "you followed the steps perfectly" after something goes well is often enough.',
          BAL_LOW:'Recognizing each small completed task often works best. A simple "what did you finish today?" or a specific "you saw that through to the end" is often enough.',
          BAL_MID:'Not pushing one fixed method often works best. A simple "what approach did you try this time?" or a specific "you found a great way to handle that" is often enough.',
          BAL_HIGH:'Recognizing when they juggle several things well often works best. A simple "you handled a lot at once there" is often enough.'
        }
      },

      hook: {
        1: { P:'You plan flawlessly, but the final result always seems to be missing something right before the deadline', A:"You start out genuinely excited, but once the novelty wears off it's hard to see it through to the end", S:"You can picture the big idea instantly, but figuring out where to start on the actual steps is a struggle", Q:'You handle step-by-step tasks fine, but freeze up when you need to combine several things at once', BAL_LOW:"You try a bit of everything, but rarely feel like you've truly finished anything", BAL_MID:"You approach things differently depending on the situation, but you're honestly not sure which approach is your real strength", BAL_HIGH:"You're good at juggling several things at once, but it's hard to tell what deserves your top priority" },
        2: { P:"You know everything you need to do, but figuring out where to even start planning it out is a struggle", A:"Repetitive tasks that aren't fun are unusually hard to stick with", S:"Pulling scattered information together into one big picture doesn't always click", Q:"Working through things step by step in order sometimes gets tangled partway through", BAL_LOW:"Whatever you start, it's easy to lose momentum partway through", BAL_MID:"You're decent at a bit of everything, but it's hard to tell what to focus on", BAL_HIGH:"Handling several things at once sometimes means none of them get your full focus" }
      }
    }

    /* ===== 언어 추가는 여기에 ja: {...}, zh: {...} 처럼 블록만 추가 ===== */
  };

  // ===== 81유형(3^4) 분류 — P/A/S/Q 각 축을 상/중/하 3단계로 나누면 3×3×3×3=81가지 프로필 코드가 나온다.
  // 81개를 하나하나 손으로 써서 관리하는 대신, 이 4×3=12개 "축별 조각"을 조합해 81가지를 전부 자동으로 커버한다.
  function getTier(v) { return v >= 75 ? 'high' : (v >= 53 ? 'mid' : 'low'); }
  function getProfileType81(scores) {
    const tiers = { P: getTier(scores.P), A: getTier(scores.A), S: getTier(scores.S), Q: getTier(scores.Q) };
    return { code: tiers.P + '-' + tiers.A + '-' + tiers.S + '-' + tiers.Q, tiers: tiers };
  }

  function get(lang) {
    return BANK[lang] || BANK.ko;
  }

  global.DCasI18n = { get: get, BANK: BANK, getTier: getTier, getProfileType81: getProfileType81 };

})(typeof window !== 'undefined' ? window : globalThis);
