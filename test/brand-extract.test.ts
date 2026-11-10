import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPage, extractStyles } from '../lib/brand-extract.ts';

test('extracts content after removing chrome while preserving article hero headers and crawl links', () => {
  const page = extractPage(`<html lang="fr"><nav><h2>All products</h2><a href="/services?ref=nav">Services</a></nav>
    <header><p>Navigation navigation navigation</p></header><main><article><header><h1>Créer ensemble</h1><p>Beautiful brands for independent people.</p></header>
    <p>Ads.</p><p>Ads that help.</p><a href="/start">Get started</a></article></main>
    <div id="cookie-consent"><h2>Cookie preferences</h2><button>Start cookies</button></div>
    <div class="cart-drawer"><h2>Your shopping cart</h2></div><div style="display:none"><h2>Hidden product</h2></div>
    <template><h2>Template product</h2></template><footer><h3>Footer product</h3></footer></html>`, 'https://example.com/');
  assert.deepEqual(page.headings, [{level: 1, text: 'Créer ensemble'}]);
  assert.ok(page.excerpt.includes('Ads. Ads that help.'));
  assert.ok(!/cookies|shopping|Hidden|Navigation/.test(page.excerpt));
  assert.deepEqual(page.ctas, ['Get started']);
  assert.ok(page.links.some(link => link.url === 'https://example.com/services'));
  assert.equal(page.seo.language, 'fr');
});

test('reads nested schema and metadata identity without treating publishers as products', () => {
  const page = extractPage(`<html><head><meta name="twitter:title" content="Acme Studio"><meta name="twitter:description" content="Design for people.">
    <meta name="twitter:image" content="/card.png?size=large"><script type="application/ld+json">${JSON.stringify({ '@graph': [
      {'@type':'WebSite',name:'Acme',description:'A human studio.',publisher:{'@type':'Organization',name:'Acme Inc',logo:{'@type':'ImageObject',url:'/logo.svg?v=2'}}},
      {'@type':'OfferCatalog',name:'Services',itemListElement:[{'@type':'Offer',itemOffered:{'@type':['https://schema.org/Product','SoftwareApplication'],name:'Acme Editor',description:'Edit every detail.',url:'/editor?ref=schema'}}]},
      {'@type':'NotAProduct',name:'Ignore this'}
    ]})}</script></head><body><main><h1>Welcome</h1></main></body></html>`, 'https://example.com/');
  assert.equal(page.title, 'Acme Studio');
  assert.equal(page.description, 'Design for people.');
  assert.equal(page.siteName, 'Acme');
  assert.ok(page.seo.schema.some(item => item.name === 'Acme Editor' && item.description === 'Edit every detail.' && item.url === 'https://example.com/editor'));
  assert.equal(page.seo.schema.find(item => item.name === 'Acme Editor').type, 'Product, SoftwareApplication');
  assert.ok(page.visuals.logos.some(logo => logo.url === 'https://example.com/logo.svg?v=2'));
  assert.equal(page.visuals.socialImage, 'https://example.com/card.png?size=large');
});

test('parses only declaration colors including modern opaque syntax and semantic hints', () => {
  const styles = extractStyles(`/* #deadbe */ #abcdef { --brand: #f80; --primary-color: rgb(100% 0% 0% / 100%); --accent: hsl(120deg 100% 50%); color:#123f; background:linear-gradient(#112233ff,rgba(0,0,255,1)); border-color:#0008; outline:rgb(10 20 30 / .5); filter:url('/#abacab'); font-family: "Avenir Next", sans-serif; }
    .x { background: hsl(.5turn 100% 50% / 1); color: rgb(10, 20, 30); }`);
  assert.deepEqual(styles.colors, ['#ff8800','#ff0000','#00ff00','#112233','#0000ff','#00ffff','#0a141e']);
  assert.deepEqual(styles.fonts, ['"Avenir Next",sans-serif']);
  assert.deepEqual(styles.colorSignals, [
    {color:'#ff8800',role:'brand',weight:3}, {color:'#ff0000',role:'primary',weight:3}, {color:'#00ff00',role:'accent',weight:3}
  ]);
});

test('bounds schema traversal, keeps schema text exact, and extracts srcset logos', () => {
  let nested: Record<string, unknown> = {'@type':'Product',name:'Too deep'};
  for (let i=0;i<100;i++) nested={child:nested};
  const page = extractPage(`<meta name="theme-color" content="#39f"><script type="application/ld+json">${JSON.stringify(nested)}</script><script type="application/ld+json">{bad}</script><img alt="Acme logo" srcset="/logo.png?x=1 1x, /logo@2x.png 2x"><main><p>Some real content.</p></main>`, 'https://example.com/');
  assert.equal(page.seo.schemaErrors, 1);
  assert.ok(!page.seo.schema.some(item=>item.name==='Too deep'));
  assert.equal(page.visuals.logos[0].url, 'https://example.com/logo.png?x=1');
  assert.deepEqual(page.visuals.colorSignals, [{color:'#3399ff',role:'theme',weight:3}]);
});

test('removes fixed navigation headers within main and preserves block text boundaries in headings', () => {
  const page = extractPage('<main><header class="fixed top-0"><h2>Features</h2><button>Try navigation</button></header><article><header><h1>Marketing<br>Department</h1></header><p>Real content.</p></article></main>', 'https://example.com/');
  assert.deepEqual(page.headings, [{level:1,text:'Marketing Department'}]);
  assert.ok(!page.excerpt.includes('Features'));
  assert.deepEqual(page.ctas, []);
  const responsive = extractPage('<main><h1><span>Marketing<br>Department.</span><span>Your<br>Team.</span></h1></main>', 'https://example.com/');
  assert.equal(responsive.headings[0].text, 'Marketing Department. Your Team.');
});

