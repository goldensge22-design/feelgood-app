/**
 * dcas-job-i18n-bank.js — 학과·직무 "라벨"의 다국어 사전
 *
 * ===== 왜 이 파일이 필요한가 =====
 * 기존 JOB_POOL_EXTRA(dcas-jobs-extra.js)는 label_ko 한 개 필드만 있고,
 * adult 리포트 전체(dcas-adult-content-engine.js 약 10곳)가 이 값을 문자열
 * 그대로 화면에 박아 넣는다. 즉 지금 구조로는 "직무명"이 언어와 무관하게
 * 항상 한국어로만 나온다 — 11개 언어(한국어 포함 12개: ko/en/ja/zh/es/ru/
 * vi/th/ar/it/az) 대응이 안 되어 있었다.
 *
 * ===== 설계 =====
 * teen 쪽 dcas-i18n-bank.js와 동일한 철학: "로직 1벌 + 언어별 텍스트만 쌓기".
 * 직무 데이터(dcas-jobs-extra.v2.patch.js)는 label_ko와 i18n_key만 갖고,
 * 실제 각 언어 문자열은 전부 이 파일의 JOB_LABEL_I18N에 있다.
 *
 * ===== 언어 추가/직무 추가 시 할 일 (이게 이번 요청의 핵심) =====
 *   1) 새 직무를 추가할 때: JOB_LABEL_I18N에 그 직무의 i18n_key로 블록 하나
 *      추가하고, LANGS 배열에 있는 언어 수만큼 번역을 채운다.
 *   2) 새 언어를 추가할 때: 아래 LANGS 배열에 언어 코드 한 줄 추가 + 기존
 *      모든 블록에 그 언어 키만 채워 넣으면 끝. get()의 폴백 로직은 안 건드려도 됨.
 *   3) 번역이 아직 없는 언어는 자동으로 ko로 폴백되므로, 화면이 깨지지 않는다
 *      (조용히 로그만 남기고 싶으면 get()의 console.warn 주석 해제).
 */
