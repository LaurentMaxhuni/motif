import { useEffect,useRef,useState,type FormEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Copy, Download, History, Loader2, Save, Sparkles, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert,AlertDescription } from '@/components/ui/alert'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import { AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel } from '@/components/ui/alert-dialog'
import { FieldSelect,FieldSelectItem } from '@/components/field-select'
import { api,download,slug,localDateTime } from '@/lib/api'
import { channels,statuses,type Content } from '@/lib/types'
import { useWorkspace } from '@/lib/workspace'
import CreativePreview from './creative-preview'
import { CreativeHistory } from './creative-history'

export default function CreativeEditor(props:{item:Content,onClose:()=>void}){
  const {brand}=useWorkspace()
  return brand?.id===props.item.brandId?<EditorSession key={`${props.item.id}:${props.item.version}:${brand.id}`} {...props}/>:null
}

function EditorSession({item,onClose}:{item:Content,onClose:()=>void}){
  const {brand,refresh}=useWorkspace()
  const [draft,setDraft]=useState<Content>(()=>structuredClone(item)),[previous,setPrevious]=useState<Content|null>(null),[instruction,setInstruction]=useState(''),[regenerate,setRegenerate]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState('Changes stay in this preview until you save.'),[confirm,setConfirm]=useState<'delete'|'duplicate'|null>(null)
  const live=useRef(true),locked=useRef(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null)
  useEffect(()=>{live.current=true;return()=>{live.current=false}},[])
  function close(){live.current=false;onClose()}
  function update<K extends keyof Content>(key:K,value:Content[K]){setDraft(current=>({...current,[key]:value}))}
  async function run(label:string,operation:()=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(label);setError('');try{await operation()}catch(e){if(live.current)setError(e instanceof Error?e.message:'Operation failed. Try again.')}finally{locked.current=false;if(live.current)setBusy('')}}
  function revise(e:FormEvent){e.preventDefault();if(!instruction.trim())return;void run('Revising',async()=>{const result=await api<{item:Content}>('revise','POST',{...draft,instruction:instruction.trim(),regenerateArtwork:regenerate});if(!live.current)return;setPrevious(structuredClone(draft));setDraft(result.item);setInstruction('');setRegenerate(false);setStatus('AI revision ready. Save to keep it.')})}
  function save(e:FormEvent){e.preventDefault();void run('Saving',async()=>{await api('contents/'+draft.id,'PUT',draft);await refresh();if(!live.current)return;toast.success('Creation saved.');close()})}
  function restore() {
    if (restoreVersion === null) return
    void run('Restoring', async () => {
      const { item } = await api<{ item: Content }>(
        'contents/' + draft.id + '/versions/' + restoreVersion + '/restore',
        'POST',
        { version: draft.version },
      )
      if (live.current) {
        setDraft(item)
        setPrevious(null)
        setInstruction('')
        setRegenerate(false)
        setRestoreVersion(null)
        setHistoryOpen(false)
        setStatus('Version restored and saved as a draft.')
      }
      await refresh()
    })
  }
  async function exportCreative(png:boolean){await run('Exporting',async()=>{
    const name=slug(draft.title)
    if(draft.design){const result=await api<{document:string,rendered:string}>('compose','POST',draft);if(!live.current)return;if(!png){download(name+'.html',result.document,'text/html');return}const bytes=Uint8Array.from(atob(result.rendered.split(',')[1]),c=>c.charCodeAt(0));download(name+'.png',bytes,'image/png');return}
    const svg=renderToStaticMarkup(<CreativePreview item={draft} brand={brand}/>)
    if(!png){download(name+'.svg',svg,'image/svg+xml');return}
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}))
    try{const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Could not render creative. Download SVG instead.'));image.src=url});if(!live.current)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=1080;const context=canvas.getContext('2d');if(!context)throw new Error('PNG export unavailable. Download SVG instead.');context.drawImage(image,0,0,1080,1080);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('PNG export failed.');if(live.current)download(name+'.png',blob,'image/png')}finally{URL.revokeObjectURL(url)}
  })}
  function confirmAction(){void run(confirm==='delete'?'Deleting':'Duplicating',async()=>{if(confirm==='delete')await api('contents/'+draft.id,'DELETE',{version:draft.version});else await api('contents','POST',{...draft,title:draft.title+' (copy)',status:'Draft',scheduledAt:''});await refresh();if(!live.current)return;toast.success(confirm==='delete'?'Creation deleted.':'Copy added to workspace.');close()})}
  return <Dialog open onOpenChange={open=>{if(!open)close()}}><DialogContent className="max-h-[92dvh] flex flex-col gap-0 overflow-clip p-0 sm:max-w-6xl"><DialogHeader className="shrink-0 border-b px-6 py-5 pr-12"><div className="flex items-center gap-3"><DialogTitle>Review creation</DialogTitle><Badge variant="secondary">{draft.kind}</Badge></div><DialogDescription>Refine with AI, review the copy, then save your changes.</DialogDescription></DialogHeader><div className="grid min-h-0 min-w-0 overflow-y-auto lg:grid-cols-[1.05fr_1fr]">
    <div className="min-w-0 space-y-5 bg-muted/35 p-5 sm:p-8"><div className="overflow-hidden rounded-xl border bg-background shadow-sm"><CreativePreview item={draft} brand={brand}/></div><div className="flex flex-wrap justify-center gap-2"><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void exportCreative(true)}><Download className="size-4"/> PNG</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>void exportCreative(false)}>{draft.design?'HTML':'SVG'}</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={()=>download(slug(draft.title)+'.md',`${draft.headline}\n\n${draft.subhead?draft.subhead+'\n\n':''}${draft.body}\n\n${draft.cta}`,'text/markdown')}><Copy className="size-4"/> Copy text</Button></div><p className="text-center text-xs leading-relaxed text-muted-foreground">{draft.source}<br/>1080 × 1080 · Preview changes are unsaved</p><section aria-label="Generated copy" className="space-y-3 rounded-xl border bg-background p-5"><h3 className="text-lg font-semibold">{draft.headline}</h3>{draft.subhead&&<p>{draft.subhead}</p>}<p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{draft.body}</p><p className="text-sm font-medium">{draft.cta}</p></section></div>
    <div className="min-w-0 space-y-6 p-5 sm:p-8"><form id="revision-form" onSubmit={revise} className="space-y-4" aria-busy={busy==='Revising'}><div><h2 className="text-lg font-semibold tracking-tight">Tell AI what to change.</h2><p className="mt-1 text-sm text-muted-foreground">Give the design a new direction with a prompt.</p></div><Label htmlFor="revision-instruction">Describe your changes</Label><Textarea id="revision-instruction" name="instruction" rows={3} maxLength={4000} required disabled={!!busy} value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Make it darker, use a bolder headline, and give the product more space…"/><div className="flex items-center gap-2"><Checkbox id="regenerate-artwork" name="regenerateArtwork" disabled={!!busy} checked={regenerate} onCheckedChange={checked=>setRegenerate(checked===true)}/><Label htmlFor="regenerate-artwork">Generate new artwork</Label></div><p className="text-xs text-muted-foreground">{draft.image?'Keep unchecked to preserve the current artwork.':'This creation has no artwork yet. AI will generate it on the first revision.'}</p><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!!busy}>{busy==='Revising'?<Loader2 className="animate-spin"/>:<Sparkles/>}Revise with AI</Button><Button variant="outline" type="button" disabled={!!busy||!previous} onClick={()=>{if(previous){setDraft(previous);setPrevious(null);setStatus('Previous design restored. Save to keep it.')}}}><Undo2/> Undo revision</Button></div></form>
    <p role="status" aria-live="polite" className="text-xs text-muted-foreground">{busy?`${busy}…`:status}</p>{error&&<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    <Button type="button" variant="outline" disabled={!!busy} aria-expanded={historyOpen} aria-controls="creative-version-history" onClick={() => setHistoryOpen(open => !open)}>
      <History />Version history
    </Button>
    {historyOpen && <CreativeHistory key={draft.version} id={draft.id} currentVersion={draft.version} brand={brand} disabled={!!busy} onRestore={setRestoreVersion} />}
    <form id="editor-form" onSubmit={save} className="space-y-4 border-t pt-6"><div className="space-y-2"><Label htmlFor="creative-title">Internal title</Label><Input id="creative-title" name="title" value={draft.title} onChange={e=>update('title',e.target.value)} required maxLength={300} disabled={!!busy}/></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="creative-channel">Channel</Label><FieldSelect id="creative-channel" name="channel" value={draft.channel} onValueChange={value=>update('channel',value)} disabled={!!busy}>{channels.map(c=><FieldSelectItem key={c}>{c}</FieldSelectItem>)}</FieldSelect></div><div className="space-y-2"><Label htmlFor="creative-status">Status</Label><FieldSelect id="creative-status" name="status" value={draft.status} onValueChange={value=>update('status',value)} disabled={!!busy}>{statuses.map(s=><FieldSelectItem key={s}>{s}</FieldSelectItem>)}</FieldSelect></div></div><div className="space-y-2"><Label htmlFor="creative-date">Calendar date & time</Label><Input id="creative-date" name="scheduledAt" type="datetime-local" value={draft.scheduledAt?localDateTime(draft.scheduledAt):''} onChange={e=>{const value=e.target.value;update('scheduledAt',value?new Date(value).toISOString():'')}} disabled={!!busy}/></div><div className="space-y-2"><Label htmlFor="creative-notes">Internal notes</Label><Textarea id="creative-notes" name="notes" rows={2} value={draft.notes} onChange={e=>update('notes',e.target.value)} maxLength={4000} disabled={!!busy}/></div><div className="flex flex-wrap justify-between gap-2 pt-2"><div className="flex gap-2"><Button type="button" variant="ghost" size="icon" disabled={!!busy} aria-label="Delete creation" onClick={()=>setConfirm('delete')}><Trash2 className="text-destructive"/></Button><Button type="button" variant="outline" disabled={!!busy} onClick={()=>setConfirm('duplicate')}><Copy/> Duplicate</Button></div><Button type="submit" disabled={!!busy}>{busy==='Saving'?<Loader2 className="animate-spin"/>:<Save/>}Save creation</Button></div></form></div></div>
    <AlertDialog open={confirm!==null} onOpenChange={open=>{if(!open&&!busy)setConfirm(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm==='delete'?'Delete this creation?':'Duplicate this creation?'}</AlertDialogTitle><AlertDialogDescription>{confirm==='delete'?'This removes the saved creation from your workspace.':'Add a copy of this preview to your workspace as an unscheduled draft.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel><Button variant={confirm==='delete'?'destructive':'default'} onClick={confirmAction} disabled={!!busy}>{busy?<Loader2 className="animate-spin"/>:null}{confirm==='delete'?'Delete creation':'Create copy'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={restoreVersion !== null} onOpenChange={open => { if (!open && !busy) setRestoreVersion(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore version {restoreVersion}?</AlertDialogTitle>
          <AlertDialogDescription>Motif will save this version as a new draft and clear its calendar date. The current saved version will remain in history. Unsaved edits will be discarded.</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={!!busy}>Cancel</AlertDialogCancel>
          <Button disabled={!!busy} onClick={restore}>{busy === 'Restoring' ? 'Restoring…' : 'Restore version'}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DialogContent></Dialog>
}
