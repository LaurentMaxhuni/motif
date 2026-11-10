import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {localEndpoint,readBounded,imageData,fail,text} from './core.ts';
import type { openStore } from './core.ts';
import type { Settings } from '../src/lib/types.ts';

export const imageProviders=['local','unsloth','cloudflare'];
export const cloudflareModel='@cf/black-forest-labs/flux-1-schnell';
export function imageSettings(settings: Omit<Partial<Settings>, 'imageProvider'> & { imageProvider?: unknown }){
  const imageProvider=settings.imageProvider??'local';
  if(!imageProviders.includes(imageProvider as string))fail('Unknown image provider.');
  const cloudflareAccountId=text(settings.cloudflareAccountId||'',32);
  if((cloudflareAccountId||imageProvider==='cloudflare')&&!/^[a-f0-9]{32}$/i.test(cloudflareAccountId))fail('Enter your 32-character Cloudflare account ID.');
  return {imageProvider: imageProvider as NonNullable<Settings['imageProvider']>,cloudflareAccountId,unslothImageEndpoint:localEndpoint(settings.unslothImageEndpoint||'http://127.0.0.1:8888/v1'),unslothImageModel:text(settings.unslothImageModel||'',200)};
}
export const imageReady=(settings: Partial<Settings>)=>settings.imageProvider==='cloudflare'?/^[a-f0-9]{32}$/i.test(settings.cloudflareAccountId||''):Boolean(settings.imageProvider==='unsloth'?settings.unslothImageModel:settings.imageModel);
export const imageLabel=(settings: Partial<Settings>)=>settings.imageProvider==='cloudflare'?'Cloudflare FLUX.1 Schnell':settings.imageProvider==='unsloth'?`Unsloth · ${settings.unslothImageModel||''}`:settings.imageModel;

function encodedImage(raw: unknown){
  if(typeof raw!=='string'||!raw)fail('Image server must return b64_json image data. Remote image URLs are not fetched.',502);
  if(raw.startsWith('data:'))return imageData(raw);
  if(raw.length>7000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))fail('Image response exceeded size limit or contained invalid base64.',502);
  const bytes=Buffer.from(raw,'base64');
  const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpeg':bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'?'webp':'';
  if(!mime)fail('Image response is not a supported PNG, JPEG or WebP image.',502);
  return imageData(`data:image/${mime};base64,${raw}`);
}
function requestFailure(provider,status){
  const name=provider==='cloudflare'?'Cloudflare':provider==='unsloth'?'Unsloth Studio':'Local image server';
  if([401,403].includes(status))fail(`${name} rejected the API key or token. Check its permissions and account.`,502);
  if(status===429)fail(`${name} quota or rate limit reached. Try again after the limit resets.`,502);
  if(provider==='unsloth'&&status===503)fail('Load a supported text-to-image model in Unsloth Studio before generating.',502);
  if(status===404)fail(`${name} image API was not found. Check the base URL and server version.`,502);
  fail(`${name} is unavailable or rejected this request (HTTP ${status}). Check the selected image model.`,502);
}
interface ImageRequestOptions {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function request(url: string,body: unknown,apiKey: string,provider: string,{fetchImpl=fetch,signal,timeoutMs=180000}: ImageRequestOptions={}){
  try{
    const response=await fetchImpl(url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(apiKey?{Authorization:`Bearer ${apiKey}`}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs)});
    if(!response.ok){await response.body?.cancel().catch(()=>{});requestFailure(provider,response.status)}
    if(response.headers.get('content-type')?.startsWith('image/')){
      const chunks=[];let size=0;
      for await(const chunk of response.body){size+=chunk.length;if(size>5000000)fail('Image response exceeded size limit.',502);chunks.push(Buffer.from(chunk))}
      return {binary:Buffer.concat(chunks).toString('base64')};
    }
    const raw=await readBounded(response,7000000);
    try{const result=JSON.parse(raw);if(!result||typeof result!=='object'||Array.isArray(result))fail('Image server returned invalid JSON.',502);return result}catch{fail('Image server returned invalid JSON.',502)}
  }catch(error){
    if(error.status)throw error;
    fail(signal?.aborted?'Image request cancelled.':error.name==='TimeoutError'?'Image generation timed out. Try a faster model.':'Cannot reach the image provider. Check its URL, server and credentials.',502);
  }
}
function keyValue(value: unknown){
  if(typeof value!=='string'||value.length>4000||/[^\x21-\x7e]/.test(value))fail('API key must be a token without spaces or line breaks.');
  return value;
}
export async function generateProviderImage(settings: Partial<Settings>,rawPrompt: unknown,{apiKey='',fetchImpl=fetch,signal,timeoutMs}: ImageRequestOptions & { apiKey?: string }={}){
  const config={...settings,...imageSettings(settings)},provider=config.imageProvider;
  const prompt=text(rawPrompt,provider==='cloudflare'?2048:4000);if(!prompt)fail('Describe the image to generate.');
  if(apiKey)keyValue(apiKey);
  if(provider==='cloudflare'){
    if(!apiKey)fail('Add a Cloudflare API token in Settings first.');
    const result=await request(`https://api.cloudflare.com/client/v4/accounts/${config.cloudflareAccountId}/ai/run/${cloudflareModel}`,{prompt,steps:4},apiKey,provider,{fetchImpl,signal,timeoutMs});
    if(result.success===false)fail('Cloudflare rejected image generation. Check account permissions, quota and model availability.',502);
    return encodedImage(result.binary||result.result?.image);
  }
  const model=provider==='unsloth'?config.unslothImageModel:config.imageModel;
  if(!model)fail('Choose an image model in Settings first.');
  const endpoint=localEndpoint(provider==='unsloth'?config.unslothImageEndpoint:config.imageEndpoint);
  const result=await request(endpoint+'/images/generations',{model,prompt,n:1,size:'1024x1024',response_format:'b64_json'},apiKey,provider,{fetchImpl,signal,timeoutMs});
  return encodedImage(result.binary||result.data?.[0]?.b64_json);
}