(function (global) {
  'use strict';

  // 지원 언어 목록 (11개 번역 언어 + 한국어 원문 = 총 12개).
  // 언어를 늘리거나 줄일 때는 이 배열 하나만 고치면 된다.
  var LANGS = ['ko', 'en', 'ja', 'zh', 'es', 'ru', 'vi', 'th', 'ar', 'it', 'az'];

  var JOB_LABEL_I18N = {

    // ===== 항공보안학과 (deptKey) =====
    '항공보안학과': {
      ko: '항공보안학과', en: 'Aviation Security', ja: '航空保安学科', zh: '航空安保学科',
      es: 'Seguridad de Aviación', ru: 'Авиационная безопасность', vi: 'Ngành An ninh Hàng không',
      th: 'สาขาการรักษาความปลอดภัยการบิน', ar: 'قسم أمن الطيران', it: 'Sicurezza dell\'Aviazione', az: 'Aviasiya Təhlükəsizliyi',
    },

    '항공보안학과.airport-sec-admin': { // 공항보안 사무직
      ko: '공항보안 사무직', en: 'Airport Security Administrative Staff', ja: '空港保安事務職', zh: '机场安保行政职位',
      es: 'Personal Administrativo de Seguridad Aeroportuaria', ru: 'Административный сотрудник службы безопасности аэропорта',
      vi: 'Nhân viên hành chính an ninh sân bay', th: 'เจ้าหน้าที่ธุรการฝ่ายรักษาความปลอดภัยสนามบิน',
      ar: 'موظف إداري لأمن المطار', it: 'Personale Amministrativo della Sicurezza Aeroportuale', az: 'Hava limanı təhlükəsizliyi inzibati işçisi',
    },
    '항공보안학과.airline-sec-admin': { // 항공사보안 사무직
      ko: '항공사보안 사무직', en: 'Airline Security Administrative Staff', ja: '航空会社保安事務職', zh: '航空公司安保行政职位',
      es: 'Personal Administrativo de Seguridad de Aerolínea', ru: 'Административный сотрудник службы безопасности авиакомпании',
      vi: 'Nhân viên hành chính an ninh hãng hàng không', th: 'เจ้าหน้าที่ธุรการฝ่ายรักษาความปลอดภัยสายการบิน',
      ar: 'موظف إداري لأمن شركة الطيران', it: 'Personale Amministrativo della Sicurezza della Compagnia Aerea', az: 'Aviaşirkət təhlükəsizliyi inzibati işçisi',
    },
    '항공보안학과.avsec-screener': { // 항공보안검색요원
      ko: '항공보안검색요원', en: 'Aviation Security Screener', ja: '航空保安検索要員', zh: '航空安保安检员',
      es: 'Agente de Inspección de Seguridad Aérea', ru: 'Сотрудник авиационного досмотра',
      vi: 'Nhân viên soi chiếu an ninh hàng không', th: 'เจ้าหน้าที่ตรวจค้นความปลอดภัยการบิน',
      ar: 'مفتش أمن الطيران', it: 'Addetto ai Controlli di Sicurezza Aeroportuale', az: 'Aviasiya təhlükəsizliyi yoxlama əməkdaşı',
    },
    '항공보안학과.airport-guard': { // 항공경비요원
      ko: '항공경비요원', en: 'Airport Security Guard', ja: '空港警備要員', zh: '机场警卫人员',
      es: 'Guardia de Seguridad Aeroportuaria', ru: 'Охранник аэропорта',
      vi: 'Nhân viên bảo vệ sân bay', th: 'เจ้าหน้าที่รักษาความปลอดภัยสนามบิน',
      ar: 'حارس أمن المطار', it: 'Guardia di Sicurezza Aeroportuale', az: 'Hava limanı mühafizəçisi',
    },
    '항공보안학과.counter-terror': { // 대테러보안요원
      ko: '대테러보안요원', en: 'Counter-Terrorism Security Officer', ja: '対テロ保安要員', zh: '反恐安保人员',
      es: 'Oficial de Seguridad Antiterrorista', ru: 'Сотрудник по борьбе с терроризмом',
      vi: 'Nhân viên an ninh chống khủng bố', th: 'เจ้าหน้าที่รักษาความปลอดภัยต่อต้านการก่อการร้าย',
      ar: 'ضابط أمن مكافحة الإرهاب', it: 'Agente di Sicurezza Antiterrorismo', az: 'Terrorla mübarizə təhlükəsizlik əməkdaşı',
    },
    '항공보안학과.airline-sec-officer': { // 항공사보안요원
      ko: '항공사보안요원', en: 'Airline Security Officer', ja: '航空会社保安要員', zh: '航空公司安保人员',
      es: 'Oficial de Seguridad de Aerolínea', ru: 'Сотрудник службы безопасности авиакомпании',
      vi: 'Nhân viên an ninh hãng hàng không', th: 'เจ้าหน้าที่รักษาความปลอดภัยสายการบิน',
      ar: 'ضابط أمن شركة الطيران', it: 'Agente di Sicurezza della Compagnia Aerea', az: 'Aviaşirkət təhlükəsizlik əməkdaşı',
    },
    '항공보안학과.cargo-sec-officer': { // 항공화물보안요원
      ko: '항공화물보안요원', en: 'Air Cargo Security Officer', ja: '航空貨物保安要員', zh: '航空货运安保人员',
      es: 'Oficial de Seguridad de Carga Aérea', ru: 'Сотрудник безопасности авиационных грузов',
      vi: 'Nhân viên an ninh hàng hóa hàng không', th: 'เจ้าหน้าที่รักษาความปลอดภัยสินค้าทางอากาศ',
      ar: 'ضابط أمن الشحن الجوي', it: 'Agente di Sicurezza del Cargo Aereo', az: 'Hava yükü təhlükəsizlik əməkdaşı',
    },
    '항공보안학과.industrial-sec-admin': { // 산업보안 사무직
      ko: '산업보안 사무직', en: 'Industrial Security Administrative Staff', ja: '産業保安事務職', zh: '产业安保行政职位',
      es: 'Personal Administrativo de Seguridad Industrial', ru: 'Административный сотрудник промышленной безопасности',
      vi: 'Nhân viên hành chính an ninh công nghiệp', th: 'เจ้าหน้าที่ธุรการฝ่ายรักษาความปลอดภัยอุตสาหกรรม',
      ar: 'موظف إداري للأمن الصناعي', it: 'Personale Amministrativo della Sicurezza Industriale', az: 'Sənaye təhlükəsizliyi inzibati işçisi',
    },
    '항공보안학과.industrial-sec-guard': { // 산업보안 경비요원
      ko: '산업보안 경비요원', en: 'Industrial Security Guard', ja: '産業保安警備要員', zh: '产业安保警卫人员',
      es: 'Guardia de Seguridad Industrial', ru: 'Охранник промышленной безопасности',
      vi: 'Nhân viên bảo vệ an ninh công nghiệp', th: 'เจ้าหน้าที่รักษาความปลอดภัยอุตสาหกรรม',
      ar: 'حارس الأمن الصناعي', it: 'Guardia di Sicurezza Industriale', az: 'Sənaye təhlükəsizlik mühafizəçisi',
    },
    '항공보안학과.industrial-sec-screener': { // 산업보안검색요원
      ko: '산업보안검색요원', en: 'Industrial Security Screener', ja: '産業保安検索要員', zh: '产业安保安检员',
      es: 'Agente de Inspección de Seguridad Industrial', ru: 'Сотрудник промышленного досмотра',
      vi: 'Nhân viên soi chiếu an ninh công nghiệp', th: 'เจ้าหน้าที่ตรวจค้นความปลอดภัยอุตสาหกรรม',
      ar: 'مفتش الأمن الصناعي', it: 'Addetto ai Controlli di Sicurezza Industriale', az: 'Sənaye təhlükəsizliyi yoxlama əməkdaşı',
    },

    /* ===== 다음 학과를 추가할 때 여기 아래에 같은 패턴으로 블록만 이어붙이면 됩니다 =====
     * '경영학과.xxx': { ko:'...', en:'...', ... },
     */
  };

  function get(i18nKey, lang) {
    var entry = JOB_LABEL_I18N[i18nKey];
    if (!entry) return null; // 아직 사전에 없는 키 — 호출부에서 label_ko로 폴백
    if (entry[lang]) return entry[lang];
    // console.warn('[DCasJobI18n] missing translation', i18nKey, lang, '→ ko로 폴백');
    return entry.ko || null;
  }

  global.DCasJobI18n = {
    LANGS: LANGS,
    JOB_LABEL_I18N: JOB_LABEL_I18N,
    get: get,
  };

})(typeof window !== 'undefined' ? window : globalThis);
