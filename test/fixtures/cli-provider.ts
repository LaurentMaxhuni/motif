// Deterministic subprocess fixture. Never contacts a model or external service.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import {fixtureConcepts,fixtureDesign} from '../fixtures.ts';
const args=process.argv.slice(2);
if(args.includes('--version')){console.log('opencode v2.0.32');process.exit(0)}
const model=args[args.indexOf('--model')+1]||'fixture/claude',provider=model.split('/')[1];
let input='';for await(const chunk of process.stdin)input+=chunk;
let request: { count?: number; current?: unknown; task?: string }={};try{const start=input.indexOf('\n[')+1;const messages=JSON.parse(input.slice(start,input.lastIndexOf(']')+1));request=JSON.parse(messages.at(-1).content)}catch{}
if(model==='fixture/failure')process.exit(9);
if (model === 'fixture/codex/schema' && request.task === 'creative-plan') {
  const schema = JSON.parse(readFileSync(args[args.indexOf('--output-schema') + 1], 'utf8'));
  assert.deepEqual(schema.required, ['concepts']);
  assert.equal(schema.properties.concepts.items.additionalProperties, false);
} else if (model === 'fixture/codex/schema') {
  const schemaFlag = args.indexOf('--output-schema');
  if (schemaFlag < 0) {
    console.log(JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'I created a campaign for you.' } }));
    process.exit(0);
  }
  const schema = JSON.parse(readFileSync(args[schemaFlag + 1], 'utf8'));
  const item = schema.properties.items.items;
  assert.deepEqual(schema.required, ['items']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(item.additionalProperties, false);
  assert.deepEqual(item.required, input.includes('imagePrompt') ? ['title', 'headline', 'body', 'cta', 'subhead', 'design'] : ['title', 'headline', 'body', 'cta']);
  if (item.properties.design) assert.deepEqual(item.properties.design.required, ['html', 'css', 'imagePrompt']);
}
let result='A thoughtful campaign for your brand.';
if(input.includes('MOTIF_OK'))result='MOTIF_OK';
else if(request.task==='creative-plan')result=JSON.stringify({concepts:fixtureConcepts(request.count||1)});
else if(request.task==='design-refinement')result=JSON.stringify({design:fixtureDesign});
else if(input.includes('items'))result=JSON.stringify({items:Array.from({length:request.count||1},()=>({title:'CLI campaign',headline:'Made for your day',body:'Discover considered everyday objects.',cta:'Explore',subhead:'Thoughtful design',design:fixtureDesign}))});
else if(request.current)result=JSON.stringify({title:'CLI revision',headline:'Made with care',body:'Everyday objects with thoughtful details.',cta:'Explore',subhead:'A quieter day',design:fixtureDesign});
else if(input.includes('audience')&&input.includes('voice')&&input.includes('evidence'))result='{"claims":[]}';
if(provider==='codex')console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:result}}));
else if(provider==='opencode')console.log(JSON.stringify({type:'text',part:{text:result}}));
else if(['pi','omp'].includes(provider))console.log(JSON.stringify({type:'message_end',message:{role:'assistant',content:[{type:'text',text:result}],stopReason:'stop'}}));
else console.log(JSON.stringify({type:'result',result}));
