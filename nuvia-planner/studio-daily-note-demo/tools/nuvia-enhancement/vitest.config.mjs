import ts from 'typescript';
export default {
 plugins:[{name:'isolated-regression-tsx',enforce:'pre',transform(code,id){
  if(id.endsWith('.tsx'))return {code:ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,map:null};
 }}],
 test:{include:['artifacts/nuvia-ui-review/src/official/tests/**/*.test.ts'],maxWorkers:2},
};
