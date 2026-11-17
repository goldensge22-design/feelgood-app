import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axe = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
export async function audit(p, lang, label, axeCheck = false) {
  await p.waitForTimeout(100);
  const details = await p.evaluate(() => {
    const issues = [];
    const visible = e => {
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('details:not([open]) > :not(summary)');
    };
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 2) issues.push({ kind: 'page-overflow', width: root.scrollWidth, client: root.clientWidth, offenders:[...document.querySelectorAll('main *,header select')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>root.clientWidth+2;}).slice(-8).map(e=>({tag:e.tagName,id:e.getAttribute('data-testid'),class:e.className?.toString().slice(0,100)})) });
    for (const e of document.querySelectorAll('main *,header a,header select,nav a')) {
      if (!visible(e) || ['svg', 'path', 'circle', 'option'].includes(e.tagName.toLowerCase()) || e.namespaceURI.includes('svg')) continue;
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      if (s.textOverflow === 'ellipsis') issues.push({ kind: 'ellipsis', id: e.getAttribute('data-testid') });
      if (!['TEXTAREA','INPUT','SELECT'].includes(e.tagName) && e.textContent.trim() &&
          ((['hidden','clip'].includes(s.overflowX) && e.scrollWidth > e.clientWidth + 3) ||
           (['hidden','clip'].includes(s.overflowY) && e.scrollHeight > e.clientHeight + 3))) {
        const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        let n, clipped = false;
        while ((n = walker.nextNode())) {
          if (!n.textContent.trim() || !visible(n.parentElement)) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          for (const b of range.getClientRects()) {
            if ((['hidden','clip'].includes(s.overflowX) && (b.left < r.left - 3 || b.right > r.right + 3)) ||
                (['hidden','clip'].includes(s.overflowY) && (b.top < r.top - 3 || b.bottom > r.bottom + 3))) clipped = true;
          }
        }
        if (clipped) issues.push({ kind: 'clipping', tag: e.tagName, id: e.getAttribute('data-testid') });
      }
      if (e.matches('a,button,input,select,textarea,summary') && !e.classList.contains('sr-only')) {
        let target = e;
        if (e.matches('input[type=checkbox],input[type=radio]')) target = e.labels?.[0] ?? e;
        const hit = target.getBoundingClientRect();
        if (hit.height < 43.5 || hit.width < 43.5) issues.push({ kind: 'small-target', id: e.getAttribute('data-testid'), width: hit.width, height: hit.height });
        // Sibling control overlap, not normal parent-child boxes or document scroll.
        for (const sibling of e.parentElement?.children ?? []) {
          if (sibling === e || !sibling.matches('a,button,input,select,textarea') || !visible(sibling)) continue;
          const b = sibling.getBoundingClientRect();
          if (Math.min(r.right,b.right)-Math.max(r.left,b.left)>3 && Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)>3) issues.push({ kind:'control-overlap', id:e.getAttribute('data-testid') });
        }
      }
    }
    const residual = [];
    const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const e = n.parentElement;
      if (visible(e) && !e.closest('[data-user-content],textarea,script,style') && /[가-힣]/.test(n.textContent)) residual.push(n.textContent.trim().slice(0,80));
    }
    const attributes = [...document.querySelectorAll('main [aria-label],main [placeholder],header [aria-label]')].filter(e => visible(e) && !e.closest('[data-user-content]')).flatMap(e => ['aria-label','placeholder'].map(a=>e.getAttribute(a)??'')).filter(t=>/[가-힣]/.test(t));
    return { issues, residual: [...new Set([...residual,...attributes])], lang:root.lang, dir:root.dir };
  });
  if (lang === 'ko') details.residual = [];
  const selector = p.getByTestId('select-language');
  await p.evaluate(() => window.scrollTo(0,0));
  const rect = await selector.boundingBox();
  details.selector = { visible: await selector.isVisible(), height: rect?.height, nearTop: rect?.y < 180, physicalRight: rect ? rect.x+rect.width >= p.viewportSize().width-70 : false, current: await selector.inputValue() };
  if (axeCheck) {
    await p.addScriptTag({ content: axe });
    const a = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21aa'] } });
      return { violations: r.violations.map(v=>({ id:v.id, impact:v.impact, nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary})) })), incomplete:r.incomplete.map(v=>v.id) };
    });
    details.axe = a;
  }
  return { label, ...details };
}
export async function keyboardOrder(p) {
  const expected = await p.locator('a[href],button,input,select,textarea,summary,[tabindex]').evaluateAll(els=>els.filter(e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return !e.matches(':disabled')&&e.tabIndex>=0&&r.width&&r.height&&s.visibility!=='hidden'&&!e.closest('details:not([open]) > :not(summary)');
  }).map((e,i)=>{e.setAttribute('data-qa-tab',String(i));return String(i);}));
  await p.evaluate(()=>{document.activeElement?.blur();const b=document.body;b.tabIndex=-1;b.focus();});
  const visited=[];
  for(let i=0;i<expected.length;i++) {
    await p.keyboard.press('Tab');
    visited.push(await p.evaluate(()=>document.activeElement?.getAttribute('data-qa-tab')));
  }
  await p.locator('[data-qa-tab]').evaluateAll(es=>es.forEach(e=>e.removeAttribute('data-qa-tab')));
  return {expected,visited,pass:JSON.stringify(expected)===JSON.stringify(visited)};
}
