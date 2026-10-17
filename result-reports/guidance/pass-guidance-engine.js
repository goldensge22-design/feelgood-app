/* Score-informed practice suggestions; not a diagnosis or treatment prescription. */
(function (global) {
  'use strict';
  const AXES = ['P', 'A', 'S', 'Q'];
  const POLICIES = Object.freeze({
    'kpass-child': Object.freeze({low:85, high:120, balance:15, max:160}),
    'dcas-teen': Object.freeze({low:52, high:75, balance:20, max:100}),
    'dcas-adult': Object.freeze({low:52, high:75, balance:20, max:100})
  });
  function analyze(kind, profile) {
    const policy = POLICIES[kind];
    if (!policy) throw new RangeError('Unsupported report kind');
    const scores = {}, levels = {};
    for (const axis of AXES) {
      const value = profile && profile.scores && profile.scores[axis];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > policy.max) throw new RangeError('Invalid score: ' + axis);
      scores[axis] = value;
      levels[axis] = value <= policy.low ? 'L' : value >= policy.high ? 'H' : 'M';
    }
    const max = Math.max(...Object.values(scores)), min = Math.min(...Object.values(scores));
    const top = AXES.filter(axis => scores[axis] === max), low = AXES.filter(axis => levels[axis] === 'L');
    const code = AXES.map(axis => levels[axis]).join(''), spread = max - min, balanced = spread < policy.balance;
    const age = profile && profile.ageYears;
    const ageBand = kind === 'dcas-adult' ? 'adult' : kind === 'dcas-teen'
      ? (typeof age !== 'number' ? 'teenUnknown' : age >= 16 ? 'teenSenior' : 'teenJunior')
      : (typeof age !== 'number' ? 'childUnknown' : age <= 7 ? 'childEarly' : age <= 9 ? 'childJunior' : 'childSenior');
    // Keep every exact tie. Small differences do not prescribe a preferred method.
    const starters = balanced ? AXES.slice() : top;
    return {
      kind, scores, levels, code, spread, balanced, top, low, starters,
      order:[...starters, ...AXES.filter(axis => !starters.includes(axis))], ageBand,
      sameBand:new Set(Object.values(levels)).size === 1,
      summaryKey:code === 'LLLL' ? 'summary.allL' : code === 'MMMM' ? 'summary.allM' : code === 'HHHH' ? 'summary.allH' : 'summary.mixed',
      reasonKey:spread === 0 ? 'reason.tie' : balanced ? 'reason.close' : 'reason.relative',
      support:Object.fromEntries(AXES.map(axis => [axis, levels[axis] === 'L' ? 'guided' : levels[axis] === 'M' ? 'compare' : 'extend'])),
      interest:typeof profile.interestLabel === 'string' ? profile.interestLabel.trim().slice(0, 120) : ''
    };
  }
  function localeCode(locale) {
    const raw = String(locale || 'ko').replace(/_/g, '-').toLowerCase();
    if (raw === 'zh-tw' || raw.startsWith('zh-hant')) return 'zh-TW';
    return raw.split('-')[0];
  }
  function translator(kind, locale) {
    const pack = global.FeelGoodGuidanceResources && global.FeelGoodGuidanceResources[kind];
    if (!pack) throw new Error('Guidance resources not loaded: ' + kind);
    const code = localeCode(locale);
    return function t(key, values) {
      let value = pack.locales[code] && pack.locales[code][key];
      if (!value) {
        if (code !== 'ko') console.warn('[guidance:i18n-missing]', kind, code, key);
        value = pack.locales.ko[key];
      }
      if (!value) throw new Error('Missing guidance source: ' + key);
      return value.replace(/\{(\w+)\}/g, (_, name) => {
        if (!values || !Object.hasOwn(values, name)) throw new Error('Missing placeholder: ' + name);
        return String(values[name]);
      });
    };
  }
  function describe(kind, profile, locale) {
    const model = analyze(kind, profile), t = translator(kind, locale);
    const intlLocale = localeCode(locale) === 'zh' ? 'zh-CN' : localeCode(locale);
    const number = value => new Intl.NumberFormat(intlLocale, {maximumFractionDigits:2}).format(value);
    // Some Chrome builds do not implement ListFormat for Khmer. Never let an
    // unsupported locale silently inherit the computer's Korean conjunction.
    const listFormatter = Intl.ListFormat.supportedLocalesOf([intlLocale]).length
      ? new Intl.ListFormat(intlLocale, {style:'long', type:'conjunction'}) : null;
    const labels = axes => {
      const names=axes.map(axis => t('axis.' + axis));
      return listFormatter ? listFormatter.format(names) : names.join(' · ');
    };
    // Join complete localized paragraphs, never fragments of a sentence.
    const scoreLine=t('scores.line', Object.fromEntries(AXES.map(axis => [axis,number(model.scores[axis])])));
    const learning=t('learning.plan', {axes:labels(model.starters)});
    const firstMethods=model.starters.map(axis=>t('method.'+axis));
    return { model, t, summary:[t(model.summaryKey),scoreLine].join('\n\n'),
      reason:t(model.reasonKey, {axes:labels(model.top), spread:number(model.spread)}),
      activity:t('activity.' + model.ageBand),
      cards:model.order.map(axis => ({axis, score:model.scores[axis], level:model.levels[axis], support:model.support[axis],
        title:t('axis.score', {axis:t('axis.' + axis), score:number(model.scores[axis]), level:t('level.' + model.levels[axis])}),
        method:t('method.' + axis), supportText:t('support.' + model.support[axis]), check:t('check.' + axis)})),
      learning:[learning,...firstMethods].join('\n\n'),
      career:[t('career.explore'),scoreLine,learning].join('\n\n'),
      job:[t('job.explore'),scoreLine,learning].join('\n\n'),
      title:model.sameBand ? t('name.all' + model.code[0]) : null,
      interest:model.interest ? t('interest.provided', {interest:model.interest}) : t('interest.choose'),
      scoreLine:scoreLine,
      adjust:[scoreLine,t(model.low.length?'support.guided':model.code==='HHHH'?'support.extend':'support.compare'),t('adjust.next')].join('\n\n'),
      limitation:t('limits.practice')
    };
  }
  global.FeelGoodPassGuidance = Object.freeze({analyze, describe, translator, localeCode, POLICIES});
})(typeof window !== 'undefined' ? window : globalThis);
