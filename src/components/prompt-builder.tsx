import { useState, type FormEvent } from 'react'
import { WandSparkles } from 'lucide-react'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { kinds } from '@/lib/types'

type ContentKind = typeof kinds[number]

const formats = {
  'Social post': { name: 'a social post', topic: 'A summer collection launch', details: 'Open with a short hook, highlight one standout piece, and invite readers to browse the collection.' },
  'Ad creative': { name: 'an ad creative', topic: 'A starter kit for small kitchens', details: 'Focus on the space it saves and end with a Shop the kit call to action. Use a clean product close-up.' },
  Email: { name: 'an email', topic: 'A welcome email for new subscribers', details: 'Include a subject line and preview text. Introduce the brand in two short paragraphs and link to the bestsellers.' },
  'SEO article': { name: 'an SEO article', topic: 'How to care for linen clothing', details: 'Use “how to wash linen” as the primary keyword. Cover washing, drying, and common mistakes with practical steps.' },
  'Video script': { name: 'a video script', topic: 'A 30-second product demo', details: 'Start with the problem in the first three seconds. Show three quick steps with voiceover and on-screen text.' },
} satisfies Record<ContentKind, { name: string; topic: string; details: string }>

export const creativeBriefLimit = 4000

export function PromptBuilder({ brief, kind, disabled, onApply }: {
  brief: string
  kind: ContentKind
  disabled: boolean
  onApply: (brief: string, kind: ContentKind) => void
}) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState(kind)
  const [topic, setTopic] = useState('')
  const [audience, setAudience] = useState('')
  const [details, setDetails] = useState('')
  const example = formats[format]
  const subject = topic.trim()
  const prompt = subject ? [
    `Create ${example.name} about ${subject}${/[.!?]$/.test(subject) ? '' : '.'}`,
    audience.trim() && `Audience: ${audience.trim()}`,
    details.trim() && `Direction: ${details.trim()}`,
  ].filter(Boolean).join('\n') : ''
  const combined = [brief, prompt].filter(Boolean).join('\n\n')
  const tooLong = combined.length > creativeBriefLimit

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || !prompt || tooLong) return
    onApply(combined, format)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={next => {
      if (next) {
        setFormat(kind)
        setTopic('')
        setAudience('')
        setDetails('')
      }
      setOpen(next)
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}><WandSparkles/> Build a prompt</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build a prompt</DialogTitle>
          <DialogDescription>Start with an example or enter your own idea. You can edit the result in your creative brief.</DialogDescription>
        </DialogHeader>
        <form onSubmit={apply} className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-2">
              <Label htmlFor="prompt-format">Content type</Label>
              <FieldSelect id="prompt-format" value={format} onValueChange={value => {
                const selected = kinds.find(option => option === value)
                if (selected) setFormat(selected)
              }}>
                {kinds.map(option => <FieldSelectItem key={option}>{option}</FieldSelectItem>)}
              </FieldSelect>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setTopic(example.topic)
              setDetails(example.details)
            }}>Load example</Button>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-topic">Topic</Label>
            <Input id="prompt-topic" value={topic} onChange={event => setTopic(event.target.value)} maxLength={250} placeholder={example.topic} required autoFocus/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-audience">Audience (optional)</Label>
            <Input id="prompt-audience" value={audience} onChange={event => setAudience(event.target.value)} maxLength={250} placeholder="e.g. Returning customers"/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prompt-details">Creative direction (optional)</Label>
            <Textarea id="prompt-details" value={details} onChange={event => setDetails(event.target.value)} maxLength={1500} rows={3} placeholder="Add a goal, tone, key details, or call to action."/>
          </div>
          {tooLong && <p role="status" className="text-sm text-destructive">Shorten your brief or prompt to fit {creativeBriefLimit.toLocaleString()} characters.</p>}
          {!tooLong && brief.trim() && <p className="text-sm text-muted-foreground">Adds the prompt after your existing brief.</p>}
          <Button type="submit" disabled={disabled || !prompt || tooLong} className="justify-self-end">Use prompt</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
