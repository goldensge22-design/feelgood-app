/**
 * D-CAS Teen report — 7-combo content bank (English)
 * Mirrors dcas-teen-combo-bank.js exactly in structure. Same axis logic
 * (pickComboKey, BALANCE_THRESHOLD) — only the copy differs.
 * ★ First draft — needs review before production use.
 */
(function (global) {
  const AXIS_LABEL = { P: 'Planning', A: 'Attention', S: 'Simultaneous', Q: 'Successive' };
  const BALANCE_THRESHOLD = 20;

  function pickComboKey(scores) {
    // 81-type exception: if all four domains share one absolute band, do not invent a strongest/weakest axis.
    const levels = [scores.P, scores.A, scores.S, scores.Q].map(function (v) { return v >= 75 ? 'H' : (v <= 52 ? 'L' : 'M'); });
    if (levels.every(function (lv) { return lv === levels[0]; })) return 'BAL';
    const ranked = [
      { k: 'P', v: scores.P }, { k: 'A', v: scores.A },
      { k: 'S', v: scores.S }, { k: 'Q', v: scores.Q },
    ].sort(function (a, b) { return b.v - a.v; });
    if (ranked[0].v - ranked[3].v < BALANCE_THRESHOLD) return 'BAL';
    if (ranked[1].v < 75) return ranked[0].k + '_SOLO';
    const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
    const top2 = [ranked[0].k, ranked[1].k].sort(function (a, b) { return ORDER[a] - ORDER[b]; });
    return top2.join('');
  }

  const COMBO = {
    PQ: {
      code: 'Left-Brain 2-P', heroType: 'The Logical Architect',
      oneliner: 'Successive processing and planning are both strong, giving you the ability to follow a study plan step by step with precision. {weak} is comparatively lower, so activities that require synthesizing many ideas at once take a bit more conscious effort.',
      chips: ['#SuccessiveStrength', '#StrongPlanning', '#ProceduralPrecision', '#SynthesisNeedsWork'],
      figure: { name: 'Linus Torvalds', why: 'is known for managing an enormously complex system through thousands of precise rules and procedures. Like {name}, the ability to "finish with precision by following the sequence" is a core talent for completing large projects.' },
      strengthKw: { P: 'Strategic execution · Initiative', Q: 'Procedural rigor · Attention to detail' },
    },
    PA: {
      code: 'COGNITIVE ID · P-A', heroType: 'The Goal-Focused Learner',
      oneliner: 'Planning and attention are both strong, giving you the ability to set a goal and stay immersed without wavering until it\'s done. {weak} is comparatively lower, so situations that require synthesizing scattered information at once may take a bit more time.',
      chips: ['#StrongPlanning', '#SustainedFocus', '#GoalOriented', '#SynthesisNeedsWork'],
      figure: { name: 'Marie Curie', why: 'is known for repeating the same experimental method for years without losing sight of the goal. Like {name}, the ability to "set a plan and stay immersed until the end" is a core talent for completing long-term projects.' },
      strengthKw: { P: 'Strategic execution · Initiative', A: 'Sustained focus' },
    },
    PS: {
      code: 'Right-Brain 3-C', heroType: 'The Immersive Idea Architect',
      oneliner: 'Simultaneous processing and planning are both strong, giving a fast ability to grasp the whole picture and turn it into an action plan. {weak} is comparatively lower, so following detailed step-by-step procedures takes a bit more conscious effort.',
      chips: ['#IntuitiveJudgment', '#StrongPlanning', '#CreativeProblemSolving', '#ProcessNeedsWork'],
      figure: { name: 'Thomas Edison', why: 'revised his plans through thousands of failures, staying immersed until he finished the job. Like {name}, the ability to "picture the whole first, then plan and execute" is a core talent for turning ideas into real results in any field.' },
      strengthKw: { P: 'Strategic execution · Initiative', S: 'Integrative thinking · Systems view' },
    },
    AS: {
      code: 'COGNITIVE ID · A-S', heroType: 'The Immersive Explorer',
      oneliner: 'Attention and simultaneous processing are both strong, giving you the ability to quickly read a situation while also diving deep into subjects that interest you. {weak} is comparatively lower, so activities requiring a fixed step-by-step order take a bit more attention.',
      chips: ['#SustainedFocus', '#IntuitiveThinking', '#QuickSituationalRead', '#ProcessNeedsWork'],
      figure: { name: 'Jean-Henri Fabre', why: 'observed a single insect for years while also documenting its entire surrounding environment. Like {name}, the ability to "dive deep without losing sight of the whole" is a core talent for exploration and research.' },
      strengthKw: { A: 'Sustained focus', S: 'Integrative thinking · Systems view' },
    },
    AQ: {
      code: 'COGNITIVE ID · A-Q', heroType: 'The Precision Learner',
      oneliner: 'Attention and successive processing are both strong, giving you the ability to follow a fixed procedure precisely and repeat it without tiring. {weak} is comparatively lower, so activities requiring you to synthesize many ideas at once may take extra time.',
      chips: ['#SustainedFocus', '#ProceduralPrecision', '#ConsistentRepetition', '#SynthesisNeedsWork'],
      figure: { name: 'Han Seok-bong', why: 'is famous for repeating the fixed stroke order of calligraphy countless times without ever breaking it, reaching mastery. Like {name}, the ability to "repeat precisely over a long time" is a core talent for subjects that demand precision.' },
      strengthKw: { A: 'Sustained focus', Q: 'Procedural rigor · Attention to detail' },
    },
    SQ: {
      code: 'COGNITIVE ID · S-Q', heroType: 'The Structured Storyteller',
      oneliner: 'Simultaneous and successive processing are both strong, giving you the ability to picture the whole and then unfold it in a logical sequence. {weak} is comparatively lower, so conscious management helps with the stamina to push a goal through to the end.',
      chips: ['#IntuitiveThinking', '#StructuredComposition', '#LogicalFlow', '#StaminaNeedsWork'],
      figure: { name: 'Walt Disney', why: 'pinned storyboard panels on a wall to see the whole picture, then rearranged the sequence until the story worked. Like {name}, the ability to "lay everything out and then arrange the order" is a core talent for communicating complex ideas persuasively.' },
      strengthKw: { S: 'Integrative thinking · Systems view', Q: 'Procedural rigor · Attention to detail' },
    },
    BAL: {
      code: 'COGNITIVE ID · BAL', heroType: 'The Balanced All-Rounder',
      oneliner: 'All four cognitive abilities are evenly developed, giving you the flexibility to respond to any situation without being locked into one way of doing things.',
      chips: ['#EvenAbilities', '#Versatile', '#FlexibleThinking', '#SituationalAdaptability'],
      figure: { name: 'Leonardo da Vinci', why: 'is known for doing art, anatomical observation, and mechanical design all at once. The ability to not be confined to just one thing is a core talent for students who move across multiple fields.' },
      strengthKw: { P: 'Strategic execution', A: 'Sustained focus', S: 'Integrative thinking', Q: 'Procedural rigor' },
    },
    P_SOLO: {
      code: 'COGNITIVE ID · P-SOLO', heroType: 'The Planning-Led Learner',
      oneliner: 'Planning stands out relative to the other three domains. Setting a goal and executing according to plan is your clear strength. The other domains haven\'t settled into a fixed strength yet, and may show up differently depending on the situation.',
      chips: ['#PlanningDominant', '#GoalOriented', '#SingleStrength'],
      figure: { name: 'Benjamin Franklin', why: 'is known for mapping out his day into a tight schedule and following it for life. Like {name}, the ability to "set a plan and carry it out" is a core talent for turning goals into reality.' },
      strengthKw: { P: 'Strategic execution · Initiative' },
    },
    A_SOLO: {
      code: 'COGNITIVE ID · A-SOLO', heroType: 'The Focus-Led Learner',
      oneliner: 'Attention stands out relative to the other three domains. Diving deep into one task and seeing it through is your clear strength. The other domains haven\'t settled into a fixed strength yet, and may show up differently depending on the situation.',
      chips: ['#AttentionDominant', '#SustainedFocus', '#SingleStrength'],
      figure: { name: 'Jean-Henri Fabre', why: 'is known for observing a single insect for years at a time. Like {name}, the ability to "dive deep into one thing" is a core talent for research.' },
      strengthKw: { A: 'Sustained focus' },
    },
    S_SOLO: {
      code: 'COGNITIVE ID · S-SOLO', heroType: 'The Big-Picture-Led Learner',
      oneliner: 'Simultaneous processing stands out relative to the other three domains. Quickly pulling scattered information into one big picture is your clear strength. The other domains haven\'t settled into a fixed strength yet, and may show up differently depending on the situation.',
      chips: ['#SimultaneousDominant', '#IntuitiveJudgment', '#SingleStrength'],
      figure: { name: 'Steve Jobs', why: 'is known for quickly synthesizing scattered ideas into one clear picture. Like {name}, the ability to "grasp the whole quickly" is a core talent for setting direction.' },
      strengthKw: { S: 'Integrative thinking · Systems view' },
    },
    Q_SOLO: {
      code: 'COGNITIVE ID · Q-SOLO', heroType: 'The Procedure-Led Learner',
      oneliner: 'Successive processing stands out relative to the other three domains. Following a set procedure accurately, step by step, is your clear strength. The other domains haven\'t settled into a fixed strength yet, and may show up differently depending on the situation.',
      chips: ['#SuccessiveDominant', '#ProceduralRigor', '#SingleStrength'],
      figure: { name: 'Han Seok-bong', why: 'is known for repeating a fixed sequence of brush strokes without ever breaking order, until he reached mastery. Like {name}, the ability to "follow order precisely" is a core talent for tasks that demand precision.' },
      strengthKw: { Q: 'Procedural rigor · Attention to detail' },
    },
  };

  const WEAK_KW = {
    P: 'Growing strategic planning', A: 'Growing sustained focus',
    S: 'Growing integrative thinking', Q: 'Growing procedural rigor',
  };

  const EXAMPLE_PHRASE = {
    P: { strong: '"Set goals and executed systematically", "Planned and completed a project"', weak: '"Practicing setting plans one step at a time"' },
    A: { strong: '"Sustained focus over long stretches", "Improved quality through repeated practice"', weak: '"Training focus with short immersion routines"' },
    S: { strong: '"Synthesized complex information", "Grasped the overall structure first"', weak: '"Trying to sketch out the big picture on my own"' },
    Q: { strong: '"Followed steps accurately and in order", "Verified each stage carefully"', weak: '"Developing a habit of checking each step"' },
  };

  function pickWeakAxis(scores) {
    return [{k:'P',v:scores.P},{k:'A',v:scores.A},{k:'S',v:scores.S},{k:'Q',v:scores.Q}]
      .sort(function(a,b){return a.v-b.v;})[0].k;
  }
  function fill(str, vars) {
    return Object.keys(vars).reduce(function (s, k) {
      return s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    }, str);
  }
  function getCombo(scores) {
    const key = pickComboKey(scores);
    let combo = COMBO[key];
    if (key === 'BAL') {
      const avg = (scores.P + scores.A + scores.S + scores.Q) / 4;
      if (avg >= 75) {
        combo = Object.assign({}, combo, {
          code: 'COGNITIVE ID · BAL-H', heroType: 'The Balanced All-Rounder (High Achiever)',
          oneliner: 'All four cognitive abilities are developed to a consistently high level, giving you the ability to perform reliably well no matter what kind of task comes your way.',
        });
      } else if (avg <= 52) {
        combo = Object.assign({}, combo, {
          code: 'COGNITIVE ID · BAL-L', heroType: 'The Balanced Growth Learner',
          oneliner: 'All four cognitive abilities are evenly developed rather than concentrated in one area. You\'re still building up overall accuracy, but since no single area is a pronounced weak point, training tends to lift several areas at a similar pace.',
        });
      }
    }
    return { key: key, combo: combo, weakAxisKey: pickWeakAxis(scores), weakAxisLabel: AXIS_LABEL[pickWeakAxis(scores)] };
  }

  global.DCasTeenComboBankEn = { COMBO: COMBO, WEAK_KW: WEAK_KW, EXAMPLE_PHRASE: EXAMPLE_PHRASE, pickComboKey: pickComboKey, getCombo: getCombo, fill: fill, AXIS_LABEL: AXIS_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
