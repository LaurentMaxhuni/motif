export const kinds = ['Social post', 'Ad creative', 'Email', 'SEO article', 'Video script'] as const
export const channels = ['Instagram', 'Facebook', 'LinkedIn', 'Pinterest', 'Email', 'Blog', 'TikTok', 'Twitter', 'Threads', 'Bluesky'] as const
export const statuses = ['Draft', 'Approved', 'Scheduled', 'Ready'] as const
export type Page = 'studio'|'workspace'|'calendar'|'brand'|'connections'|'chat'|'analytics'|'settings'|'onboarding'
export type Analysis = Record<string, any>
export interface Brand {
  id: string; version: number; name: string; website: string; description: string; audience: string; voice: string; product: string;
  colors: string[]; image: string; source: string; goal?: string; industry?: string; language?: string; analysis?: Analysis;
  createdAt?: string; updatedAt?: string
}
export interface Content {
  id: string; version: number; brandId: string; kind: string; channel: string; status: string; title: string; headline: string;
  body: string; cta: string; notes: string; scheduledAt: string; layout: number; color: string; image: string; source: string;
  design?: { html: string; css: string; imagePrompt: string }; subhead?: string; rendered?: string; createdAt?: string; updatedAt?: string
}
export interface Settings { textEndpoint: string; textModel: string; imageEndpoint: string; imageModel: string }
export interface Snapshot { token: string; brands: Brand[]; contents: Content[]; settings: Settings; workspace: { onboardingCompleted: boolean } }
