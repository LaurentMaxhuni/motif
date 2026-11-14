// Deterministic subprocess fixture. Never contacts a model or external service.
import {fixtureDesign} from '../fixtures.ts';
const args=process.argv.slice(2);
if(args.includes('--version')){console.log('opencode v2.0.32');process.exit(0)}
const model=args[args.indexOf('--model')+1]||'fixture/claude',provider=model.split('/')[1];
let input='';for await(const chunk of process.stdin)input+=chunk;
let request: { count?: number; current?: unknown }={};try{const start=input.indexOf('\n[')+1;const messages=JSON.parse(input.slice(start,input.lastIndexOf(']')+1));request=JSON.parse(messages.at(-1).content)}catch{}
if(model==='fixture/failure')process.exit(9);
let result='A thoughtful campaign for your brand.';
if(input.includes('MOTIF_OK'))result='MOTIF_OK';
else if(input.includes('items'))result=JSON.stringify({items:Array.from({length:request.count||1},()=>({title:'CLI campaign',headline:'Made for your day',body:'Discover considered everyday objects.',cta:'Explore',subhead:'Thoughtful design',design:fixtureDesign}))});
else if(request.current)result=JSON.stringify({title:'CLI revision',headline:'Made with care',body:'Everyday objects with thoughtful details.',cta:'Explore',subhead:'A quieter day',design:fixtureDesign});
else if(input.includes('audience')&&input.includes('voice')&&input.includes('evidence'))result='{"claims":[]}';
if(provider==='codex')console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:result}}));
else if(provider==='opencode')console.log(JSON.stringify({type:'text',part:{text:result}}));
else if(['pi','omp'].includes(provider))console.log(JSON.stringify({type:'message_end',message:{role:'assistant',content:[{type:'text',text:result}],stopReason:'stop'}}));
else console.log(JSON.stringify({type:'result',result}));
