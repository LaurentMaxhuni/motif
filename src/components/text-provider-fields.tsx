import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, PlugZap, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { api } from '@/lib/api'
import { localServers, textGuides, type ProviderGuide } from '@/lib/providers'
import { cliProviders, type CliProvider, type Settings } from '@/lib/types'

interface Model { id: string; label?: string; description?: string }
const DEFAULT = '__default__', CUSTOM = '__custom__'

export function GuideCard({ guide }: { guide: ProviderGuide }) {
  return <div className="space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
    <p>{guide.summary}</p>
    <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
    {guide.links.length > 0 && <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">{guide.links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-4">{link.label}<ExternalLink className="size-3"/></a>)}</div>}
  </div>
}

export function TextProviderFields({ settings, onChange, disabled = false }: { settings: Settings; onChange: (value: Settings) => void; disabled?: boolean }) {
  const provider = settings.textProvider || 'local'
  const isLocal = provider === 'local'
  const profile = !isLocal ? settings.cliProfiles?.[provider] || { executable: '', model: '' } : null
  const model = isLocal ? settings.textModel : profile?.model || ''
  const [models, setModels] = useState<Model[]>([]), [loading, setLoading] = useState(false), [note, setNote] = useState(''), [listError, setListError] = useState('')
  const [testing, setTesting] = useState(false), [status, setStatus] = useState(''), [failed, setFailed] = useState(false), [custom, setCustom] = useState(false)
  const alive = useRef(true), epoch = useRef(0), latest = useRef(settings)
  latest.current = settings
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  function setModel(value: string) {
    if (isLocal) onChange({ ...settings, textModel: value })
    else if (profile) onChange({ ...settings, cliProfiles: { ...settings.cliProfiles, [provider]: { ...profile, model: value } } })
  }
  function setExecutable(value: string) { if (profile) onChange({ ...settings, cliProfiles: { ...settings.cliProfiles, [provider]: { ...profile, executable: value } } }) }

  async function loadModels() {
    const sequence = ++epoch.current
    setLoading(true); setListError(''); setNote('')
    try {
      const result = isLocal
        ? { models: (await api<{ models: string[] }>('models', 'POST', { kind: 'text', textEndpoint: settings.textEndpoint })).models.map(id => ({ id })) }
        : await api<{ models: Model[]; note?: string }>('cli/models', 'POST', { textProvider: provider, cliProfiles: settings.cliProfiles })
      if (!alive.current || sequence !== epoch.current) return
      setModels(result.models); setNote('note' in result && result.note ? result.note : isLocal && !result.models.length ? 'The app is running but has no models yet. Download one in it, then refresh.' : '')
      // Pick the first model automatically when a local server needs one and none is chosen yet.
      if (isLocal && !latest.current.textModel && result.models[0]) onChange({ ...latest.current, textModel: result.models[0].id })
    } catch (error) {
      if (!alive.current || sequence !== epoch.current) return
      setModels([])
      setListError(isLocal ? `Couldn't reach an AI app at ${settings.textEndpoint}. Make sure Ollama or LM Studio is open, or check the address.` : (error as Error).message)
    } finally { if (alive.current && sequence === epoch.current) setLoading(false) }
  }
  // Follow the selection: reload the list whenever the provider, address or executable changes.
  const executable = profile?.executable || ''
  useEffect(() => {
    setStatus(''); setFailed(false); setCustom(false)
    const timer = setTimeout(() => void loadModels(), isLocal ? 500 : 0)
    return () => { clearTimeout(timer); epoch.current++ }
  }, [provider, isLocal ? settings.textEndpoint : executable])

  async function test() {
    const sequence = epoch.current
    setTesting(true); setStatus(''); setFailed(false)
    try {
      if (isLocal) {
        if (!settings.textModel) throw new Error('Choose a model first.')
        if (!models.some(item => item.id === settings.textModel)) throw new Error(`${settings.textModel} isn't loaded in your AI app.`)
        setStatus('Connected. Save settings to use it.')
      } else {
        const result = await api<{ ok: boolean; provider: string }>('cli/test', 'POST', settings)
        if (alive.current && sequence === epoch.current) setStatus(`${result.provider} replied. Save settings to use it.`)
      }
    } catch (error) { if (alive.current && sequence === epoch.current) { setFailed(true); setStatus((error as Error).message) } }
    finally { if (alive.current) setTesting(false) }
  }

  const known = models.some(item => item.id === model)
  const showCustom = custom || (!!model && !known && !loading)
  const selectValue = showCustom ? CUSTOM : model || (isLocal ? '' : DEFAULT)
  const preset = localServers.find(server => server.endpoint === settings.textEndpoint)?.id || 'custom'
  const busy = disabled || testing

  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="text-provider">Writing AI</Label>
      <FieldSelect id="text-provider" value={provider} disabled={busy} onValueChange={value => onChange({ ...settings, textProvider: value as Settings['textProvider'] })}>
        <FieldSelectItem value="local">{textGuides.local.name}</FieldSelectItem>
        {Object.keys(cliProviders).map(id => <FieldSelectItem key={id} value={id}>{textGuides[id as CliProvider].name}</FieldSelectItem>)}
      </FieldSelect>
      <p className="text-xs text-muted-foreground">Writes your copy, designs your layouts and reads your website.</p>
    </div>
    <GuideCard guide={textGuides[provider]}/>
    {isLocal && <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
      <div className="space-y-2">
        <Label htmlFor="text-app">App</Label>
        <FieldSelect id="text-app" value={preset} disabled={busy} onValueChange={value => { const server = localServers.find(item => item.id === value); if (server) onChange({ ...settings, textEndpoint: server.endpoint, textModel: '' }) }}>
          {localServers.map(server => <FieldSelectItem key={server.id} value={server.id}>{server.label}</FieldSelectItem>)}
          <FieldSelectItem value="custom">Other</FieldSelectItem>
        </FieldSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="text-endpoint">Address</Label>
        <Input id="text-endpoint" type="url" required value={settings.textEndpoint} disabled={busy} onChange={event => onChange({ ...settings, textEndpoint: event.target.value })}/>
      </div>
    </div>}
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="text-model">Model</Label>
        <Button type="button" variant="ghost" size="sm" className="h-7" disabled={busy || loading} onClick={() => void loadModels()}>{loading ? <Loader2 className="size-3.5 animate-spin"/> : <RefreshCw className="size-3.5"/>}Refresh list</Button>
      </div>
      <FieldSelect id="text-model" value={selectValue} disabled={busy || loading} placeholder={loading ? 'Looking for models…' : 'Choose a model'} onValueChange={value => {
        if (value === CUSTOM) { setCustom(true); return }
        setCustom(false); setModel(value === DEFAULT ? '' : value)
      }}>
        {!isLocal && <FieldSelectItem value={DEFAULT}>Recommended (its default model)</FieldSelectItem>}
        {models.map(item => <FieldSelectItem key={item.id} value={item.id}>{item.label ? `${item.label}${item.description ? ` · ${item.description}` : ''}` : item.id}</FieldSelectItem>)}
        <FieldSelectItem value={CUSTOM}>Type a model name…</FieldSelectItem>
      </FieldSelect>
      {showCustom && <Input id="text-model-custom" aria-label="Model name" value={model} maxLength={200} disabled={busy} placeholder={provider === 'claude' ? 'e.g. sonnet' : 'Exact model name'} onChange={event => setModel(event.target.value)} autoFocus={custom}/>}
      {listError ? <p role="alert" className="text-sm text-destructive">{listError}</p> : note ? <p className="text-xs text-muted-foreground">{note}</p> : !loading && models.length > 0 && <p className="text-xs text-muted-foreground">{models.length} model{models.length === 1 ? '' : 's'} available.</p>}
    </div>
    {profile && <details className="rounded-md border px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium">Advanced</summary>
      <div className="mt-3 space-y-2">
        <Label htmlFor="cli-executable">Program location</Label>
        <Input id="cli-executable" value={profile.executable} disabled={busy} maxLength={2000} placeholder="Found automatically" onChange={event => setExecutable(event.target.value)}/>
        <p className="text-xs text-muted-foreground">Only needed if {cliProviders[provider as CliProvider]} isn't found automatically. Use the full path to the program file.</p>
      </div>
    </details>}
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" disabled={busy || loading} onClick={() => void test()}>{testing ? <Loader2 className="size-4 animate-spin"/> : <PlugZap className="size-4"/>}Check connection</Button>
      {!isLocal && <span className="text-xs text-muted-foreground">Sends one tiny message, which may count toward your plan.</span>}
    </div>
    <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>{status}</p>
    {!isLocal && <p className="text-xs text-muted-foreground">Your prompts and brand details go to the service {cliProviders[provider as CliProvider]} is signed in to.</p>}
  </div>
}
