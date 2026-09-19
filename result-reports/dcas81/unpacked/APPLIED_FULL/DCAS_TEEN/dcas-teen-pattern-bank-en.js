/**
 * D-CAS Teen report — English axis-pair diagnostic pattern bank
 * Mirrors dcas-teen-pattern-bank.js exactly.
 */
(function (global) {
  const AXIS_LABEL = { P: 'Planning', A: 'Attention', S: 'Simultaneous', Q: 'Successive' };

  const PATTERN = {
    PQ: {
      title: 'Flawless design, but details collapse right before the deadline',
      sym: 'The project proposal is excellent, but the final deliverable has steps out of order — or the problem-solving strategy in math is sound, but errors creep in at the last calculation step.',
      rx: 'Planning builds the overall strategy; successive processing executes and verifies that strategy step by step. A gap between design and execution-verification turns a good plan into an unpolished result. → Use the procedure-checklist cards (Study Plan section) to separate "designing" from "executing," checking each on its own.',
    },
    AS: {
      title: '"Knew it, got it wrong" — the recurring mistake',
      sym: 'You grasp the overall context of a passage right away, but on the actual test you miss small conditions (units, signs, exceptions) and get it wrong.',
      rx: 'Simultaneous processing integrates the whole picture quickly, but if attention — holding and checking each small detail — is comparatively lower, you get "the big picture right but leaking on details." → After finishing a problem, physically point to "the 3 conditions this problem requires" and re-check them.',
    },
    SQ: {
      title: 'Understand the concept, but stumble applying the rule',
      sym: 'You grasp the "overall principle" of grammar quickly, but trip up on the order of application (tense agreement, word order) — or you know a math concept but get tangled in multi-step calculations that require following a sequence.',
      rx: 'Simultaneous processing (integrating concepts) and successive processing (applying rules in order) are different cognitive pathways. Understanding a concept doesn\'t guarantee you can apply its rules. → Don\'t go straight from "understand the concept" to "solve problems" — insert a middle step: pull out just the sequential rules and drill them separately first.',
    },
    AQ: {
      title: 'The combination most shaken by repetitive procedural tasks',
      sym: 'You can\'t stay with simple repetitive calculations or memorization-heavy tasks for long — you lose track of the sequence or lose interest partway through.',
      rx: 'When both axes are on the lower side, tasks that require staying focused while maintaining a sequence create a double burden. This is the top-priority combination to train. → Approach sequential-training missions in short, frequent bursts (under 10 minutes) — never in one long session.',
    },
    PA: {
      title: 'You set goals easily, but struggle to sustain them',
      sym: 'You\'re full of motivation when making a plan, but a few days later even keeping up with the plan itself fizzles out.',
      rx: 'A gap between planning (design) and attention (sustaining) means good plans don\'t last through execution. → Break daily goals into 25-minute blocks so you practice the feeling of sticking to a plan often, in small doses.',
    },
    PS: {
      title: 'Big-picture ideas come easily, but detailed planning stalls',
      sym: 'Overall direction or ideas come to you quickly, but breaking them into concrete execution steps feels overwhelming.',
      rx: 'When simultaneous processing (integration) outpaces planning (sequencing), good ideas don\'t translate well into concrete plans. → As soon as an idea comes, immediately decide just "the first thing to do" and start there.',
    },
  };

  const PATTERN_SYNERGY = {
    PQ: { title: 'Planning and execution both strong — a high-polish pattern', sym: 'Both the ability to strategize and the ability to execute it accurately in order are strong, so quality stays high from kickoff to finish.', rx: 'Lean into this as a clear strength. → It shows up biggest in activities that need "plan through execution" end-to-end, like projects or competitions.' },
    AS: { title: 'Deep focus with fast big-picture grasp — an insightful pattern', sym: 'Both the ability to focus deeply on one thing and to integrate the whole context quickly are strong, so you can spot the key point in complex material fast.', rx: 'Lean into this as a clear strength. → It shows up biggest in independent inquiry or deep-dive projects that need depth and integration at the same time.' },
    SQ: { title: 'Big picture and fine procedure together — a balanced pattern', sym: 'Both integrating concepts as a whole and applying them accurately in order are strong, so there\'s little gap between understanding and application.', rx: 'Lean into this as a clear strength. → You reach a polished result faster than most in learning that runs from concept to problem-solving.' },
    AQ: { title: 'Steady and precise follow-through — a reliable pattern', sym: 'Both staying immersed in one task and following procedure precisely are strong, so quality stays consistent in repetitive, detail-heavy work.', rx: 'Lean into this as a clear strength. → It shows up biggest in lab reports or long-term projects that need both consistency and precision.' },
    PA: { title: 'Setting goals and seeing them through — a sustained pattern', sym: 'Both the ability to plan and the ability to sustain that plan over time are strong, so you finish what you start without wavering.', rx: 'Lean into this as a clear strength. → This staying power becomes your biggest asset for long-term goals like exam prep or certifications.' },
    PS: { title: 'Big-picture vision paired with a real plan — a strong-strategy pattern', sym: 'Both quickly sketching the overall direction and turning it into an execution plan are strong, so ideas translate well into concrete plans.', rx: 'Lean into this as a clear strength. → It shows up biggest in club planning or competitions that need "idea → execution plan" together.' },
  };

  function pairKey(k1, k2) {
    const ORDER = { P: 0, A: 1, S: 2, Q: 3 };
    return [k1, k2].sort(function (a, b) { return ORDER[a] - ORDER[b]; }).join('');
  }

  function pickFourPatterns(scores) {
    const ranked = [
      { k: 'P', v: scores.P }, { k: 'A', v: scores.A },
      { k: 'S', v: scores.S }, { k: 'Q', v: scores.Q },
    ].sort(function (a, b) { return b.v - a.v; });
    const weakKey = ranked[3].k;
    const others = ranked.slice(0, 3).map(function (r) { return r.k; });
    const pairs = [pairKey(ranked[0].k, ranked[1].k)];
    others.forEach(function (k) {
      const pk = pairKey(weakKey, k);
      if (pairs.indexOf(pk) === -1) pairs.push(pk);
    });
    return pairs.slice(0, 4).map(function (pk, idx) {
      const keys = pk.split('');
      const bothHigh = keys.every(function(k){ return scores[k] >= 75; });
      const pattern = (idx === 0 && bothHigh && PATTERN_SYNERGY[pk]) ? PATTERN_SYNERGY[pk] : PATTERN[pk];
      if (!pattern) return null;
      return {
        pattern: pattern,
        axisKeys: keys,
        axisScores: keys.map(function (k) { return { k: k, v: scores[k] }; }),
      };
    }).filter(Boolean);
  }

  global.DCasTeenPatternBankEn = { PATTERN: PATTERN, PATTERN_SYNERGY: PATTERN_SYNERGY, pairKey: pairKey, pickFourPatterns: pickFourPatterns, AXIS_LABEL: AXIS_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
