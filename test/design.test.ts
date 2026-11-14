import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designInput, designDocument } from '../lib/design.ts';
import { fixtureDesign,fixturePNG } from './fixtures.ts';

test('HTML/CSS contract preserves flexible layout and editable placeholders',()=>{
  const design=designInput(fixtureDesign);assert.match(design.html,/\{\{headline\}\}/);assert.match(design.css,/position:absolute/);
  const document=designDocument({title:'Example',design,headline:'<img src=x onerror=alert(1)>',cta:'Explore',subhead:'A real caption',image:`data:image/png;base64,${fixturePNG().toString('base64')}`},{name:'Test & Co'});
  assert.ok(document.includes('&lt;img src=x onerror=alert(1)&gt;'));assert.ok(document.includes('Test &amp; Co'));assert.match(document,/img-src data:/);assert.ok(!document.includes('{{headline}}'));
});
test('reject active HTML, external assets and attribute injection',()=>{
  for(const html of ['<script>alert(1)</script>','<iframe src="file:///secret"></iframe>','<svg onload="alert(1)"></svg>','<img src="http://localhost:3333/api/state">','<div style="background:red">x</div>','<div onclick="alert(1)">x</div>','<a href="https://example.com">x</a>'])assert.throws(()=>designInput({...fixtureDesign,html:fixtureDesign.html+html}));
});
test('reject CSS imports, URLs, escapes, dynamic resources, and malformed CSS',()=>{
  for(const css of ['@import "https://example.com/a.css";','.x{background:url(https://example.com)}','.x{background:u\\72l(https://example.com)}','@font-face{font-family:x;src:url(file:///secret)}','.x{background:image-set("https://example.com/a.png" 1x)}','.x{width:attr(data-secret px)}','.x{animation:spin 1s infinite}','@keyframes spin{to{opacity:0}}','.x{color:!}'])assert.throws(()=>designInput({...fixtureDesign,css}));
});
test('CSS text cannot terminate style element in exported document',()=>{
  const design=designInput({...fixtureDesign,css:fixtureDesign.css+'.ad:after{content:"</style><script>alert(1)</script>"}'});
  assert.ok(!design.css.includes('<'));const document=designDocument({design,headline:'Hello',cta:'Explore',image:'',title:'Example'},{name:'Brand'});assert.equal((document.match(/<\/style>/g)||[]).length,1);
});
test('require image prompt, artwork and editable text; bound model output',()=>{
  for(const patch of [{imagePrompt:''},{html:'<div>{{brand}}{{headline}}{{cta}}</div>'},{html:fixtureDesign.html.replace('{{headline}}','Hardcoded')},{css:'x'.repeat(18001)}])assert.throws(()=>designInput({...fixtureDesign,...patch}));
});
