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
  stage: 'design' | 'artwork' | 'render' | 'save'
  completed: number
  count: number
  weekly: boolean
  error?: string
}
