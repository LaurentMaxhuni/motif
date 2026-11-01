import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeWebsite } from '../lib/analysis.js'
import { brandInput } from '../lib/core.js'

const root='https://quality.example/'
function fixture(documents){const calls=[];return {calls,fetchDocument:async url=>{calls.push(url);if(!(url in documents))throw Object.assign(new Error('Missing'),{statusCode:404});return {html:documents[url],url}}}}
const home='<title>Acme</title><meta property="og:site_name" content="Acme"><main><h1>Practical software for busy teams</h1><p>We build scheduling software for independent teams who want to simplify their work.</p></main>'

test('business pages outrank legal/editorial keyword matches and legal headings never become products',async()=>{
  const network=fixture({[root]:home+'<a href="/policies/terms-of-service">Terms</a><a href="/blog/about-solutions">Blog</a><a href="/products/widget">Widget</a>',[root+'policies/terms-of-service']:'<title>Terms</title><h1>Terms and conditions</h1>',[root+'blog/about-solutions']:'<title>Blog</title><h1>Our product story</h1>',[root+'products/widget']:'<title>Widget | Acme</title><main><h1>Widget</h1><p>A useful shared calendar for busy independent teams.</p></main>'})
  const result=await analyzeWebsite({url:root,maxPages:2},{},network)
  assert.equal(result.analysis.pages[1].url,root+'products/widget')
  assert.ok(!/Terms and conditions|Our product story/.test(result.product));assert.match(result.product,/Widget/)
});

test('same-origin sitemap indexes discover query-bearing children within policy and budgets',async()=>{
  const network=fixture({[root]:home,[root+'robots.txt']:'User-agent: *\nDisallow: /blocked\nSitemap: '+root+'sitemap.xml',[root+'sitemap.xml']:`<sitemapindex><sitemap><loc>${root}sitemap_products.xml?from=1&amp;to=10</loc></sitemap><sitemap><loc>${root}sitemap_products.xml?from=1&amp;to=10</loc></sitemap><sitemap><loc>https://outside.example/private.xml</loc></sitemap><sitemap><loc>${root}blocked/map.xml</loc></sitemap></sitemapindex>`,[root+'sitemap_products.xml?from=1&to=10']:`<urlset><url><loc>${root}products/widget</loc></url></urlset>`,[root+'products/widget']:'<title>Widget | Acme</title><main><h1>Widget</h1><p>A useful shared calendar for busy independent teams.</p></main>'})
  const result=await analyzeWebsite({url:root,maxPages:2},{},network)
  assert.ok(network.calls.includes(root+'sitemap_products.xml?from=1&to=10'));assert.equal(network.calls.filter(u=>u.includes('?from')).length,1)
  assert.ok(!network.calls.some(u=>u.includes('outside.example')||u.includes('/blocked/')))
  assert.equal(result.analysis.pages.length,2);assert.ok(result.analysis.coverage.requests<=36)
});

test('nested structured products beat UI slogans and deduplicate before limits',async()=>{
  const schema={'@context':'https://schema.org','@type':'ItemList',itemListElement:[{'@type':'ListItem',item:{'@type':'Product',name:'Linen shirt',description:'A breathable linen shirt made for everyday comfort.'}},{'@type':'ListItem',item:{'@type':'Product',name:'Linen shirt',description:'A breathable linen shirt made for everyday comfort.'}},{'@type':'NotAProduct',name:'Fake item'}]}
  const page=home+`<script type="application/ld+json">${JSON.stringify(schema)}</script><h2>Added to Cart</h2><h2>Compare our styles</h2>`
  const network=fixture({[root]:page+'<a href="/products/shirt">Shop</a>',[root+'products/shirt']:page})
  const result=await analyzeWebsite({url:root,maxPages:2},{},network)
  assert.equal(result.product,'Linen shirt');assert.equal(result.analysis.findings.products.length,1)
  assert.ok(result.analysis.findings.products[0].sourceUrls.length===2)
  assert.ok(result.analysis.evidence.some(e=>e.quote==='Linen shirt'))
  assert.doesNotThrow(()=>brandInput(result))
});

test('brand identity from analyzed pages beats a generic deep-link page title',async()=>{
  const network=fixture({[root+'pricing']:'<title>Pricing | Acme</title><main><h1>Choose your plan</h1><p>Choose the scheduling plan that fits your team and business.</p><a href="/">Home</a></main>',[root]:home})
  const result=await analyzeWebsite({url:root+'pricing',maxPages:2},{},network)
  assert.equal(result.name,'Acme');assert.ok(result.analysis.evidence.find(e=>e.claim==='name: Acme').sourceUrls.includes(root))
});

