/**
 * K-PASS 81개 고유 노출 명칭 패치 v1.0
 *
 * 기존 KPassEngine의 표준점수 판정, 개인화 문장, 전체척도 및 학습유형 로직은
 * 유지하고 P/A/S/Q의 H/M/L 조합별 화면 노출 명칭만 81개 고유값으로 확장한다.
 */
(function (global) {
  'use strict';

  const engine = global.KPassEngine;
  if (!engine || engine.__uniqueNamesV1) return;

  const ORDER = ['P', 'A', 'S', 'Q'];
  const NAME_LANGS = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
  const THRESHOLDS = Object.freeze({ high: 120, low: 85 });

  const KO_SIGNATURE = {
    P:'계획주도', A:'몰입주도', S:'직관통합', Q:'절차주도',
    PA:'목표관리', PS:'비전설계', PQ:'논리설계', AS:'몰입탐구', AQ:'정밀실행', SQ:'구조표현',
    PAS:'전략통찰', PAQ:'정밀전략', PSQ:'구조기획', ASQ:'분석통합', PASQ:'전영역조율'
  };
  const KO_ROLE = {
    P:'실행가', A:'탐구가', S:'기획가', Q:'실행가',
    PA:'전략가', PS:'설계가', PQ:'실행가', AS:'탐구가', AQ:'완성가', SQ:'이야기꾼',
    PAS:'전략가', PAQ:'완성가', PSQ:'설계가', ASQ:'탐구가', PASQ:'올라운더'
  };

  const NAMES = {
    ko:{axis:{P:'계획력',A:'주의력',S:'동시처리',Q:'순차처리'},lead:'주도',steady:'안정',support:'보완',growth:'성장',profile:'유형',id:'인지 ID',allH:'전영역 고역량 균형형 올라운더',allM:'전영역 균형형 전략 탐색가',allL:'전영역 균형형 성장 탐험가'},
    en:{axis:{P:'Planning',A:'Attention',S:'Simultaneous',Q:'Successive'},lead:'Led',steady:'Steady',support:'Support',growth:'Growth',profile:'Profile',id:'Cognitive ID',allH:'All-Domain High-Capacity All-Rounder',allM:'All-Domain Balanced Strategy Explorer',allL:'All-Domain Balanced Growth Explorer'},
    ja:{axis:{P:'プランニング',A:'注意',S:'同時処理',Q:'継次処理'},lead:'主導',steady:'安定',support:'補完',growth:'成長',profile:'タイプ',id:'認知ID',allH:'全領域高能力バランス型オールラウンダー',allM:'全領域バランス型戦略探索者',allL:'全領域バランス型成長探索者'},
    zh:{axis:{P:'计划',A:'注意',S:'同时加工',Q:'继时加工'},lead:'主导',steady:'稳定',support:'补强',growth:'成长',profile:'类型',id:'认知ID',allH:'全领域高能力均衡型全能者',allM:'全领域均衡型策略探索者',allL:'全领域均衡型成长探索者'},
    'zh-TW':{axis:{P:'計畫',A:'注意',S:'同時處理',Q:'循序處理'},lead:'主導',steady:'穩定',support:'補強',growth:'成長',profile:'類型',id:'認知ID',allH:'全領域高能力均衡型全能者',allM:'全領域均衡型策略探索者',allL:'全領域均衡型成長探索者'},
    es:{axis:{P:'Planificación',A:'Atención',S:'Procesamiento simultáneo',Q:'Procesamiento sucesivo'},lead:'dominante',steady:'estable',support:'de apoyo',growth:'en crecimiento',profile:'perfil',id:'ID cognitivo',allH:'Perfil equilibrado de alta capacidad en todas las áreas',allM:'Explorador estratégico equilibrado en todas las áreas',allL:'Explorador de crecimiento equilibrado en todas las áreas'},
    fr:{axis:{P:'Planification',A:'Attention',S:'Traitement simultané',Q:'Traitement séquentiel'},lead:'dominant',steady:'stable',support:'à renforcer',growth:'en développement',profile:'profil',id:'ID cognitif',allH:'Profil polyvalent équilibré à haute capacité',allM:'Explorateur stratégique équilibré dans tous les domaines',allL:'Explorateur de développement équilibré dans tous les domaines'},
    ru:{axis:{P:'Планирование',A:'Внимание',S:'Одновременная обработка',Q:'Последовательная обработка'},lead:'ведущий',steady:'стабильный',support:'для поддержки',growth:'в развитии',profile:'профиль',id:'Когнитивный ID',allH:'Сбалансированный универсал высокого уровня',allM:'Сбалансированный стратегический исследователь',allL:'Сбалансированный исследователь развития'},
    vi:{axis:{P:'Lập kế hoạch',A:'Chú ý',S:'Xử lý đồng thời',Q:'Xử lý kế tiếp'},lead:'chủ đạo',steady:'ổn định',support:'cần hỗ trợ',growth:'đang phát triển',profile:'hồ sơ',id:'ID nhận thức',allH:'Hồ sơ toàn diện cân bằng năng lực cao',allM:'Hồ sơ khám phá chiến lược cân bằng',allL:'Hồ sơ khám phá phát triển cân bằng'},
    th:{axis:{P:'การวางแผน',A:'ความสนใจ',S:'การประมวลผลพร้อมกัน',Q:'การประมวลผลตามลำดับ'},lead:'นำ',steady:'มั่นคง',support:'เสริม',growth:'กำลังพัฒนา',profile:'โปรไฟล์',id:'รหัสการรู้คิด',allH:'ผู้รอบรู้สมดุลศักยภาพสูงทุกด้าน',allM:'นักสำรวจกลยุทธ์สมดุลทุกด้าน',allL:'นักสำรวจการเติบโตสมดุลทุกด้าน'},
    ar:{axis:{P:'التخطيط',A:'الانتباه',S:'المعالجة المتزامنة',Q:'المعالجة المتتابعة'},lead:'قيادي',steady:'مستقر',support:'بحاجة إلى دعم',growth:'في طور النمو',profile:'نمط',id:'المعرّف المعرفي',allH:'نمط متوازن عالي القدرة في جميع المجالات',allM:'مستكشف استراتيجي متوازن في جميع المجالات',allL:'مستكشف نمو متوازن في جميع المجالات'},
    it:{axis:{P:'Pianificazione',A:'Attenzione',S:'Elaborazione simultanea',Q:'Elaborazione sequenziale'},lead:'dominante',steady:'stabile',support:'da sostenere',growth:'in crescita',profile:'profilo',id:'ID cognitivo',allH:'Profilo equilibrato ad alta capacità in tutte le aree',allM:'Esploratore strategico equilibrato in tutte le aree',allL:'Esploratore di crescita equilibrato in tutte le aree'},
    az:{axis:{P:'Planlaşdırma',A:'Diqqət',S:'Eyni vaxtda emal',Q:'Ardıcıl emal'},lead:'aparıcı',steady:'sabit',support:'dəstək',growth:'inkişaf',profile:'profil',id:'Koqnitiv ID',allH:'Bütün sahələr üzrə yüksək qabiliyyətli balanslı universal',allM:'Bütün sahələr üzrə balanslı strateji tədqiqatçı',allL:'Bütün sahələr üzrə balanslı inkişaf tədqiqatçısı'},
    km:{axis:{P:'ការធ្វើផែនការ',A:'ការយកចិត្តទុកដាក់',S:'ដំណើរការព័ត៌មានព្រមគ្នា',Q:'ដំណើរការព័ត៌មានតាមលំដាប់'},lead:'ដឹកនាំ',steady:'មានស្ថិរភាព',support:'ត្រូវការគាំទ្រ',growth:'កំពុងអភិវឌ្ឍ',profile:'ទម្រង់',id:'អត្តសញ្ញាណការយល់ដឹង',allH:'ទម្រង់សមត្ថភាពខ្ពស់មានតុល្យភាពគ្រប់វិស័យ',allM:'អ្នកស្វែងរកយុទ្ធសាស្ត្រមានតុល្យភាពគ្រប់វិស័យ',allL:'អ្នកស្វែងរកការលូតលាស់មានតុល្យភាពគ្រប់វិស័យ'},
    mn:{axis:{P:'Төлөвлөлт',A:'Анхаарал',S:'Зэрэгцээ боловсруулалт',Q:'Дараалсан боловсруулалт'},lead:'давамгай',steady:'тогтвортой',support:'дэмжлэг шаардлагатай',growth:'хөгжиж буй',profile:'хэв шинж',id:'Танин мэдэхүйн ID',allH:'Бүх чиглэлд өндөр чадамжтай тэнцвэрт олон талт хэв шинж',allM:'Бүх чиглэлд тэнцвэртэй стратеги эрэлхийлэгч',allL:'Бүх чиглэлд тэнцвэртэй хөгжлийн эрэлхийлэгч'}
  };

  function normalizeLang(lang) {
    const raw = String(lang || '').trim().replace(/_/g, '-');
    const lower = raw.toLowerCase();
    if (lower === 'zh-tw' || lower.startsWith('zh-hant')) return 'zh-TW';
    const primary = lower.split('-')[0];
    return NAME_LANGS.indexOf(primary) >= 0 ? primary : 'ko';
  }

  function getLevel(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) throw new TypeError('K-PASS profile scores must be finite numbers');
    if (value >= THRESHOLDS.high) return 'H';
    if (value <= THRESHOLDS.low) return 'L';
    return 'M';
  }

  function getLevels(scores) {
    const levels = {};
    ORDER.forEach(function (axis) { levels[axis] = getLevel(scores && scores[axis]); });
    return levels;
  }

  function axisKey(levels, target) {
    return ORDER.filter(function (axis) { return levels[axis] === target; }).join('');
  }

  function joinAxisLabels(key, data, lang) {
    const labels = key.split('').map(function (axis) { return data.axis[axis]; });
    if (lang === 'ja' || lang === 'zh' || lang === 'zh-TW') return labels.join('・');
    if (lang === 'ar') return labels.join('، ');
    return labels.join(' + ');
  }

  function buildKorean(levels) {
    const high = axisKey(levels, 'H');
    const medium = axisKey(levels, 'M');
    const low = axisKey(levels, 'L');
    if (high === 'PASQ') return NAMES.ko.allH;
    if (medium === 'PASQ') return NAMES.ko.allM;
    if (low === 'PASQ') return NAMES.ko.allL;
    if (high) {
      if (low) return KO_SIGNATURE[high] + ' · ' + KO_SIGNATURE[low] + ' 보완형 ' + KO_ROLE[high];
      return KO_SIGNATURE[high] + ' · ' + KO_SIGNATURE[medium] + ' 안정형 ' + KO_ROLE[high];
    }
    return KO_SIGNATURE[medium] + ' 안정 · ' + KO_SIGNATURE[low] + ' 성장형 ' + KO_ROLE[medium];
  }

  function buildLocalized(levels, lang) {
    const data = NAMES[lang] || NAMES.en;
    const high = axisKey(levels, 'H');
    const medium = axisKey(levels, 'M');
    const low = axisKey(levels, 'L');
    if (high === 'PASQ') return data.allH;
    if (medium === 'PASQ') return data.allM;
    if (low === 'PASQ') return data.allL;
    if (high) {
      const lead = joinAxisLabels(high, data, lang) + ' ' + data.lead;
      const nuanceKey = low || medium;
      const nuance = joinAxisLabels(nuanceKey, data, lang) + ' ' + (low ? data.support : data.steady);
      return lead + ' · ' + nuance + ' ' + data.profile;
    }
    return joinAxisLabels(medium, data, lang) + ' ' + data.steady + ' · ' +
      joinAxisLabels(low, data, lang) + ' ' + data.growth + ' ' + data.profile;
  }

  function classify(scores, lang) {
    const locale = normalizeLang(lang);
    const levels = getLevels(scores);
    const compactCode = ORDER.map(function (axis) { return levels[axis]; }).join('');
    return {
      lang: locale,
      dir: locale === 'ar' ? 'rtl' : 'ltr',
      levels: levels,
      compactCode: compactCode,
      code: ORDER.map(function (axis) { return axis + '-' + levels[axis]; }).join(' / '),
      title: locale === 'ko' ? buildKorean(levels) : buildLocalized(levels, locale),
      nameSchema: 'kpass81-unique-v1'
    };
  }

  let lastProfile = null;
  const originalApply = engine.applyPersonalization.bind(engine);
  const originalBuild = engine.buildDerived.bind(engine);

  function currentLocale() {
    if (global.FeelGoodReportI18n && typeof global.FeelGoodReportI18n.getLocale === 'function') {
      return global.FeelGoodReportI18n.getLocale();
    }
    return global.__REPORT_LOCALE_ACTIVE__ || global.__REPORT_LOCALE__ ||
      (global.document && global.document.documentElement.lang) || 'ko';
  }

  function setLocalizedText(id, value, profile) {
    if (!global.document) return;
    const element = global.document.getElementById(id);
    if (!element) return;
    element.lang = profile.lang;
    element.dir = profile.dir;
    element.textContent = value;
  }

  function renderName(scores, lang) {
    const profile81 = classify(scores, lang);
    setLocalizedText('pf-cover-type', profile81.title, profile81);
    setLocalizedText('pf-herotype', profile81.title, profile81);
    setLocalizedText('pf-profile81-name', profile81.title, profile81);
    if (global.document) {
      ['pf-cover-type','pf-herotype','pf-profile81-name'].forEach(function (id) {
        const element = global.document.getElementById(id);
        if (element) {
          element.dataset.profile81Code = profile81.code;
          element.dataset.profile81Schema = profile81.nameSchema;
        }
      });
    }
    return profile81;
  }

  engine.buildDerived = function (profile) {
    const derived = originalBuild(profile);
    derived.profile81 = classify(profile.scores, currentLocale());
    return derived;
  };
  engine.applyPersonalization = function (profile) {
    lastProfile = profile;
    const derived = originalApply(profile);
    derived.profile81 = renderName(profile.scores, currentLocale());
    return derived;
  };

  if (global.document) {
    global.document.addEventListener('fg-report-locale-changed', function (event) {
      if (!lastProfile) return;
      const locale = event && event.detail ? event.detail.locale : currentLocale();
      renderName(lastProfile.scores, locale);
    });
  }

  global.KPassProfile81Names = Object.freeze({
    LANGS: NAME_LANGS.slice(),
    THRESHOLDS: THRESHOLDS,
    normalizeLang: normalizeLang,
    getLevel: getLevel,
    classify: classify
  });
  engine.__uniqueNamesV1 = true;
})(typeof window !== 'undefined' ? window : globalThis);
