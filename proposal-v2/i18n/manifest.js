// FeelGood proposal language registry.
// To add a language: add one entry here and create the matching <code>.js file.
(function loadProposalLanguages(document) {
  var config = {
  "assetVersion": "20260922-1",
  "languages": [
    {
      "code": "ko",
      "label": "🇰🇷 한국어",
      "dir": "ltr",
      "reportCode": "ko",
      "dashboardCode": "ko"
    },
    {
      "code": "en",
      "label": "🇺🇸 English",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "en"
    },
    {
      "code": "zh",
      "label": "🇨🇳 中文",
      "dir": "ltr",
      "reportCode": "zh",
      "dashboardCode": "zh-CN"
    },
    {
      "code": "mn",
      "label": "🇲🇳 Монгол",
      "dir": "ltr",
      "reportCode": "mn",
      "dashboardCode": "mn"
    },
    {
      "code": "th",
      "label": "🇹🇭 ไทย",
      "dir": "ltr",
      "reportCode": "th",
      "dashboardCode": "th"
    },
    {
      "code": "vi",
      "label": "🇻🇳 Tiếng Việt",
      "dir": "ltr",
      "reportCode": "vi",
      "dashboardCode": "vi"
    },
    {
      "code": "ja",
      "label": "🇯🇵 日本語",
      "dir": "ltr",
      "reportCode": "ja",
      "dashboardCode": "ja"
    },
    {
      "code": "ar",
      "label": "🇸🇦 العربية",
      "dir": "rtl",
      "reportCode": "ar",
      "dashboardCode": "ar"
    },
    {
      "code": "ru",
      "label": "🇷🇺 Русский",
      "dir": "ltr",
      "reportCode": "ru",
      "dashboardCode": "ru"
    },
    {
      "code": "km",
      "label": "🇰🇭 ភាសាខ្មែរ",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "km"
    },
    {
      "code": "zh-TW",
      "label": "🇹🇼 繁體中文",
      "dir": "ltr",
      "reportCode": "zh",
      "dashboardCode": "zh-TW",
      "status": "ai-draft"
    },
    {
      "code": "es",
      "label": "🇪🇸 Español",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "es",
      "status": "ai-draft"
    },
    {
      "code": "fr",
      "label": "🇫🇷 Français",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "fr",
      "status": "ai-draft"
    },
    {
      "code": "it",
      "label": "🇮🇹 Italiano",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "it",
      "status": "ai-draft"
    },
    {
      "code": "az",
      "label": "🇦🇿 Azərbaycan",
      "dir": "ltr",
      "reportCode": "en",
      "dashboardCode": "az",
      "status": "ai-draft"
    }
  ]
};
  window.PROPOSAL_I18N_CONFIG = config;
  window.LANG = window.LANG || {};
  var source = document.currentScript && document.currentScript.src;
  var base = source ? source.slice(0, source.lastIndexOf('/') + 1) : 'proposal-v2/i18n/';
  config.languages.forEach(function (language) {
    var src = base + language.code + '.js?v=' + encodeURIComponent(config.assetVersion);
    document.write('<script src="' + src + '"><\/script>');
  });
})(document);
