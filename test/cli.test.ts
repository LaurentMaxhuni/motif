import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cliSettings, cliInvocation, parseCliOutput, cliCompletion, inspectCli, resolveCli } from '../lib/cli.ts';
import { createApp } from '../server.ts';
import { fileURLToPath } from 'node:url';
import { generate, revise, brandInput } from '../lib/core.ts';

test('CLI settings validate providers and preserve individual profiles',()=>{
  assert.equal(cliSettings({}).textProvider,'local');
  assert.throws(()=>cliSettings({textProvider:'shell'}),/provider/i);
  assert.throws(()=>cliSettings({cliProfiles:{codex:{executable:'codex --unsafe'}}}),/absolute/i);
  assert.throws(()=>cliSettings({cliProfiles:{codex:{model:'--unsafe'}}}),/flags/i);
  const value=cliSettings({textProvider:'pi',cliProfiles:{pi:{model:'ollama/qwen'},claude:{model:'sonnet'}}});
  assert.equal(value.cliProfiles.pi.model,'ollama/qwen');assert.equal(value.cliProfiles.claude.model,'sonnet');
});

test('CLI creative designs and plain-language revisions use existing validation',async()=>{
  const settings={textProvider:'claude' as const,imageModel:'separate-image-model',cliProfiles:{claude:{executable:fileURLToPath(new URL('./fixtures/cli-provider.ts',import.meta.url)),model:'fixture/claude'}}};
  const brand=brandInput({name:'Morrow',colors:['#123456','#654321']});
  const [draft]=await generate(settings,brand,{kind:'Ad creative',mode:'hybrid',count:1,brief:'An everyday launch'});
  assert.match(draft.design.html,/data-asset="artwork"/);assert.match(draft.source,/CLI AI \+ image/);
  const result=await revise(settings,brand,draft,'Make the headline quieter');
  assert.equal(result.headline,'Made with care');assert.equal(result.image,draft.image);assert.match(result.source,/CLI AI revision/);
});