test('brand color declaration hints beat repeated neutral chrome without hiding observations',async()=>{
  const network=fixture({[root]:home+'<style>body{color:#222;background:#fff}.a{color:#fff}.b{color:#222}:root{--primary:#222;--accent:#222;--brand:#7c3aed}</style>'})
  const result=await analyzeWebsite({url:root,maxPages:1},{},network)
  assert.equal(result.colors[0],'#7c3aed');assert.ok(result.analysis.findings.visualIdentity.palette.some(c=>c.color==='#ffffff'))
  assert.match(result.analysis.findings.visualIdentity.palette[0].role,/brand|declaration/i)
});

test('HTTP 200 challenge/empty documents are not mistaken for business research',async()=>{
  for(const html of ['<html><title>Just a moment...</title><body><div id="cf-challenge-running">Checking your browser before proceeding.</div></body></html>','<html><title>Acme</title><body><div id="root"></div><script src="/app.js"></script></body></html>']){
    await assert.rejects(analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:html})),/readable|challenge|JavaScript/i)
  }
  const result=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:'<title>Security challenge solutions | Acme</title><main><h1>Meet your next security challenge</h1><p>We help teams solve security challenges with practical products and expert support.</p></main>'}))
  assert.equal(result.analysis.pages.length,1)
});

test('a local synthesis adapter that ignores cancellation cannot leave analysis hanging',async()=>{
  const controller=new AbortController();let started
  const synthesis=new Promise(resolve=>started=resolve)
  const result=analyzeWebsite({url:root,maxPages:1,useAI:true},{textEndpoint:'http://127.0.0.1:11434/v1'}, {...fixture({[root]:home}),signal:controller.signal,infer:()=>{started();return new Promise(()=>{})}})
  await synthesis;controller.abort();let timer
  const observed=await Promise.race([result.then(()=>null,error=>error),new Promise(resolve=>timer=setTimeout(()=>resolve('hung'),100))]);clearTimeout(timer)
  assert.notEqual(observed,'hung');assert.ok(observed instanceof Error)
});

test('real transport redirect callbacks and failed bytes count toward scan budgets',async()=>{
  const network=fixture({[root]:home+'<a href="/about">About</a>',[root+'about']:home})
  const result=await analyzeWebsite({url:root,maxPages:2},{},{fetchDocument:async(url,redirects,options)=>{
    options.onRequest(url)
    if(url===root){options.onRequest(url);options.onRequest(url);options.onBytes(500)}
    else if(url===root+'about')options.onBytes(300)
    return network.fetchDocument(url,redirects,options)
  }})
  assert.equal(result.analysis.coverage.requests,6);assert.equal(result.analysis.coverage.bytes,800)
});

test('metadata-only coverage is disclosed and products never come from untracked fallback headings',async()=>{
  const result=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:'<title>Acme</title><meta name="description" content="Scheduling software for independent teams."><div id="root"></div>'}))
  assert.equal(result.analysis.pages[0].quality,'metadata-only');assert.ok(result.analysis.warnings.some(w=>w.includes('Metadata-only')))
  assert.equal(result.product,'');assert.equal(result.analysis.findings.products.length,0)
});

test('sitemap cycles and query-specific robots restrictions cannot expand discovery indefinitely',async()=>{
  const network=fixture({[root]:home,[root+'robots.txt']:'User-agent: *\nDisallow: /private.xml?secret=\nSitemap: '+root+'sitemap.xml',[root+'sitemap.xml']:`<sitemapindex><sitemap><loc>${root}sitemap.xml</loc></sitemap><sitemap><loc>${root}private.xml?secret=1</loc></sitemap>${[1,2,3,4,5,6].map(i=>`<sitemap><loc>${root}child-${i}.xml</loc></sitemap>`).join('')}</sitemapindex>`,...Object.fromEntries([1,2,3,4,5,6].map(i=>[root+`child-${i}.xml`,'<urlset/>']))})
  const result=await analyzeWebsite({url:root,maxPages:1},{},network)
  assert.equal(network.calls.filter(url=>url.endsWith('/sitemap.xml')).length,1);assert.ok(!network.calls.some(url=>url.includes('secret=')))
  assert.ok(network.calls.filter(url=>url.includes('child-')).length<=3)
  assert.ok(result.analysis.warnings.some(w=>w.includes('sitemap-file limit')))
});

