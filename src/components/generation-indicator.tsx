import { useState } from 'react'
import { CircleAlert, CircleCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GenerationJob } from '@/lib/generation'
import type { Page } from '@/lib/types'

export function GenerationIndicator({ job, navigate }: {
  job?: GenerationJob | null
  navigate: (page: Page) => void
}) {
  const [reviewedJob, setReviewedJob] = useState<string>()
  const visible = job && job.status !== 'cancelled' && job.id !== reviewedJob ? job : undefined
  let label = ''
  let compact = ''

  if (visible?.status === 'running') {
    const index = visible.completed + 1
    const total = visible.count
    const stages = {
      design: ['Preparing drafts', 'Preparing'],
      artwork: [`Artwork for draft ${index} of ${total}`, `Artwork ${index}/${total}`],
      render: [`Rendering draft ${index} of ${total}`, `Render ${index}/${total}`],
      save: ['Saving drafts', 'Saving'],
    }
    const [full, short] = stages[visible.stage]
    label = full
    compact = short
  } else if (visible?.status === 'completed') {
    label = `${visible.count} ${visible.count === 1 ? 'draft' : 'drafts'} ready`
    compact = label
  } else if (visible?.status === 'failed') {
    label = 'Generation failed'
    compact = 'Failed'
  }

  const ready = visible?.status === 'completed'
  const Icon = ready ? CircleCheck : visible?.status === 'failed' ? CircleAlert : Loader2

  return <>
    <span role="status" className="sr-only">{label}</span>
    {visible && <Button
      type="button"
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5 px-2 sm:px-3"
      aria-label={label + (ready ? '. Review drafts' : '. Open Creative studio')}
      onClick={() => {
        if (ready) setReviewedJob(visible.id)
        navigate(ready ? 'workspace' : 'studio')
      }}
    >
      <Icon aria-hidden="true" className={visible.status === 'running' ? 'motion-safe:animate-spin' : undefined} />
      <span className="sm:hidden">{compact}</span>
      <span className="hidden sm:inline">{label}</span>
    </Button>}
  </>
}
