// Pure reference policy for a future authenticated server adapter. NOT a deployed API.
// Never pass client-edited approval metadata as `data`. It must be a trusted server bundle.
import crypto from 'node:crypto';
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const dateOK=(x,now)=>nonempty(x)&&Number.isFinite(Date.parse(x))&&Date.parse(x)<=now;
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
export function findBinding(data,{population,sourceId,sourceVersion}){
 if(!['adult','teen'].includes(population)||typeof sourceId!=='string'||sourceVersion!==data.manifest.sourceCommit)return null;
 return data.bindings.find(b=>b.population===population&&b.sourceRef.id===sourceId&&b.sourceRef.version===sourceVersion)||null;
}
export function eligibleCard(data,card,locale,audience,now){
 const pack=data.packs[locale];
 if(!card||!data.manifest.requiredLocales.includes(locale)||!['middle','high','university-adult'].includes(audience))return false;
 if(!['general','safety-sensitive'].includes(card.risk)||card.status!=='approved'||card.visibility!=='public'||!card.audiences.includes(audience))return false;
 if(!nonempty(card.source.reviewedBy)||!dateOK(card.source.reviewedAt,now))return false;
 if(!pack||pack.locale!==locale||pack.status!=='reviewed'||pack.sourceVersion!==card.version)return false;
 const keys=Object.values(card.text).flat();
 if(!keys.every(k=>nonempty(data.sourceMessages[k])&&nonempty(pack.messages?.[k])&&pack.sourceHashes?.[k]===digest(data.sourceMessages[k])&&pack.keyStatus?.[k]==='reviewed'))return false;
 if(card.risk==='safety-sensitive'&&(!nonempty(card.source.reviewDueAt)||!(Date.parse(card.source.reviewDueAt)>now)||!card.source.officialReferences.length||!card.source.officialReferences.every(r=>/^https:\/\//.test(r.uri)&&nonempty(r.version)&&nonempty(r.jurisdiction)&&dateOK(r.effectiveAt,now))))return false;
 return true;
}
export function lookupReleased(data,input,now=Date.now()){
 const b=findBinding(data,input);
 const empty={status:'unavailable',cards:[],dailyCards:[],nextAction:'offer-private-authoring',aiRequested:false};
 if(!b||b.status!=='reviewed'||!nonempty(b.reviewedBy)||!dateOK(b.reviewedAt,now)||!nonempty(b.domainReviewedBy)||!dateOK(b.domainReviewedAt,now))return empty;
 if((b.population==='adult'&&input.audience!=='university-adult')||(b.population==='teen'&&!['middle','high'].includes(input.audience)))return empty;
 const resolve=ids=>ids.map(id=>data.cards.find(c=>c.id===id));
 const cards=resolve(b.templateIds),dailyCards=resolve(b.dailyTemplateIds);
 if(cards.length!==3||dailyCards.length!==3||!cards.every(c=>eligibleCard(data,c,input.locale,input.audience,now))||!dailyCards.every(c=>eligibleCard(data,c,input.locale,input.audience,now)))return empty;
 return {status:'available',cards,dailyCards,nextAction:'choose-one',aiRequested:false};
}