test('translations and repeated about pages do not crowd out product coverage',async()=>{
  const about='<title>About Acme</title><main><p>Our mission is to give independent businesses a useful shared calendar.</p></main>'
  const network=fixture({[root]:'<html lang="en">'+home+'<a href="/about-us">About</a><a href="/fr/about-us">French</a><a href="/de/about-us">German</a><a href="/use-cases/ad-generator">Use cases</a></html>',[root+'about-us']:about,[root+'fr/about-us']:about,[root+'de/about-us']:about,[root+'use-cases/ad-generator']:'<title>Ad Generator | Acme</title><main><h1>Ads for your business</h1><p>Create useful advertisements for your products with an easy local workflow.</p></main>'})
  const result=await analyzeWebsite({url:root,maxPages:3},{},network)
  assert.ok(result.analysis.pages.some(p=>p.url.endsWith('/use-cases/ad-generator')));assert.ok(!network.calls.includes(root+'fr/about-us'));assert.equal(result.product,'Ad Generator')
});

test('explicit product groups summarize variants while keeping their source evidence',async()=>{
  const schema={'@type':'ProductGroup',name:'Linen shirt',hasVariant:[{'@type':'Product',name:'Linen shirt blue size M'},{'@type':'Product',name:'Linen shirt red size L'}]}
  const result=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:home+`<script type="application/ld+json">${JSON.stringify(schema)}</script>`}))
  assert.equal(result.product,'Linen shirt');assert.equal(result.analysis.findings.products.length,1)
  assert.equal(result.analysis.pages[0].seo.schema.filter(s=>s.variantOf==='Linen shirt').length,2)
});

test('audience wording excludes incidental transaction statistics',async()=>{
  const result=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:home.replace('</main>','<p>Last year we processed forty billion dollars for businesses while maintaining uptime.</p></main>')}))
  assert.equal(result.audience,'')
  const explicit=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:home.replace('</main>','<p>Built for independent retailers who want to grow their business.</p></main>')}))
  assert.match(explicit.audience,/Built for independent retailers/)
});

test('catalog headings are candidates instead of a generic brand products title',async()=>{
  const page='<meta property="og:site_name" content="Acme"><title>Acme Products and Features</title><main><h1>Our products</h1><h2>For everyone</h2><h2>Scheduler</h2><p>Shared calendars for teams.</p><h2>Invoice manager</h2><p>Organize invoices.</p></main>'
  const result=await analyzeWebsite({url:root+'products',maxPages:1},{},fixture({[root+'products']:page}))
  assert.equal(result.product,'Scheduler; Invoice manager')
});

test('nested product manufacturers cannot replace the website brand through schema fallback',async()=>{
  const page='<title>Retailer | Buy Shoes</title><script type="application/ld+json">{"@type":"Product","name":"Trainer","brand":{"@type":"Organization","name":"ShoeMaker"}}</script><main><h1>Retailer shoes</h1></main>'
  const result=await analyzeWebsite({url:root,maxPages:1},{},fixture({[root]:page}))
  assert.equal(result.name,'Retailer');assert.equal(result.product,'Trainer')
});

test('later structured product evidence upgrades an earlier heading candidate',async()=>{
  const catalog='<title>Acme Products</title><main><h1>Products</h1><h2>Widget</h2></main><a href="/products/widget">Details</a>'
  const detail=home+'<script type="application/ld+json">{"@type":"Product","name":"Widget","description":"A reliable shared calendar."}</script>'
  const result=await analyzeWebsite({url:root+'products',maxPages:2},{},fixture({[root+'products']:catalog,[root+'products/widget']:detail}))
  const product=result.analysis.findings.products.find(p=>p.name==='Widget')
  assert.equal(product.source,'Structured publisher data');assert.equal(product.sourceUrl,root+'products/widget')
  assert.equal(product.description,'A reliable shared calendar.');assert.deepEqual(product.sourceUrls,[root+'products',root+'products/widget'])
});

test('name-only structured upgrades retain earlier descriptions with their own source',async()=>{
  const title=home.replace('<title>Acme</title>','<title>Widget | Acme</title><meta name="description" content="A reliable shared calendar.">')+'<a href="/products/widget/details">Details</a>'
  const detail=home+'<script type="application/ld+json">{"@type":"Product","name":"Widget"}</script>'
  const result=await analyzeWebsite({url:root+'products/widget',maxPages:2},{},fixture({[root+'products/widget']:title,[root+'products/widget/details']:detail}))
  const product=result.analysis.findings.products[0]
  assert.equal(product.source,'Structured publisher data');assert.equal(product.sourceUrl,root+'products/widget/details')
  assert.equal(product.description,'A reliable shared calendar.');assert.equal(product.descriptionSourceUrl,root+'products/widget')
});
