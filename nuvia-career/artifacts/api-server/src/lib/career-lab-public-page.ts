import {Resolver} from "node:dns/promises";
import {get} from "node:https";
import {isIPv4} from "node:net";

export function publicIpv4(ip:string){
  if(!isIPv4(ip))return false;
  const [a,b,c]=ip.split(".").map(Number);
  return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||
    (a===172&&b>=16&&b<=31)||(a===192&&(b===168||(b===0&&(c===0||c===2))||(b===88&&c===99)))||
    (a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
}

export function publicPageText(html:string) {
  return html.replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(script|style|noscript|template|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d{1,7}|#x[\da-f]{1,6});/gi, entity=>{
      const value=entity.toLowerCase(),named:Record<string,string>={"&nbsp;":" ","&amp;":"&","&quot;":'"',"&apos;":"'","&lt;":"<","&gt;":">"};
      if(named[value]!==undefined)return named[value];
      const hex=value.startsWith("&#x");
      const code=parseInt(value.slice(hex?3:2,-1),hex?16:10);
      return code>0&&code<=0x10ffff?String.fromCodePoint(code):" ";
    }).replace(/\s+/gu," ").trim();
}

/**
 * Optional evidence from the same public URL submitted to GPT. Never follow
 * redirects or execute scripts. Pin DNS lookup to a verified public IPv4 while
 * preserving TLS host/certificate checks. No cookies or service credentials.
 */
export async function readPublicLabPage(validated:string){
  const page=new URL(validated);
  if(page.protocol!=="https:"||page.username||page.password||page.port||page.hash)return "";
  try{
    const resolver=new Resolver({timeout:2200,tries:1});
    const addresses=await resolver.resolve4(page.hostname);
    if(!addresses.length||addresses.some(ip=>!publicIpv4(ip)))return "";
    const ip=addresses[0];
    const text=await new Promise<string>((resolve,reject)=>{
      const request=get(page,{
        agent:false,family:4,lookup:(_name,_options,done)=>done(null,ip,4),
        headers:{"Accept":"text/html,text/plain","Accept-Encoding":"identity","User-Agent":"NUVIA public citation verification"},
      },response=>{
        if(response.statusCode!==200||!/^text\/(?:html|plain)(?:;|$)/i.test(response.headers["content-type"]??"")||
          (response.headers["content-encoding"]&&response.headers["content-encoding"]!=="identity")){
          response.destroy();resolve("");return;
        }
        let n=0;
        const chunks:Buffer[]=[];
        response.on("data",(chunk:Buffer)=>{n+=chunk.length;if(n>384_000)request.destroy();else chunks.push(chunk);});
        response.on("aborted",()=>reject(Error("BODY_LIMIT")));
        response.on("error",reject);
        response.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));
      });
      const clock=setTimeout(()=>request.destroy(Error("PUBLIC_PAGE_TIMEOUT")),6500);
      request.on("error",reject);
      request.on("close",()=>clearTimeout(clock));
    });
    const visible=publicPageText(text);
    return visible.length>=80?visible.slice(0,100_000):"";
  }catch{return "";}
}
