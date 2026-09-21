/**
 * D-CAS 공통 81유형 정적 콘텐츠 엔진
 * - P/A/S/Q 각 축을 H/M/L로 분류: 3^4 = 81
 * - 생성형 AI/API를 사용하지 않음
 * - 지원 언어: ko/en/ja/zh/es/ru/vi/th/ar/it/az/km
 * - D-CAS 원점수 기준 기본 절단점: H >= 75, L <= 52, M = 53~74
 */
(function (global) {
  'use strict';

  const ORDER = ['P', 'A', 'S', 'Q'];
  const DEFAULT_THRESHOLDS = { high: 75, low: 52, balance: 20 };
  const LANG_ALIASES = {
    ko:'ko', kr:'ko', en:'en', ja:'ja', jp:'ja', zh:'zh', cn:'zh',
    es:'es', ru:'ru', vi:'vi', vn:'vi', th:'th', ar:'ar', it:'it', az:'az', km:'km'
  };
  const LOCALE_META = {
    km:{label:'ខ្មែរ',dir:'ltr',status:'ai-draft',sourceLocale:'ko',sourceVersion:'ko-profile81-v1'}
  };

  const I18N = {
    ko: {
      axis:{P:'계획력',A:'주의력',S:'동시처리',Q:'순차처리'}, level:{H:'상',M:'중',L:'하'},
      titles:{ALL_L:'균형형·전반적 기반 강화형',ALL_M:'균형형·표준 범위 탐색형',ALL_H:'균형형·고역량 통합형',BAL:'균형형·혼합 수준 프로필',PROFILE:'81유형 인지 프로필'},
      summaries:{
        ALL_L:'네 영역 모두 하 범위로 나타났습니다. 개인 안에서 특정 한 영역만 취약한 형태는 아니지만, 전반적인 기초 역량을 함께 지원해야 합니다. 이 결과만으로 능력이나 진로 가능성을 제한하지 말고 일상 관찰과 추가 평가를 함께 확인하세요.',
        ALL_M:'네 영역 모두 중 범위로 나타났습니다. 개인 안에서 뚜렷한 우세·취약 영역을 정하기보다 여러 활동을 경험하며 실제 관심과 수행 강점이 어디에서 나타나는지 탐색하는 것이 적절합니다.',
        ALL_H:'네 영역 모두 상 범위로 나타났습니다. 네 가지 처리 방식을 고르게 활용할 가능성이 높으므로, 복합 과제와 관심 분야의 심화 경험으로 전문성을 확장하는 것이 적절합니다.',
        BAL:'네 영역의 점수 차이가 작아 특정 축을 임의로 강점이나 약점으로 정하지 않습니다. 절대 수준과 과제별 실제 수행을 함께 해석해야 합니다.',
        PROFILE:'네 영역의 상·중·하 조합을 함께 읽은 81유형입니다. 상대적 순위뿐 아니라 각 영역의 절대 수준을 동시에 반영합니다.'
      },
      fragments:{
        P:{H:'계획력은 상 수준으로, 목표를 정하고 실행 단계를 조직하는 힘을 적극 활용할 수 있습니다.',M:'계획력은 중 수준으로, 짧고 구체적인 목표에서 계획 전략을 안정적으로 연습할 수 있습니다.',L:'계획력은 하 수준으로, 목표를 작은 단계로 나누고 다음 행동을 눈에 보이게 제시하는 지원이 필요합니다.'},
        A:{H:'주의력은 상 수준으로, 방해 자극을 관리하며 한 과제에 몰입하는 힘을 활용할 수 있습니다.',M:'주의력은 중 수준으로, 과제의 흥미와 환경에 따라 집중이 달라질 수 있어 일정한 루틴이 도움이 됩니다.',L:'주의력은 하 수준으로, 짧은 집중 구간과 즉각적인 피드백, 방해 자극을 줄인 환경이 필요합니다.'},
        S:{H:'동시처리는 상 수준으로, 여러 정보를 종합해 전체 구조와 관계를 파악하는 힘을 활용할 수 있습니다.',M:'동시처리는 중 수준으로, 그림·도식과 핵심 요약을 함께 사용하면 전체 구조 파악이 안정됩니다.',L:'동시처리는 하 수준으로, 전체 그림을 먼저 보여주고 정보 사이의 관계를 시각화하는 지원이 필요합니다.'},
        Q:{H:'순차처리는 상 수준으로, 절차와 순서를 정확히 따라 단계적으로 완성하는 힘을 활용할 수 있습니다.',M:'순차처리는 중 수준으로, 순서표와 말로 설명하기를 병행하면 절차 수행이 안정됩니다.',L:'순차처리는 하 수준으로, 한 번에 한 단계씩 제시하고 체크리스트로 완료 여부를 확인하는 지원이 필요합니다.'}
      },
      rec:{
        ALL_L:{learning:'학습·업무는 짧고 쉬운 단위부터 시작해 네 영역의 완료 경험을 함께 쌓으세요.',career:'진로는 현재 점수로 제한하지 말고, 충분한 안내가 있는 다양한 체험에서 흥미와 변화 속도를 관찰하세요.',job:'직무 적합도는 배제 기준이 아닙니다. 구조화된 입문 과제와 지원 환경에서 실제 수행을 확인하세요.'},
        ALL_M:{learning:'한 가지 방식으로 고정하지 말고 계획·집중·전체 보기·순서 처리 전략을 번갈아 사용해 효과를 비교하세요.',career:'점수만으로 특정 진로를 확정하기보다 다양한 활동에서 흥미·지속성·성과가 함께 나타나는 분야를 찾으세요.',job:'추천 순위와 함께 실제 경험, 관심, 교육 가능성을 확인해 직무 선택 범위를 좁히세요.'},
        ALL_H:{learning:'여러 처리 방식을 함께 요구하는 복합 과제와 관심 분야의 심화 과제에 도전하세요.',career:'폭넓은 역량을 바탕으로 관심 분야를 정하고 장기 프로젝트를 통해 전문성을 구체화하세요.',job:'복합 문제 해결과 조율이 필요한 직무를 탐색하되 실제 관심과 경험을 함께 반영하세요.'},
        BAL:{learning:'작은 점수 차이로 강·약축을 만들지 말고 과제별로 어떤 전략이 효과적인지 비교하세요.',career:'균형형에서는 점수 순위보다 관심, 경험, 지속성 자료를 더 크게 반영하세요.',job:'직무 추천은 임의의 최고축이 아니라 네 영역의 전체 수준과 실제 경험을 함께 근거로 해석하세요.'},
        supportLow:'{axes} 영역은 지원 강도를 높이고, 한 번에 한 단계·시각화·짧은 반복을 우선 적용하세요.',useHigh:'{axes} 영역은 과제 수행의 자원으로 활용하고 다른 영역을 보조하도록 설계하세요.',career:'81유형 코드는 진로를 확정하는 값이 아니라 추천 이유와 필요한 지원을 구체화하는 보조 정보입니다.',job:'직무 순위에는 같은 점수를 중복 가중하지 않고, 81유형을 강점 활용법과 지원 조건 설명에 사용합니다.'
      },
      labels:{profile:'81유형 프로필',learning:'81유형 학습 적용',career:'81유형 진로 적용',job:'81유형 직무 적용'}
    },
    en: {
      axis:{P:'Planning',A:'Attention',S:'Simultaneous',Q:'Successive'}, level:{H:'High',M:'Mid',L:'Low'},
      titles:{ALL_L:'Balanced · Broad Foundation Support',ALL_M:'Balanced · Standard-Range Explorer',ALL_H:'Balanced · High-Capacity Integrator',BAL:'Balanced · Mixed-Level Profile',PROFILE:'81-Type Cognitive Profile'},
      summaries:{ALL_L:'All four domains fall in the low band. No single domain is uniquely weak, but broad foundational support is needed. Do not use this result alone to limit ability or career options; combine it with everyday observation and further assessment.',ALL_M:'All four domains fall in the middle band. Rather than assigning a dominant strength or weakness, use varied experiences to discover where interest and real performance emerge.',ALL_H:'All four domains fall in the high band. The four processing approaches can likely be used together; complex tasks and deeper experience in an area of interest are appropriate.',BAL:'The four scores are close, so no domain is arbitrarily labeled strongest or weakest. Interpret absolute level together with task-based performance.',PROFILE:'This is one of 81 profiles formed from the high, middle, and low levels of the four domains. It reflects absolute level as well as within-person pattern.'},
      fragments:{P:{H:'Planning is high; goal setting and organizing action steps can be used as an active resource.',M:'Planning is mid-range; short, concrete goals help stabilize planning strategies.',L:'Planning is low; break goals into small steps and make the next action visible.'},A:{H:'Attention is high; sustained focus can be used while distractions are managed.',M:'Attention is mid-range; a consistent routine helps when focus varies with interest and context.',L:'Attention is low; use short focus blocks, immediate feedback, and a low-distraction setting.'},S:{H:'Simultaneous processing is high; use the ability to integrate information and see overall structure.',M:'Simultaneous processing is mid-range; diagrams and concise summaries can stabilize the big picture.',L:'Simultaneous processing is low; show the whole picture first and visualize relationships.'},Q:{H:'Successive processing is high; use the ability to follow procedures accurately step by step.',M:'Successive processing is mid-range; sequence charts and verbal rehearsal can stabilize performance.',L:'Successive processing is low; present one step at a time and confirm completion with a checklist.'}},
      rec:{ALL_L:{learning:'Start with short, manageable units and build completion experiences across all four domains.',career:'Do not restrict options from current scores; observe interest and rate of change in well-supported experiences.',job:'Job fit is not an exclusion rule. Check real performance in structured entry tasks with appropriate support.'},ALL_M:{learning:'Rotate planning, focus, big-picture, and step-by-step strategies and compare what works.',career:'Use varied activities to find fields where interest, persistence, and performance appear together.',job:'Narrow options using recommendations together with experience, interest, and trainability.'},ALL_H:{learning:'Try complex and advanced tasks that require several processing approaches together.',career:'Select an area of interest and build expertise through longer projects.',job:'Explore complex problem-solving and coordination roles while considering real interest and experience.'},BAL:{learning:'Do not create strengths from small score gaps; compare which strategy works by task.',career:'For a balanced profile, weight interests, experience, and persistence more than rank order.',job:'Interpret recommendations from overall level and experience, not an arbitrary top domain.'},supportLow:'Increase support for {axes}: one step at a time, visualization, and short repetition.',useHigh:'Use {axes} as task resources and to support the other domains.',career:'The 81-type code supports the explanation of fit and needed support; it does not determine a career.',job:'The same scores are not weighted twice; the 81-type profile is used to explain strengths and support conditions.'},
      labels:{profile:'81-Type Profile',learning:'81-Type Learning Use',career:'81-Type Career Use',job:'81-Type Job Use'}
    },
    ja: {
      axis:{P:'プランニング',A:'注意',S:'同時処理',Q:'継次処理'}, level:{H:'高',M:'中',L:'低'},
      titles:{ALL_L:'均衡型・全般的基礎支援型',ALL_M:'均衡型・標準範囲探索型',ALL_H:'均衡型・高能力統合型',BAL:'均衡型・混合水準プロフィール',PROFILE:'81タイプ認知プロフィール'},
      summaries:{ALL_L:'4領域すべてが低い範囲です。特定の1領域だけが弱い形ではありませんが、基礎能力を全般的に支援する必要があります。この結果だけで能力や進路を制限せず、日常観察と追加評価を併用してください。',ALL_M:'4領域すべてが中程度です。明確な優位・弱点を決めず、多様な経験から関心と実際の強みを探す段階です。',ALL_H:'4領域すべてが高い範囲です。複数の処理方法を統合する複合課題と、関心分野の発展学習が適しています。',BAL:'4領域の差が小さいため、任意に最強・最弱を決めません。絶対水準と実際の課題遂行を一緒に解釈します。',PROFILE:'4領域の高・中・低の組合せによる81タイプの一つです。個人内順位と絶対水準を同時に示します。'},
      fragments:{P:{H:'プランニングは高水準で、目標設定と手順の構成を強みとして活用できます。',M:'プランニングは中水準で、短く具体的な目標から安定させると効果的です。',L:'プランニングは低水準で、目標を小さく分け次の行動を見える形で示す支援が必要です。'},A:{H:'注意は高水準で、妨害刺激を管理しながら集中を活用できます。',M:'注意は中水準で、興味や環境による変動を一定のルーティンで補えます。',L:'注意は低水準で、短い集中区間、即時フィードバック、刺激の少ない環境が必要です。'},S:{H:'同時処理は高水準で、情報を統合し全体構造を捉える力を活用できます。',M:'同時処理は中水準で、図や要約を併用すると全体像が安定します。',L:'同時処理は低水準で、最初に全体像を示し関係を視覚化する支援が必要です。'},Q:{H:'継次処理は高水準で、手順を正確に段階的に進める力を活用できます。',M:'継次処理は中水準で、順序表と言語化を併用すると安定します。',L:'継次処理は低水準で、一度に一段階を示しチェックリストで確認する支援が必要です。'}},
      rec:{ALL_L:{learning:'短く易しい単位から始め、4領域すべてで完了経験を積みます。',career:'現在の得点で進路を制限せず、支援のある体験で関心と変化を観察します。',job:'適合度は排除基準ではありません。構造化された入門課題で実際の遂行を確認します。'},ALL_M:{learning:'4つの方略を交互に試し、課題ごとの効果を比較します。',career:'関心・持続・成果が共に現れる分野を多様な体験から探します。',job:'推薦順位だけでなく経験・関心・学習可能性を併せて判断します。'},ALL_H:{learning:'複数の処理を統合する複合・発展課題に挑戦します。',career:'関心分野を選び長期課題で専門性を深めます。',job:'実際の関心と経験も考慮し、複合問題解決職を探索します。'},BAL:{learning:'小さな差で強弱を作らず課題別に有効な方略を比較します。',career:'均衡型では順位より関心・経験・持続性を重視します。',job:'任意の最高軸ではなく全体水準と経験から解釈します。'},supportLow:'{axes}は一段階ずつ、視覚化、短い反復で支援します。',useHigh:'{axes}を課題遂行の資源として活用します。',career:'81タイプは進路決定値ではなく、適合理由と支援条件を具体化する補助情報です。',job:'同じ得点を二重加重せず、81タイプは強みと支援条件の説明に用います。'},
      labels:{profile:'81タイプ',learning:'81タイプの学習活用',career:'81タイプの進路活用',job:'81タイプの職務活用'}
    },
    zh: {
      axis:{P:'计划能力',A:'注意力',S:'同时加工',Q:'继时加工'}, level:{H:'高',M:'中',L:'低'},
      titles:{ALL_L:'均衡型·整体基础支持型',ALL_M:'均衡型·标准范围探索型',ALL_H:'均衡型·高能力整合型',BAL:'均衡型·混合水平画像',PROFILE:'81型认知画像'},
      summaries:{ALL_L:'四个领域均处于低水平。并非只有某一领域薄弱，但需要对整体基础能力提供支持。请勿仅凭本结果限制能力或生涯选择，应结合日常观察和进一步评估。',ALL_M:'四个领域均处于中等水平。与其指定明显优势或弱项，更适合通过多样体验寻找真实兴趣与表现优势。',ALL_H:'四个领域均处于高水平。适合进行需要整合多种加工方式的复杂任务，并在兴趣领域深入发展。',BAL:'四个领域分数接近，因此不任意指定最强或最弱领域。应结合绝对水平与实际任务表现进行解释。',PROFILE:'这是由四个领域高、中、低组合形成的81种画像之一，同时反映绝对水平和个体内部模式。'},
      fragments:{P:{H:'计划能力高，可积极运用设定目标和组织行动步骤的能力。',M:'计划能力中等，从短期、具体目标开始练习更稳定。',L:'计划能力低，需要把目标拆成小步骤并清楚呈现下一步行动。'},A:{H:'注意力高，可在管理干扰的同时发挥持续专注能力。',M:'注意力中等，稳定的日常流程有助于减少兴趣和环境造成的波动。',L:'注意力低，需要短时专注、即时反馈和低干扰环境。'},S:{H:'同时加工高，可运用整合信息和把握整体结构的能力。',M:'同时加工中等，图示与重点摘要有助于稳定把握全局。',L:'同时加工低，需要先展示全貌并将信息关系可视化。'},Q:{H:'继时加工高，可运用按步骤准确完成程序的能力。',M:'继时加工中等，顺序表与口头复述并用更稳定。',L:'继时加工低，需要一次呈现一个步骤并用清单确认完成。'}},
      rec:{ALL_L:{learning:'从短小、容易的任务开始，在四个领域共同积累完成体验。',career:'不要依据当前分数限制选择，应在充分支持的体验中观察兴趣和变化。',job:'岗位适配度不是排除标准，应在结构化入门任务中观察真实表现。'},ALL_M:{learning:'轮换使用四种策略并比较不同任务中的效果。',career:'通过多样活动寻找兴趣、坚持和成果同时出现的领域。',job:'结合推荐、经验、兴趣和可训练性逐步缩小选择。'},ALL_H:{learning:'挑战需要整合多种加工方式的复杂与进阶任务。',career:'选择兴趣领域，通过长期项目发展专业性。',job:'结合真实兴趣和经验探索复杂问题解决类岗位。'},BAL:{learning:'不要用微小差异制造强弱项，应比较不同任务中的有效策略。',career:'均衡型应比排名更重视兴趣、经验和坚持性。',job:'应根据整体水平和经验解释，而非任意最高轴。'},supportLow:'对{axes}提高支持强度：一次一步、可视化、短时重复。',useHigh:'把{axes}作为任务资源并支持其他领域。',career:'81型代码用于具体说明适配理由和支持条件，不决定生涯。',job:'不重复加权同一分数；81型用于解释优势和支持条件。'},
      labels:{profile:'81型画像',learning:'81型学习应用',career:'81型生涯应用',job:'81型岗位应用'}
    },
    es: {
      axis:{P:'Planificación',A:'Atención',S:'Procesamiento simultáneo',Q:'Procesamiento sucesivo'}, level:{H:'Alto',M:'Medio',L:'Bajo'},
      titles:{ALL_L:'Equilibrado · Apoyo básico global',ALL_M:'Equilibrado · Explorador de rango estándar',ALL_H:'Equilibrado · Integrador de alta capacidad',BAL:'Equilibrado · Perfil de niveles mixtos',PROFILE:'Perfil cognitivo de 81 tipos'},
      summaries:{ALL_L:'Las cuatro áreas están en el rango bajo. No existe una única debilidad aislada, pero se necesita apoyo básico general. No limite capacidades ni opciones profesionales solo con este resultado; combínelo con observación cotidiana y evaluación adicional.',ALL_M:'Las cuatro áreas están en el rango medio. En vez de fijar una fortaleza o debilidad dominante, conviene explorar experiencias variadas para descubrir interés y rendimiento real.',ALL_H:'Las cuatro áreas están en el rango alto. Es apropiado afrontar tareas complejas y profundizar en un campo de interés.',BAL:'Las puntuaciones son cercanas; no se asigna de forma arbitraria un área más fuerte o más débil. Interprete el nivel absoluto junto con el desempeño real.',PROFILE:'Es uno de los 81 perfiles formados por los niveles alto, medio y bajo de cuatro áreas; refleja nivel absoluto y patrón individual.'},
      fragments:{P:{H:'La planificación es alta; puede aprovechar la fijación de metas y la organización de pasos.',M:'La planificación es media; conviene practicar con metas breves y concretas.',L:'La planificación es baja; divida las metas en pasos pequeños y haga visible la siguiente acción.'},A:{H:'La atención es alta; puede aprovechar la concentración sostenida controlando distractores.',M:'La atención es media; una rutina estable ayuda cuando varía según interés y contexto.',L:'La atención es baja; use bloques breves, retroalimentación inmediata y pocos distractores.'},S:{H:'El procesamiento simultáneo es alto; puede integrar información y captar la estructura global.',M:'El procesamiento simultáneo es medio; diagramas y resúmenes estabilizan la visión global.',L:'El procesamiento simultáneo es bajo; muestre primero el panorama y visualice relaciones.'},Q:{H:'El procesamiento sucesivo es alto; puede seguir procedimientos con precisión paso a paso.',M:'El procesamiento sucesivo es medio; use secuencias y explicación verbal.',L:'El procesamiento sucesivo es bajo; presente un paso cada vez y confirme con una lista.'}},
      rec:{ALL_L:{learning:'Empiece con unidades breves y manejables y acumule experiencias de finalización en las cuatro áreas.',career:'No limite opciones por la puntuación actual; observe interés y cambio en experiencias con apoyo.',job:'La adecuación laboral no excluye opciones; compruebe el desempeño en tareas iniciales estructuradas.'},ALL_M:{learning:'Alterne las cuatro estrategias y compare cuál funciona en cada tarea.',career:'Busque campos donde coincidan interés, persistencia y rendimiento.',job:'Combine recomendación, experiencia, interés y capacidad de aprendizaje.'},ALL_H:{learning:'Afronte tareas complejas que integren varios procesos.',career:'Elija un área de interés y desarrolle especialización con proyectos largos.',job:'Explore funciones de resolución compleja considerando interés y experiencia.'},BAL:{learning:'No cree fortalezas por diferencias pequeñas; compare estrategias por tarea.',career:'En un perfil equilibrado, priorice interés, experiencia y persistencia.',job:'Interprete el nivel global y la experiencia, no un eje superior arbitrario.'},supportLow:'Aumente el apoyo en {axes}: un paso cada vez, visualización y repetición breve.',useHigh:'Use {axes} como recursos para apoyar las demás áreas.',career:'El código de 81 tipos apoya la explicación; no determina una carrera.',job:'No se ponderan dos veces las mismas puntuaciones; el perfil explica fortalezas y apoyos.'},
      labels:{profile:'Perfil de 81 tipos',learning:'Aplicación al aprendizaje',career:'Aplicación vocacional',job:'Aplicación laboral'}
    },
    ru: {
      axis:{P:'Планирование',A:'Внимание',S:'Одновременная обработка',Q:'Последовательная обработка'}, level:{H:'Высокий',M:'Средний',L:'Низкий'},
      titles:{ALL_L:'Сбалансированный · Общая базовая поддержка',ALL_M:'Сбалансированный · Поиск в нормативном диапазоне',ALL_H:'Сбалансированный · Интегратор высокого уровня',BAL:'Сбалансированный · Смешанный профиль',PROFILE:'Когнитивный профиль из 81 типа'},
      summaries:{ALL_L:'Все четыре области находятся в низком диапазоне. Нет одной изолированной слабой области, но нужна общая базовая поддержка. Не ограничивайте способности или карьеру только этим результатом; учитывайте наблюдения и дополнительную оценку.',ALL_M:'Все четыре области находятся в среднем диапазоне. Вместо назначения ведущей силы или слабости лучше через разный опыт искать реальные интересы и достижения.',ALL_H:'Все четыре области находятся в высоком диапазоне. Подходят сложные задачи, объединяющие несколько способов обработки, и углубление в интересующей области.',BAL:'Различия малы, поэтому сильнейшая и слабейшая область не назначаются произвольно. Учитывайте абсолютный уровень и реальное выполнение задач.',PROFILE:'Это один из 81 профиля, образованных уровнями H/M/L четырёх областей; он отражает и абсолютный уровень, и индивидуальный рисунок.'},
      fragments:{P:{H:'Планирование высокое: можно опираться на постановку целей и организацию шагов.',M:'Планирование среднее: полезны короткие и конкретные цели.',L:'Планирование низкое: делите цель на малые шаги и показывайте следующее действие.'},A:{H:'Внимание высокое: можно использовать устойчивую концентрацию при контроле отвлечений.',M:'Внимание среднее: стабильный режим уменьшает колебания из-за интереса и среды.',L:'Внимание низкое: нужны короткие интервалы, быстрая обратная связь и мало отвлечений.'},S:{H:'Одновременная обработка высокая: можно объединять информацию и видеть общую структуру.',M:'Одновременная обработка средняя: схемы и краткие выводы поддерживают целостное понимание.',L:'Одновременная обработка низкая: сначала покажите общую картину и визуализируйте связи.'},Q:{H:'Последовательная обработка высокая: можно точно выполнять процедуры по шагам.',M:'Последовательная обработка средняя: помогают схемы порядка и проговаривание.',L:'Последовательная обработка низкая: давайте один шаг за раз и используйте чек-лист.'}},
      rec:{ALL_L:{learning:'Начинайте с коротких посильных заданий и накапливайте завершения во всех областях.',career:'Не ограничивайте выбор текущими баллами; наблюдайте интерес и динамику при поддержке.',job:'Профпригодность не является критерием исключения; проверяйте реальные результаты в структурированных вводных задачах.'},ALL_M:{learning:'Чередуйте четыре стратегии и сравнивайте их эффективность.',career:'Ищите области, где совпадают интерес, устойчивость и результат.',job:'Сочетайте рекомендации с опытом, интересом и обучаемостью.'},ALL_H:{learning:'Выбирайте сложные задания, объединяющие несколько процессов.',career:'Углубляйте выбранную область через долгие проекты.',job:'Исследуйте сложные роли с учётом интереса и опыта.'},BAL:{learning:'Не создавайте сильные и слабые стороны из малых различий.',career:'Для сбалансированного профиля важнее интерес, опыт и устойчивость.',job:'Опирайтесь на общий уровень и опыт, а не на случайную верхнюю ось.'},supportLow:'Усильте поддержку для {axes}: один шаг, визуализация, короткое повторение.',useHigh:'Используйте {axes} как ресурс для других областей.',career:'Код 81 типов уточняет основания и поддержку, но не определяет карьеру.',job:'Одинаковые баллы не взвешиваются дважды; профиль объясняет условия успеха.'},
      labels:{profile:'Профиль 81 типа',learning:'Применение в обучении',career:'Применение в карьере',job:'Применение в работе'}
    },
    vi: {
      axis:{P:'Lập kế hoạch',A:'Chú ý',S:'Xử lý đồng thời',Q:'Xử lý tuần tự'}, level:{H:'Cao',M:'Trung bình',L:'Thấp'},
      titles:{ALL_L:'Cân bằng · Cần củng cố nền tảng toàn diện',ALL_M:'Cân bằng · Khám phá trong vùng chuẩn',ALL_H:'Cân bằng · Tích hợp năng lực cao',BAL:'Cân bằng · Hồ sơ mức hỗn hợp',PROFILE:'Hồ sơ nhận thức 81 kiểu'},
      summaries:{ALL_L:'Cả bốn lĩnh vực đều ở mức thấp. Không có một điểm yếu đơn lẻ, nhưng cần hỗ trợ nền tảng toàn diện. Không dùng riêng kết quả này để giới hạn năng lực hay nghề nghiệp; cần kết hợp quan sát và đánh giá thêm.',ALL_M:'Cả bốn lĩnh vực đều ở mức trung bình. Thay vì gán một điểm mạnh hay yếu nổi trội, hãy trải nghiệm đa dạng để tìm hứng thú và thế mạnh thực tế.',ALL_H:'Cả bốn lĩnh vực đều ở mức cao. Phù hợp với nhiệm vụ phức hợp và trải nghiệm chuyên sâu trong lĩnh vực quan tâm.',BAL:'Các điểm số gần nhau nên không tùy ý chọn lĩnh vực mạnh nhất hoặc yếu nhất. Cần đọc cùng mức tuyệt đối và kết quả thực tế.',PROFILE:'Đây là một trong 81 hồ sơ tạo từ mức cao, trung bình và thấp của bốn lĩnh vực; phản ánh cả mức tuyệt đối và mẫu hình cá nhân.'},
      fragments:{P:{H:'Lập kế hoạch ở mức cao; có thể tận dụng khả năng đặt mục tiêu và tổ chức bước hành động.',M:'Lập kế hoạch ở mức trung bình; nên luyện với mục tiêu ngắn và cụ thể.',L:'Lập kế hoạch ở mức thấp; cần chia mục tiêu thành bước nhỏ và làm rõ hành động tiếp theo.'},A:{H:'Chú ý ở mức cao; có thể tận dụng khả năng tập trung bền vững khi kiểm soát nhiễu.',M:'Chú ý ở mức trung bình; thói quen ổn định giúp giảm dao động theo hứng thú và môi trường.',L:'Chú ý ở mức thấp; cần phiên tập trung ngắn, phản hồi ngay và môi trường ít nhiễu.'},S:{H:'Xử lý đồng thời ở mức cao; có thể tích hợp thông tin và nắm cấu trúc tổng thể.',M:'Xử lý đồng thời ở mức trung bình; sơ đồ và tóm tắt giúp ổn định bức tranh chung.',L:'Xử lý đồng thời ở mức thấp; cần cho thấy toàn cảnh trước và trực quan hóa quan hệ.'},Q:{H:'Xử lý tuần tự ở mức cao; có thể thực hiện chính xác theo từng bước.',M:'Xử lý tuần tự ở mức trung bình; bảng trình tự và diễn đạt bằng lời sẽ hữu ích.',L:'Xử lý tuần tự ở mức thấp; cần đưa từng bước một và kiểm tra bằng danh sách.'}},
      rec:{ALL_L:{learning:'Bắt đầu bằng đơn vị ngắn, dễ và tích lũy trải nghiệm hoàn thành ở cả bốn lĩnh vực.',career:'Không giới hạn lựa chọn bằng điểm hiện tại; quan sát hứng thú và tiến bộ trong trải nghiệm có hỗ trợ.',job:'Độ phù hợp nghề không phải tiêu chí loại trừ; hãy kiểm tra hiệu suất trong nhiệm vụ nhập môn có cấu trúc.'},ALL_M:{learning:'Luân phiên bốn chiến lược và so sánh hiệu quả theo nhiệm vụ.',career:'Tìm lĩnh vực có cả hứng thú, bền bỉ và kết quả.',job:'Kết hợp gợi ý với kinh nghiệm, hứng thú và khả năng học.'},ALL_H:{learning:'Thử nhiệm vụ phức hợp cần nhiều cách xử lý.',career:'Chọn lĩnh vực quan tâm và phát triển chuyên môn qua dự án dài hạn.',job:'Khám phá vai trò giải quyết vấn đề phức tạp cùng hứng thú thực tế.'},BAL:{learning:'Không tạo điểm mạnh/yếu từ chênh lệch nhỏ; so sánh chiến lược theo nhiệm vụ.',career:'Với hồ sơ cân bằng, ưu tiên hứng thú, kinh nghiệm và tính bền bỉ.',job:'Giải thích từ mức tổng thể và kinh nghiệm, không từ một trục cao tùy ý.'},supportLow:'Tăng hỗ trợ cho {axes}: từng bước, trực quan và lặp lại ngắn.',useHigh:'Dùng {axes} làm nguồn lực hỗ trợ các lĩnh vực khác.',career:'Mã 81 kiểu hỗ trợ giải thích, không quyết định nghề nghiệp.',job:'Không tính trọng số hai lần; hồ sơ dùng để giải thích điểm mạnh và điều kiện hỗ trợ.'},
      labels:{profile:'Hồ sơ 81 kiểu',learning:'Ứng dụng học tập',career:'Ứng dụng nghề nghiệp',job:'Ứng dụng công việc'}
    },
    th: {
      axis:{P:'การวางแผน',A:'ความใส่ใจ',S:'การประมวลผลแบบพร้อมกัน',Q:'การประมวลผลตามลำดับ'}, level:{H:'สูง',M:'กลาง',L:'ต่ำ'},
      titles:{ALL_L:'สมดุล · ต้องเสริมพื้นฐานโดยรวม',ALL_M:'สมดุล · สำรวจในช่วงมาตรฐาน',ALL_H:'สมดุล · บูรณาการศักยภาพสูง',BAL:'สมดุล · โปรไฟล์ระดับผสม',PROFILE:'โปรไฟล์การรู้คิด 81 แบบ'},
      summaries:{ALL_L:'ทั้งสี่ด้านอยู่ในระดับต่ำ ไม่มีด้านใดอ่อนเพียงด้านเดียว แต่ควรเสริมพื้นฐานโดยรวม ไม่ควรใช้ผลนี้เพียงอย่างเดียวเพื่อจำกัดความสามารถหรือเส้นทางอาชีพ และควรพิจารณาการสังเกตกับการประเมินเพิ่มเติม',ALL_M:'ทั้งสี่ด้านอยู่ในระดับกลาง จึงไม่ควรกำหนดจุดแข็งหรือจุดอ่อนเด่นชัด แต่ควรใช้ประสบการณ์ที่หลากหลายเพื่อค้นหาความสนใจและผลงานจริง',ALL_H:'ทั้งสี่ด้านอยู่ในระดับสูง เหมาะกับงานซับซ้อนที่ใช้หลายกระบวนการร่วมกันและการต่อยอดในสาขาที่สนใจ',BAL:'คะแนนทั้งสี่ด้านใกล้กัน จึงไม่กำหนดด้านที่แข็งหรืออ่อนที่สุดโดยพลการ ควรพิจารณาระดับจริงร่วมกับผลงานในภารกิจ',PROFILE:'นี่คือหนึ่งใน 81 โปรไฟล์จากระดับสูง กลาง และต่ำของสี่ด้าน โดยสะท้อนทั้งระดับจริงและรูปแบบเฉพาะบุคคล'},
      fragments:{P:{H:'การวางแผนอยู่ระดับสูง สามารถใช้การตั้งเป้าหมายและจัดขั้นตอนเป็นจุดแข็งได้',M:'การวางแผนอยู่ระดับกลาง ควรฝึกด้วยเป้าหมายสั้นและชัดเจน',L:'การวางแผนอยู่ระดับต่ำ ควรแบ่งเป้าหมายเป็นขั้นเล็กและทำให้ขั้นต่อไปมองเห็นได้'},A:{H:'ความใส่ใจอยู่ระดับสูง สามารถใช้สมาธิต่อเนื่องเมื่อจัดการสิ่งรบกวนได้',M:'ความใส่ใจอยู่ระดับกลาง กิจวัตรที่สม่ำเสมอช่วยลดความผันผวนตามความสนใจและสภาพแวดล้อม',L:'ความใส่ใจอยู่ระดับต่ำ ควรใช้ช่วงโฟกัสสั้น การตอบกลับทันที และสภาพแวดล้อมรบกวนน้อย'},S:{H:'การประมวลผลแบบพร้อมกันอยู่ระดับสูง สามารถรวมข้อมูลและเห็นโครงสร้างโดยรวมได้',M:'การประมวลผลแบบพร้อมกันอยู่ระดับกลาง แผนภาพและสรุปใจความช่วยให้เห็นภาพรวม',L:'การประมวลผลแบบพร้อมกันอยู่ระดับต่ำ ควรแสดงภาพรวมก่อนและทำความสัมพันธ์ให้เป็นภาพ'},Q:{H:'การประมวลผลตามลำดับอยู่ระดับสูง สามารถทำตามขั้นตอนได้อย่างแม่นยำ',M:'การประมวลผลตามลำดับอยู่ระดับกลาง ตารางลำดับและการพูดทบทวนช่วยได้',L:'การประมวลผลตามลำดับอยู่ระดับต่ำ ควรนำเสนอทีละขั้นและใช้เช็กลิสต์'}},
      rec:{ALL_L:{learning:'เริ่มจากงานสั้นและง่าย แล้วสร้างประสบการณ์ทำสำเร็จในทั้งสี่ด้าน',career:'อย่าจำกัดทางเลือกจากคะแนนปัจจุบัน ให้สังเกตความสนใจและการเปลี่ยนแปลงในประสบการณ์ที่มีการช่วยเหลือ',job:'ความเหมาะสมของงานไม่ใช่เกณฑ์ตัดออก ควรดูผลงานจริงในงานเริ่มต้นที่มีโครงสร้าง'},ALL_M:{learning:'สลับใช้ทั้งสี่กลยุทธ์และเปรียบเทียบว่าแบบใดได้ผลในแต่ละงาน',career:'ค้นหาสาขาที่ความสนใจ ความต่อเนื่อง และผลงานเกิดร่วมกัน',job:'พิจารณาคำแนะนำร่วมกับประสบการณ์ ความสนใจ และศักยภาพในการฝึก'},ALL_H:{learning:'ลองงานซับซ้อนที่ต้องใช้หลายกระบวนการร่วมกัน',career:'เลือกสาขาที่สนใจและสร้างความเชี่ยวชาญผ่านโครงการระยะยาว',job:'สำรวจงานแก้ปัญหาซับซ้อนโดยพิจารณาความสนใจและประสบการณ์จริง'},BAL:{learning:'อย่าสร้างจุดแข็งจากความต่างเล็กน้อย ให้เปรียบเทียบกลยุทธ์ตามงาน',career:'โปรไฟล์สมดุลควรให้น้ำหนักกับความสนใจ ประสบการณ์ และความต่อเนื่องมากกว่าอันดับ',job:'ตีความจากระดับรวมและประสบการณ์ ไม่ใช่แกนสูงสุดโดยพลการ'},supportLow:'เพิ่มการช่วยเหลือใน {axes}: ทีละขั้น ใช้ภาพ และทำซ้ำสั้น ๆ',useHigh:'ใช้ {axes} เป็นทรัพยากรช่วยด้านอื่น',career:'รหัส 81 แบบใช้ช่วยอธิบาย ไม่ได้กำหนดอาชีพ',job:'ไม่ให้น้ำหนักคะแนนเดิมซ้ำ โปรไฟล์ใช้เพื่ออธิบายจุดแข็งและเงื่อนไขช่วยเหลือ'},
      labels:{profile:'โปรไฟล์ 81 แบบ',learning:'การใช้ในการเรียนรู้',career:'การใช้ด้านอาชีพ',job:'การใช้ด้านงาน'}
    },
    ar: {
      axis:{P:'التخطيط',A:'الانتباه',S:'المعالجة المتزامنة',Q:'المعالجة المتتابعة'}, level:{H:'مرتفع',M:'متوسط',L:'منخفض'},
      titles:{ALL_L:'متوازن · دعم تأسيسي شامل',ALL_M:'متوازن · استكشاف ضمن النطاق المعياري',ALL_H:'متوازن · تكامل عالي القدرة',BAL:'متوازن · ملف متعدد المستويات',PROFILE:'ملف معرفي من 81 نمطًا'},
      summaries:{ALL_L:'تقع المجالات الأربعة في المستوى المنخفض. لا يوجد مجال واحد ضعيف بصورة منفردة، لكن يلزم دعم تأسيسي شامل. لا ينبغي تقييد القدرات أو المسار المهني بهذه النتيجة وحدها؛ بل تُدمج مع الملاحظة اليومية وتقييم إضافي.',ALL_M:'تقع المجالات الأربعة في المستوى المتوسط. بدل تعيين قوة أو ضعف مهيمن، يُنصح بخبرات متنوعة لاكتشاف الاهتمام والأداء الفعلي.',ALL_H:'تقع المجالات الأربعة في المستوى المرتفع. تناسب المهام المركبة والخبرات المتعمقة في مجال الاهتمام.',BAL:'الفروق بين الدرجات صغيرة، لذلك لا يُعيَّن مجال أقوى أو أضعف بصورة اعتباطية. يجب تفسير المستوى المطلق مع الأداء الفعلي.',PROFILE:'هذا أحد 81 ملفًا ناتجًا عن مستويات مرتفع ومتوسط ومنخفض في أربعة مجالات، ويعكس المستوى المطلق والنمط الفردي.'},
      fragments:{P:{H:'التخطيط مرتفع؛ يمكن الاستفادة من تحديد الأهداف وتنظيم خطوات العمل.',M:'التخطيط متوسط؛ تساعد الأهداف القصيرة والواضحة على تثبيت الاستراتيجية.',L:'التخطيط منخفض؛ قسّم الهدف إلى خطوات صغيرة وأظهر الإجراء التالي بوضوح.'},A:{H:'الانتباه مرتفع؛ يمكن الاستفادة من التركيز المستمر مع ضبط المشتتات.',M:'الانتباه متوسط؛ يساعد الروتين الثابت عندما يتغير التركيز حسب الاهتمام والسياق.',L:'الانتباه منخفض؛ استخدم فترات تركيز قصيرة وتغذية راجعة فورية وبيئة قليلة المشتتات.'},S:{H:'المعالجة المتزامنة مرتفعة؛ يمكن دمج المعلومات وفهم البنية الكلية.',M:'المعالجة المتزامنة متوسطة؛ تساعد المخططات والملخصات في تثبيت الصورة العامة.',L:'المعالجة المتزامنة منخفضة؛ اعرض الصورة الكلية أولًا ووضّح العلاقات بصريًا.'},Q:{H:'المعالجة المتتابعة مرتفعة؛ يمكن اتباع الإجراءات بدقة خطوة بخطوة.',M:'المعالجة المتتابعة متوسطة؛ تساعد خرائط التسلسل والترديد اللفظي.',L:'المعالجة المتتابعة منخفضة؛ قدّم خطوة واحدة كل مرة وتحقق بقائمة مراجعة.'}},
      rec:{ALL_L:{learning:'ابدأ بوحدات قصيرة وميسرة وابنِ خبرات إنجاز في المجالات الأربعة.',career:'لا تقيّد الخيارات بالدرجات الحالية؛ راقب الاهتمام والتغير في خبرات مدعومة.',job:'ملاءمة الوظيفة ليست معيار استبعاد؛ اختبر الأداء في مهام تمهيدية منظمة.'},ALL_M:{learning:'بدّل بين الاستراتيجيات الأربع وقارن فاعليتها حسب المهمة.',career:'ابحث عن مجالات يجتمع فيها الاهتمام والاستمرار والأداء.',job:'ادمج التوصيات مع الخبرة والاهتمام وقابلية التعلم.'},ALL_H:{learning:'جرّب مهام مركبة تتطلب عدة طرق معالجة.',career:'اختر مجال اهتمام وطوّر التخصص عبر مشاريع طويلة.',job:'استكشف أدوار حل المشكلات المركبة مع مراعاة الاهتمام والخبرة.'},BAL:{learning:'لا تصنع نقاط قوة من فروق صغيرة؛ قارن الاستراتيجيات حسب المهمة.',career:'في الملف المتوازن، أعطِ وزنًا أكبر للاهتمام والخبرة والاستمرار.',job:'فسّر من المستوى الكلي والخبرة لا من محور أعلى اعتباطيًا.'},supportLow:'زد الدعم في {axes}: خطوة واحدة، تصور بصري، وتكرار قصير.',useHigh:'استخدم {axes} كمورد لدعم المجالات الأخرى.',career:'رمز 81 نمطًا يوضح الأسباب والدعم ولا يحدد المهنة.',job:'لا تُوزن الدرجات نفسها مرتين؛ يستخدم الملف لشرح القوة وشروط الدعم.'},
      labels:{profile:'ملف 81 نمطًا',learning:'تطبيق التعلم',career:'تطبيق المسار المهني',job:'تطبيق الوظيفة'}
    },
    it: {
      axis:{P:'Pianificazione',A:'Attenzione',S:'Elaborazione simultanea',Q:'Elaborazione successiva'}, level:{H:'Alto',M:'Medio',L:'Basso'},
      titles:{ALL_L:'Equilibrato · Supporto di base globale',ALL_M:'Equilibrato · Esploratore nella norma',ALL_H:'Equilibrato · Integratore ad alta capacità',BAL:'Equilibrato · Profilo a livelli misti',PROFILE:'Profilo cognitivo a 81 tipi'},
      summaries:{ALL_L:'Tutte e quattro le aree sono nella fascia bassa. Non c’è una sola debolezza isolata, ma serve un sostegno di base globale. Non limitare capacità o scelte professionali usando solo questo risultato; integrarlo con osservazione e valutazione aggiuntiva.',ALL_M:'Tutte e quattro le aree sono nella fascia media. È meglio esplorare esperienze diverse per scoprire interessi e punti di forza reali, senza assegnare una forza o debolezza dominante.',ALL_H:'Tutte e quattro le aree sono nella fascia alta. Sono adatti compiti complessi e approfondimenti nell’area di interesse.',BAL:'Le differenze sono ridotte; non viene assegnata arbitrariamente un’area più forte o più debole. Interpretare il livello assoluto insieme alla prestazione reale.',PROFILE:'È uno degli 81 profili formati dai livelli alto, medio e basso delle quattro aree; riflette livello assoluto e schema individuale.'},
      fragments:{P:{H:'La pianificazione è alta; si possono usare definizione degli obiettivi e organizzazione dei passi.',M:'La pianificazione è media; obiettivi brevi e concreti aiutano a stabilizzare la strategia.',L:'La pianificazione è bassa; dividere gli obiettivi in piccoli passi e rendere visibile l’azione successiva.'},A:{H:'L’attenzione è alta; si può sfruttare la concentrazione sostenuta gestendo le distrazioni.',M:'L’attenzione è media; una routine stabile aiuta quando varia con interesse e contesto.',L:'L’attenzione è bassa; usare brevi blocchi, feedback immediato e poche distrazioni.'},S:{H:'L’elaborazione simultanea è alta; si possono integrare informazioni e cogliere la struttura globale.',M:'L’elaborazione simultanea è media; diagrammi e sintesi sostengono la visione d’insieme.',L:'L’elaborazione simultanea è bassa; mostrare prima il quadro generale e visualizzare le relazioni.'},Q:{H:'L’elaborazione successiva è alta; si possono seguire procedure con precisione passo dopo passo.',M:'L’elaborazione successiva è media; aiutano sequenze e verbalizzazione.',L:'L’elaborazione successiva è bassa; presentare un passo alla volta e verificare con una checklist.'}},
      rec:{ALL_L:{learning:'Iniziare con unità brevi e gestibili e costruire esperienze di completamento in tutte le aree.',career:'Non limitare le opzioni dai punteggi attuali; osservare interesse e cambiamento in esperienze sostenute.',job:'L’idoneità non è un criterio di esclusione; verificare la prestazione in attività iniziali strutturate.'},ALL_M:{learning:'Alternare le quattro strategie e confrontarne l’efficacia.',career:'Cercare ambiti in cui interesse, costanza e risultati compaiono insieme.',job:'Integrare raccomandazioni, esperienza, interesse e allenabilità.'},ALL_H:{learning:'Affrontare compiti complessi che integrano più processi.',career:'Scegliere un’area di interesse e sviluppare competenza con progetti lunghi.',job:'Esplorare ruoli complessi considerando interesse ed esperienza.'},BAL:{learning:'Non creare forze da piccole differenze; confrontare le strategie per compito.',career:'Nel profilo equilibrato pesare più interesse, esperienza e costanza.',job:'Interpretare livello globale ed esperienza, non un asse superiore arbitrario.'},supportLow:'Aumentare il supporto in {axes}: un passo, visualizzazione e brevi ripetizioni.',useHigh:'Usare {axes} come risorse a sostegno delle altre aree.',career:'Il codice a 81 tipi chiarisce motivi e supporti, non determina la carriera.',job:'Gli stessi punteggi non sono pesati due volte; il profilo spiega forze e supporti.'},
      labels:{profile:'Profilo a 81 tipi',learning:'Applicazione didattica',career:'Applicazione professionale',job:'Applicazione lavorativa'}
    },
    az: {
      axis:{P:'Planlaşdırma',A:'Diqqət',S:'Eyni vaxtlı emal',Q:'Ardıcıl emal'}, level:{H:'Yüksək',M:'Orta',L:'Aşağı'},
      titles:{ALL_L:'Balanslı · Ümumi baza dəstəyi',ALL_M:'Balanslı · Standart diapazon tədqiqatçısı',ALL_H:'Balanslı · Yüksək qabiliyyətli inteqrator',BAL:'Balanslı · Qarışıq səviyyəli profil',PROFILE:'81 tipli koqnitiv profil'},
      summaries:{ALL_L:'Dörd sahənin hamısı aşağı diapazondadır. Tək bir zəif sahə yoxdur, lakin ümumi baza dəstəyi lazımdır. Yalnız bu nəticə ilə qabiliyyət və karyera imkanlarını məhdudlaşdırmayın; gündəlik müşahidə və əlavə qiymətləndirmə ilə birlikdə baxın.',ALL_M:'Dörd sahənin hamısı orta diapazondadır. Aydın güclü və ya zəif sahə təyin etməkdənsə, müxtəlif təcrübələrlə maraq və real performansı araşdırmaq uyğundur.',ALL_H:'Dörd sahənin hamısı yüksək diapazondadır. Bir neçə emal üsulunu birləşdirən mürəkkəb tapşırıqlar və maraq sahəsində dərinləşmə uyğundur.',BAL:'Ballar bir-birinə yaxındır; ən güclü və ən zəif sahə süni şəkildə seçilmir. Mütləq səviyyəni real tapşırıq performansı ilə birlikdə şərh edin.',PROFILE:'Bu, dörd sahənin yüksək, orta və aşağı səviyyələrindən yaranan 81 profildən biridir; həm mütləq səviyyəni, həm də fərdi nümunəni göstərir.'},
      fragments:{P:{H:'Planlaşdırma yüksəkdir; məqsəd qoyma və addımları təşkil etmə gücündən istifadə etmək olar.',M:'Planlaşdırma ortadır; qısa və konkret məqsədlər strategiyanı sabitləşdirir.',L:'Planlaşdırma aşağıdır; məqsədi kiçik addımlara bölün və növbəti hərəkəti görünən edin.'},A:{H:'Diqqət yüksəkdir; yayındırıcıları idarə etməklə davamlı fokusdan istifadə etmək olar.',M:'Diqqət ortadır; sabit rutin maraq və mühitdən yaranan dəyişkənliyi azaldır.',L:'Diqqət aşağıdır; qısa fokus blokları, dərhal rəy və az yayındırıcı mühit lazımdır.'},S:{H:'Eyni vaxtlı emal yüksəkdir; məlumatı birləşdirib ümumi quruluşu görmək olar.',M:'Eyni vaxtlı emal ortadır; diaqram və qısa xülasə ümumi mənzərəni sabitləşdirir.',L:'Eyni vaxtlı emal aşağıdır; əvvəlcə ümumi mənzərəni göstərin və əlaqələri vizuallaşdırın.'},Q:{H:'Ardıcıl emal yüksəkdir; prosedurları addım-addım dəqiq izləmək olar.',M:'Ardıcıl emal ortadır; ardıcıllıq cədvəli və şifahi təkrar kömək edir.',L:'Ardıcıl emal aşağıdır; hər dəfə bir addım göstərin və siyahı ilə yoxlayın.'}},
      rec:{ALL_L:{learning:'Qısa və asan vahidlərlə başlayın, dörd sahədə tamamlanma təcrübəsi yaradın.',career:'Cari ballarla seçimləri məhdudlaşdırmayın; dəstəklənən təcrübələrdə maraq və dəyişimi izləyin.',job:'İş uyğunluğu istisna meyarı deyil; strukturlaşdırılmış başlanğıc tapşırıqlarda real performansı yoxlayın.'},ALL_M:{learning:'Dörd strategiyanı növbə ilə sınayın və tapşırığa görə müqayisə edin.',career:'Maraq, davamlılıq və nəticənin birlikdə göründüyü sahələri tapın.',job:'Tövsiyəni təcrübə, maraq və öyrənmə imkanı ilə birləşdirin.'},ALL_H:{learning:'Bir neçə emal üsulunu birləşdirən mürəkkəb tapşırıqları sınayın.',career:'Maraq sahəsi seçin və uzun layihələrlə ixtisaslaşın.',job:'Real maraq və təcrübə ilə mürəkkəb problem həlli rollarını araşdırın.'},BAL:{learning:'Kiçik fərqlərdən güclü-zəif sahə yaratmayın; strategiyaları tapşırığa görə müqayisə edin.',career:'Balanslı profildə maraq, təcrübə və davamlılığa daha çox çəki verin.',job:'Süni yüksək oxdan deyil, ümumi səviyyə və təcrübədən şərh edin.'},supportLow:'{axes} üçün dəstəyi artırın: bir addım, vizuallaşdırma və qısa təkrar.',useHigh:'{axes} sahələrini digər sahələrə dəstək verən resurs kimi istifadə edin.',career:'81 tip kodu izahı dəstəkləyir, karyeranı müəyyən etmir.',job:'Eyni ballar iki dəfə çəkilmir; profil gücləri və dəstək şərtlərini izah edir.'},
      labels:{profile:'81 tipli profil',learning:'Öyrənmədə tətbiq',career:'Karyerada tətbiq',job:'İşdə tətbiq'}
    },
    km: {
      axis:{P:'ការធ្វើផែនការ',A:'ការយកចិត្តទុកដាក់',S:'ដំណើរការព័ត៌មានព្រមគ្នា',Q:'ដំណើរការព័ត៌មានតាមលំដាប់'}, level:{H:'ខ្ពស់',M:'មធ្យម',L:'ទាប'},
      titles:{ALL_L:'មានតុល្យភាព · ត្រូវពង្រឹងមូលដ្ឋានទូទៅ',ALL_M:'មានតុល្យភាព · ស្វែងរកក្នុងកម្រិតស្តង់ដារ',ALL_H:'មានតុល្យភាព · សមាហរណកម្មសមត្ថភាពខ្ពស់',BAL:'មានតុល្យភាព · ទម្រង់កម្រិតចម្រុះ',PROFILE:'ទម្រង់ការយល់ដឹង ៨១ ប្រភេទ'},
      summaries:{
        ALL_L:'វិស័យទាំងបួនស្ថិតក្នុងកម្រិតទាប។ មិនមានវិស័យណាមួយខ្សោយដាច់ដោយឡែកទេ ប៉ុន្តែត្រូវការការគាំទ្រមូលដ្ឋានទូទៅ។ កុំប្រើលទ្ធផលនេះតែមួយគត់ដើម្បីកំណត់សមត្ថភាព ឬជម្រើសអាជីព; សូមពិចារណារួមជាមួយការសង្កេតប្រចាំថ្ងៃ និងការវាយតម្លៃបន្ថែម។',
        ALL_M:'វិស័យទាំងបួនស្ថិតក្នុងកម្រិតមធ្យម។ ជំនួសឱ្យការកំណត់ចំណុចខ្លាំង ឬចំណុចខ្សោយលេចធ្លោ គួរសាកល្បងបទពិសោធន៍ចម្រុះ ដើម្បីស្វែងរកចំណាប់អារម្មណ៍ និងសមត្ថភាពអនុវត្តជាក់ស្តែង។',
        ALL_H:'វិស័យទាំងបួនស្ថិតក្នុងកម្រិតខ្ពស់។ អាចប្រើវិធីដំណើរការព័ត៌មានទាំងបួនរួមគ្នាបាន ដូច្នេះកិច្ចការស្មុគស្មាញ និងការសិក្សាស៊ីជម្រៅក្នុងវិស័យដែលចាប់អារម្មណ៍គឺសមស្រប។',
        BAL:'ពិន្ទុទាំងបួននៅជិតគ្នា ដូច្នេះមិនកំណត់វិស័យខ្លាំងបំផុត ឬខ្សោយបំផុតដោយបង្ខំទេ។ ត្រូវបកស្រាយកម្រិតជាក់លាក់រួមជាមួយលទ្ធផលអនុវត្តតាមកិច្ចការ។',
        PROFILE:'នេះជាទម្រង់មួយក្នុងចំណោម ៨១ ប្រភេទ ដែលបង្កើតពីកម្រិតខ្ពស់ មធ្យម និងទាបនៃវិស័យទាំងបួន។ វាបង្ហាញទាំងកម្រិតជាក់លាក់ និងលំនាំផ្ទាល់ខ្លួន។'
      },
      fragments:{
        P:{H:'ការធ្វើផែនការស្ថិតក្នុងកម្រិតខ្ពស់ ហើយអាចប្រើសមត្ថភាពកំណត់គោលដៅ និងរៀបចំជំហានអនុវត្តបានយ៉ាងសកម្ម។',M:'ការធ្វើផែនការស្ថិតក្នុងកម្រិតមធ្យម ហើយអាចហាត់យុទ្ធសាស្ត្រផែនការបានល្អជាមួយគោលដៅខ្លី និងជាក់លាក់។',L:'ការធ្វើផែនការស្ថិតក្នុងកម្រិតទាប ដូច្នេះគួរបំបែកគោលដៅជាជំហានតូចៗ និងបង្ហាញសកម្មភាពបន្ទាប់ឱ្យឃើញច្បាស់។'},
        A:{H:'ការយកចិត្តទុកដាក់ស្ថិតក្នុងកម្រិតខ្ពស់ ហើយអាចប្រើសមត្ថភាពផ្តោតលើកិច្ចការមួយដោយគ្រប់គ្រងអ្វីដែលរំខាន។',M:'ការយកចិត្តទុកដាក់ស្ថិតក្នុងកម្រិតមធ្យម ហើយទម្លាប់ថេរអាចជួយកាត់បន្ថយការប្រែប្រួលតាមចំណាប់អារម្មណ៍ និងបរិយាកាស។',L:'ការយកចិត្តទុកដាក់ស្ថិតក្នុងកម្រិតទាប ដូច្នេះត្រូវការវគ្គផ្តោតខ្លីៗ មតិត្រឡប់ភ្លាមៗ និងបរិយាកាសដែលមានការរំខានតិច។'},
        S:{H:'ដំណើរការព័ត៌មានព្រមគ្នាស្ថិតក្នុងកម្រិតខ្ពស់ ហើយអាចរួមបញ្ចូលព័ត៌មានជាច្រើន ដើម្បីយល់ពីរចនាសម្ព័ន្ធ និងទំនាក់ទំនងទាំងមូល។',M:'ដំណើរការព័ត៌មានព្រមគ្នាស្ថិតក្នុងកម្រិតមធ្យម ហើយការប្រើគំនូសតាងជាមួយសេចក្តីសង្ខេបខ្លីអាចជួយឱ្យយល់រូបភាពទាំងមូលបានថេរ។',L:'ដំណើរការព័ត៌មានព្រមគ្នាស្ថិតក្នុងកម្រិតទាប ដូច្នេះគួរបង្ហាញរូបភាពទាំងមូលជាមុន និងធ្វើឱ្យទំនាក់ទំនងរវាងព័ត៌មានមើលឃើញបាន។'},
        Q:{H:'ដំណើរការព័ត៌មានតាមលំដាប់ស្ថិតក្នុងកម្រិតខ្ពស់ ហើយអាចអនុវត្តនីតិវិធីមួយជំហានម្តងៗបានត្រឹមត្រូវ។',M:'ដំណើរការព័ត៌មានតាមលំដាប់ស្ថិតក្នុងកម្រិតមធ្យម ហើយតារាងលំដាប់ជំហានជាមួយការពន្យល់ដោយមាត់អាចជួយឱ្យការអនុវត្តមានស្ថិរភាព។',L:'ដំណើរការព័ត៌មានតាមលំដាប់ស្ថិតក្នុងកម្រិតទាប ដូច្នេះគួរបង្ហាញម្តងមួយជំហាន និងប្រើបញ្ជីត្រួតពិនិត្យដើម្បីបញ្ជាក់ការបញ្ចប់។'}
      },
      rec:{
        ALL_L:{learning:'ចាប់ផ្តើមពីកិច្ចការខ្លី និងងាយស្រួល ហើយបង្កើតបទពិសោធន៍បញ្ចប់កិច្ចការនៅគ្រប់វិស័យទាំងបួន។',career:'កុំកំណត់ជម្រើសតាមពិន្ទុបច្ចុប្បន្ន; សង្កេតចំណាប់អារម្មណ៍ និងល្បឿននៃការរីកចម្រើនក្នុងបទពិសោធន៍ដែលមានការគាំទ្រល្អ។',job:'ភាពសមស្របនឹងការងារមិនមែនជាលក្ខខណ្ឌដកចេញទេ។ ត្រូវពិនិត្យការអនុវត្តជាក់ស្តែងក្នុងកិច្ចការចាប់ផ្តើមដែលមានរចនាសម្ព័ន្ធ និងការគាំទ្រសមស្រប។'},
        ALL_M:{learning:'សាកល្បងប្តូររវាងការធ្វើផែនការ ការផ្តោតអារម្មណ៍ ការមើលរូបភាពទាំងមូល និងការធ្វើតាមលំដាប់ ហើយប្រៀបធៀបវិធីដែលមានប្រសិទ្ធភាព។',career:'ស្វែងរកវិស័យដែលចំណាប់អារម្មណ៍ ការតស៊ូ និងលទ្ធផលល្អកើតឡើងរួមគ្នាតាមរយៈបទពិសោធន៍ចម្រុះ។',job:'បង្រួមជម្រើសដោយពិចារណាអនុសាសន៍រួមជាមួយបទពិសោធន៍ ចំណាប់អារម្មណ៍ និងសមត្ថភាពក្នុងការបណ្តុះបណ្តាល។'},
        ALL_H:{learning:'សាកល្បងកិច្ចការស្មុគស្មាញ និងកម្រិតខ្ពស់ ដែលត្រូវការប្រើវិធីដំណើរការព័ត៌មានជាច្រើនរួមគ្នា។',career:'ជ្រើសរើសវិស័យដែលចាប់អារម្មណ៍ និងអភិវឌ្ឍជំនាញតាមរយៈគម្រោងរយៈពេលវែង។',job:'ស្វែងរកតួនាទីដោះស្រាយបញ្ហាស្មុគស្មាញ និងសម្របសម្រួល ដោយពិចារណាចំណាប់អារម្មណ៍ និងបទពិសោធន៍ជាក់ស្តែង។'},
        BAL:{learning:'កុំបង្កើតចំណុចខ្លាំង ឬខ្សោយពីភាពខុសគ្នាតូចៗនៃពិន្ទុ; ប្រៀបធៀបថាវិធីណាមានប្រសិទ្ធភាពតាមប្រភេទកិច្ចការ។',career:'សម្រាប់ទម្រង់មានតុល្យភាព គួរផ្តល់ទម្ងន់ដល់ចំណាប់អារម្មណ៍ បទពិសោធន៍ និងការតស៊ូជាងលំដាប់ពិន្ទុ។',job:'បកស្រាយអនុសាសន៍តាមកម្រិតទូទៅ និងបទពិសោធន៍ មិនមែនតាមវិស័យខ្ពស់ដែលកំណត់ដោយបង្ខំទេ។'},
        supportLow:'បង្កើនការគាំទ្រសម្រាប់ {axes} ដោយបង្ហាញម្តងមួយជំហាន ប្រើរូបភាព និងធ្វើឡើងវិញខ្លីៗ។',
        useHigh:'ប្រើ {axes} ជាធនធានសម្រាប់កិច្ចការ និងដើម្បីគាំទ្រវិស័យផ្សេងទៀត។',
        career:'លេខកូដ ៨១ ប្រភេទជួយពន្យល់ពីភាពសមស្រប និងលក្ខខណ្ឌគាំទ្រ ប៉ុន្តែមិនកំណត់អាជីពទេ។',
        job:'ពិន្ទុដដែលមិនត្រូវបានគណនាទម្ងន់ពីរដងទេ; ទម្រង់ ៨១ ប្រភេទត្រូវបានប្រើដើម្បីពន្យល់ចំណុចខ្លាំង និងលក្ខខណ្ឌគាំទ្រ។'
      },
      labels:{profile:'ទម្រង់ ៨១ ប្រភេទ',learning:'ការអនុវត្តក្នុងការសិក្សា',career:'ការអនុវត្តក្នុងការជ្រើសរើសអាជីព',job:'ការអនុវត្តក្នុងការងារ'}
    }
  };

  let activeLang = 'ko';

  function normalizeLang(lang) {
    const raw = String(lang || '').toLowerCase().split('-')[0];
    return LANG_ALIASES[raw] || 'ko';
  }

  function setLang(lang) { activeLang = normalizeLang(lang); return activeLang; }
  function getLang() { return activeLang; }
  function getLevel(score, thresholds) {
    const t = Object.assign({}, DEFAULT_THRESHOLDS, thresholds || {});
    const n = Number(score);
    if (n >= t.high) return 'H';
    if (n <= t.low) return 'L';
    return 'M';
  }
  function fill(text, vars) {
    return String(text || '').replace(/\{(\w+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    });
  }
  function joinAxes(keys, d, lang) {
    const labels = keys.map(function (k) { return d.axis[k]; });
    if (lang === 'zh' || lang === 'ja') return labels.join('、');
    if (lang === 'ar') return labels.join('، ');
    return labels.join(', ');
  }

  function validateScores(scores) {
    const invalid = ORDER.filter(function (k) {
      const n = Number(scores && scores[k]);
      return !Number.isFinite(n) || n < 0 || n > 100;
    });
    if (invalid.length) {
      throw new RangeError('D-CAS scores must include finite 0-100 values for P, A, S, Q (invalid: ' + invalid.join(', ') + ')');
    }
    const normalized = {};
    ORDER.forEach(function (k) { normalized[k] = Number(scores[k]); });
    return normalized;
  }

  function classifyProcessing(scores) {
    const normalized = validateScores(scores);
    const diff = Math.abs(normalized.S - normalized.Q);
    const isBalanced = diff <= 10;
    const dominant = isBalanced ? null : (normalized.S > normalized.Q ? 'S' : 'Q');
    return {
      diff:diff,
      isBalanced:isBalanced,
      dominant:dominant,
      kind:isBalanced ? 'BALANCED' : (dominant === 'S' ? 'S_DOMINANT' : 'Q_DOMINANT')
    };
  }

  function classify(scores, lang, thresholds) {
    const locale = normalizeLang(lang || activeLang);
    const d = I18N[locale] || I18N.ko;
    const t = Object.assign({}, DEFAULT_THRESHOLDS, thresholds || {});
    const safeScores = validateScores(scores);
    const levels = {};
    ORDER.forEach(function (k) {
      levels[k] = getLevel(safeScores[k], t);
    });
    const compactCode = ORDER.map(function (k) { return levels[k]; }).join('');
    const code = ORDER.map(function (k) { return k + '-' + levels[k]; }).join(' / ');
    const values = ORDER.map(function (k) { return safeScores[k]; });
    const spread = Math.max.apply(null, values) - Math.min.apply(null, values);
    const exactTie = spread === 0;
    const isBalanced = spread < t.balance;
    let kind = 'PROFILE';
    if (compactCode === 'LLLL') kind = 'ALL_L';
    else if (compactCode === 'MMMM') kind = 'ALL_M';
    else if (compactCode === 'HHHH') kind = 'ALL_H';
    else if (isBalanced) kind = 'BAL';

    const fragments = ORDER.map(function (k) {
      return { axis:k, level:levels[k], axisLabel:d.axis[k], levelLabel:d.level[levels[k]], text:d.fragments[k][levels[k]] };
    });
    const lowAxes = ORDER.filter(function (k) { return levels[k] === 'L'; });
    const highAxes = ORDER.filter(function (k) { return levels[k] === 'H'; });
    let recommendations;
    if (d.rec[kind]) {
      recommendations = Object.assign({}, d.rec[kind]);
    } else {
      recommendations = {
        learning: lowAxes.length ? fill(d.rec.supportLow, {axes:joinAxes(lowAxes, d, locale)}) : fill(d.rec.useHigh, {axes:joinAxes(highAxes, d, locale)}),
        career: d.rec.career,
        job: d.rec.job
      };
    }
    return {
      lang:locale, dir:locale === 'ar' ? 'rtl' : 'ltr', scores:safeScores, levels:levels,
      compactCode:compactCode, code:code, kind:kind, title:d.titles[kind], summary:d.summaries[kind],
      fragments:fragments, recommendations:recommendations, labels:d.labels,
      spread:spread, exactTie:exactTie, isBalanced:isBalanced, thresholds:t,
      processing:classifyProcessing(safeScores)
    };
  }

  function toPlainText(profile) {
    return profile.title + ' (' + profile.code + ')\n' + profile.summary + '\n' + profile.fragments.map(function (f) { return f.text; }).join(' ');
  }

  global.DCasProfile81 = {
    LANGS:Object.keys(I18N), I18N:I18N, LOCALE_META:LOCALE_META, ORDER:ORDER, DEFAULT_THRESHOLDS:DEFAULT_THRESHOLDS,
    normalizeLang:normalizeLang, setLang:setLang, getLang:getLang, getLevel:getLevel,
    validateScores:validateScores, classifyProcessing:classifyProcessing,
    classify:classify, toPlainText:toPlainText
  };
})(typeof window !== 'undefined' ? window : globalThis);
