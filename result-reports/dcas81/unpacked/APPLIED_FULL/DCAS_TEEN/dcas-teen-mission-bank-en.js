/**
 * D-CAS Teen report — English mission board (09) and growth checklist (10) bank
 * Mirrors dcas-teen-mission-bank.js exactly.
 */
(function (global) {
  const AXIS_LABEL = { P: 'Planning', A: 'Attention', S: 'Simultaneous', Q: 'Successive' };
  function balPickLocal(tier, variants) { return variants[tier]; }

  const TRAIN_MISSION = {
    Q: { diff: 'low', title: 'Cook a recipe in the exact order', desc: 'A classic sequential activity where following the exact order produces the result. Photograph each step from prep to plating.', xp: 30, skill: 'Successive-processing training' },
    A: { diff: 'mid', title: 'Complete five 25-minute focus timers', desc: 'Full focus for 25 minutes, no distractions, then a free 5-minute break. Short, repeated bursts are the key.', xp: 40, skill: 'Sustained-attention training' },
    P: { diff: 'mid', title: 'Set a weekly plan and follow it for 3 days', desc: 'Write down what you\'ll do Mon-Sun ahead of time, and check off each day you actually followed it. Making a plan and keeping it are different skills.', xp: 40, skill: 'Planning training' },
    S: { diff: 'mid', title: 'Summarize something complex as one mind map', desc: 'Pick a textbook chapter or news article and condense the key content into a single mind map. Practice seeing the whole structure at once.', xp: 40, skill: 'Simultaneous-processing training' },
  };
  const LINK_MISSION = {
    PQ: { title: 'Clear a 3-step Tower of Hanoi', desc: 'Use planning to sketch the whole sequence first, then execute it one step at a time in order.', xp: 50, skill: 'Successive + planning bridge' },
    PA: { title: '25-minute focus + plan-of-the-day combo challenge', desc: 'Write today\'s plan first, then execute each item as a 25-minute focus block.', xp: 50, skill: 'Planning + attention bridge' },
    PS: { title: 'Turn a sketch idea into an execution plan', desc: 'Express an idea as a drawing or mind map first, then break it into a 3-step execution order.', xp: 50, skill: 'Simultaneous + planning bridge' },
    AS: { title: 'Two-stage reading: overview then detail check', desc: 'Read a passage straight through for overall context first, then go back and verify 3 specific conditions.', xp: 50, skill: 'Simultaneous + attention bridge' },
    AQ: { title: 'Checklist-based repetition drill', desc: 'Turn one repetitive task into a checklist and repeat it 5 times, following the order precisely.', xp: 50, skill: 'Attention + successive bridge' },
    SQ: { title: 'Design a presentation as a storyboard', desc: 'Sketch the overall flow as a storyboard first, then arrange the presentation order logically.', xp: 50, skill: 'Simultaneous + successive bridge' },
    BAL: { title: 'Lead a team project, rotating roles', desc: 'Take turns leading planning, execution, and wrap-up within one project. A chance to use a well-rounded skill set in different ways.', xp: 50, skill: 'Balanced integration training' },
  };
  const CAPSTONE_MISSION = {
    title: 'Design and complete a 3-stage project solo',
    descTpl: 'The big picture — plan → build an execution plan → execute in stages — draws on your strengths ({strong}), while completing every stage in exact order naturally trains {weak}. Example: take one contest entry from concept to submission on your own.',
    xp: 100, skillTpl: 'Strength use + {weak} integration training',
  };

  const SELFCHECK_ITEM = {
    Q: { text: 'Wrote down 3 things to do today, in order', scale: 'Successive-processing practice' },
    P: { text: 'Wrote the task order in one line before starting', scale: 'Planning practice' },
    A: { text: 'Studied in 25-min focus + 5-min break blocks', scale: 'Sustained attention' },
    S: { text: 'Summarized something complex as a drawing or mind map first', scale: 'Simultaneous-processing practice' },
  };

  function pickAxisData(scores) {
    const ranked = [
      { k: 'P', v: scores.P }, { k: 'A', v: scores.A },
      { k: 'S', v: scores.S }, { k: 'Q', v: scores.Q },
    ].sort(function (a, b) { return b.v - a.v; });
    const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
    const top2Key = [ranked[0].k, ranked[1].k].sort(function (a, b) { return ORDER[a] - ORDER[b]; }).join('');
    return { ranked: ranked, weakKey: ranked[3].k, top2Key: top2Key, strong2Keys: [ranked[0].k, ranked[1].k] };
  }

  function buildMissions(scores) {
    const d = pickAxisData(scores);
    const trainM = TRAIN_MISSION[d.weakKey];
    const linkM = LINK_MISSION[d.top2Key] || LINK_MISSION.BAL;
    const strongLabel = d.strong2Keys.map(function (k) { return AXIS_LABEL[k]; }).join(' + ');
    const weakLabel = AXIS_LABEL[d.weakKey];
    const capstoneDesc = CAPSTONE_MISSION.descTpl.replace('{strong}', strongLabel).replace('{weak}', weakLabel);
    const capstoneSkill = CAPSTONE_MISSION.skillTpl.replace('{weak}', weakLabel);
    const secondWeakKey = d.ranked[2].k;
    const secondM = TRAIN_MISSION[secondWeakKey];
    return [
      { diff: trainM.diff, title: trainM.title, desc: trainM.desc, xp: trainM.xp, skill: trainM.skill },
      { diff: 'mid', title: linkM.title, desc: linkM.desc, xp: linkM.xp, skill: linkM.skill },
      { diff: secondM.diff, title: secondM.title, desc: secondM.desc, xp: secondM.xp, skill: secondM.skill },
      { diff: 'high', title: CAPSTONE_MISSION.title, desc: capstoneDesc, xp: CAPSTONE_MISSION.xp, skill: capstoneSkill },
    ];
  }

  function buildSelfcheckItems(scores) {
    const d = pickAxisData(scores);
    const secondWeakKey = d.ranked[2].k;
    const strongLabel = AXIS_LABEL[d.strong2Keys[0]];
    const weakLabel = AXIS_LABEL[d.weakKey];
    const items = [];
    items.push(SELFCHECK_ITEM[d.weakKey]);
    items.push(SELFCHECK_ITEM[secondWeakKey]);
    const covered = [d.weakKey, secondWeakKey];
    if (covered.indexOf('A') === -1) {
      items.push({ text: 'Studied in 25-min focus + 5-min break blocks', scale: 'Sustained attention' });
    } else {
      items.push({ text: 'Explained something I learned today in my own words', scale: 'Comprehension check' });
    }
    // Patch: item 4 always asserted a specific "strong axis" even for balanced profiles
    const isBalancedSelfcheckEn = (d.ranked[0].v - d.ranked[3].v) < 20;
    const balTierSelfcheckEn = (function(){ const avg=(d.ranked[0].v+d.ranked[1].v+d.ranked[2].v+d.ranked[3].v)/4; return avg<=52?'LOW':(avg<75?'MID':'HIGH'); })();
    items.push(isBalancedSelfcheckEn
      ? { text: balPickLocal(balTierSelfcheckEn, { LOW:'Set one small goal and completed it through short, repeated tries', MID:'Adjusted my approach on the fly, whatever the situation called for, after a plan fell through', HIGH:'Saw a complex task through to the end by using several approaches at once' }), scale: 'Adaptability' }
      : { text: 'Used my ' + strongLabel.toLowerCase() + ' strength to adjust after a plan fell through', scale: 'Adaptability' });
    items.push({ text: 'Completed at least 1 ' + weakLabel.toLowerCase() + '-related mission from the mission board', scale: 'Integrated training' });
    return items;
  }

  global.DCasTeenMissionBankEn = { AXIS_LABEL: AXIS_LABEL, pickAxisData: pickAxisData, buildMissions: buildMissions, buildSelfcheckItems: buildSelfcheckItems };
})(typeof window !== 'undefined' ? window : globalThis);