test('converts opaque OKLCH samples to sRGB and ignores translucent samples', () => {
  const result = extractStyles(':root { --primary:oklch(62.7955% .257683 29.2339); --accent:oklch(.8664396 .2948272 142.495); color:oklch(.5 0 0 / 100%); border-color:oklch(.5 0 0 / .3); background:oklch(.45201372 .31321437 264.052); }');
  assert.deepEqual(result.colors, ['#ff0000','#00ff00','#636363','#0000ff']);
  assert.deepEqual(result.colorSignals, [{color:'#ff0000',role:'primary',weight:3},{color:'#00ff00',role:'accent',weight:3}]);
  assert.deepEqual(extractStyles('a{color:oklch(.5 1e999 0);border-color:hsl(1e999 100% 50%)}').colors, []);
});

test('retains sibling main regions and substantial business sections outside a short hero main', () => {
  const sibling = extractPage('<main><h1>Brand Studio</h1><p>Thoughtful brands.</p></main><main><h2>Identity design</h2><p>Everything needed for your next launch.</p></main>', 'https://example.com/');
  assert.deepEqual(sibling.headings.map(h=>h.text), ['Brand Studio','Identity design']);
  assert.ok(sibling.excerpt.includes('Identity design'));
  const outside = extractPage('<main><h1>Brand Studio</h1><p>Thoughtful brands.</p></main><section><h2>Identity design</h2><p>Everything needed for your next launch. We research your market, explore the possibilities, and build your visual identity around your story.</p></section><footer><h2>Legal</h2></footer>', 'https://example.com/');
  assert.deepEqual(outside.headings.map(h=>h.text), ['Brand Studio','Identity design']);
  assert.ok(outside.excerpt.includes('research your market'));
  assert.ok(!outside.excerpt.includes('Legal'));
});

test('reads explicitly completed React streamed boundaries without executing scripts or exposing ordinary hidden UI', () => {
  const page = extractPage('<main><h1>Brand Studio</h1><!--$?--><template id="B:1"></template><p>Loading copy</p><!--/$--></main><div hidden id="S:1"><section><h2>Identity design</h2><p>Build your brand around your story.</p></section></div><div hidden id="S:2"><h2>Unfinished section</h2></div><div hidden><h2>Hidden UI</h2></div><script>$RC("B:1","S:1")</script><script>throw new Error("never execute")</script>', 'https://example.com/');
  assert.deepEqual(page.headings.map(h=>h.text), ['Brand Studio','Identity design']);
  assert.ok(!/Loading|Unfinished|Hidden/.test(page.excerpt));
  assert.equal(page.streamedBoundaries, 1);
  assert.match(page.extractionNotes[0], /Statically assembled 1 completed React HTML boundaries/);
  assert.equal(page.contentScope, 'main');
});

test('records explicit product variant parents without inferring relationships from names', () => {
  const graph = [
    {'@type':'ProductGroup',name:'Natural Runner',hasVariant:[{'@type':'Product',name:'Natural Runner size 8',offers:{'@type':'Offer',name:'Size 8 price'}},{'@type':'Product',name:'Natural Runner size 9'}]},
    {'@type':'Product',name:'Natural Runner size 10'},
    {'@type':'Product',name:'Another shoe',isVariantOf:{'@type':'ProductGroup',name:'Natural Runner'}},
    {'@type':'Organization',name:'Publisher',hasVariant:{'@type':'Product',name:'No group relationship'}}
  ];
  const page = extractPage(`<script type="application/ld+json">${JSON.stringify({'@graph':graph})}</script><main><h1>Our shoes</h1></main>`, 'https://example.com/');
  const byName = name => page.seo.schema.find(item=>item.name===name);
  assert.equal(byName('Natural Runner size 8').variantOf, 'Natural Runner');
  assert.equal(byName('Natural Runner size 9').variantOf, 'Natural Runner');
  assert.equal(byName('Another shoe').variantOf, 'Natural Runner');
  assert.equal(byName('Natural Runner size 10').variantOf, undefined);
  assert.equal(byName('Size 8 price').variantOf, undefined);
  assert.equal(byName('No group relationship').variantOf, undefined);
  assert.equal(page.seo.schema.length, 9);
});

test('keeps nested product brands as evidence without promoting them to site identity', () => {
  const product = {'@type':'Product',name:'Trainer',brand:{'@type':'Organization',name:'ShoeMaker',description:'Makes shoes.',logo:'/manufacturer.svg'}};
  const page = extractPage(`<title>Retailer</title><script type="application/ld+json">${JSON.stringify(product)}</script><main><h1>Retailer</h1></main>`, 'https://example.com/');
  assert.equal(page.siteName, '');
  assert.equal(page.description, '');
  assert.equal(page.title, 'Retailer');
  assert.equal(page.seo.schema.find(item=>item.name==='ShoeMaker').identityEligible, false);
  assert.ok(!page.visuals.logos.some(logo=>logo.url.endsWith('/manufacturer.svg')));
  const owned = extractPage(`<script type="application/ld+json">${JSON.stringify({'@graph':[product,{'@type':'WebSite',publisher:{'@type':'Organization',name:'Retailer',description:'Your independent shop.',logo:'/retailer.svg'}}]})}</script><main><h1>Retailer</h1></main>`, 'https://example.com/');
  assert.equal(owned.siteName, 'Retailer');
  assert.equal(owned.description, 'Your independent shop.');
  assert.equal(owned.seo.schema.find(item=>item.name==='Retailer').identityEligible, true);
  assert.equal(owned.seo.schema.find(item=>item.name==='ShoeMaker').identityEligible, false);
  assert.ok(owned.visuals.logos.some(logo=>logo.url.endsWith('/retailer.svg')));
});
