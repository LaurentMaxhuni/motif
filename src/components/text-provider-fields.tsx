import { useRef, useEffect, useState } from 'react'
import { Terminal, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { api } from '@/lib/api'
import { cliProviders, type CliProvider, type Settings } from '@/lib/types'

interface Detection { id: CliProvider; name: string; available: boolean; version?: string; error?: string }
export function TextProviderFields({settings,onChange,disabled=false}:{settings:Settings;onChange:(value:Settings)=>void;disabled?:boolean}) {
  const provider=settings.textProvider || 'local'
  const [working,setWorking]=useState(false),[detections,setDetections]=useState<Detection[]>([]),[status,setStatus]=useState(''),[failed,setFailed]=useState(false)
  const alive=useRef(true),epoch=useRef(0)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  useEffect(()=>{epoch.current++;setStatus('');setDetections([])},[provider,settings.cliProfiles])
  const profile=provider!=='local' ? settings.cliProfiles?.[provider] || {executable:'',model:''} : null
  function update(key:'model'|'executable',value:string){if(provider==='local'||!profile)return;onChange({...settings,cliProfiles:{...settings.cliProfiles,[provider]:{...profile,[key]:value}}})}
  async function inspect(test=false){
    const sequence=epoch.current;setWorking(true);setStatus('');setFailed(false)
    try{
      if(test){const result=await api<{ok:boolean;provider:string}>('cli/test','POST',settings);if(alive.current&&sequence===epoch.current)setStatus(`${result.provider}: test reply received.`)}
      else{const result=await api<{providers:Detection[]}>('cli/detect','POST',settings);if(alive.current&&sequence===epoch.current){setDetections(result.providers);setStatus('Detection checks installation only. Use Test selected CLI to check login and model access.')}}
    }catch(error){if(alive.current&&sequence===epoch.current){setFailed(true);setStatus((error as Error).message)}}finally{if(alive.current)setWorking(false)}
  }
  return <div className="space-y-4"><div className="space-y-2"><Label htmlFor="text-provider">Text AI provider</Label><FieldSelect id="text-provider" value={provider} disabled={disabled||working} onValueChange={value=>onChange({...settings,textProvider:value as Settings['textProvider']})}><FieldSelectItem value="local">Local OpenAI-compatible server</FieldSelectItem>{Object.entries(cliProviders).map(([id,name])=><FieldSelectItem key={id} value={id}>{name} CLI</FieldSelectItem>)}</FieldSelect></div>{profile&&<><p className="text-sm text-muted-foreground">Uses {cliProviders[provider as CliProvider]} on this computer and its existing login. Prompts and brand information go to the model configured by that CLI, which may be a cloud service.</p><div className="space-y-2"><Label htmlFor="cli-model">CLI model override</Label><Input id="cli-model" value={profile.model} disabled={disabled||working} maxLength={200} placeholder="Leave blank to use the CLI default" onChange={event=>update('model',event.target.value)}/></div><div className="space-y-2"><Label htmlFor="cli-executable">CLI executable path</Label><Input id="cli-executable" value={profile.executable} disabled={disabled||working} maxLength={2000} placeholder="Auto-detect from PATH" onChange={event=>update('executable',event.target.value)}/><p className="text-xs text-muted-foreground">Optional absolute file path, without arguments. Each CLI keeps its own settings here.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={disabled||working} onClick={()=>void inspect()}>{working?<Loader2 className="size-4 animate-spin"/>:<Search className="size-4"/>}Detect installed CLIs</Button><Button type="button" variant="outline" disabled={disabled||working} onClick={()=>void inspect(true)}><Terminal className="size-4"/>Test selected CLI</Button></div><p className="text-xs text-muted-foreground">The test sends a short prompt and may use your provider quota. Detection and tests do not save settings. Image generation still needs a separate image server.</p>{detections.length>0&&<ul aria-label="CLI installations" className="space-y-2 text-sm">{detections.map(item=><li key={item.id}><span className="font-medium">{item.name}</span>: {item.available?`Installed · ${item.version}`:item.error}</li>)}</ul>}<p role={failed?'alert':'status'} className={failed?'text-sm text-destructive':'text-sm text-muted-foreground'}>{status}</p></>}</div>
}
