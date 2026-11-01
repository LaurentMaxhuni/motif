import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { useWorkspace } from '@/lib/workspace'
type Message = { role: 'user'|'assistant'; content: string }
export default function Assistant() { const { brand } = useWorkspace(); return <Conversation key={brand?.id} brandId={brand?.id} /> }
function Conversation({brandId}: {brandId?:string}) {
  const {data,navigate} = useWorkspace()
  const [messages,setMessages]=useState<Message[]>([]), [prompt,setPrompt]=useState(''), [busy,setBusy]=useState(false)
  const alive=useRef(true)
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false}},[])
  async function send(event:React.FormEvent) {
    event.preventDefault(); if(!brandId||busy||!prompt.trim())return
    const message:Message={role:'user',content:prompt.trim()};const next:Message[]=[...messages,message].slice(-19)
    setBusy(true)
    try { const result=await api<{answer:string}>('chat','POST',{brandId,messages:next});if(!alive.current)return;setMessages([...next,{role:'assistant' as const,content:result.answer}].slice(-20));setPrompt('') }
    catch(error){if(alive.current)toast.error(error instanceof Error?error.message:'Conversation failed.')}
    finally{if(alive.current)setBusy(false)}
  }
  return <div className="mx-auto max-w-4xl space-y-6"><div><h1 className="text-2xl font-semibold tracking-tight">Brand assistant</h1><p className="mt-2 text-muted-foreground">Work through ideas with your Brand DNA and local text model.</p></div><Card><CardContent className="space-y-6 pt-6"><div className="min-h-72 space-y-5" role="log" aria-label="Conversation" aria-live="polite">{messages.length?messages.map((message,index)=><div key={index} className={message.role==='user'?'ml-6 rounded-xl bg-muted p-4':'mr-6 rounded-xl border p-4'}><p className="mb-2 text-xs font-medium text-muted-foreground">{message.role==='user'?'You':'Motif'}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p></div>):<div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><Sparkles className="size-8 text-violet-500"/><h2 className="text-lg font-medium">Find your next direction</h2><div className="flex flex-wrap justify-center gap-2">{['Suggest 5 content ideas for my brand','Help me plan a product launch','Review my brand positioning'].map(text=><Button key={text} variant="outline" onClick={()=>setPrompt(text)}>{text}</Button>)}</div></div>}{busy&&<p className="text-sm text-muted-foreground">Thinking with your local model…</p>}</div><form onSubmit={send} className="space-y-3"><label htmlFor="assistant-message" className="sr-only">Message to local assistant</label><Textarea id="assistant-message" value={prompt} onChange={e=>setPrompt(e.target.value)} required maxLength={8000} rows={3} disabled={busy||!brandId} placeholder="Ask something about your brand…"/><div className="flex items-center justify-between gap-4"><p className="text-xs text-muted-foreground">Last 20 messages stay in this page until you leave. {data.settings.textModel||'Connect a text model in Settings.'}</p><Button disabled={busy||!brandId||!prompt.trim()}><Send className="size-4"/>Send</Button></div></form>{!data.settings.textModel&&<Button variant="link" onClick={()=>navigate('settings')}>Set up local AI</Button>}</CardContent></Card></div>
}
