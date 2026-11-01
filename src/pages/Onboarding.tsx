import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { Brand, Settings } from '@/lib/types'
import { useWorkspace } from '@/lib/workspace'
import { BrandFields, emptyBrand } from '@/components/brand-fields'
import { ResearchForm, ResearchReport, useResearch } from '@/components/research'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Check, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

function resume() {
  try {
    const saved = JSON.parse(localStorage.getItem('motif-onboarding') || 'null')
    if (saved?.draft && typeof saved.draft === 'object' && !Array.isArray(saved.draft)) {
      const draft = emptyBrand(), input = saved.draft
      for (const key of ['id', 'name', 'website', 'description', 'product', 'audience', 'voice', 'image', 'source', 'goal', 'industry', 'language'] as const) if (typeof input[key] === 'string') draft[key] = input[key]
      if (Number.isSafeInteger(input.version) && input.version >= 0) draft.version = input.version
      if (Array.isArray(input.colors) && input.colors.length >= 2 && input.colors.every((color: unknown) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color))) draft.colors = input.colors
      if (input.analysis && typeof input.analysis === 'object' && !Array.isArray(input.analysis)) draft.analysis = input.analysis
      return { draft, step: saved.step >= 3 && draft.id ? 3 : saved.step === 2 ? 2 : 0 }
    }
  } catch { /* Start clean if browser storage is unavailable. */ }
  return { draft: emptyBrand(), step: 0 }
}
export default function Onboarding() {
  const { data, refresh, selectBrand, navigate } = useWorkspace()
  const [initial] = useState(resume), [draft, setDraft] = useState(initial.draft), [step, setStep] = useState(initial.step), [manual, setManual] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [settings, setSettings] = useState<Settings>(data.settings)
  const research = useResearch('onboarding'), alive = useRef(true)
  const [sessionId] = useState(() => crypto.randomUUID())
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { try { localStorage.setItem('motif-onboarding', JSON.stringify({ sessionId, step, draft, enteredName: draft.name })) } catch { /* Storage can be disabled. */ } }, [sessionId, step, draft])
  function persistSaved(saved: Brand, step: number) {
    try {
      if (JSON.parse(localStorage.getItem('motif-onboarding') || 'null')?.sessionId === sessionId)
        localStorage.setItem('motif-onboarding', JSON.stringify({ sessionId, step, draft: saved, enteredName: saved.name }))
    } catch { /* Storage can be disabled. */ }
  }
  async function save() {
    setBusy(true); setError('')
    try {
      const saved = await api<Brand>(draft.id ? 'brands/' + draft.id : 'brands', draft.id ? 'PUT' : 'POST', draft)
      persistSaved(saved, 2)
      if (alive.current) setDraft(saved)
      try {
        await api('workspace', 'PUT', { onboardingCompleted: true })
        persistSaved(saved, 3)
      } finally { await refresh() }
      if (!alive.current) return
      selectBrand(saved.id); setStep(3)
    } catch (error) { if (alive.current) setError((error as Error).message) }
    finally { if (alive.current) setBusy(false) }
  }
  function finish(page: 'studio' | 'connections') { try { localStorage.removeItem('motif-onboarding') } catch { /* Storage can be disabled. */ } navigate(page) }
  return <div className="mx-auto max-w-4xl space-y-8 py-4"><div className="flex flex-wrap items-center justify-between gap-4"><Badge variant="secondary">Welcome to Motif</Badge>{data.brands.length > 0 && <Button variant="ghost" onClick={() => navigate('studio')}>Back to workspace</Button>}</div>
    <ol className="grid grid-cols-3 gap-3" aria-label="Setup progress">{['Your business', 'Brand DNA', 'Your studio'].map((title, index) => <li key={title} aria-current={(step >= 3 ? 2 : step === 2 ? 1 : 0) === index ? 'step' : undefined} className={`border-t-2 pt-3 text-sm ${index === (step >= 3 ? 2 : step === 2 ? 1 : 0) ? 'border-primary font-medium' : 'border-muted text-muted-foreground'}`}>{index + 1}. {title}</li>)}</ol>
    <header className="space-y-3"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{step === 3 ? `${draft.name} has a home.` : step === 2 ? 'Make this brand your own.' : 'Good marketing starts with knowing you.'}</h1><p className="max-w-2xl text-muted-foreground">{step === 3 ? 'Your Brand DNA is saved. Start with templates or connect local models whenever you’re ready.' : step === 2 ? 'Review every detail. Nothing becomes Brand DNA until you save it.' : 'Start with your public website, or tell your story yourself. Your workspace and model processing stay on your machine.'}</p></header>
    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
    {step === 0 && <Card><CardHeader><CardTitle>Tell us where to start</CardTitle><CardDescription>Website research contacts the public pages you choose. Manual setup works offline.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="space-y-2"><Label htmlFor="onboarding-name">Business name</Label><Input id="onboarding-name" maxLength={100} value={draft.name} disabled={research.running} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Your business" /></div>{!manual && <ResearchForm website={draft.website} model={data.settings.textModel} research={research} onWebsiteChange={website => setDraft(current => ({ ...current, website }))} onResult={result => { setDraft(current => ({ ...current, ...result, name: current.name.trim() || result.name || '' })); setStep(2) }} />}<Button variant="outline" disabled={research.running} onClick={() => { setManual(true); setStep(2) }}>Enter Brand DNA myself<ArrowRight className="size-4" /></Button></CardContent></Card>}
    {step === 2 && <><Card><CardHeader><CardTitle>Your Brand DNA</CardTitle></CardHeader><CardContent><form className="space-y-6" onSubmit={event => { event.preventDefault(); void save() }}><BrandFields value={draft} onChange={setDraft} disabled={busy} /><div className="flex flex-wrap gap-3"><Button disabled={busy}>{busy ? 'Saving…' : 'Make this my Brand DNA'}<Check className="size-4" /></Button><Button type="button" variant="outline" disabled={busy} onClick={() => { setManual(false); setStep(0); setError('') }}>Back</Button></div></form></CardContent></Card>{draft.analysis && <ResearchReport analysis={draft.analysis} />}</>}
    {step === 3 && <><Card><CardHeader><CardTitle>Local models <Badge variant="outline">Optional</Badge></CardTitle><CardDescription>Use running OpenAI-compatible localhost servers. Models are not downloaded or started automatically.</CardDescription></CardHeader><CardContent><form className="space-y-5" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await api('settings', 'PUT', settings); await refresh(); if (alive.current) toast.success('Local model settings saved.') } catch (error) { if (alive.current) setError((error as Error).message) } finally { if (alive.current) setBusy(false) } }}>{(['textEndpoint', 'textModel', 'imageEndpoint', 'imageModel'] as const).map(key => <div className="space-y-2" key={key}><Label htmlFor={'setup-' + key}>{({ textEndpoint: 'Text endpoint', textModel: 'Text model ID', imageEndpoint: 'Image endpoint', imageModel: 'Image model ID' })[key]}</Label><Input id={'setup-' + key} type={key.endsWith('Endpoint') ? 'url' : 'text'} required={key.endsWith('Endpoint')} disabled={busy} value={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.value })} /></div>)}<Button variant="outline" disabled={busy}>{busy ? 'Saving…' : 'Save model settings'}</Button></form></CardContent></Card><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => finish('studio')}>Create my first campaign<ArrowRight className="size-4" /></Button><Button variant="outline" disabled={busy} onClick={() => finish('connections')}>Connect social channels</Button></div></>}
  </div>
}
