/** Complete, deterministic JSON fingerprint, including nested arrays/objects.
 * This is a comparison representation, not a signature or authentication proof. */
export const stable=(v:unknown):string=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v)??'null';
