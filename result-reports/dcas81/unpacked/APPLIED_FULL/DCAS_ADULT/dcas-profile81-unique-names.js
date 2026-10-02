/**
 * D-CAS 81개 고유 노출 명칭 패치 v1.0
 *
 * 기존 DCasProfile81.classify()의 점수 판정, 예외 처리, 문장과 추천은 유지하고
 * P/A/S/Q H/M/L 조합별 화면 노출 명칭만 81개 고유값으로 확장한다.
 */
(function (global) {
  'use strict';

  const bank = global.DCasProfile81;
  if (!bank || bank.__uniqueNamesV1) return;

  const ORDER = ['P', 'A', 'S', 'Q'];
  const NAME_LANGS = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];

  const KO_SIGNATURE = {
    P:'계획주도', A:'몰입주도', S:'직관통합', Q:'절차주도',
    PA:'목표관리', PS:'비전설계', PQ:'논리설계', AS:'몰입탐구', AQ:'정밀실행', SQ:'구조표현',
    PAS:'전략통찰', PAQ:'정밀전략', PSQ:'구조기획', ASQ:'분석통합', PASQ:'전영역조율'
  };
  const KO_ROLE = {
    P:'실행가', A:'분석가', S:'기획자', Q:'실행가',
    PA:'전략가', PS:'기획자', PQ:'실행가', AS:'분석가', AQ:'실무가', SQ:'스토리텔러',
    PAS:'전략가', PAQ:'실행가', PSQ:'기획자', ASQ:'분석가', PASQ:'올라운더'
  };

  const NAMES = {
    ko:{axis:{P:'계획력',A:'주의력',S:'동시처리',Q:'순차처리'},lead:'주도',steady:'안정',support:'보완',growth:'성장',profile:'유형',allH:'전영역 고역량 균형형 올라운더',allM:'전영역 균형형 전략 탐색가',allL:'전영역 균형형 성장 인재'},
    en:{axis:{P:'Planning',A:'Attention',S:'Simultaneous',Q:'Successive'},lead:'Led',steady:'Steady',support:'Support',growth:'Growth',profile:'Profile',allH:'All-Domain High-Capacity All-Rounder',allM:'All-Domain Balanced Strategy Explorer',allL:'All-Domain Balanced Growth Profile'},
    ja:{axis:{P:'プランニング',A:'注意',S:'同時処理',Q:'継次処理'},lead:'主導',steady:'安定',support:'補完',growth:'成長',profile:'タイプ',allH:'全領域高能力バランス型オールラウンダー',allM:'全領域バランス型戦略探索者',allL:'全領域バランス型成長プロフィール'},
    zh:{axis:{P:'计划',A:'注意',S:'同时加工',Q:'继时加工'},lead:'主导',steady:'稳定',support:'补强',growth:'成长',profile:'类型',allH:'全领域高能力均衡型全能者',allM:'全领域均衡型策略探索者',allL:'全领域均衡型成长人才'},
    'zh-TW':{axis:{P:'計畫',A:'注意',S:'同時處理',Q:'循序處理'},lead:'主導',steady:'穩定',support:'補強',growth:'成長',profile:'類型',allH:'全領域高能力均衡型全能者',allM:'全領域均衡型策略探索者',allL:'全領域均衡型成長人才'},
    es:{axis:{P:'Planificación',A:'Atención',S:'Procesamiento simultáneo',Q:'Procesamiento sucesivo'},lead:'dominante',steady:'estable',support:'de apoyo',growth:'en crecimiento',profile:'perfil',allH:'Perfil equilibrado de alta capacidad en todas las áreas',allM:'Explorador estratégico equilibrado en todas las áreas',allL:'Perfil de crecimiento equilibrado en todas las áreas'},
    fr:{axis:{P:'Planification',A:'Attention',S:'Traitement simultané',Q:'Traitement séquentiel'},lead:'dominant',steady:'stable',support:'à renforcer',growth:'en développement',profile:'profil',allH:'Profil polyvalent équilibré à haute capacité',allM:'Explorateur stratégique équilibré dans tous les domaines',allL:'Profil de développement équilibré dans tous les domaines'},
    ru:{axis:{P:'Планирование',A:'Внимание',S:'Одновременная обработка',Q:'Последовательная обработка'},lead:'ведущий',steady:'стабильный',support:'для поддержки',growth:'в развитии',profile:'профиль',allH:'Сбалансированный универсал высокого уровня',allM:'Сбалансированный стратегический исследователь',allL:'Сбалансированный профиль развития'},
    vi:{axis:{P:'Lập kế hoạch',A:'Chú ý',S:'Xử lý đồng thời',Q:'Xử lý kế tiếp'},lead:'chủ đạo',steady:'ổn định',support:'cần hỗ trợ',growth:'đang phát triển',profile:'hồ sơ',allH:'Hồ sơ toàn diện cân bằng năng lực cao',allM:'Hồ sơ khám phá chiến lược cân bằng',allL:'Hồ sơ phát triển cân bằng toàn diện'},
    th:{axis:{P:'การวางแผน',A:'ความสนใจ',S:'การประมวลผลพร้อมกัน',Q:'การประมวลผลตามลำดับ'},lead:'นำ',steady:'มั่นคง',support:'เสริม',growth:'กำลังพัฒนา',profile:'โปรไฟล์',allH:'ผู้รอบรู้สมดุลศักยภาพสูงทุกด้าน',allM:'นักสำรวจกลยุทธ์สมดุลทุกด้าน',allL:'โปรไฟล์การเติบโตสมดุลทุกด้าน'},
    ar:{axis:{P:'التخطيط',A:'الانتباه',S:'المعالجة المتزامنة',Q:'المعالجة المتتابعة'},lead:'قيادي',steady:'مستقر',support:'بحاجة إلى دعم',growth:'في طور النمو',profile:'نمط',allH:'نمط متوازن عالي القدرة في جميع المجالات',allM:'مستكشف استراتيجي متوازن في جميع المجالات',allL:'نمط نمو متوازن في جميع المجالات'},
    it:{axis:{P:'Pianificazione',A:'Attenzione',S:'Elaborazione simultanea',Q:'Elaborazione sequenziale'},lead:'dominante',steady:'stabile',support:'da sostenere',growth:'in crescita',profile:'profilo',allH:'Profilo equilibrato ad alta capacità in tutte le aree',allM:'Esploratore strategico equilibrato in tutte le aree',allL:'Profilo di crescita equilibrato in tutte le aree'},
    az:{axis:{P:'Planlaşdırma',A:'Diqqət',S:'Eyni vaxtda emal',Q:'Ardıcıl emal'},lead:'aparıcı',steady:'sabit',support:'dəstək',growth:'inkişaf',profile:'profil',allH:'Bütün sahələr üzrə yüksək qabiliyyətli balanslı universal',allM:'Bütün sahələr üzrə balanslı strateji tədqiqatçı',allL:'Bütün sahələr üzrə balanslı inkişaf profili'},
    km:{axis:{P:'ការធ្វើផែនការ',A:'ការយកចិត្តទុកដាក់',S:'ដំណើរការព័ត៌មានព្រមគ្នា',Q:'ដំណើរការព័ត៌មានតាមលំដាប់'},lead:'ដឹកនាំ',steady:'មានស្ថិរភាព',support:'ត្រូវការគាំទ្រ',growth:'កំពុងអភិវឌ្ឍ',profile:'ទម្រង់',allH:'ទម្រង់សមត្ថភាពខ្ពស់មានតុល្យភាពគ្រប់វិស័យ',allM:'អ្នកស្វែងរកយុទ្ធសាស្ត្រមានតុល្យភាពគ្រប់វិស័យ',allL:'ទម្រង់កំណើនមានតុល្យភាពគ្រប់វិស័យ'},
    mn:{axis:{P:'Төлөвлөлт',A:'Анхаарал',S:'Зэрэгцээ боловсруулалт',Q:'Дараалсан боловсруулалт'},lead:'давамгай',steady:'тогтвортой',support:'дэмжлэг шаардлагатай',growth:'хөгжиж буй',profile:'хэв шинж',allH:'Бүх чиглэлд өндөр чадамжтай тэнцвэрт олон талт хэв шинж',allM:'Бүх чиглэлд тэнцвэртэй стратеги эрэлхийлэгч',allL:'Бүх чиглэлд тэнцвэртэй хөгжлийн хэв шинж'}
  };

  function normalizeNameLang(lang) {
    const raw = String(lang || '').trim().replace(/_/g, '-');
    const lower = raw.toLowerCase();
    if (lower === 'zh-tw' || lower.startsWith('zh-hant')) return 'zh-TW';
    const primary = lower.split('-')[0];
    if (NAME_LANGS.indexOf(primary) >= 0) return primary;
    return 'ko';
  }

  function axisKey(levels, target) {
    return ORDER.filter(function (axis) { return levels[axis] === target; }).join('');
  }

  function joinAxisLabels(key, nameData, lang) {
    const labels = key.split('').map(function (axis) { return nameData.axis[axis]; });
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

  function getUniqueName(levels, lang) {
    const locale = normalizeNameLang(lang);
    return locale === 'ko' ? buildKorean(levels) : buildLocalized(levels, locale);
  }

  const EXTENDED_CONTENT_LANGS = ['fr', 'mn', 'zh-TW'];
  const EXTENDED_LEVELS = {
    fr: { H: 'Élevé', M: 'Moyen', L: 'Faible' },
    mn: { H: 'Өндөр', M: 'Дунд', L: 'Бага' },
    'zh-TW': { H: '高', M: '中', L: '低' }
  };
  const runtimeContentCache = {};

  function translateTree(value, translations) {
    if (typeof value === 'string') return translations.get(value) || value;
    if (Array.isArray(value)) return value.map(function (item) { return translateTree(item, translations); });
    if (!value || typeof value !== 'object') return value;
    const output = {};
    Object.keys(value).forEach(function (key) { output[key] = translateTree(value[key], translations); });
    return output;
  }

  function getRuntimeContent(locale) {
    if (runtimeContentCache[locale]) return runtimeContentCache[locale];
    const bundle = global.__FG_REPORT_I18N__;
    const entries = bundle && bundle.locales && bundle.locales[locale];
    if (!Array.isArray(entries)) return null;
    const translations = new Map();
    entries.forEach(function (entry) {
      if (entry && typeof entry.source === 'string' && typeof entry.target === 'string' && entry.target.trim()) {
        translations.set(entry.source, entry.target);
      }
    });
    const content = translateTree(bank.I18N.ko, translations);
    content.level = Object.assign({}, EXTENDED_LEVELS[locale]);
    runtimeContentCache[locale] = content;
    return content;
  }

  function fill(text, vars) {
    return String(text || '').replace(/\{(\w+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : '';
    });
  }

  function joinAxes(keys, content, locale) {
    const labels = keys.map(function (key) { return content.axis[key]; });
    if (locale === 'zh-TW') return labels.join('、');
    return labels.join(', ');
  }

  function applyRuntimeContent(profile, locale) {
    const content = getRuntimeContent(locale);
    if (!content) return profile;
    profile.summary = content.summaries[profile.kind];
    profile.fragments = ORDER.map(function (axis) {
      return {
        axis: axis,
        level: profile.levels[axis],
        axisLabel: content.axis[axis],
        levelLabel: content.level[profile.levels[axis]],
        text: content.fragments[axis][profile.levels[axis]]
      };
    });
    const lowAxes = ORDER.filter(function (axis) { return profile.levels[axis] === 'L'; });
    const highAxes = ORDER.filter(function (axis) { return profile.levels[axis] === 'H'; });
    if (content.rec[profile.kind]) {
      profile.recommendations = Object.assign({}, content.rec[profile.kind]);
    } else {
      profile.recommendations = {
        learning: lowAxes.length
          ? fill(content.rec.supportLow, { axes: joinAxes(lowAxes, content, locale) })
          : fill(content.rec.useHigh, { axes: joinAxes(highAxes, content, locale) }),
        career: content.rec.career,
        job: content.rec.job
      };
    }
    profile.labels = Object.assign({}, content.labels);
    return profile;
  }

  const baseNormalizeLang = bank.normalizeLang.bind(bank);
  const baseSetLang = bank.setLang.bind(bank);
  const baseClassify = bank.classify.bind(bank);
  let activeNameLang = normalizeNameLang(bank.getLang());

  bank.normalizeLang = normalizeNameLang;
  bank.setLang = function (lang) {
    activeNameLang = normalizeNameLang(lang);
    baseSetLang(activeNameLang === 'zh-TW' ? 'zh' : activeNameLang);
    return activeNameLang;
  };
  bank.getLang = function () { return activeNameLang; };
  bank.classify = function (scores, lang, thresholds) {
    const nameLang = normalizeNameLang(lang || activeNameLang);
    const contentLang = nameLang === 'zh-TW' ? 'zh' : baseNormalizeLang(nameLang);
    const profile = baseClassify(scores, contentLang, thresholds);
    if (EXTENDED_CONTENT_LANGS.indexOf(nameLang) >= 0) applyRuntimeContent(profile, nameLang);
    profile.lang = nameLang;
    profile.dir = nameLang === 'ar' ? 'rtl' : 'ltr';
    profile.title = getUniqueName(profile.levels, nameLang);
    profile.nameSchema = 'dcas81-unique-v1';
    return profile;
  };

  bank.NAME_LANGS = NAME_LANGS.slice();
  bank.LANGS = NAME_LANGS.slice();
  bank.getUniqueName = getUniqueName;
  bank.__uniqueNamesV1 = true;
})(typeof window !== 'undefined' ? window : globalThis);
