(function (global) {
  'use strict';
  const bundle = global.__FG_REPORT_I18N__;
  if (!bundle || !bundle.locales) return;
  const localeNames = bundle.localeNames || {};
  const preferredOrder = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
  const available = new Set(['ko', ...Object.keys(bundle.locales)]);
  const supported = preferredOrder.filter((locale) => available.has(locale))
    .concat([...available].filter((locale) => !preferredOrder.includes(locale)));
  const languageLabels = {ko:'언어',en:'Language',ja:'言語',zh:'语言','zh-TW':'語言',es:'Idioma',fr:'Langue',ru:'Язык',vi:'Ngôn ngữ',th:'ภาษา',ar:'اللغة',it:'Lingua',az:'Dil',km:'ភាសា',mn:'Хэл'};
  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  const translatedNodes = new Set();
  const translatedAttrs = new Set();
  const ignoredTags = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
  const translatedAttributes = ['aria-label','alt','title','placeholder'];
  const runtimeStyle = document.createElement('style');
  runtimeStyle.textContent = '.lang-menu{max-height:min(70vh,520px);overflow:auto}.fg-report-language-select{min-height:36px;padding:7px 34px 7px 11px;border:1px solid rgba(255,255,255,.4);border-radius:10px;background:#fff;color:#17345c;font:700 12px/1.3 "Noto Sans",sans-serif}.fg-report-rtl{font-family:"Noto Sans Arabic","Noto Sans",sans-serif}.fg-report-rtl .page,.fg-report-rtl section{text-align:right}@media print{.fg-report-language-select{display:none!important}}';
  document.head.appendChild(runtimeStyle);
  let activeLocale = normalizeLocale(global.__REPORT_LOCALE__ || new URL(global.location.href).searchParams.get('lang') || 'ko');
  let translating = false;
  let observer;
  let compiled = compile(activeLocale);

  function normalizeLocale(value) {
    const requested = String(value || 'ko').trim().replace('_', '-');
    const exact = supported.find((code) => code.toLowerCase() === requested.toLowerCase());
    if (exact) return exact;
    if (requested.toLowerCase() === 'zh-cn' && supported.includes('zh')) return 'zh';
    const base = requested.toLowerCase().split('-')[0];
    return supported.includes(base) ? base : 'ko';
  }
  function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function compile(locale) {
    const entries = (bundle.locales[locale] || []).filter((entry) => entry.source && entry.target !== undefined && entry.source !== entry.target);
    const plain = [], templates = [], exact = new Map();
    for (const entry of entries) {
      const dynamicPlaceholders = (entry.placeholders || []).filter((placeholder) => placeholder.startsWith('{'));
      if (!dynamicPlaceholders.length) { plain.push(entry); exact.set(entry.source, entry.target); continue; }
      let pattern = escapeRegex(entry.source);
      const captures = [];
      for (const placeholder of dynamicPlaceholders) {
        const token = escapeRegex(placeholder);
        if (!pattern.includes(token)) continue;
        pattern = pattern.replace(token, '([\\s\\S]*?)');
        captures.push(placeholder);
      }
      if (captures.length) templates.push({ ...entry, regex:new RegExp(pattern, 'g'), captures });
    }
    plain.sort((a,b) => b.source.length - a.source.length);
    templates.sort((a,b) => b.source.length - a.source.length);
    return { plain, templates, exact };
  }
  function translateValue(value) {
    if (activeLocale === 'ko' || !/[가-힣]/.test(value)) return value;
    const leading = value.match(/^\s*/)[0], trailing = value.match(/\s*$/)[0];
    const trimmed = value.slice(leading.length, value.length - trailing.length);
    if (compiled.exact.has(trimmed)) return leading + compiled.exact.get(trimmed) + trailing;
    let output = value;
    for (const entry of compiled.templates) {
      output = output.replace(entry.regex, function () {
        const args = arguments;
        let target = entry.target;
        entry.captures.forEach((placeholder, index) => { target = target.replaceAll(placeholder, args[index + 1]); });
        return target;
      });
    }
    for (const entry of compiled.plain) if (output.includes(entry.source)) output = output.split(entry.source).join(entry.target);
    return output;
  }
  function rememberAttributes(element) {
    if (!attrOriginals.has(element)) attrOriginals.set(element, {});
    const originals = attrOriginals.get(element);
    for (const name of translatedAttributes) {
      if (!element.hasAttribute(name)) continue;
      if (!(name in originals)) originals[name] = element.getAttribute(name);
      const translated = translateValue(originals[name]);
      if (element.getAttribute(name) !== translated) element.setAttribute(name, translated);
      translatedAttrs.add(element);
    }
  }
  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.parentElement || ignoredTags.has(node.parentElement.tagName)) return;
      const localizedRoot = node.parentElement.closest('[lang]');
      if (activeLocale !== 'ko' && localizedRoot && localizedRoot !== document.documentElement && localizedRoot.lang === activeLocale) return;
      if (!textOriginals.has(node) || (/[가-힣]/.test(node.nodeValue) && !translating)) textOriginals.set(node, node.nodeValue);
      const translated = translateValue(textOriginals.get(node));
      if (node.nodeValue !== translated) node.nodeValue = translated;
      translatedNodes.add(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || ignoredTags.has(node.tagName)) return;
    rememberAttributes(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let current;
    while ((current = walker.nextNode())) current.nodeType === Node.ELEMENT_NODE ? rememberAttributes(current) : translateNode(current);
  }
  function restoreOriginals() {
    translating = true;
    for (const node of translatedNodes) if (node.isConnected && textOriginals.has(node)) node.nodeValue = textOriginals.get(node);
    for (const element of translatedAttrs) {
      if (!element.isConnected) continue;
      const originals = attrOriginals.get(element) || {};
      Object.keys(originals).forEach((name) => element.setAttribute(name, originals[name]));
    }
    translating = false;
  }
  function updateDirection() {
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = activeLocale === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('fg-report-rtl', activeLocale === 'ar');
  }
  function updateMenu() {
    const menu = document.getElementById('langMenu');
    const label = document.getElementById('langBtnLabel') || document.getElementById('langLabel');
    if (label) label.textContent = localeNames[activeLocale] || activeLocale.toUpperCase();
    if (menu) {
      menu.innerHTML = '';
      for (const locale of supported) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = locale === activeLocale ? 'lang-item on active' : 'lang-item';
        button.dataset.code = locale;
        button.textContent = localeNames[locale] || locale.toUpperCase();
        button.addEventListener('click', () => setLocale(locale));
        menu.appendChild(button);
      }
      return;
    }
    if (document.getElementById('fg-report-language-select')) return;
    const select = document.createElement('select');
    select.id = 'fg-report-language-select';
    select.className = 'fg-report-language-select';
    select.setAttribute('aria-label', languageLabels[activeLocale] || languageLabels.en);
    supported.forEach((locale) => select.add(new Option(localeNames[locale] || locale.toUpperCase(), locale)));
    select.value = activeLocale;
    select.addEventListener('change', () => setLocale(select.value));
    const host = document.querySelector('.top-actions') || document.querySelector('header.top') || document.body;
    host.prepend(select);
  }
  function updateUrl() {
    const url = new URL(global.location.href);
    url.searchParams.set('lang', activeLocale);
    global.history.replaceState(global.history.state, '', url.pathname + url.search + url.hash);
  }
  function apply() {
    if (observer) observer.disconnect();
    translating = true;
    updateDirection();
    if (bundle.reportId === 'dcas-teen' && global.DCasTeenEngine) global.DCasTeenEngine.setProfile81Language(activeLocale, global.__TEST_PROFILE__);
    if (bundle.reportId === 'dcas-adult' && global.DCasAdultEngine) global.DCasAdultEngine.setProfile81Language(activeLocale);
    translateNode(document.body);
    updateMenu();
    const select = document.getElementById('fg-report-language-select');
    if (select) select.setAttribute('aria-label', languageLabels[activeLocale] || languageLabels.en);
    translating = false;
    if (observer) observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});
    document.dispatchEvent(new CustomEvent('fg-report-locale-changed', {detail:{locale:activeLocale,reportId:bundle.reportId}}));
  }
  function setLocale(locale) {
    const next = normalizeLocale(locale);
    if (next === activeLocale) return;
    restoreOriginals();
    activeLocale = next;
    compiled = compile(activeLocale);
    global.__REPORT_LOCALE__ = activeLocale;
    global.__REPORT_LOCALE_ACTIVE__ = activeLocale;
    updateUrl();
    apply();
  }
  observer = new MutationObserver((mutations) => {
    if (translating) return;
    observer.disconnect();
    translating = true;
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateNode(mutation.target);
      else if (mutation.type === 'attributes') rememberAttributes(mutation.target);
      else mutation.addedNodes.forEach(translateNode);
    }
    translating = false;
    observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});
  });
  global.FeelGoodReportI18n = Object.freeze({ setLocale, getLocale:() => activeLocale, supportedLocales:[...supported] });
  global.__REPORT_LOCALE__ = activeLocale;
  global.__REPORT_LOCALE_ACTIVE__ = activeLocale;
  apply();
})(window);
