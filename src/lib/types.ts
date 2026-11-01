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
export const cliProviders = { codex: 'Codex', claude: 'Claude Code', opencode: 'OpenCode', pi: 'Pi', omp: 'OMP' } as const
export type CliProvider = keyof typeof cliProviders
export interface CliProfile { executable: string; model: string }
export type ImageProvider = 'local'|'unsloth'|'cloudflare'
export interface Settings { textEndpoint: string; textModel: string; imageEndpoint: string; imageModel: string; textProvider?: 'local' | CliProvider; cliProfiles?: Partial<Record<CliProvider,CliProfile>>; imageProvider?: ImageProvider; unslothImageEndpoint?: string; unslothImageModel?: string; cloudflareAccountId?: string; imageCredentials?: Partial<Record<ImageProvider,string|null>> }
export function textModelLabel(settings: Settings) { const id=settings.textProvider; return id && id!=='local' ? `${cliProviders[id]} · ${settings.cliProfiles?.[id]?.model || 'CLI default'}` : settings.textModel }
export function imageModelLabel(settings: Settings) { return settings.imageProvider==='cloudflare' ? settings.cloudflareAccountId ? 'Cloudflare FLUX.1 Schnell' : '' : settings.imageProvider==='unsloth' ? settings.unslothImageModel ? `Unsloth · ${settings.unslothImageModel}` : '' : settings.imageModel }
export interface Snapshot { token: string; brands: Brand[]; contents: Content[]; settings: Settings; imageCredentials?: Partial<Record<ImageProvider,boolean>>; workspace: { onboardingCompleted: boolean } }
