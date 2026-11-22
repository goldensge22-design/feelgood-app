import assert from 'node:assert/strict';
import {test} from 'node:test';
import {REVIEW_PRODUCT_LINKS, reviewAudience, reviewProducts, reviewRouteRedirect} from './review-audience';
import {AUDIENCE_MESSAGES} from './review-audience-messages';
import {youthStoryPreview} from './review-youth-story';

test('audience must be explicit and primary products are independent of language',()=>{
  for(const unknown of [null,undefined,'','student','child','parent','teacher','17',true])assert.equal(reviewAudience(unknown),null);
  assert.deepEqual(reviewProducts('adult'),['company','storyboard']);
  assert.deepEqual(reviewProducts('youth'),['career','storyboard']);
  assert.deepEqual(reviewProducts(null),[]);
  assert.ok(reviewProducts('family').includes('history'));
  for(const role of ['youth','adult'] as const)for(const product of reviewProducts(role)){
    assert.ok(AUDIENCE_MESSAGES[REVIEW_PRODUCT_LINKS[product][1]].every(Boolean));
    assert.ok(['/lab','/storyboard'].includes(REVIEW_PRODUCT_LINKS[product][0]));
  }
});

test('legacy URLs are blocked before render except family History and preserved private editing paths',()=>{
  for(const role of ['adult','youth'] as const){
    for(const path of ['/history','/history/one','/history/one/more/','/%68ISTORY/id','/my-history','/activity-history','/experiences'])assert.equal(reviewRouteRedirect(path,role,true),'/planner');
    for(const path of ['/kids','/kids/one','/nuvia-kids','/child/work','/family'])assert.equal(reviewRouteRedirect(path,role,true),'/home');
    for(const path of ['/home','/report','/lab','/planner','/planner/card/my-own','/storyboard','/versions','/export','/teacher'])assert.equal(reviewRouteRedirect(path,role,true),null);
    assert.equal(reviewRouteRedirect('/planner',role,false),'/');
  }
  assert.equal(reviewRouteRedirect('/history/one','family',true),null);
  assert.equal(reviewRouteRedirect('/family',null,false),null);
  assert.equal(reviewRouteRedirect('/storyboard',null,true),'/');
});

test('teen preview uses reviewed words and explicitly distinguishes imagined activity',()=>{
  const input={lang:'ko',actions:[{text:'가까운 길을 비교해 보겠다고 적었어요.',thought:true},{text:'물건 세 개를 정리했어요.',thought:false}],
    keyword:'비교 기준',body:'내가 쓴 문장',thought:'다음에 해 보고 싶은 것'};
  const result=youthStoryPreview(input,'generate');
  assert.match(result,/가정 상황에서 적은 생각: 가까운 길/);
  assert.match(result,/내가 기록한 활동: 물건 세 개/);
  assert.match(result,/더 탐색하고 싶은 진로 키워드: 비교 기준/);
  assert.equal(youthStoryPreview({...input,actions:[]},'generate'),'');
  assert.equal(youthStoryPreview(input,'refine'),'내가 쓴 문장\n\n다음에 해 보고 싶은 것');
});
