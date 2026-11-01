import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { fail, privateIP, readBounded, text } from './core.js';

const providers = ['buffer', 'metricool', 'zernio'];
export const providerCatalog = [
  { id:'buffer',name:'Buffer',docs:'https://developers.buffer.com',notes:'Personal API key and organizationId. Public image URLs; no local upload.' },
  { id:'metricool',name:'Metricool',docs:'https://app.metricool.com/resources/apidocs/index.html',notes:'Advanced or Custom API plan; token, userId and blogId. Text delivery only.' },
  { id:'zernio',name:'Zernio',docs:'https://docs.zernio.com',notes:'API key; optional profileId. Public image URLs; no local upload.' }
];
const limits = { facebook: 63206, instagram: 2200, linkedin: 3000, twitter: 280, threads: 500, bluesky: 300 };
const platformName = value => { const name=String(value || '').toLowerCase(); return ['x','x/twitter'].includes(name) ? 'twitter' : name; };
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,200}$/.test(value);
const metricFields = { facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedinCompany', twitter: 'twitter', threads: 'threads', bluesky: 'bluesky' };
const bufferQuery = 'query MotifChannels($input: ChannelsInput!) { channels(input: $input) { id name displayName service isDisconnected isLocked } }';
const bufferMutation = 'mutation MotifCreatePost($input: CreatePostInput!) { createPost(input: $input) { __typename ... on PostActionSuccess { post { id } } ... on MutationError { message } } }';

// Providers fetch media remotely. Validate before disclosing a URL; Motif never fetches it.
export async function publicMediaURL(value, resolve = lookup) {
  let url; try { url = new URL(value); } catch { fail('Enter a public HTTPS image URL.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443') || !host.includes('.') || /(?:^|\.)(localhost|local|internal|test|invalid|example)$/.test(host)) fail('Media must use a public HTTPS URL without credentials.');
  if ([...url.searchParams.keys()].some(key=>/token|password|secret|signature|credential|api[-_]?key|x-amz-|x-goog-|^sig$|^key$/i.test(key))) fail('Media URLs must not contain credentials or signed access tokens.');
  const addresses = isIP(host) ? [{ address: host }] : await resolve(host, { all: true }).catch(() => fail('Media hostname could not be verified.'));
  if (!addresses.length || addresses.some(x => privateIP(x.address))) fail('Private or special-use media addresses are blocked.');
  return url.href;
}

export function createConnectorService({ store, secretKey, fetchImpl = fetch, resolveMediaHost = lookup }) {
  if (!Buffer.isBuffer(secretKey) || secretKey.length !== 32) throw new Error('Connector encryption requires a 32-byte key.');
  store.db.exec('CREATE TABLE IF NOT EXISTS connector_secrets (id TEXT PRIMARY KEY, sealed TEXT NOT NULL);');
  function seal(token, id) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', secretKey, iv);
    cipher.setAAD(Buffer.from(id));
    return Buffer.concat([iv, cipher.update(token, 'utf8'), cipher.final(), cipher.getAuthTag()]).toString('base64');
  }
  function tokenFor(id) {
    try {
      const raw = Buffer.from(store.db.prepare('SELECT sealed FROM connector_secrets WHERE id=?').get(id).sealed, 'base64');
      const cipher = createDecipheriv('aes-256-gcm', secretKey, raw.subarray(0, 12));
      cipher.setAAD(Buffer.from(id)); cipher.setAuthTag(raw.subarray(-16));
      return Buffer.concat([cipher.update(raw.subarray(12, -16)), cipher.final()]).toString('utf8');
    } catch { fail('Connection credentials unavailable. Re-enter the API token.', 409); }
  }
  function scoped(id, brandId) {
    const c = store.get('connection', id);
    if (!brandId || c.brandId !== brandId) fail('Connection does not belong to this brand.', 404);
    return c;
  }
  const clean = c => ({ id:c.id, version:c.version, brandId:c.brandId, provider:c.provider, name:c.name, config:c.config, hasToken:true, createdAt:c.createdAt, updatedAt:c.updatedAt });
  const list = brandId => store.all('connection').filter(c => c.brandId === brandId).map(clean);
  function save(input) {
    store.get('brand', input.brandId);
    const old = input.id ? scoped(input.id, input.brandId) : null;
    if (!providers.includes(input.provider)) fail('Choose Buffer, Metricool, or Zernio.');
    if (old && old.provider !== input.provider) fail('Create a new connection to change provider.');
    const name = text(input.name || input.provider, 100);
    if (!name) fail('Connection name required.');
    const config = {};
    const keys = input.provider === 'metricool' ? ['userId', 'blogId'] : input.provider === 'buffer' ? ['organizationId'] : ['profileId'];
    for (const key of keys) {
      const value = input.config?.[key] ?? old?.config?.[key];
      if (value !== undefined && value !== '') { if (!safeId(String(value))) fail(`Invalid ${key}.`); config[key] = String(value); }
    }
    if (input.provider === 'metricool' && (!/^\d+$/.test(config.userId || '') || !/^\d+$/.test(config.blogId || ''))) fail('Metricool requires numeric userId and blogId (Advanced or Custom plan).');
    if (input.provider === 'buffer' && !config.organizationId) fail('Buffer organizationId required.');
    const token = input.token;
    if (token !== undefined && (typeof token !== 'string' || !/^[\x21-\x7e]{8,4096}$/.test(token))) fail('Enter a valid API token without spaces or line breaks.');
    if (!old && !token) fail('API token required.');
    store.db.exec('BEGIN IMMEDIATE');
    try {
      const c = store.save('connection', { brandId:input.brandId, provider:input.provider, name, config }, input.id, input.version);
      if (token) store.db.prepare('INSERT INTO connector_secrets VALUES (?,?) ON CONFLICT(id) DO UPDATE SET sealed=excluded.sealed').run(c.id, seal(token,c.id));
      store.db.exec('COMMIT'); return clean(c);
    } catch (e) { store.db.exec('ROLLBACK'); throw e; }
  }
  function remove(id, version, brandId) {
    scoped(id, brandId); store.db.exec('BEGIN IMMEDIATE');
    try { store.remove('connection',id,version); store.db.prepare('DELETE FROM connector_secrets WHERE id=?').run(id); store.db.exec('COMMIT'); }
    catch(e) { store.db.exec('ROLLBACK'); throw e; }
  }
  function metricURL(c, path) {
    const u = new URL(`https://app.metricool.com/api${path}`);
    u.searchParams.set('userId',c.config.userId); u.searchParams.set('blogId',c.config.blogId); return u.href;
  }
  async function request(c, url, body, extraHeaders = {}) {
    const headers = { Accept:'application/json', 'Content-Type':'application/json', ...extraHeaders };
    const token = tokenFor(c.id);
    headers[c.provider === 'metricool' ? 'X-Mc-Auth' : 'Authorization'] = c.provider === 'metricool' ? token : `Bearer ${token}`;
    try {
      const response = await fetchImpl(url, { method:body === undefined ? 'GET' : 'POST', headers, ...(body === undefined ? {} : {body:JSON.stringify(body)}), redirect:'error', signal:AbortSignal.timeout(15000) });
      if (!response.ok) throw Object.assign(new Error(`Provider returned HTTP ${response.status}. Check credentials, plan, and permissions.`), { definitive:response.status >= 400 && response.status < 500 && response.status !== 408, status:502 });
      const result = JSON.parse(await readBounded(response, 1_000_000));
      if (c.provider === 'buffer' && result.errors?.length) throw Object.assign(new Error('Buffer rejected the GraphQL request. Check connection and content permissions.'), { definitive:!body?.query?.startsWith('mutation'), status:502 });
      return result;
    } catch(e) {
      if (e.definitive) throw e;
      throw Object.assign(new Error('Provider request did not return a confirmed result. Check the provider before trying again.'), { status:502 });
    }
  }
  async function accountsFor(c) {
    let accounts;
    if (c.provider === 'buffer') {
      const r = await request(c,'https://api.buffer.com',{ query:bufferQuery, variables:{input:{organizationId:c.config.organizationId}} });
      accounts = r.data?.channels?.filter(a=>!a.isDisconnected && !a.isLocked).map(a=>({id:a.id,name:a.displayName || a.name,platform:a.service}));
    } else if (c.provider === 'zernio') {
      const url = new URL('https://zernio.com/api/v1/accounts');
      if (c.config.profileId) url.searchParams.set('profileId',c.config.profileId);
      const r = await request(c,url.href);
      accounts = r.accounts?.filter(a=>a.isActive !== false).map(a=>({id:a._id,name:a.displayName || a.username,platform:a.platform}));
    } else {
      const r = await request(c,metricURL(c,'/admin/simpleProfiles'));
      const profile = (Array.isArray(r) ? r : r.data)?.find(a=>String(a.id ?? a.blogId) === c.config.blogId);
      if (!profile) fail('Metricool brand was not returned. Check blogId, userId, and plan.',502);
      accounts = Object.entries(metricFields).filter(([,field])=>profile[field]).map(([platform,field])=>({id:`${c.config.blogId}:${platform}`,name:String(profile[field]),platform}));
    }
    if (!Array.isArray(accounts)) fail('Provider returned an unexpected account response.',502);
    const token=tokenFor(c.id);
    return accounts.filter(a=>safeId(a.id) && !a.id.includes(token) && limits[platformName(a.platform)]).slice(0,500).map(a=>({id:a.id,name:String(a.name || a.id).slice(0,500).split(token).join('[redacted]'),platform:platformName(a.platform)}));
  }
  async function test(id,brandId) { const c=scoped(id,brandId); return { connectionId:id, provider:c.provider, accounts:await accountsFor(c), checkedAt:new Date().toISOString() }; }
  const deliveries = brandId => store.all('delivery').filter(d=>d.brandId === brandId);
  async function send(input) {
    const c=scoped(input.connectionId,input.brandId), content=store.get('content',input.contentId);
    if (content.brandId !== c.brandId) fail('Content does not belong to this brand.',404);
    if (!Number.isInteger(input.contentVersion) || !Number.isInteger(input.connectionVersion) || input.contentVersion !== content.version || input.connectionVersion !== c.version) fail('Content or connection changed since review. Reload and review before sending.',409);
    if (!['Approved','Ready','Scheduled'].includes(content.status)) fail('Approve content before sending it to a provider.',409);
    if (!['draft','schedule'].includes(input.mode)) fail('Choose draft or a future scheduled delivery.');
    const platform=platformName(input.platform);
    if (!limits[platform] || !safeId(input.accountId)) fail('Unsupported platform or invalid account.');
    if (platformName(content.channel) !== platform) fail('Selected account platform must match the content channel.');
    const body=text(content.body || content.headline || content.title,63206);
    if (!body || [...body].length > limits[platform]) fail(`Content exceeds the ${platform} text limit (${limits[platform]} characters).`);
    let scheduledAt='';
    if (input.mode === 'schedule') {
      if (typeof input.scheduledAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(input.scheduledAt) || !(Date.parse(input.scheduledAt) > Date.now()+60000)) fail('Schedule at least one minute in the future, with an explicit timezone.');
      scheduledAt=new Date(input.scheduledAt).toISOString();
    }
    const mediaUrl=input.mediaUrl ? await publicMediaURL(input.mediaUrl,resolveMediaHost) : '';
    if (mediaUrl && c.provider === 'metricool') fail('Metricool image delivery requires a verified mediaId workflow. Export the local creative and attach it in Metricool.');
    if (platform === 'instagram' && !mediaUrl) fail('Instagram requires a public image URL. Local images cannot be fetched by providers.');
    if (input.mode === 'schedule' && platform === 'instagram') fail('Instagram scheduling needs network-specific publishing settings. Send a draft for review instead.');
    const fingerprint=createHash('sha256').update(JSON.stringify([c.id,content.id,platform,input.accountId,input.mode,scheduledAt,body,mediaUrl])).digest('hex');
    const previous=deliveries(c.brandId).find(d=>d.fingerprint === fingerprint);
    if (previous) return { ...previous, duplicate:true };
    const accounts=await accountsFor(c);
    if (!accounts.some(a=>a.id === input.accountId && a.platform === platform)) fail('Choose a connected account returned by Test connection.');
    if (store.get('content',content.id).version !== content.version || scoped(c.id,c.brandId).version !== c.version) fail('Content or connection changed during review. Reload before sending.',409);
    if (scheduledAt && Date.parse(scheduledAt) <= Date.now()+30000) fail('Scheduled time is too close. Choose a later time.');
    // No await between duplicate check and journaling. Recheck after account lookup for concurrent clicks.
    const concurrent=deliveries(c.brandId).find(d=>d.fingerprint === fingerprint);
    if (concurrent) return { ...concurrent, duplicate:true };
    let delivery=store.save('delivery',{brandId:c.brandId,connectionId:c.id,contentId:content.id,contentVersion:content.version,provider:c.provider,accountId:input.accountId,platform,mode:input.mode,scheduledAt,fingerprint,status:'sending'});
    try {
      let remoteId;
      if (c.provider === 'buffer') {
        const payload={ channelId:input.accountId,text:body,schedulingType:'automatic',mode:input.mode === 'draft' ? 'addToQueue' : 'customScheduled',saveToDraft:input.mode === 'draft',needsApproval:false,assets:mediaUrl ? [{image:{url:mediaUrl}}] : [],...(scheduledAt ? {dueAt:scheduledAt} : {}) };
        const r=await request(c,'https://api.buffer.com',{query:bufferMutation,variables:{input:payload}});
        if (r.data?.createPost?.__typename !== 'PostActionSuccess') throw Object.assign(new Error('Buffer rejected the post. Review channel requirements in Buffer.'),{definitive:!!r.data?.createPost?.__typename});
        remoteId=r.data.createPost.post?.id;
      } else if (c.provider === 'zernio') {
        const r=await request(c,'https://zernio.com/api/v1/posts',{content:body,platforms:[{platform,accountId:input.accountId}],isDraft:input.mode === 'draft',publishNow:false,...(scheduledAt ? {scheduledFor:scheduledAt,timezone:'UTC'} : {}),...(mediaUrl ? {mediaItems:[{type:'image',url:mediaUrl}]} : {})},{'Idempotency-Key':delivery.id});
        remoteId=r.post?._id;
      } else {
        const r=await request(c,metricURL(c,'/v2/scheduler/posts'),{text:body,providers:[{network:platform}],draft:input.mode === 'draft',publicationDate:{dateTime:(scheduledAt || new Date(Date.now()+86400000).toISOString()).slice(0,19),timezone:'UTC'},autoPublish:input.mode === 'schedule'});
        remoteId=r.data?.id;
      }
      if (!safeId(String(remoteId ?? '')) || String(remoteId).includes(tokenFor(c.id))) throw new Error('Unconfirmed response');
      delivery=store.save('delivery',{...delivery,status:input.mode === 'draft' ? 'draft' : 'scheduled',remoteId:String(remoteId)},delivery.id,delivery.version);
    } catch(e) {
      delivery=store.save('delivery',{...delivery,status:e.definitive ? 'failed' : 'uncertain',error:e.definitive ? 'Provider rejected delivery. Check credentials, permissions, and network requirements.' : 'Outcome unconfirmed. Check the provider before any new delivery; no automatic retry.'},delivery.id,delivery.version);
    }
    return delivery;
  }
  return { list,save,remove,test,send,deliveries };
}
