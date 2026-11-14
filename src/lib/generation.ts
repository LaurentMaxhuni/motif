export interface GenerationRequest {
  kind: string
  mode: string
  brief: string
  count: number
  scheduledDates?: string[]
}

export interface GenerationJob {
  id: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  stage: 'plan' | 'design' | 'artwork' | 'render' | 'review' | 'save'
  completed: number
  count: number
  weekly: boolean
  error?: string
}
