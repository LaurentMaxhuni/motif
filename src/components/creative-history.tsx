import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldSelect, FieldSelectItem } from '@/components/field-select'
import { api } from '@/lib/api'
import type { Brand, Content } from '@/lib/types'
import CreativePreview from './creative-preview'

type VersionSummary = Pick<Content, 'version' | 'title' | 'status' | 'updatedAt'>

export function CreativeHistory({ id, currentVersion, brand, disabled, onRestore }: {
  id: string
  currentVersion: number
  brand?: Brand
  disabled: boolean
  onRestore: (version: number) => void
}) {
  const [versions, setVersions] = useState<VersionSummary[]>()
  const [selected, setSelected] = useState('')
  const [preview, setPreview] = useState<Content>()
  const [listError, setListError] = useState('')
  const [previewError, setPreviewError] = useState('')
  const path = 'contents/' + id + '/versions'

  useEffect(() => {
    let active = true
    void api<{ versions: VersionSummary[] }>(path).then(({ versions }) => {
      if (!active) return
      setVersions(versions)
      if (versions.length) setSelected(String(versions[0].version))
    }).catch(error => {
      if (active) setListError(error.message)
    })
    return () => { active = false }
  }, [path])

  useEffect(() => {
    if (!selected) return
    let active = true
    void api<{ item: Content }>(path + '/' + selected).then(({ item }) => {
      if (active) setPreview(item)
    }).catch(error => {
      if (active) setPreviewError(error.message)
    })
    return () => { active = false }
  }, [path, selected])

  const summary = versions?.find(version => String(version.version) === selected)
  const item = preview && String(preview.version) === selected ? preview : undefined

  return <section id="creative-version-history" aria-label="Version history" className="space-y-4 rounded-xl border p-4">
    <p className="text-sm text-muted-foreground">Current saved version {currentVersion}</p>
    {listError && <p role="alert" className="text-sm text-destructive">{listError}</p>}
    {!versions && !listError && <p role="status" className="text-sm">Loading saved versions…</p>}
    {versions?.length === 0 && <p className="text-sm text-muted-foreground">Earlier versions will appear after you save changes.</p>}
    {!!versions?.length && <>
      <div className="space-y-2">
        <Label htmlFor="creative-version">Saved version</Label>
        <FieldSelect id="creative-version" value={selected} disabled={disabled} onValueChange={value => {
          setPreviewError('')
          setSelected(value)
        }}>
          {versions.map(version => <FieldSelectItem key={version.version} value={version.version}>
            Version {version.version} · {version.title}
          </FieldSelectItem>)}
        </FieldSelect>
      </div>
      {summary && <p className="text-xs text-muted-foreground">
        {summary.status}{summary.updatedAt && <> · {new Date(summary.updatedAt).toLocaleString()}</>}
      </p>}
      {previewError && <p role="alert" className="text-sm text-destructive">{previewError}</p>}
      {!item && !previewError && <p role="status" className="text-sm">Loading preview…</p>}
      {item && <>
        <div className="max-w-64 overflow-hidden rounded-lg border">
          <CreativePreview item={item} brand={brand} />
        </div>
        <div className="space-y-2 break-words text-sm">
          <h3 className="font-semibold">{item.headline}</h3>
          {item.subhead && <p>{item.subhead}</p>}
          <p className="whitespace-pre-wrap text-muted-foreground">{item.body}</p>
          <p>{item.cta}</p>
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => onRestore(item.version)}>
          Restore as draft
        </Button>
      </>}
    </>}
  </section>
}
