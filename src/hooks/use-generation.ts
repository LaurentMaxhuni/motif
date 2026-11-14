import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { GenerationJob, GenerationRequest } from '@/lib/generation'

export function useGeneration(brandId: string | undefined, refresh: () => Promise<void>) {
  const [snapshot, setSnapshot] = useState<{ brandId: string; job: GenerationJob | null }>()
  const [issue, setIssue] = useState<{ brandId: string; message: string }>()
  const [pollVersion, setPollVersion] = useState(0)
  const mutation = useRef(0)
  const activeBrand = useRef(brandId)
  activeBrand.current = brandId
  const lastRefreshed = useRef('')
  const path = 'generation-jobs/' + encodeURIComponent(brandId ?? '')

  useEffect(() => {
    if (!brandId) return
    const scope = brandId
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      const version = mutation.current
      const current = () => !stopped && activeBrand.current === scope && mutation.current === version
      try {
        const { job } = await api<{ job: GenerationJob | null }>(path)
        if (!current()) return
        if (job?.status === 'completed' && lastRefreshed.current !== job.id) {
          await refresh()
          if (!current()) return
          lastRefreshed.current = job.id
        }
        setIssue(undefined)
        setSnapshot({ brandId: scope, job })
        if (job?.status === 'running') timer = setTimeout(poll, 700)
      } catch {
        if (!current()) return
        setIssue({ brandId: scope, message: 'Couldn’t check generation progress. Reconnecting…' })
        timer = setTimeout(poll, 1500)
      }
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer) }
  }, [brandId, path, pollVersion, refresh])

  async function change(suffix: string, method: 'POST' | 'DELETE', body: object) {
    if (!brandId) return
    const version = ++mutation.current
    try {
      const { job } = await api<{ job: GenerationJob }>(path + suffix, method, body)
      if (activeBrand.current === brandId && mutation.current === version) setSnapshot({ brandId, job })
      return job
    } finally {
      if (activeBrand.current === brandId && mutation.current === version) {
        mutation.current++
        setPollVersion(value => value + 1)
      }
    }
  }

  return {
    job: snapshot?.brandId === brandId ? snapshot?.job : undefined,
    loaded: snapshot?.brandId === brandId,
    error: issue?.brandId === brandId ? issue?.message : undefined,
    start: (input: GenerationRequest) => change('', 'POST', input),
    cancel: (id: string) => change('/' + id, 'DELETE', {}),
    retry: (id: string) => change('/' + id + '/retry', 'POST', {}),
  }
}
