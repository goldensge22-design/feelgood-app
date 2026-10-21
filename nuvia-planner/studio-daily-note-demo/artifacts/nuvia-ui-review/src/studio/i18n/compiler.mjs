// Studio-only source macro. Canonical record values are not translated.
import ts from 'typescript';
import {createHash} from 'node:crypto';
export const keyFor=s=>'s.'+createHash('sha256').update(s).digest('hex').slice(0,16);
const korean=/[가-힣]/;
const canonical=new Set('학습 생활 업무 기타 상 중 하 수학 국어 영어 과학 사회 역사 한국사 세계사 물리 화학 생물 생명 지구 숙제 복습 시험 수행평가 과제 프로젝트 진로 계획 주의 동시 순차'.split(' '));
const staticContext=n=>{
 for(let p=n.parent;p;p=p.parent){if(ts.isTypeNode(p))return true;if(ts.isFunctionLike(p))return false;}
 return true;
};
const rawValue=n=>ts.isPropertyAssignment(n.parent)&&n.parent.name===n ||
 ts.isJsxAttribute(n.parent)&&['value','defaultValue'].includes(n.parent.name.getText()) ||
 ts.isBinaryExpression(n.parent)&&['===','!==','==','!='].includes(n.parent.operatorToken.getText());
const entered=/\.(title|cardTitle|subject|goal|scope|firstAction|flag|nextPosition|materials|relationship|output|feeling|difficulty|example|note|name|text|situation|challenge|action|adjustment|result|learning|method|chunk|reason)\b/;
const labelPath=/targetNames|supportNames|stageNames|AXIS_NAMES|SUPPORT_NAMES|STAGE_NAMES/;
export function transformStudio(code,file,collect,compile=true){
 const sf=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const edits=[],covered=new Set();
 const add=(s,n,replacement)=>{
  if(!korean.test(s))return;
  const key=keyFor(s);collect?.(key,s,file,n.getStart(sf));
  if(compile)edits.push({start:n.getStart(sf),end:n.end,text:replacement?.(key)??`__st_t(${JSON.stringify(key)})`});
 };
 const visit=n=>{
  if(covered.has(n))return;
  if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)!=='option'){
   let group=[];
   const flush=()=>{
    if(group.length<2){group=[];return;}
    let text='',params=[];
    for(const child of group){
     if(ts.isJsxText(child))text+=child.text.replace(/\s+/g,' ');
     else{const name='value'+(params.length+1),expression=child.expression.getText(sf);
      text+='{'+name+'}';
      const wrapper=transformStudio('function __expression(){return ('+expression+');}',file,collect,compile);
      const compiled=wrapper.slice(wrapper.indexOf('return (')+8,wrapper.lastIndexOf(');}'));
      params.push(`${name}:(${compiled})`);
     }
    }
    text=text.trim();
    if(params.length&&korean.test(text)){
     const key=keyFor(text);collect?.(key,text,file,group[0].getStart(sf));
     if(compile)edits.push({start:group[0].getStart(sf),end:group.at(-1).end,text:`{__st_t(${JSON.stringify(key)},{${params.join(',')}})}`});
     for(const child of group)covered.add(child);
    }
    group=[];
   };
   for(const child of n.children){
    const e=ts.isJsxExpression(child)?child.expression:undefined;
    const primitive=e&&(ts.isIdentifier(e)||ts.isPropertyAccessExpression(e)||ts.isElementAccessExpression(e)||ts.isNumericLiteral(e)||ts.isStringLiteral(e))&&!/\b(children|icon|body|header|footer|detail)\b/.test(e.getText(sf));
    if(ts.isJsxText(child)||primitive)group.push(child);else flush();
   }
   flush();
  }
  if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(sf)==='option'&&!n.openingElement.attributes.properties.some(p=>p.name?.getText(sf)==='value')){
   const parts=n.children.filter(c=>!ts.isJsxText(c)||c.text.trim());
   if(parts.length===1){
    const value=ts.isJsxExpression(parts[0])?parts[0].expression?.getText(sf):JSON.stringify(parts[0].getText(sf).trim());
    if(value&&compile)edits.push({start:n.openingElement.end-1,end:n.openingElement.end-1,text:` value={${value}}`});
   }
  }
  if(file.endsWith('/report.ts')&&ts.isCallExpression(n)&&n.expression.getText(sf)==='esc'&&n.arguments.length===1&&n.arguments[0].getText(sf)==='p'){
   if(compile)edits.push({start:n.getStart(sf),end:n.end,text:'esc(__st_label(p))'});
   return;
  }
  if(ts.isElementAccessExpression(n)&&labelPath.test(n.expression.getText(sf))){
   if(compile)edits.push({start:n.getStart(sf),end:n.end,text:`__st_label(${n.getText(sf)})`});
   return;
  }
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&['toLocaleString','toLocaleDateString'].includes(n.expression.name.text)&&n.arguments[0]?.getText(sf).includes('ko-KR')){
   if(compile)edits.push({start:n.getStart(sf),end:n.end,text:`__st_date(${n.expression.expression.getText(sf)},${n.expression.name.text==='toLocaleString'?'{dateStyle:"medium",timeStyle:"short"}':'{dateStyle:"medium"}'})`});
   return;
  }
  if(ts.isJsxText(n)){
   const s=n.text.replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).join(' ');
   add(s,n,k=>`{__st_t(${JSON.stringify(k)})}`);return;
  }
  if(ts.isJsxAttribute(n)&&n.initializer&&ts.isStringLiteral(n.initializer)){
   if(!['value','defaultValue'].includes(n.name.getText(sf)))add(n.initializer.text,n.initializer,k=>`{__st_t(${JSON.stringify(k)})}`);
   return;
  }
  if(ts.isTemplateExpression(n)){
   let s=n.head.text,params=[];
   n.templateSpans.forEach((span,i)=>{
    const name='value'+(i+1);s+='{'+name+'}'+span.literal.text;
    const wrapper='function __expression(){return ('+span.expression.getText(sf)+');}';
    const transformed=transformStudio(wrapper,file,collect,compile);
    const expression=transformed.slice(transformed.indexOf('return (')+8,transformed.lastIndexOf(');}'));
    params.push(`${name}:(${expression})`);
   });
   if(korean.test(s)&&!rawValue(n)){
    add(s,n,k=>`__st_t(${JSON.stringify(k)},{${params.join(',')}})`);return;
   }
  }
  if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)){
   if(!rawValue(n)&&!ts.isLiteralTypeNode(n.parent)&&!ts.isImportDeclaration(n.parent)&&!ts.isExportDeclaration(n.parent)){
    const s=n.text;
    if(!canonical.has(s)&&!staticContext(n))add(s,n);
    else if(korean.test(s))collect?.(keyFor(s),s,file,n.getStart(sf));
   }
   return;
  }
  // Translate static label maps and canonical option labels at their display boundary.
  // User-authored fields, input values and record structures stay untouched.
  if(ts.isJsxExpression(n)&&n.expression&&n.parent&&ts.isJsxElement(n.parent)){
   const e=n.expression,txt=e.getText(sf);
   const user=entered.test(txt)&&!labelPath.test(txt)||ts.isIdentifier(e)&&!['l','label','status','stage','target','axis','kind','tone','unit','answer','support','helpLabel'].includes(txt);
   if(compile){
    const wrapper=transformStudio('function __expression(){return ('+txt+');}',file,collect,true);
    const translated=wrapper.slice(wrapper.indexOf('return (')+8,wrapper.lastIndexOf(');}'));
    const option=n.parent.openingElement.tagName.getText(sf)==='option';
    const protectedOption=option&&(entered.test(txt)||txt.startsWith('localeNames['));
    edits.push({start:e.getStart(sf),end:e.end,text:protectedOption?translated:`${option?'__st_label':user?'__st_raw':'__st_label'}(${translated})`});return;
   }
  }
  ts.forEachChild(n,visit);
 };
 visit(sf);
 if(!compile)return code;
 let result=code;
 for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
 return `import {t as __st_t,label as __st_label,intlDate as __st_date,rawText as __st_raw} from ${JSON.stringify(new URL('./runtime.ts',import.meta.url).pathname)};\n`+result;
}
export default function studioI18n(){return {name:'studio-keyed-i18n',enforce:'pre',transform(code,id){
 const file=id.split('?')[0];
 if(!file.includes('/src/studio/')||file.includes('/i18n/')||file.endsWith('/task-copy.ts')||!/\.(tsx?|jsx?)$/.test(file))return;
 return {code:transformStudio(code,file),map:null};
}};}
