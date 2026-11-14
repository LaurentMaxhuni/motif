import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { GenerationJob } from '@/lib/generation'

export function GenerationStatus({ job, pending, cancel, retry }: {
  job: GenerationJob
  pending: boolean
  cancel: () => void
  retry: () => void
}) {
  const stage = {
    design: 'Preparing drafts',
    artwork: `Generating artwork for draft ${job.completed + 1}`,
    render: `Rendering draft ${job.completed + 1}`,
    save: 'Saving drafts',
  }[job.stage]

  return <div className="space-y-3 rounded-lg border p-4">
    <p className="text-sm font-medium">{job.weekly ? 'Weekly plan' : 'Creative generation'}</p>
    {job.status === 'running' && <>
      <p role="status" className="text-sm text-muted-foreground">{stage} · {job.completed} of {job.count} drafts prepared</p>
      <Progress aria-label="Drafts prepared" value={job.completed / job.count * 100} />
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={cancel}>Cancel generation</Button>
    </>}
    {job.status === 'completed' &&
      <p role="status" className="text-sm text-muted-foreground">{job.count} {job.count === 1 ? 'draft' : 'drafts'} saved. Ready for review.</p>}
    {job.status === 'failed' && <p role="alert" className="text-sm text-destructive">{job.error}</p>}
    {job.status === 'cancelled' && <p role="status" className="text-sm text-muted-foreground">Generation cancelled. No drafts were saved.</p>}
    {(job.status === 'failed' || job.status === 'cancelled') &&
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={retry}>Retry generation</Button>}
  </div>
}
