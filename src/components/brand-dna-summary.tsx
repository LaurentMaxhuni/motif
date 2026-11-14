import { ImagePlus, Check } from 'lucide-react'
import type { Analysis } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Asset { dataUrl: string; width: number; height: number; alt?: string; src?: string; sourceUrl: string; backdrop?: string }
interface PaletteItem { color: string; role: string; share: number; usage: string[] }
interface Figure { figure: string; context: string; sourceUrl: string }

const roleLabel: Record<string, string> = { primary: 'Primary', secondary: 'Secondary', accent: 'Accent', text: 'Text', background: 'Background', surface: 'Surface' }
const dnaLabel: Record<string, string> = { tagline: 'Tagline', positioning: 'What makes it different', mission: 'Mission', values: 'Values', personality: 'Personality', audience: 'Audience', voice: 'Voice' }
const isImage = (value: unknown): value is string => typeof value === 'string' && /^data:image\/(?:png|jpeg|webp);base64,/.test(value)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h3 className="text-sm font-medium">{title}</h3>{children}</section>
}

/** The visual and verbal brand identity found on the website, at a glance. */
export function BrandDNASummary({ analysis, image, onUseImage }: { analysis: Analysis; image?: string; onUseImage?: (dataUrl: string) => void }) {
  const findings = analysis.findings || {}, visual = findings.visualIdentity || {}
  const logos: Asset[] = (visual.logoImages || []).filter((logo: Asset) => isImage(logo.dataUrl))
  const images: Asset[] = (visual.images || []).filter((item: Asset) => isImage(item.dataUrl))
  const palette: PaletteItem[] = visual.brandPalette || []
  const type = visual.typography as { headings?: string; body?: string; buttons?: string; webFonts?: string[] } | undefined
  const figures: Figure[] = findings.figures || []
  const style = findings.voice?.style as { traits: string[]; vocabulary: string[] } | undefined
  const dna: Record<string, { value: string; quote: string }> = findings.brandDNA || {}
  const taglines: string[] = findings.taglines || []
  if (!logos.length && !palette.length && !images.length && !figures.length && !style && !Object.keys(dna).length) return null
  return <div className="space-y-7 rounded-xl border p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold tracking-tight">Found on your website</h2><p className="text-sm text-muted-foreground">Measured from {analysis.coverage?.analyzedPages || analysis.pages?.length || 0} pages{analysis.findings?.technical?.browserPages ? `, ${analysis.findings.technical.browserPages} loaded in a browser` : ''}. Check it over before you save.</p></div>
      {isImage(visual.screenshot) && <img src={visual.screenshot} alt="Your homepage as Motif saw it" className="h-20 w-auto rounded-md border object-cover object-top"/>}
    </div>

    {logos.length > 0 && <Section title="Logos">
      <div className="flex flex-wrap gap-3">{logos.map((logo, index) => <figure key={index} className="flex h-24 min-w-28 items-center justify-center rounded-lg border p-4" style={{ background: logo.backdrop || 'transparent' }}>
        <img src={logo.dataUrl} alt={logo.alt || `Logo ${index + 1}`} className="max-h-14 max-w-48 object-contain"/>
      </figure>)}</div>
    </Section>}

    {palette.length > 0 && <Section title="Colors in use">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{palette.map(item => <div key={item.color} className="flex items-center gap-3 rounded-lg border p-2.5">
        <span className="size-10 shrink-0 rounded-md border" style={{ background: item.color }}/>
        <div className="min-w-0 text-sm"><p className="font-medium">{roleLabel[item.role] || item.role} <span className="font-mono text-xs text-muted-foreground">{item.color}</span></p><p className="truncate text-xs text-muted-foreground">{item.usage.length ? item.usage.join(', ') : 'small details'}</p></div>
      </div>)}</div>
    </Section>}

    {type && (type.headings || type.body) && <Section title="Typography">
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        {type.headings && <div><dt className="text-xs text-muted-foreground">Headlines</dt><dd className="font-medium">{type.headings}</dd></div>}
        {type.body && <div><dt className="text-xs text-muted-foreground">Body text</dt><dd className="font-medium">{type.body}</dd></div>}
        {type.buttons && <div><dt className="text-xs text-muted-foreground">Buttons</dt><dd className="font-medium">{type.buttons}</dd></div>}
      </dl>
      {type.webFonts && type.webFonts.length > 0 && <p className="text-xs text-muted-foreground">Web fonts loaded: {type.webFonts.join(', ')}</p>}
    </Section>}

    {images.length > 0 && <Section title="Imagery">
      {onUseImage && <p className="text-xs text-muted-foreground">Pick one to use as the product photo in new creatives.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{images.map((item, index) => {
        const chosen = image === item.dataUrl
        return <figure key={index} className="group space-y-2">
          <img src={item.dataUrl} alt={item.alt || `Website image ${index + 1}`} className="aspect-square w-full rounded-lg border object-cover"/>
          {onUseImage && <Button type="button" size="sm" variant={chosen ? 'secondary' : 'outline'} className="h-auto w-full whitespace-normal py-1.5" disabled={chosen} aria-label={chosen ? 'Current product photo' : `Use image ${index + 1} as product photo`} onClick={() => onUseImage(item.dataUrl)}>{chosen ? <><Check/>Chosen</> : <><ImagePlus/>Use as photo</>}</Button>}
        </figure>
      })}</div>
    </Section>}

    {(Object.keys(dna).length > 0 || taglines.length > 0) && <Section title="Brand story">
      <dl className="space-y-3 text-sm">
        {!dna.tagline && taglines[0] && <div><dt className="text-xs text-muted-foreground">Headline on the homepage</dt><dd className="font-medium">{taglines[0]}</dd></div>}
        {Object.entries(dna).filter(([key]) => key !== 'voice' && key !== 'audience').map(([key, entry]) => <div key={key}>
          <dt className="text-xs text-muted-foreground">{dnaLabel[key] || key} <Badge variant="secondary" className="ml-1 align-middle">AI reading</Badge></dt>
          <dd className="font-medium">{entry.value}</dd>
          <dd className="mt-1 border-l-2 pl-3 text-xs text-muted-foreground">“{entry.quote}”</dd>
        </div>)}
      </dl>
    </Section>}

    {figures.length > 0 && <Section title="Key figures">
      <ul className="grid gap-2 text-sm sm:grid-cols-2">{figures.slice(0, 12).map((item, index) => <li key={index} className="rounded-lg border p-3"><p className="text-base font-semibold">{item.figure}</p><p className="text-xs text-muted-foreground">{item.context}</p></li>)}</ul>
      <p className="text-xs text-muted-foreground">Quoted from your pages. Motif only uses figures in copy when they appear here.</p>
    </Section>}

    {style && <Section title="How you write">
      <ul className="flex flex-wrap gap-2">{style.traits.map(trait => <li key={trait}><Badge variant="outline" className="whitespace-normal text-left">{trait}</Badge></li>)}</ul>
      {style.vocabulary.length > 0 && <p className="text-sm text-muted-foreground">Words you use often: {style.vocabulary.join(', ')}</p>}
    </Section>}
  </div>
}
