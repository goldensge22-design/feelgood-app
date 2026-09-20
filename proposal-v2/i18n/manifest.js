// FeelGood proposal language registry.
// To add a language: add one entry here and create the matching <code>.js file.
(function loadProposalLanguages(document) {
  var config = {
  "assetVersion": "20260920-1",
  "languages": [
    {
      "code": "ko",
      "label": "🇰🇷 한국어",
      "dir": "ltr",
      "reportCode": "ko"
    },
    {
      "code": "en",
      "label": "🇺🇸 English",
      "dir": "ltr",
      "reportCode": "en"
    },
    {
      "code": "zh",
      "label": "🇨🇳 中文",
      "dir": "ltr",
      "reportCode": "zh"
    },
    {
      "code": "mn",
      "label": "🇲🇳 Монгол",
      "dir": "ltr",
      "reportCode": "mn"
    },
    {
      "code": "th",
      "label": "🇹🇭 ไทย",
      "dir": "ltr",
      "reportCode": "th"
    },
    {
      "code": "vi",
      "label": "🇻🇳 Tiếng Việt",
      "dir": "ltr",
      "reportCode": "vi"
    },
    {
      "code": "ja",
      "label": "🇯🇵 日本語",
      "dir": "ltr",
      "reportCode": "ja"
    },
    {
      "code": "ar",
      "label": "🇸🇦 العربية",
      "dir": "rtl",
      "reportCode": "ar"
    },
    {
      "code": "ru",
      "label": "🇷🇺 Русский",
      "dir": "ltr",
      "reportCode": "ru"
    },
    {
      "code": "km",
      "label": "🇰🇭 ភាសាខ្មែរ",
      "dir": "ltr",
      "reportCode": "en"
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
