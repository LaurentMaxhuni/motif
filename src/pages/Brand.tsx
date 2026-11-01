import { textModelLabel } from '@/lib/types'
import { useEffect, useRef, useState } from 'react'
import { useWorkspace } from '@/lib/workspace'
import { api } from '@/lib/api'
import type { Brand as BrandData } from '@/lib/types'
import { BrandFields } from '@/components/brand-fields'
import { ResearchForm, ResearchReport, useResearch } from '@/components/research'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function Brand() {
  const { brand, data, refresh } = useWorkspace()
  return brand ? <BrandEditor key={brand.id} brand={brand} model={textModelLabel(data.settings)} refresh={refresh} /> : <p className="text-muted-foreground">Create a brand to build its Brand DNA.</p>
}
function BrandEditor({ brand, model, refresh }: { brand: BrandData; model: string; refresh: () => Promise<void> }) {
  const [draft, setDraft] = useState(brand), [open, setOpen] = useState(false), [review, setReview] = useState<BrandData | null>(null), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const research = useResearch(brand.id), alive = useRef(true)
  const serverBrand = useRef(brand)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const previous = serverBrand.current
    if (brand.version !== previous.version) setDraft(current => JSON.stringify(current) === JSON.stringify(previous) ? brand : current)
    serverBrand.current = brand
  }, [brand])
  const stale = draft.version !== brand.version
  async function save(value: BrandData, researched = false) {
    setSaving(true); setError('')
    try {
      const saved = await api<BrandData>('brands/' + brand.id, 'PUT', value)
      await refresh()
      if (!alive.current) return
      setDraft(saved); if (researched) { setReview(null); setOpen(false) }
      toast.success('Brand DNA saved.')
    } catch (error) { if (alive.current) setError((error as Error).message) }
    finally { if (alive.current) setSaving(false) }
  }
  function close() { if (saving) return; research.stop(); setOpen(false); setReview(null); setError('') }
  return <div className="mx-auto max-w-6xl space-y-8"><header className="space-y-2"><h1 className="text-3xl font-semibold tracking-tight">Brand DNA</h1><p className="text-muted-foreground">The shared source of truth behind everything you create.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><CardTitle>Your business, in your words</CardTitle><Badge variant="secondary" className="max-w-full whitespace-normal break-words">{draft.source || 'Manual'}</Badge></div><CardDescription>Review and save changes explicitly.</CardDescription></CardHeader><CardContent><form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(draft) }}><BrandFields value={draft} onChange={setDraft} disabled={saving} />{stale && <Alert><AlertDescription>Brand DNA changed while you were editing. Your edits are preserved. <Button type="button" variant="link" onClick={()=>{setDraft(brand);setError('')}}>Load saved version</Button></AlertDescription></Alert>}{error && !open && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<Button disabled={saving||stale}><Save className="size-4" />{saving ? 'Saving…' : 'Save Brand DNA'}</Button></form></CardContent></Card>
    <aside className="space-y-5"><Card><CardHeader><CardTitle>Start with evidence</CardTitle><CardDescription>Analyze up to 20 public website pages. Review products, audience, voice and visual signals before applying them.</CardDescription></CardHeader><CardContent><Button variant="outline" className="w-full" onClick={() => { setError(''); setOpen(true) }}><Search className="size-4" />Analyze website</Button></CardContent></Card><div className="rounded-xl border p-6"><div className="mb-5 flex gap-2">{draft.colors.map((color, index) => <span key={index} className="size-9 rounded-full border" style={{ background: color }} />)}</div><p className="text-xl font-medium">{draft.name}</p><p className="mt-2 text-sm text-muted-foreground">{draft.voice || 'Your voice, consistently expressed.'}</p></div></aside></div>
    {draft.analysis && <ResearchReport analysis={draft.analysis} />}
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{review ? 'Review researched Brand DNA' : 'Research your website'}</DialogTitle><DialogDescription>{review ? 'Edit findings before saving. Your current product photo and business goals are preserved.' : 'Public website extraction with optional selected-provider interpretation.'}</DialogDescription></DialogHeader>{review ? <form className="space-y-6" onSubmit={event => { event.preventDefault(); void save(review, true) }}><BrandFields value={review} onChange={setReview} disabled={saving} />{review.analysis && <ResearchReport analysis={review.analysis} />}{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}<div className="flex flex-wrap gap-3"><Button disabled={saving}>{saving ? 'Saving…' : 'Apply reviewed Brand DNA'}</Button><Button variant="outline" type="button" disabled={saving} onClick={close}>Discard research</Button></div></form> : <ResearchForm website={draft.website} model={model} research={research} onResult={result => setReview({ ...draft, ...result, id: draft.id, version: draft.version, image: draft.image, goal: draft.goal, industry: draft.industry, language: draft.language })} />}</DialogContent></Dialog>
  </div>
}
