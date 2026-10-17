/* Explicit final render stage. No polling, score mutation, storage reset or hidden overlay. */
(function (global) {
  'use strict';
  const last = new Map();
  function element(tag, text, className) {
    const node=document.createElement(tag);
    if(text!==undefined) node.textContent=text;
    if(className) node.className=className;
    return node;
  }
  function owned(node, locale) {
    node.dataset.fgGuidance='true';
    node.lang=locale;
    node.dir=locale==='ar'?'rtl':'ltr';
    return node;
  }
  function write(id, text, locale) {
    const node=document.getElementById(id);
    if(node) { owned(node,locale); node.textContent=text; }
  }
  function writeBoth(id, text, locale) { write(id,text,locale);write(id+'-en',text,locale); }
  function replaceParagraph(id, text, locale) {
    const old=document.getElementById(id);
    const parent=(old&&old.closest('p'))||document.querySelector('[data-guidance-paragraph="'+id+'"]');
    if(parent) { parent.dataset.guidanceParagraph=id; owned(parent,locale);parent.textContent=text;parent.id=id; }
  }
  function renderCard(card, advice) {
    const node=element('article',undefined,'fg-guidance-axis');
    node.dataset.axis=card.axis;node.dataset.support=card.support;
    node.append(element('h4',card.title),element('p',card.method),element('p',card.supportText));
    node.append(element('h5',advice.t('observe.label')),element('p',card.check));
    return node;
  }
  function panel(kind, advice, locale) {
    const host=document.getElementById(kind==='dcas-adult'?'efficiency':'learning');
    if(!host) return;
    let box=document.getElementById('fg-pass-guidance');
    if(!box) { box=element('section',undefined,'fg-pass-guidance');box.id='fg-pass-guidance';host.appendChild(box); }
    owned(box,locale);box.dataset.profileCode=advice.model.code;
    const heading=element('h3',advice.t('heading'));heading.id='fg-guidance-heading';
    box.setAttribute('aria-labelledby',heading.id);
    const cards=element('div',undefined,'fg-guidance-grid');
    advice.cards.forEach(card=>cards.appendChild(renderCard(card,advice)));
    box.replaceChildren(heading,element('p',advice.scoreLine),element('p',advice.reason),element('p',advice.learning),
      element('h4',advice.t('activity.label')),element('p',advice.interest),element('p',advice.activity),cards,
      element('h4',advice.t('adjust.label')),element('p',advice.adjust),element('p',advice.limitation,'fg-guidance-limit'));
  }
  function apply(kind, profile, requestedLocale) {
    last.set(kind,profile);
    const locale=global.FeelGoodPassGuidance.localeCode(requestedLocale || global.FeelGoodReportI18n?.getLocale() || global.__REPORT_LOCALE__ || 'ko');
    const d=global.FeelGoodPassGuidance.describe(kind,profile,locale);
    const t=d.t;
    const values={
      'pf-oneliner':d.reason,'pf-temperament':d.reason,'pf-herooneliner':d.reason,
      'pf-herosub':d.title||t('heading'),'pf-herosub2':d.title||t('heading'),
      'pf-homeai':d.reason,'pf-temp-secdesc':d.summary,
      'pf-strength-intro':d.summary,'pf-shine-desc':d.activity,
      'pf-subject-intro':d.learning,'pf-social-desc':t('parent.encourage'),
      'pf-compass-footnote':t('interpret.separate'),'pf-internalsummary':d.reason,
      'pf-interpret-guide1':d.reason,'pf-interpret-guide2':t('interpret.separate'),
      'pf-learntype-desc1':t('interpret.processing'),'pf-learntype-desc2':d.learning,
      'pf-profile81-text':d.summary,'pf-summarydesc':d.summary,
      'pf-opinionlead':d.summary,'pf-opiniontail':d.limitation,'pf-opinion':d.summary,'pf-opinion-summary':d.summary,
      'pf-workstyle':d.learning,'pf-collabstyle':d.job,'pf-careerdesc':d.career,
      'pf-careers-intro':d.career,'pf-careermodifier':d.interest,
      'pf-growthtitle':t('adjust.label'),'pf-growthdesc':d.adjust,'pf-growthmodifier':d.limitation,
      'pf-growthtip':d.adjust,'pf-method-intro':d.learning,'pf-learning-intro':d.learning,
      'pf-mission-intro':d.activity,'pf-parentguide-example':t('parent.encourage'),
      'pf-parent-summary':t('parent.encourage'),'pf-parent-homehelp':d.adjust,
      'pf-emo-title':t('heading'),
      'pf-eff-title1':t('activity.label'),'pf-eff-title2':t('adjust.label'),
      'pf-eff-sym1':d.reason,'pf-eff-rx1':d.learning,'pf-eff-sym2':d.summary,'pf-eff-rx2':d.adjust,
      'pf-learning-brainsci':d.limitation,'pf-brainsci-para':d.limitation,
      'pf-profile81-learning-note':d.learning,'pf-profile81-career-note':d.career,'pf-profile81-job-note':d.job,
      'pf-growth-step1':d.activity,'pf-growth-step2':d.learning,'pf-growth-step3':d.adjust
    };
    Object.assign(values,{
      'pf-eff-compare-caption':d.reason,'pf-eff-compare-h4':t('evidence.observation'),
      'pf-eff-h2':t('heading'),
      'pf-expert-compare-h4':t('evidence.observation'),
      'pf-cover-teaser':d.job,'pf-cover-hook1':t('activity.label'),'pf-cover-hook2':t('adjust.label'),
      'pf-hook1':t('activity.label'),'pf-hook2':t('adjust.label'),
      'pf-doc1-body':t('evidence.template'),'pf-doc2-body':t('evidence.template'),
      'pf-doc1-tip':t('evidence.verify'),'pf-doc2-tip':t('evidence.verify'),
      'pf-doc-teacher-body':t('evidence.template'),'pf-doc-teuk-body':t('evidence.template'),
      'pf-doc-activity1line-body':t('evidence.template'),'pf-doc-jinro-body':t('evidence.template'),
      'pf-doc-commonapp-ko-body':t('evidence.template'),'pf-doc-commonapp-en-body':t('evidence.template'),
      'pf-docs-step1':t('evidence.template'),'pf-docs-step3':t('evidence.template'),
      'pf-docs-es3label':t('evidence.verify'),'pf-emo-li2':t('parent.encourage'),
      'pf-eff-intro':d.learning,'pf-eff-tip':d.limitation
    });
    const faqQuestion=t(d.model.low.length?'faq.supportQuestion':'faq.exploreQuestion');
    Object.assign(values,{'pf-faq-q1':faqQuestion,'pf-faq1-q':faqQuestion,'pf-faq-a1':d.adjust,'pf-faq1-a':d.adjust});
    Object.entries(values).forEach(([id,text])=>writeBoth(id,text,locale));
    for(const id of ['pf-learning-brainsci','pf-learning-brainsci-en','pf-brainsci-para']) {
      const title=document.getElementById(id)?.previousElementSibling;
      if(title&&/^H[1-6]$/.test(title.tagName)){owned(title,locale);title.textContent=t('evidence.verify');}
    }
    if(kind==='dcas-teen') {
      const opinion=document.querySelector('#opinion .card p');
      if(opinion) {owned(opinion,locale);opinion.textContent=d.summary;}
      for(const suffix of ['', '-en']) {
        const patterns=document.getElementById('pf-eff-cards'+suffix);
        if(patterns) {owned(patterns,locale);patterns.replaceChildren(...d.cards.map(card=>renderCard(card,d)));}
        // These IDs occur inside sentence fragments; replace their complete list items.
        for(const [index,value] of [[1,d.activity],[2,d.learning],[3,d.adjust]]) {
          const id='pf-growth-step'+index+suffix;
          const span=document.getElementById(id);
          const li=span?.closest('li')||document.querySelector('[data-guidance-step="'+id+'"]');
          if(li) {owned(li,locale);li.dataset.guidanceStep=id;li.textContent=value;li.id=id;}
        }
      }
    }
    if(kind!=='kpass-child') {
      for(const id of ['pf-chips','pf-cover-chips','pf-herochips']) for(const suffix of ['', '-en']) {
        const node=document.getElementById(id+suffix);
        if(node) {owned(node,locale);node.replaceChildren(...['P','A','S','Q'].map(axis=>element('span',axis+'-'+d.model.levels[axis],'chip')));}
      }
      // Application/resume templates retain their feature, but require evidence rather than invented strengths.
      for(const id of ['pf-strengthtable','pf-strengthtable-en','pf-strengthtable2','pf-docs-table']) {
        const table=document.getElementById(id);
        if(!table)continue;
        owned(table,locale);
        const header=element('tr');
        for(const key of ['evidence.domain','evidence.method','evidence.observation']) header.append(element('th',t(key)));
        table.replaceChildren(header,...d.cards.map(card=>{const row=element('tr');row.append(element('td',card.title),element('td',card.method),element('td',card.check));return row;}));
      }
      const doccards=document.getElementById('pf-doccards');
      if(doccards) for(const node of doccards.querySelectorAll('p')) {owned(node,locale);node.textContent=t('evidence.template');}
    }
    if(d.title) ['pf-cover-type','pf-cover-typename','pf-herotype','pf-profile81-name'].forEach(id=>writeBoth(id,d.title,locale));
    if(kind==='kpass-child') {
      for(const id of ['pf-talent-roadmap','pf-growth-home','pf-growth-inst']) {
        const node=document.getElementById(id);
        if(node) {owned(node,locale);node.replaceChildren(element('p',d.activity),element('p',d.adjust));}
      }
      for(const id of ['coverTags','heroTags','pf-temp-tags','pf-social-tags']) {
        const node=document.getElementById(id);
        if(node) {owned(node,locale);node.replaceChildren(...['P','A','S','Q'].map(axis=>element('span',axis+'-'+d.model.levels[axis])));}
      }
      const badgeText=[d.learning,d.activity,d.adjust];
      for(let i=1;i<=3;i++) {
        const node=document.querySelector('#pf-badge'+i+' .txt');
        if(node) {owned(node,locale);node.replaceChildren(element('b',t(i===1?'heading':i===2?'activity.label':'adjust.label')),element('span',badgeText[i-1]));}
      }
      if(d.model.levels.S==='L'&&d.model.levels.Q==='L'&&Math.abs(d.model.scores.S-d.model.scores.Q)<=(profile.ageYears<=5?11:10)) {
        write('pf-learntype-name',t('processing.balancedSupport'),locale);
      }
      // Keep the existing subject and habit cards, but remove claims of already-proven strengths.
      if(!Object.values(d.model.levels).includes('H')) {
        const subject=document.getElementById('pf-subject-grid');
        if(subject) {
          [...subject.querySelectorAll('.method-card p')].forEach((node,index)=>{
            owned(node,locale);node.textContent=d.cards[index%d.cards.length].method;
          });
        }
        const habits=document.getElementById('pf-habit-grid');
        if(habits) [...habits.querySelectorAll('p')].forEach((node,index)=>{owned(node,locale);node.textContent=d.cards[index%d.cards.length].supportText;});
      }
    }
    // Replace complete sentences, never concatenate a localized fragment into Korean grammar.
    ['pf-emo-diag3-strength','pf-emo-diag4-weak'].forEach(id=>{
      replaceParagraph(id,t('parent.encourage'),locale);
      replaceParagraph(id+'-en',t('parent.encourage'),locale);
    });
    const axisSlots=kind==='kpass-child'
      ? {P:'pf-temp-think',A:'pf-temp-mood',S:'pf-temp-adapt',Q:'pf-temp-react'}
      : kind==='dcas-teen'
        ? {P:'pf-tc-think',A:'pf-tc-mood',S:'pf-tc-adapt',Q:'pf-tc-react'}
        : {P:'pf-tc1-think',A:'pf-tc1-mood',S:'pf-tc1-adapt',Q:'pf-tc1-react'};
    for(const card of d.cards) for(const suffix of ['', '-en']) {
      const node=document.getElementById(axisSlots[card.axis]+suffix);
      if(node) { owned(node,locale);node.replaceChildren(renderCard(card,d)); }
    }
    if(kind==='dcas-adult') {
      const preview=document.getElementById('pf-eff-preview');
      const rankedAxes=Object.keys(d.model.scores).sort((a,b)=>d.model.scores[b]-d.model.scores[a]);
      const cardFor=axis=>d.cards.find(card=>card.axis===axis);
      if(preview) [...preview.querySelectorAll('.cp-row')].forEach((row,index)=>{
        const score=row.children[1];
        if(score){owned(score,locale);score.textContent=index===0?rankedAxes.slice(0,2).map(axis=>cardFor(axis).title).join(' / '):cardFor(rankedAxes[3]).title;}
        const note=row.querySelector('.cp-desc');
        if(note&&preview.dataset.unranked==='true'){owned(note,locale);note.textContent=t('job.explore');}
      });
      for(const node of document.querySelectorAll('#efficiency .ds-mid,#expert .ds-mid')){owned(node,locale);node.textContent=t('evidence.domain');}
      const slots={P:'pf-tc2-execution',A:'pf-tc2-consistency',S:'pf-tc2-collab',Q:'pf-tc2-accuracy'};
      for(const card of d.cards) {const node=document.getElementById(slots[card.axis]);if(node){owned(node,locale);node.replaceChildren(renderCard(card,d));}}
      const stats=document.querySelector('#pf-emo-stats .stat-chip span');
      if(stats){owned(stats,locale);stats.textContent=t('evidence.observation');}
    }
    panel(kind,d,locale);
    global.__PASS_GUIDANCE_MODEL__=d.model;
    return d.model;
  }
  document.addEventListener('fg-report-locale-changed',event=>{
    const kind=event.detail.reportId;
    if(last.has(kind)) apply(kind,last.get(kind),event.detail.locale);
  });
  global.FeelGoodGuidanceUI=Object.freeze({apply});
})(window);
