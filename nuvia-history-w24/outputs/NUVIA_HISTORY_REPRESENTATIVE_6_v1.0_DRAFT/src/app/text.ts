import labels from '../content/locales/app.ko.json';
export const ui=(key:string)=>{if(!(key in labels))throw Error('UI_TRANSLATION_MISSING:'+key);return labels[key as keyof typeof labels];};
