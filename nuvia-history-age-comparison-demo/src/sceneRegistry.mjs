export const SCENE_POLICY_ID='nuvia.history.scene-render-policy.demo.v1';

export const renderPolicies={
 'stage-16x9-contain':{aspect:'16/9',fit:'contain'},
 'stage-3x2-contain':{aspect:'3/2',fit:'contain'},
 'book-4x3-contain':{aspect:'4/3',fit:'contain',maxDesktop:[453,340],maxMobile:[400,300]},
 'cover-2x1-focal':{aspect:'2/1',fit:'cover',focalPoint:{x:.5,y:.5},focalReview:'pending'}
};

export const rolePolicies={
 'history-stage':'stage-16x9-contain',
 'condition-stage':'stage-3x2-contain',
 'storybook-history':'book-4x3-contain',
 'storybook-condition':'book-4x3-contain',
 'storybook-result':'book-4x3-contain',
 'storybook-cover':'cover-2x1-focal'
};

export const assets={
 'shared.workshop':{path:'art/workshop.webp',kind:'background',availability:{fileStatus:'present'},rights:{status:'approved',sourceRef:'w24-approved-baseline',usageScope:['history-stage','storybook-history','storybook-cover']}},
 'shared.condition-objects-v1':{path:'art/condition-objects-v1.webp',kind:'sticker',availability:{fileStatus:'present'},rights:{status:'approved',sourceRef:'w24-approved-baseline',usageScope:['condition-stage','storybook-condition']}},
 'shared.cast':{path:'art/cast.webp',kind:'sticker',availability:{fileStatus:'present'},rights:{status:'approved',sourceRef:'w24-approved-baseline',usageScope:['storybook-result']}}
};

export const scenes={
 'gutenberg.history.workshop':{assetId:'shared.workshop',factMode:'history',sourceRefs:['S1324-21'],roles:['history-stage','storybook-history','storybook-cover'],activityDependency:{requiredForCompletion:false,alternativeAssetIds:[]},review:{historical:'approved',educational:'approved',visual:'approved',rights:'approved',accessibility:'needs-review'}},
 'gutenberg.c2.altered-access':{assetId:null,availability:{status:'pending',reasonCode:'SCENE_APPROVED_ASSET_UNAVAILABLE'},factMode:'altered',baselineSceneId:'gutenberg.history.workshop',alteredConditionId:'gutenberg.c2',modeLabelKey:'scene.mode.altered',roles:['condition-stage','storybook-condition'],activityDependency:{requiredForCompletion:false,alternativeAssetIds:[]},review:{historical:'not-applicable',educational:'approved',visual:'needs-review',rights:'not-applicable',accessibility:'needs-review'}},
 'gutenberg.c2.planning.tell':{assetId:'shared.cast',factMode:'user_imagined',modeLabelKey:'scene.mode.userImagined',derivedFromActionIds:['method:tell'],roles:['storybook-result'],activityDependency:{requiredForCompletion:false,alternativeAssetIds:[]},review:{historical:'not-applicable',educational:'approved',visual:'approved',rights:'approved',accessibility:'needs-review'}},
 'gutenberg.c2.planning.time':{assetId:null,availability:{status:'pending',reasonCode:'SCENE_APPROVED_ASSET_UNAVAILABLE'},factMode:'user_imagined',modeLabelKey:'scene.mode.userImagined',derivedFromActionIds:['method:time'],roles:['storybook-result'],activityDependency:{requiredForCompletion:false,alternativeAssetIds:[]},review:{historical:'not-applicable',educational:'approved',visual:'needs-review',rights:'not-applicable',accessibility:'needs-review'}},
 'gutenberg.c2.planning.own':{assetId:null,availability:{status:'pending',reasonCode:'SCENE_APPROVED_ASSET_UNAVAILABLE'},factMode:'user_imagined',modeLabelKey:'scene.mode.userImagined',derivedFromActionIds:['method:own'],roles:['storybook-result'],activityDependency:{requiredForCompletion:false,alternativeAssetIds:[]},review:{historical:'not-applicable',educational:'approved',visual:'needs-review',rights:'not-applicable',accessibility:'needs-review'}}
};

export function resolveScene(sceneId,role){
 const scene=scenes[sceneId],policyId=rolePolicies[role],policy=renderPolicies[policyId],asset=scene&&assets[scene.assetId],reasons=[];
 if(scene?.availability?.status==='pending')reasons.push(scene.availability.reasonCode);
 else if(!scene||!asset||asset.availability.fileStatus!=='present')reasons.push('ASSET_FILE_MISSING');
 if(asset&&!asset.rights.usageScope.includes(role))reasons.push('RIGHTS_SCOPE_MISMATCH');
 if(scene?.activityDependency.requiredForCompletion&&(!asset||asset.availability.fileStatus!=='present')&&!scene.activityDependency.alternativeAssetIds.length)reasons.push('REQUIRED_ACTIVITY_ASSET_UNAVAILABLE');
 if(!scene?.roles.includes(role)||!policy)reasons.push('RIGHTS_SCOPE_MISMATCH');
 return {status:reasons.length?'blocked':'eligible',reasons,scene,asset,policyId,policy};
}

export function sceneFigure(sceneId,role,alt,caption='',pendingText=''){
 const r=resolveScene(sceneId,role);if(r.status!=='eligible')return `<div class="scene-media scene-media--${role} scene-media--pending" data-scene-id="${sceneId}" data-scene-role="${role}" data-scene-status="pending" role="img" aria-label="${alt}"><span aria-hidden="true">◌</span><p>${pendingText}</p></div>`;
 const captionHtml=caption?`<figcaption class="condition-badge">${caption}</figcaption>`:'';
 return `<figure class="scene-media scene-media--${role}${role.startsWith('storybook-')&&role!=='storybook-cover'?' scene-media--storybook-illustration':''}" data-scene-id="${sceneId}" data-scene-role="${role}" data-policy-id="${r.policyId}"><img class="scene-media__image" src="./${r.asset.path}" alt="${alt}">${captionHtml}</figure>`;
}

export const sceneQaSummary=()=>Object.fromEntries(Object.entries(scenes).map(([id,s])=>[id,{assetId:s.assetId,factMode:s.factMode,roles:Object.fromEntries(s.roles.map(role=>[role,resolveScene(id,role).status]))}]));
