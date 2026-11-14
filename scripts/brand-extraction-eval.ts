import { parseArgs } from 'node:util'
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { analyzeWebsite } from '../lib/analysis.ts'
import { publicDocument,brandInput } from '../lib/core.ts'
import type { PublicDocument } from '../lib/core.ts'

const {values}=parseArgs({options:{live:{type:'boolean',default:false},captures:{type:'string'},out:{type:'string',default:'output/brand-evaluation'},url:{type:'string',multiple:true}}})
if(!values.live&&!values.captures)throw new Error('Use --live to contact public websites or --captures <directory> to replay recorded responses.')
if(values.live&&values.captures)throw new Error('Choose either --live or --captures, not both.')
const samples=values.url?.map((url,index)=>['site-'+(index+1),url])||[['marketing','https://tryholo.ai/'],['payments','https://stripe.com/'],['commerce','https://www.allbirds.com/'],['organization','https://www.mozilla.org/en-US/']]
if(samples.length>8)throw new Error('Evaluate at most eight websites per run.')
mkdirSync(values.out,{recursive:true})
const noise=/^(?:terms(?: and conditions)?|legal|support|company|added to cart|help us improve your .* experience)$/i
function metrics(result: Awaited<ReturnType<typeof analyzeWebsite>>){
 const products=result.analysis.findings.products,keys=products.map(p=>p.name.toLowerCase().trim()),draft=result.product.split(';').map(s=>s.trim()).filter(Boolean)
 return {name:result.name,pages:result.analysis.pages.length,readablePages:result.analysis.pages.filter(p=>p.wordCount>0).length,productFindings:products.length,duplicateProducts:keys.length-new Set(keys).size,chromeProducts:products.filter(p=>noise.test(p.name)).length,unsupportedDraftProducts:draft.filter(p=>!keys.includes(p.toLowerCase())).length,structuredProducts:products.filter(p=>p.source==='Structured publisher data').length,describedProducts:products.filter(p=>p.description).length,colors:result.colors,requests:result.analysis.coverage.requests,bytes:result.analysis.coverage.bytes}
}
type Capture = { url: string } & (
  { result: PublicDocument; error?: undefined } |
  { result?: undefined; error: { message: string; status?: number; statusCode?: number } }
)
const records=await Promise.all(samples.map(async([key,url])=>{
 const calls: Capture[]=[],missing: string[]=[],capture=values.captures?new Map((JSON.parse(readFileSync(join(values.captures,key+'-captures.json'),'utf8')) as Capture[]).map(c=>[c.url,c])):null
 const fetchDocument: typeof publicDocument=async(...args)=>{
  if(capture){const found=capture.get(args[0]);if(!found){missing.push(args[0]);throw Object.assign(new Error('URL absent from fixed capture'),{statusCode:404})}if(found.error)throw Object.assign(new Error(found.error.message),found.error);return found.result}
  try{const result=await publicDocument(...args);calls.push({url:args[0],result});return result}catch(error){calls.push({url:args[0],error:{message:error.message,status:error.status,statusCode:error.statusCode}});throw error}
 }
 const started=Date.now();let record
 try{
  const result=await analyzeWebsite({url,maxPages:5,useAI:false},{},{fetchDocument});brandInput(result)
  record={key,url,mode:values.live?'live':'fixed-capture',elapsedMs:Date.now()-started,saveable:true,...metrics(result),missingCaptureUrls:missing.length,result}
 }catch(error){record={key,url,mode:values.live?'live':'fixed-capture',elapsedMs:Date.now()-started,error:error.message,missingCaptureUrls:missing.length}}
 writeFileSync(join(values.out,key+'-result.json'),JSON.stringify(record,null,2))
 if(values.live)writeFileSync(join(values.out,key+'-captures.json'),JSON.stringify(calls))
 const {result,...summary}=record;console.log(JSON.stringify(summary));return summary
}))
writeFileSync(join(values.out,'summary.json'),JSON.stringify(records,null,2))
if(records.some(r=>r.error||!r.saveable))process.exitCode=1
