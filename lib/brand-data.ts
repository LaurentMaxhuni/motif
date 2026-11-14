import type { Brand } from '../src/lib/types.ts';

export function analysisInput(value){
  if(value===undefined||value===null)return undefined;
  const invalid=()=>{throw Object.assign(new Error('Invalid or oversized Brand DNA analysis.'),{status:400});};
  if(typeof value!=='object'||Array.isArray(value))invalid();
  const object=item=>item&&typeof item==='object'&&!Array.isArray(item);
  const url=raw=>{try{const parsed=new URL(raw);return typeof raw==='string'&&raw.length<=2000&&['http:','https:'].includes(parsed.protocol)&&!parsed.username&&!parsed.password;}catch{return false;}};
  if(!['extraction','local-ai','cli-ai'].includes(value.mode)||typeof value.analyzedAt!=='string'||!Number.isFinite(Date.parse(value.analyzedAt)))invalid();
  if(!Array.isArray(value.pages)||value.pages.length>20||!object(value.findings)||!object(value.coverage)||!Array.isArray(value.evidence)||!Array.isArray(value.warnings)||!value.warnings.every(w=>typeof w==='string'))invalid();
  if(!value.pages.every(p=>object(p)&&url(p.url)&&typeof p.title==='string'&&typeof p.description==='string'&&Array.isArray(p.headings)&&Number.isInteger(p.wordCount)&&p.wordCount>=0&&p.wordCount<=10_000_000))invalid();
  if(!value.evidence.every(e=>object(e)&&typeof e.claim==='string'&&['observed','inferred'].includes(e.kind)&&Array.isArray(e.sourceUrls)&&e.sourceUrls.every(url)&&(e.quote===undefined||typeof e.quote==='string')))invalid();
  let nodes=0;
  const check=(item,depth)=>{
    if(++nodes>30000||depth>12)invalid();
    if(item===null||typeof item==='boolean')return;
    if(typeof item==='number'){if(!Number.isFinite(item))invalid();return;}
    if(typeof item==='string'){if(item.length>50000)invalid();return;}
    if(Array.isArray(item)){if(item.length>500)invalid();for(const child of item)check(child,depth+1);return;}
    if(typeof item!=='object')invalid();
    for(const [key,child]of Object.entries(item)){if(['__proto__','constructor','prototype'].includes(key)||key.length>100)invalid();check(child,depth+1);}
  };
  check(value,0);const raw=JSON.stringify(value);if(raw.length>1_000_000)invalid();return JSON.parse(raw);
}

export function brandContext(brand: Omit<Brand, 'id' | 'version'> & { id?: string }){
  const {id,name,website,description,product,audience,voice,colors,goal,industry,language}=brand;
  const context={id,name,website,description,product,audience,voice,colors,goal,industry,language};
  if(brand.analysis)return {...context,research:{mode:brand.analysis.mode,findings:JSON.stringify(brand.analysis.findings||{}).slice(0,14000),evidence:(brand.analysis.evidence||[]).slice(0,18)}};
  return context;
}
