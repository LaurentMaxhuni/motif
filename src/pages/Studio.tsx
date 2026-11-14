import { textModelLabel,imageModelLabel } from '@/lib/types'
import { useEffect,useRef,useState,type FormEvent } from 'react'
import { ArrowRight, CalendarDays, Loader2, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card,CardContent } from '@/components/ui/card'
import { FieldSelect,FieldSelectItem } from '@/components/field-select'
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog'
import { Alert,AlertDescription } from '@/components/ui/alert'
import { ToggleGroup,ToggleGroupItem } from '@/components/ui/toggle-group'
import CreationCard from '@/components/creation-card'
import { useWorkspace } from '@/lib/workspace'
import { GenerationStatus } from '@/components/generation-status'
import { kinds } from '@/lib/types'

export default function Studio(){
  const {brand,contents,data,generation,navigate,weekPlanRequested,clearWeekPlan}=useWorkspace()
  const [brief,setBrief]=useState(''),[kind,setKind]=useState('Social post'),[count,setCount]=useState('1'),[pending,setPending]=useState(false),[error,setError]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('All content'),[plan,setPlan]=useState(false),[planBrief,setPlanBrief]=useState(''),[planKind,setPlanKind]=useState('Social post'),[planMode,setPlanMode]=useState('hybrid')
  const { job } = generation
  const submittedJob = useRef<string | undefined>(undefined)
  const actionPending = useRef(false)
  const busy = pending || !generation.loaded || job?.status === 'running'

  useEffect(() => {
    if (weekPlanRequested) { setError(''); setPlan(true); clearWeekPlan() }
  }, [weekPlanRequested, clearWeekPlan])

  useEffect(() => {
    if (job?.status !== 'completed' || job.id !== submittedJob.current) return
    submittedJob.current = undefined
    setFilter('All content')
    setQuery('')
    if (job.weekly && plan) { setPlan(false); navigate('calendar') }
    if (!job.weekly) setBrief('')
  }, [job, navigate, plan])

  async function run(action: () => Promise<typeof job>) {
    if (actionPending.current) return
    actionPending.current = true
    setPending(true)
    setError('')
    try { return await action() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Generation request failed.') }
    finally { actionPending.current = false; setPending(false) }
  }

  async function generate(event: FormEvent, weekly = false) {
    event.preventDefault()
    if (busy || !brand) return
    const scheduledDates = weekly ? Array.from({ length: 5 }, (_, index) => {
      const day = new Date()
      day.setDate(day.getDate() + index + 1)
      day.setHours(10, 0, 0, 0)
      return day.toISOString()
    }) : undefined
    const started = await run(() => generation.start({
      brief: weekly ? planBrief : brief,
      kind: weekly ? planKind : kind,
      count: weekly ? 5 : Number(count),
      mode: weekly ? planMode : 'hybrid',
      scheduledDates,
    }))
    if (started) submittedJob.current = started.id
  }

  const progress = job && <GenerationStatus
    job={job}
    pending={pending}
    cancel={() => void run(() => generation.cancel(job.id))}
    retry={() => void run(async () => {
      const started = await generation.retry(job.id)
      if (started) submittedJob.current = started.id
      return started
    })}
  />
  const items=contents.filter(c=>(filter==='All content'||c.kind===filter)&&`${c.title} ${c.headline} ${c.body}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="space-y-10"><div className="flex flex-wrap justify-between gap-4"><div><Badge variant="secondary" className="mb-3">Creative studio</Badge><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What will you create next?</h1><p className="mt-3 text-muted-foreground">A fresh idea, shaped around {brand?.name||'your brand'}.</p></div><Button variant="outline" onClick={()=>{setError('');setPlan(true)}} disabled={busy}><CalendarDays/> Plan my week</Button></div>
    <Card className="shadow-none"><CardContent className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-500/10 p-3 text-violet-600 dark:text-violet-400"><Sparkles className="size-5"/></div><div><h2 className="font-semibold">Start with a direction</h2><p className="text-sm text-muted-foreground">Your Brand DNA is already in the brief.</p></div></div><Badge variant="outline">AI design + artwork</Badge></div><form onSubmit={e=>generate(e)} className="space-y-4"><Label htmlFor="brief" className="sr-only">Creative brief</Label><Textarea id="brief" name="brief" value={brief} onChange={e=>setBrief(e.target.value)} maxLength={4000} rows={4} disabled={busy} placeholder="A new collection, a big idea, or a fresh way to say hello…" className="resize-y border-0 bg-muted/40 p-4 text-base shadow-none"/><div className="flex flex-wrap justify-between gap-3"><div className="flex flex-wrap gap-2"><FieldSelect name="kind" aria-label="Content type" value={kind} onValueChange={value=>setKind(value)} disabled={busy}>{kinds.map(k=><FieldSelectItem key={k}>{k}</FieldSelectItem>)}</FieldSelect><FieldSelect name="count" aria-label="Number of variations" value={count} onValueChange={value=>setCount(value)} disabled={busy}>{[1,3,6].map(n=><FieldSelectItem key={n} value={n}>{n} {n===1?'variation':'variations'}</FieldSelectItem>)}</FieldSelect></div><Button type="submit" disabled={busy||!brand}>{busy?<Loader2 className="animate-spin"/>:<Sparkles/>}{busy?'Creating…':'Create content'}</Button></div></form>{!plan && progress}
      {generation.error && !plan && <p role="status" className="text-sm text-muted-foreground">{generation.error}</p>}
      {error&&!plan&&<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}{(!textModelLabel(data.settings)||!imageModelLabel(data.settings))&&<p className="text-sm text-muted-foreground">Connect text and image models to start creating. <Button variant="link" className="h-auto p-0" onClick={()=>navigate('settings')}>Set up AI <ArrowRight className="size-3"/></Button></p>}<div className="flex flex-wrap items-center gap-2 border-t pt-4"><span className="mr-1 text-xs text-muted-foreground">Try a direction</span>{['Introduce our brand','Launch a new collection','Share our story'].map(s=><Button key={s} variant="outline" size="sm" onClick={()=>setBrief(s)} disabled={busy}>{s}<ArrowRight className="size-3"/></Button>)}</div></CardContent></Card>
    <section className="space-y-5"><div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-tight">Your creative library</h2><p className="mt-1 text-sm text-muted-foreground">{contents.length} creations · Made for {brand?.name}</p></div><Button variant="ghost" onClick={()=>navigate('workspace')}>Workspace <ArrowRight/></Button></div><div className="flex flex-wrap items-center justify-between gap-4"><ToggleGroup type="single" value={filter} onValueChange={value=>{if(value)setFilter(value)}} aria-label="Content type filter" className="max-w-full flex-wrap justify-start">{['All content',...kinds].map(k=><ToggleGroupItem key={k} value={k}>{k}</ToggleGroupItem>)}</ToggleGroup><div className="relative w-full sm:w-64"><Search className="absolute top-3 left-3 size-4 text-muted-foreground"/><Input type="search" aria-label="Search creations" placeholder="Find a creation…" value={query} onChange={e=>setQuery(e.target.value)} className="pl-9"/></div></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(c=><CreationCard key={c.id} item={c}/>)}</div>{!items.length&&<Card className="p-12 text-center shadow-none"><Sparkles className="mx-auto mb-4 size-7 text-muted-foreground"/><h3 className="font-medium">Your next creation starts with an idea.</h3><p className="mt-2 text-sm text-muted-foreground">Write a brief above, or try another filter.</p></Card>}</section>
    <Dialog open={plan} onOpenChange={setPlan}><DialogContent><DialogHeader><DialogTitle>A week, with a little intention.</DialogTitle><DialogDescription>Create five drafts for the next five days. Review each one before approving.</DialogDescription></DialogHeader><form onSubmit={e=>generate(e,true)} className="space-y-4"><Label htmlFor="plan-brief">Focus for the week</Label><Textarea id="plan-brief" name="brief" maxLength={4000} value={planBrief} disabled={busy} onChange={e=>setPlanBrief(e.target.value)} placeholder="Introduce our collection, share our process…"/><Label htmlFor="plan-kind">Content type</Label><FieldSelect id="plan-kind" value={planKind} disabled={busy} onValueChange={value=>setPlanKind(value)}>{kinds.map(k=><FieldSelectItem key={k}>{k}</FieldSelectItem>)}</FieldSelect><Label htmlFor="plan-mode">Generation mode</Label><FieldSelect id="plan-mode" value={planMode} disabled={busy} onValueChange={value=>setPlanMode(value)}><FieldSelectItem value="hybrid">AI design + artwork</FieldSelectItem><FieldSelectItem value="ai">AI copy</FieldSelectItem><FieldSelectItem value="template">Design templates</FieldSelectItem></FieldSelect>{error&&<Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<Button type="submit" disabled={busy}>{busy?<Loader2 className="animate-spin"/>:<Sparkles/>}{busy?'Creating…':'Create my week'}</Button></form>
      {(job?.weekly || job?.status === 'running') && progress}
      {generation.error && <p role="status" className="text-sm text-muted-foreground">{generation.error}</p>}
    </DialogContent></Dialog>
  </div>
}
