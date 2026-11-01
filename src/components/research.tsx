import { useEffect, useRef, useState } from 'react'
import type { Analysis, Brand } from '@/lib/types'
import { api, download } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Download, Search } from 'lucide-react'

async function bounded<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([request, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Research request timed out. Try again.')), 30_000) })]) }
  finally { clearTimeout(timer) }
}
export function useResearch(scope: string) {
  const sequence = useRef(0), job = useRef('')
  const [running, setRunning] = useState(false), [progress, setProgress] = useState<Analysis>({}), [error, setError] = useState('')
  function stop() { sequence.current++; const id = job.current; job.current = ''; if (id) void api('analysis/' + id, 'DELETE', {}).catch(() => {}); setRunning(false) }
  useEffect(() => { setError(''); setProgress({}); return () => { sequence.current++; const id = job.current; job.current = ''; if (id) void api('analysis/' + id, 'DELETE', {}).catch(() => {}) } }, [scope])
  async function start(input: { url: string; maxPages: number; useAI: boolean }): Promise<Partial<Brand> | null> {
    stop(); const epoch = sequence.current; setRunning(true); setError(''); setProgress({}); let id = '', abandoned = false
    try {
      const creation = api<{ id: string }>('analysis', 'POST', input).then(created => { if (abandoned || epoch !== sequence.current) void api('analysis/' + created.id, 'DELETE', {}).catch(() => {}); return created })
      const created = await bounded(creation); id = created.id
      if (epoch !== sequence.current) { void api('analysis/' + id, 'DELETE', {}).catch(() => {}); return null }
      job.current = id
      const deadline = Date.now() + 5 * 60_000
      while (epoch === sequence.current && Date.now() < deadline) {
        const result = await bounded(api<Analysis>('analysis/' + id))
        if (epoch !== sequence.current) return null
        if (result.status === 'completed') { job.current = ''; return result.result }
        if (result.status === 'failed' || result.status === 'cancelled') throw new Error(result.error || 'Analysis cancelled.')
        setProgress(result.progress || {}); await new Promise(resolve => setTimeout(resolve, 900))
      }
      if (epoch === sequence.current) throw new Error('Analysis timed out after five minutes. Try a smaller page limit.')
    } catch (error) { if (epoch === sequence.current) setError((error as Error).message) }
    finally { abandoned = true; if (epoch === sequence.current) { if (job.current) void api('analysis/' + job.current, 'DELETE', {}).catch(() => {}); job.current = ''; setRunning(false) } }
    return null
  }
  return { running, progress, error, start, stop }
}

export function ResearchForm({ website, model, research, onResult, onWebsiteChange }: { website: string; model: string; research: ReturnType<typeof useResearch>; onResult: (result: Partial<Brand>) => void; onWebsiteChange?: (website: string) => void }) {
  const [url, setUrl] = useState(website), [limit, setLimit] = useState('12'), [useAI, setUseAI] = useState(Boolean(model))
  return <form className="space-y-5" onSubmit={async event => { event.preventDefault(); const result = await research.start({ url, maxPages: Number(limit), useAI: Boolean(model) && useAI }); if (result) onResult(result) }}>
    <div className="space-y-2"><Label htmlFor="research-url">Public website</Label><Input id="research-url" type="url" required value={url} onChange={event => { setUrl(event.target.value); onWebsiteChange?.(event.target.value) }} disabled={research.running} placeholder="https://yourbusiness.com" /></div>
    <div className="space-y-2"><Label htmlFor="research-limit">Page limit</Label><FieldSelect id="research-limit" value={limit} onValueChange={value=> setLimit(value)} disabled={research.running}><FieldSelectItem value="6">6 pages · focused</FieldSelectItem><FieldSelectItem value="12">12 pages · recommended</FieldSelectItem><FieldSelectItem value="20">20 pages · deep</FieldSelectItem></FieldSelect></div>
    <div className="flex items-start gap-3"><Checkbox id="research-ai" checked={Boolean(model) && useAI} onCheckedChange={value => setUseAI(value === true)} disabled={!model || research.running} /><div className="space-y-1"><Label htmlFor="research-ai">Interpret findings with my AI provider</Label><p className="text-xs text-muted-foreground">{model || 'No text model configured. Extraction works without one.'}</p></div></div>
    <p className="text-sm text-muted-foreground">Fetches public website pages. Extraction runs locally; optional interpretation uses your selected AI provider. Review findings before saving.</p>
    {research.error && <Alert variant="destructive"><AlertDescription>{research.error}</AlertDescription></Alert>}
    {research.running ? <div className="space-y-3" role="status" aria-live="polite"><Progress value={Math.min(95, Number(research.progress.pagesCompleted || research.progress.pages || 0) / Number(limit) * 100)} /><p className="break-all text-sm">{research.progress.message || research.progress.stage || 'Preparing website research…'} · {research.progress.pagesCompleted || research.progress.pages || 0} pages</p><Button type="button" variant="outline" onClick={research.stop}>Cancel analysis</Button></div> : <Button type="submit"><Search className="size-4" />Analyze website</Button>}
  </form>
}

const label = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase())
function Source({ url, children }: { url: string; children?: React.ReactNode }) { try { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return <span>{children || url}</span>; return <a href={parsed.href} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">{children || url}</a> } catch { return <span>{children || url}</span> } }
function Finding({ value, depth = 0 }: { value: any; depth?: number }) {
  if (value == null || value === '') return <p className="text-muted-foreground">No evidence found.</p>
  if (depth > 3) return <p className="text-muted-foreground">Additional detail in full report.</p>
  if (typeof value !== 'object') return <span className="whitespace-pre-wrap break-words">{String(value)}</span>
  if (Array.isArray(value)) return <ul className="list-disc space-y-2 pl-5">{value.slice(0, 16).map((entry, index) => <li key={index}><Finding value={entry} depth={depth + 1} /></li>)}{value.length > 16 && <li>More in full report.</li>}</ul>
  return <dl className="space-y-3">{Object.entries(value).filter(([key]) => !['text', 'paragraphs', 'links', 'excerpt'].includes(key)).slice(0, 24).map(([key, entry]) => <div key={key}><dt className="font-medium">{label(key)}</dt><dd className="mt-1 text-muted-foreground"><Finding value={entry} depth={depth + 1} /></dd></div>)}</dl>
}
export function ResearchReport({ analysis }: { analysis: Analysis }) {
  const pages: Analysis[] = analysis.pages || [], evidence: Analysis[] = analysis.evidence || []
  return <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><CardTitle>Website research</CardTitle><CardDescription>{pages.length} pages · {evidence.length} evidence records · {['local-ai','cli-ai'].includes(analysis.mode) ? 'AI interpretation + evidence' : 'Local extraction'}</CardDescription></div><Button variant="outline" size="sm" onClick={() => download('motif-brand-analysis.json', JSON.stringify(analysis, null, 2), 'application/json')}><Download className="size-4" />Full report</Button></div></CardHeader><CardContent><Accordion type="multiple">
    {analysis.warnings?.length > 0 && <AccordionItem value="notes"><AccordionTrigger>Review notes & limitations</AccordionTrigger><AccordionContent><Finding value={analysis.warnings} /></AccordionContent></AccordionItem>}
    {Object.entries(analysis.findings || {}).map(([key, value]) => <AccordionItem key={key} value={'finding-' + key}><AccordionTrigger>{label(key)}</AccordionTrigger><AccordionContent><Finding value={value} /></AccordionContent></AccordionItem>)}
    <AccordionItem value="pages"><AccordionTrigger>Source pages & search audit</AccordionTrigger><AccordionContent><div className="space-y-5">{pages.map((page, index) => <article className="space-y-2 border-b pb-4 last:border-0" key={index}><h3 className="font-medium"><Source url={page.url}>{page.title || page.url}</Source></h3><p className="text-muted-foreground">{page.description || 'No meta description found.'}</p><p className="text-xs text-muted-foreground">{page.wordCount || 0} words</p>{page.seo && <Finding value={page.seo} />}</article>)}</div></AccordionContent></AccordionItem>
    <AccordionItem value="evidence"><AccordionTrigger>Observed evidence & interpretations</AccordionTrigger><AccordionContent><div className="space-y-6">{evidence.slice(0, 60).map((entry, index) => <article className="space-y-3" key={index}><Badge variant={entry.kind === 'inferred' ? 'secondary' : 'outline'}>{entry.kind === 'inferred' ? 'Interpretation · review' : 'Observed on website'}</Badge><p>{entry.claim}</p>{entry.quote && <blockquote className="border-l-2 pl-4 text-muted-foreground">{entry.quote}</blockquote>}<div className="flex flex-wrap gap-3 text-xs">{(entry.sourceUrls || []).map((url: string) => <Source key={url} url={url} />)}</div></article>)}{evidence.length > 60 && <p>Remaining evidence included in full report.</p>}</div></AccordionContent></AccordionItem>
    <AccordionItem value="coverage"><AccordionTrigger>Crawl coverage</AccordionTrigger><AccordionContent><Finding value={analysis.coverage} /></AccordionContent></AccordionItem>
  </Accordion></CardContent></Card>
}