test('provider event parsing returns final text only and rejects provider failures',()=>{
  assert.equal(parseCliOutput('codex',JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Hello'}})),'Hello');
  assert.equal(parseCliOutput('claude',JSON.stringify({type:'result',result:'Hello'})),'Hello');
  for(const provider of ['pi','omp']){
    assert.equal(parseCliOutput(provider,JSON.stringify({type:'message_end',message:{role:'assistant',content:[{type:'thinking',thinking:'private'},{type:'text',text:'Hello'}],stopReason:'stop'}})),'Hello');
    assert.throws(()=>parseCliOutput(provider,JSON.stringify({type:'message_end',message:{role:'assistant',stopReason:'error',errorMessage:'credential secret'}})),/failed/i);
  }
  assert.equal(parseCliOutput('opencode',[{type:'text',part:{text:'Hello '}},{type:'text',part:{text:'world'}}].map(event=>JSON.stringify(event)).join('\n')),'Hello world');
  assert.throws(()=>parseCliOutput('claude',JSON.stringify({type:'result',is_error:true,result:'secret'})),/failed/i);
  assert.throws(()=>parseCliOutput('codex',JSON.stringify({type:'turn.failed',error:{message:'secret'}})),/failed/i);
  assert.throws(()=>parseCliOutput('opencode','not json'),/output/i);
  const retry=[{type:'message_end',message:{role:'assistant',stopReason:'error',errorMessage:'Connection error.'}},{type:'message_end',message:{role:'assistant',stopReason:'stop',content:[{type:'text',text:'Recovered'}]}}];
  assert.equal(parseCliOutput('pi',retry.map(event=>JSON.stringify(event)).join('\n')),'Recovered');
  assert.throws(()=>parseCliOutput('opencode',JSON.stringify({type:'error',error:{status:401,message:'private token'}})),/Authentication failed/);
});

test('CLI invocations disable tools and keep prompts on stdin',()=>{
  for(const provider of ['codex','claude','opencode','pi','omp']){
    const result=cliInvocation(provider,'test/model','2.0.32');
    assert.ok(result.args.includes('test/model'));assert.ok(!result.args.includes('--dangerously-bypass-approvals-and-sandbox'));
    if(provider==='codex'){assert.ok(result.args.includes('read-only'));assert.ok(result.args.includes('--ignore-user-config'));}
    else if(provider==='claude')assert.ok(result.args.includes('--tools='));
    else if(provider==='opencode')assert.equal(JSON.parse(result.env.OPENCODE_CONFIG_CONTENT).permissions.at(-1).effect,'deny');
    else assert.ok(result.args.includes('--no-tools'));
  }
  const legacy=cliInvocation('opencode','','1.18.32');
  assert.ok(!legacy.args.includes('--standalone'));assert.equal(JSON.parse(legacy.env.OPENCODE_CONFIG_CONTENT).permission['*'],'deny');
});

test('Windows npm and pnpm shims resolve without launching a command shell',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'motif-cli-test-'));
  try{
    writeFileSync(join(dir,'cli.js'),'');writeFileSync(join(dir,'codex.cmd'),'@echo off\n"%_prog%" "%dp0%\\cli.js" %*');
    const result=await resolveCli('codex',join(dir,'codex.cmd'));assert.equal(result.command,process.execPath);assert.equal(result.prefix[0],join(dir,'cli.js'));
    writeFileSync(join(dir,'pi.cmd'),'@if exist "%~dp0\\node.exe" (\n"%~dp0\\node.exe" "%~dp0\\cli.js" %*\n)');
    assert.equal((await resolveCli('pi',join(dir,'pi.cmd'))).prefix[0],join(dir,'cli.js'));
    writeFileSync(join(dir,'bad.cmd'),'@echo off\ncall attacker %*');await assert.rejects(resolveCli('codex',join(dir,'bad.cmd')),/shim/i);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('actual CLI process receives literal stdin, supports probes and cleans its working directory',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'motif-cli-test-'));const script=join(dir,'provider.mjs');
  writeFileSync(script,`if(process.argv.includes('--version')){console.log('1.0.0');process.exit(0)}let input='';for await(const chunk of process.stdin)input+=chunk;console.log(JSON.stringify({type:'result',result:JSON.stringify({input,cwd:process.cwd(),args:process.argv.slice(2)})}));`);
  try{
    const settings={textProvider:'claude',cliProfiles:{claude:{executable:script,model:'test/model'}}};
    assert.equal((await inspectCli('claude',settings.cliProfiles.claude)).available,true);
    const value=JSON.parse(await cliCompletion(settings,[{role:'system',content:'Return JSON'},{role:'user',content:'$(whoami) `bad` & <literal>'}],true,100));
    assert.match(value.input,/\$\(whoami\) `bad` & <literal>/);assert.match(value.input,/Return JSON/);assert.ok(!value.args.some(arg=>arg.includes('whoami')));assert.equal(existsSync(value.cwd),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('CLI process failures, oversized output, timeout and cancellation reject cleanly',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'motif-cli-test-'));const script=join(dir,'provider.mjs');
  const settings={textProvider:'claude',cliProfiles:{claude:{executable:script}}};
  try{
    writeFileSync(script,"process.stderr.write('secret credentials');process.exit(7)");
    await assert.rejects(cliCompletion(settings,[],false,100),error=>error instanceof Error&&'status' in error&&error.status===502&&!error.message.includes('secret'));
    writeFileSync(script,"process.stdout.write('x'.repeat(1100000));setInterval(()=>{},1000)");
    await assert.rejects(cliCompletion(settings,[],false,100),/size limit/i);
    writeFileSync(script,'setInterval(()=>{},1000)');
    await assert.rejects(cliCompletion(settings,[],false,100,undefined,{timeoutMs:50}),/timed out/i);
    const controller=new AbortController();setTimeout(()=>controller.abort(),50);
    await assert.rejects(cliCompletion(settings,[],false,100,controller.signal),/cancel/i);
    controller.abort();await assert.rejects(cliCompletion(settings,[],false,100,controller.signal),/cancel/i);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('all five CLI providers drive the real assistant/generation/research API with blank local model IDs',async()=>{
  const app=createApp({database:':memory:',seed:true,analysisDependencies:{fetchDocument:async url=>{
    if(/robots\.txt|sitemap\.xml/.test(url))throw Object.assign(new Error('Missing'),{statusCode:404});
    return {url,html:'<title>CLI research</title><main><h1>Thoughtful everyday objects</h1><p>We make practical objects with care for independent teams.</p></main>'}
  }}});await app.server.listen({port:0,host:'127.0.0.1'});
  const base=`http://127.0.0.1:${(app.server.server.address() as AddressInfo).port}/api/`;
  const state=await(await fetch(base+'state')).json();
  const call=async(path,body)=>{const response=await fetch(base+path,{method:path==='settings'?'PUT':'POST',headers:{'Content-Type':'application/json','X-Motif-Token':state.token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()}};
  const executable=fileURLToPath(new URL('./fixtures/cli-provider.ts',import.meta.url));
  try{
    for(const id of ['codex','claude','opencode','pi','omp']){
      const config={...state.settings,textProvider:id,cliProfiles:{[id]:{executable,model:'fixture/'+id}}};
      assert.equal((await call('settings',config)).status,200);
      assert.equal((await call('cli/test',config)).data.ok,true);
      const chat=await call('chat',{brandId:state.brands[0].id,messages:[{role:'user',content:'Suggest a campaign'}]});assert.equal(chat.status,200);assert.match(chat.data.answer,/thoughtful/);
      const generated=await call('generate',{brandId:state.brands[0].id,kind:'Email',mode:'ai',count:1,brief:'A launch'});
      assert.equal(generated.status,201,JSON.stringify(generated.data));assert.equal(generated.data.items[0].title,'CLI campaign');assert.match(generated.data.items[0].source,/CLI AI/);
      const scan=await call('analysis',{url:'https://fixture.example/',maxPages:1,useAI:true});assert.equal(scan.status,202);
      let job;for(let attempt=0;attempt<60;attempt++){job=await(await fetch(base+'analysis/'+scan.data.id)).json();if(job.status!=='running')break;await new Promise(resolve=>setTimeout(resolve,20))}
      assert.equal(job.status,'completed',job.error);assert.equal(job.result.analysis.mode,'cli-ai');assert.equal(brandInput(job.result).analysis.mode,'cli-ai');assert.equal(app.store.all('brand').length,1);
    }
    const detected=await call('cli/detect',{cliProfiles:Object.fromEntries(['codex','claude','opencode','pi','omp'].map(id=>[id,{executable,model:'fixture/'+id}]))});
    assert.equal(detected.data.providers.length,5);assert.ok(detected.data.providers.every(p=>p.available&&p.authenticated===null));
    assert.equal((await call('settings',{...state.settings,textProvider:'bash'})).status,400);
    assert.equal((await call('cli/test',{textProvider:'local'})).status,400);
  }finally{await app.server.close()}
});
