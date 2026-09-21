import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {writingCopy as c} from '../src/locales/ko-writing.mjs';
import {reconsiderCopy as p} from '../src/locales/ko-reconsider.mjs';
import {esc} from '../src/reconsiderationView.mjs';
import {validateSceneAssets} from './validate-scenes.mjs';
await validateSceneAssets();
const out='dist-writing';await mkdir(out,{recursive:true});
for(const f of ['writing.html','writing.css','styles.css','styles-extra.css','planning-writing.css','reconsider.css','src','art','fonts'])await cp(f,`${out}/${f}`,{recursive:true});
await cp('writing.html',`${out}/index.html`);
await cp('docs/NUVIA_HISTORY_TEEN_RULES_v1.0.md',`${out}/rules.md`);
const data={title:c.reviewTitle,status:'demo-user-review-pending',scope:'W24-C2 Planning',locale:'ko',versions:{rules:'1.0',runtime:'nuvia.history.teen-writing.demo.v1'},
 copy:c,planning:p,paths:{middle:c.reviewMiddle,high:c.reviewHigh},gates:c.reviewGates,images:c.reviewImages,limits:c.reviewLimits,
 sourceHashes:Object.fromEntries(await Promise.all(['src/writing-contract.mjs','src/writing-app.mjs','src/locales/ko-writing.mjs','src/reconsideration.mjs','src/reconsiderationView.mjs'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])))};
await writeFile(`${out}/review.json`,JSON.stringify(data,null,2));
const md=`# ${c.reviewTitle}\n\n${c.reviewDescription}\n\n## ${c.middle}\n${c.reviewMiddle}\n\n## ${c.high}\n${c.reviewHigh}\n\n## ${c.gate}\n${c.reviewGates}\n\n${c.reviewImages}\n\n${c.reviewLimits}\n\n## ${c.reviewLink}\n\n`+Object.entries(c).filter(([,v])=>typeof v==='string').map(([k,v])=>`- ${k}: ${v}`).join('\n')+`\n\n## ${c.planRecord}\n\n`+JSON.stringify(p,null,2);
await writeFile(`${out}/review.md`,md);
await writeFile(`${out}/review.html`,`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.reviewTitle}</title><link rel="stylesheet" href="./styles.css"><link rel="stylesheet" href="./writing.css"></head><body><main class="app-shell writing-shell"><h1>${c.reviewTitle}</h1><p>${c.reviewDescription}</p><nav class="link-row"><a href="./review.json" download>JSON</a><a href="./review.md" download>Markdown</a><a href="./rules.md" download>${c.downloadRules}</a><a href="./writing.html?lang=ko&age=middle-school">${c.middle}</a><a href="./writing.html?lang=ko&age=high-school">${c.high}</a></nav><h2>${c.middle}</h2><p>${c.reviewMiddle}</p><h2>${c.high}</h2><p>${c.reviewHigh}</p><h2>${c.gate}</h2><p>${c.reviewGates}</p><p>${c.reviewImages}</p><p>${c.reviewLimits}</p><h2>${c.reviewLink}</h2><dl>${Object.entries(c).filter(([,v])=>typeof v==='string').map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl><pre>${esc(JSON.stringify(p,null,2))}</pre></main></body></html>`);
console.log('Built dist-writing; legacy dist and dist-reconsider untouched. Static review HTML/JSON/Markdown and rules included.');
