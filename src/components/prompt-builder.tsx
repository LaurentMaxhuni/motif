import { useRef, useState, type FormEvent } from 'react'
import { Loader2, PenLine } from 'lucide-react'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/lib/api'
import { kinds } from '@/lib/types'

type ContentKind = typeof kinds[number]

const formats = {
  'Social post': { name: 'a social post', topic: 'A summer collection launch' },
  'Ad creative': { name: 'an ad creative', topic: 'A starter kit for small kitchens' },
  Email: { name: 'an email', topic: 'A welcome email for new subscribers' },
  'SEO article': { name: 'an SEO article', topic: 'How to care for linen clothing' },
  'Video script': { name: 'a video script', topic: 'A 30-second product demo' },
} satisfies Record<ContentKind, { name: string; topic: string }>

export const creativeBriefLimit = 4000

export function PromptBuilder({ brief, kind, brandId, aiReady, disabled, onApply }: {
  brief: string
  kind: ContentKind
  brandId?: string
  /** A writing model is connected, so the brief can be drafted with AI. */
  aiReady: boolean
  disabled: boolean
  onApply: (brief: string, kind: ContentKind) => void
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState(kind)
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [details, setDetails] = useState('')
  const [draft, setDraft] = useState('')
  const [writing, setWriting] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const example = formats[format]
  const subject = topic.trim()
  const written = subject ? [
    `Create ${example.name} about ${subject}${/[.!?]$/.test(subject) ? '' : '.'}`,
    audience.trim() && `Audience: ${audience.trim()}`,
    details.trim() && `Direction: ${details.trim()}`,
  ].filter(Boolean).join('\n') : ''
  const result = draft.trim() || written
  const combined = [brief, result].filter(Boolean).join('\n\n')
  const tooLong = combined.length > creativeBriefLimit

  async function writeWithAI() {
    if (!brandId || writing) return
    const id = ++request.current
    setWriting(true); setError('')
    try {
      const response = await api<{ brief: string }>('brief', 'POST', { brandId, kind: format, idea: subject, audience: audience.trim(), details: details.trim(), current: brief })
      if (id === request.current) setDraft(response.brief)
    } catch (cause) {
      if (id === request.current) setError((cause as Error).message)
    } finally {
      if (id === request.current) setWriting(false)
    }
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || writing || !result || tooLong) return
    onApply(combined, format)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={next => {
      if (next) {
        setFormat(kind); setTopic(''); setAudience(''); setDetails(''); setDraft(''); setError('')
      } else request.current++
      setWriting(false)
      setOpen(next)
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}><PenLine/> Help me write a brief</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write a brief</DialogTitle>
          <DialogDescription>{aiReady
            ? 'Give a rough idea, or leave it blank and let AI pick an angle from your Brand DNA. You can edit the result before using it.'
            : 'Describe what you want to make. Connect a writing AI in Settings to have it draft the brief for you.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={apply} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="prompt-format">Content type</Label>
            <FieldSelect id="prompt-format" value={format} disabled={writing} onValueChange={value => {
              const selected = kinds.find(option => option === value)
              if (selected) setFormat(selected)
            }}>
              {kinds.map(option => <FieldSelectItem key={option}>{option}</FieldSelectItem>)}
            </FieldSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-topic">What is it about?{aiReady && ' (optional)'}</Label>
            <Input id="prompt-topic" value={topic} disabled={writing} onChange={event => setTopic(event.target.value)} maxLength={250} placeholder={`e.g. ${example.topic}`} required={!aiReady} autoFocus/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-audience">Who is it for? (optional)</Label>
            <Input id="prompt-audience" value={audience} disabled={writing} onChange={event => setAudience(event.target.value)} maxLength={250} placeholder="e.g. Returning customers"/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-details">Anything else? (optional)</Label>
            <Textarea id="prompt-details" value={details} disabled={writing} onChange={event => setDetails(event.target.value)} maxLength={1500} rows={2} placeholder="An offer, a tone, a detail to include, or the action people should take."/>
          </div>
          {aiReady && <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={disabled || writing || !brandId} onClick={() => void writeWithAI()}>
              {writing ? <Loader2 className="animate-spin"/> : <PenLine/>}{writing ? 'Writing…' : draft ? 'Write another version' : 'Write it with AI'}
            </Button>
            {writing && <span role="status" className="text-sm text-muted-foreground">This usually takes 10 to 30 seconds.</span>}
          </div>}
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          {draft && <div className="grid gap-2">
            <Label htmlFor="prompt-draft">Your brief</Label>
            <Textarea id="prompt-draft" value={draft} disabled={writing} onChange={event => setDraft(event.target.value)} maxLength={creativeBriefLimit} rows={9}/>
          </div>}
          {tooLong && <p role="status" className="text-sm text-destructive">Shorten your brief to fit {creativeBriefLimit.toLocaleString()} characters.</p>}
          {!tooLong && brief.trim() && result && <p className="text-sm text-muted-foreground">This is added after the brief you already have.</p>}
          <Button type="submit" disabled={disabled || writing || !result || tooLong} className="justify-self-end">Use this brief</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
