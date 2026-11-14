import { useEffect, useId, useRef } from 'react'
import type { Brand } from '@/lib/types'
import { upload } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

export const emptyBrand = (): Brand => ({ id: '', version: 0, name: '', website: '', description: '', product: '', audience: '', voice: '', colors: ['#18181b', '#8b5cf6'], image: '', source: 'Manual', goal: 'Build awareness', industry: '', language: 'English' })

export function BrandFields({ value, onChange, disabled = false }: { value: Brand; onChange: (value: Brand) => void; disabled?: boolean }) {
  const prefix = useId()
  const latest = useRef(value), uploadSequence = useRef(0)
  latest.current = value
  useEffect(() => () => { uploadSequence.current++ }, [])
  const field = (key: keyof Brand, title: string, multiline = false, maxLength = 2000) => {
    const id = `${prefix}-${key}`
    const props = { id, name: key, value: String(value[key] || ''), disabled, maxLength, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [key]: event.target.value }) }
    return <div className="space-y-2"><Label htmlFor={id}>{title}</Label>{multiline ? <Textarea {...props} rows={3} /> : <Input {...props} required={key === 'name'} type={key === 'website' ? 'url' : 'text'} />}</div>
  }
  return <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">{field('name', 'Business name', false, 100)}{field('website', 'Website', false, 2000)}</div>
    {field('description', 'Your story', true, 8000)}{field('product', 'Products & services', true)}
    <div className="grid gap-5 sm:grid-cols-2">{field('audience', 'Your audience', true)}{field('voice', 'Brand voice', true)}</div>
    <div className="grid gap-5 sm:grid-cols-2">{field('industry', 'Industry', false, 200)}{field('language', 'Language', false, 100)}</div>
    {field('goal', 'Your goal', false, 500)}
    <fieldset className="space-y-3"><legend className="text-sm font-medium">Brand palette</legend><p className="text-sm text-muted-foreground">The first color leads in your creatives, the second supports it. Add up to six.</p><div className="flex flex-wrap items-end gap-4">{(value.colors?.length >= 2 ? value.colors : [value.colors?.[0] || '#18181b', value.colors?.[1] || '#8b5cf6']).map((color, index) => <div key={index} className="space-y-2"><Label htmlFor={`${prefix}-color-${index}`}>{index === 0 ? 'Primary' : index === 1 ? 'Secondary' : `Color ${index + 1}`}</Label><div className="flex items-center gap-1"><Input id={`${prefix}-color-${index}`} type="color" className="h-11 w-20 p-1" disabled={disabled} value={color} onChange={event => { const colors = [...value.colors]; colors[index] = event.target.value; onChange({ ...value, colors }) }} />{index >= 2 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove color ${index + 1}`} disabled={disabled} onClick={() => onChange({ ...value, colors: value.colors.filter((_, i) => i !== index) })}><X className="size-4" /></Button>}</div></div>)}{(value.colors?.length || 0) < 6 && <Button type="button" variant="outline" size="sm" className="mb-1.5" disabled={disabled} onClick={() => onChange({ ...value, colors: [...(value.colors?.length >= 2 ? value.colors : [value.colors?.[0] || '#18181b', value.colors?.[1] || '#8b5cf6']), '#888888'] })}><Plus className="size-4" />Add color</Button>}</div></fieldset>
    <div className="space-y-3"><Label htmlFor={`${prefix}-photo`}>Product photo</Label><p className="text-sm text-muted-foreground">PNG, JPEG or WebP, up to 5 MB. Used in new creatives.</p>{value.image && <img src={value.image} alt="Current product" className="max-h-48 max-w-full rounded-lg border object-contain" />}<Input id={`${prefix}-photo`} type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={async event => { const input = event.target, file = input.files?.[0]; if (!file) return; const epoch = ++uploadSequence.current; try { const image = await upload(file); if (epoch === uploadSequence.current) onChange({ ...latest.current, image }) } catch (error) { if (epoch === uploadSequence.current) toast.error((error as Error).message) } input.value = '' }} />{value.image && <Button variant="ghost" type="button" disabled={disabled} onClick={() => { uploadSequence.current++; onChange({ ...value, image: '' }) }}>Remove photo</Button>}</div>
  </div>
}