export function createImageService({store,secretKey,fetchImpl=fetch}: { store: ReturnType<typeof openStore>; secretKey: Buffer; fetchImpl?: typeof fetch }){
  if(!Buffer.isBuffer(secretKey)||secretKey.length!==32)throw new Error('Image credentials require a 32-byte key.');
  store.db.exec('CREATE TABLE IF NOT EXISTS image_secrets (provider TEXT PRIMARY KEY, sealed TEXT NOT NULL)');
  function credentialStatus(){return Object.fromEntries(imageProviders.map(provider=>[provider,Boolean(store.db.prepare('SELECT 1 FROM image_secrets WHERE provider=?').get(provider))]))}
  function validateCredentials(input: Record<string, unknown>={}){
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(id=>!imageProviders.includes(id)))fail('Invalid image credentials.');
    return Object.entries(input).map(([id,value]): [string, string | null]=>[id,value===null?null:keyValue(value)]);
  }
  function saveCredentials(input?: Record<string, unknown>){
    const entries=validateCredentials(input);
    for(const [id,value]of entries){
      if(value===null)store.db.prepare('DELETE FROM image_secrets WHERE provider=?').run(id);
      else if(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secretKey,iv);cipher.setAAD(Buffer.from('image:'+id));const sealed=Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]).toString('base64');store.db.prepare('INSERT INTO image_secrets VALUES (?,?) ON CONFLICT(provider) DO UPDATE SET sealed=excluded.sealed').run(id,sealed)}
    }
  }
  function token(provider: string,overrides?: Record<string, string | null>){
    if(overrides&&Object.hasOwn(overrides,provider)&&overrides[provider]!=='' )return overrides[provider]||'';
    const row=store.db.prepare('SELECT sealed FROM image_secrets WHERE provider=?').get(provider);if(!row)return '';
    try{const raw=Buffer.from(row.sealed as string,'base64'),decipher=createDecipheriv('aes-256-gcm',secretKey,raw.subarray(0,12));decipher.setAAD(Buffer.from('image:'+provider));decipher.setAuthTag(raw.subarray(-16));return Buffer.concat([decipher.update(raw.subarray(12,-16)),decipher.final()]).toString('utf8')}
    catch{fail('Image credentials could not be decrypted. Re-enter the API key in Settings.',409)}
  }
  async function generate(settings: Partial<Settings>,prompt: unknown,overrides?: Record<string, string | null>){
    if(overrides)validateCredentials(overrides);
    return generateProviderImage(settings,prompt,{apiKey:token(settings.imageProvider||'local',overrides),fetchImpl});
  }
  function assertReady(settings: Partial<Settings>){
    imageSettings(settings);
    if(!imageReady(settings))fail('Choose an image model in Settings first.');
    if(settings.imageProvider==='cloudflare'&&!token('cloudflare'))fail('Add a Cloudflare API token in Settings first.');
  }
  async function models(settings: Partial<Settings>,overrides?: Record<string, string | null>){
    const config={...settings,...imageSettings(settings)};if(overrides)validateCredentials(overrides);
    if(config.imageProvider==='cloudflare')return [cloudflareModel];
    const endpoint=localEndpoint(config.imageProvider==='unsloth'?config.unslothImageEndpoint:config.imageEndpoint);
    const result=await request(endpoint+'/models',null,token(config.imageProvider,overrides),config.imageProvider,{fetchImpl,timeoutMs:10000});
    return (Array.isArray(result.data)?result.data:[]).filter(model=>typeof model.id==='string').map(model=>model.id).slice(0,200);
  }
  return {credentialStatus,validateCredentials,saveCredentials,assertReady,generate,models};
}
