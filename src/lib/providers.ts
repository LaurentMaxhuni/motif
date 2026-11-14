import type { CliProvider, ImageProvider } from '@/lib/types'

export interface HelpLink { label: string; href: string }
export interface ProviderGuide { name: string; summary: string; steps: string[]; links: HelpLink[] }

/** Plain-language setup guides shown next to each AI choice in Settings. */
export const textGuides: Record<'local' | CliProvider, ProviderGuide> = {
  local: {
    name: 'On this computer (Ollama, LM Studio)',
    summary: 'Runs a free model on your own computer. Nothing leaves your machine, but you need a reasonably powerful computer.',
    steps: ['Install Ollama or LM Studio and download a model in it.', 'Keep the app running, then pick its address below.', 'Choose one of the models it lists.'],
    links: [{ label: 'Download Ollama', href: 'https://ollama.com/download' }, { label: 'Download LM Studio', href: 'https://lmstudio.ai' }],
  },
  codex: {
    name: 'Codex (ChatGPT account)',
    summary: 'Uses your ChatGPT plan or OpenAI account through the Codex app on this computer.',
    steps: ['Install Codex.', 'Open a terminal, run codex once and sign in.', 'Come back here and pick a model.'],
    links: [{ label: 'Install Codex', href: 'https://developers.openai.com/codex/cli' }],
  },
  claude: {
    name: 'Claude Code (Claude account)',
    summary: 'Uses your Claude plan or Anthropic account through Claude Code on this computer.',
    steps: ['Install Claude Code.', 'Open a terminal, run claude once and sign in.', 'Come back here and pick a model.'],
    links: [{ label: 'Install Claude Code', href: 'https://code.claude.com/docs/en/setup' }, { label: 'Quickstart', href: 'https://code.claude.com/docs/en/quickstart' }],
  },
  opencode: {
    name: 'OpenCode',
    summary: 'Uses whichever AI accounts or local models you have connected in OpenCode.',
    steps: ['Install OpenCode.', 'Run opencode auth login in a terminal to connect a provider.', 'Pick one of its models here.'],
    links: [{ label: 'OpenCode docs', href: 'https://opencode.ai/docs' }],
  },
  pi: {
    name: 'Pi',
    summary: 'Uses the AI providers you have set up in the Pi coding agent.',
    steps: ['Install Pi and connect a provider in it.', 'Pick one of its models here.'],
    links: [{ label: 'Pi on GitHub', href: 'https://github.com/earendil-works/pi' }],
  },
  omp: {
    name: 'OMP',
    summary: 'Uses the AI providers you have set up in OMP (oh-my-pi).',
    steps: ['Install OMP and connect a provider in it.', 'Pick one of its models here.'],
    links: [{ label: 'OMP on GitHub', href: 'https://github.com/can1357/oh-my-pi' }],
  },
}

export const localServers = [
  { id: 'ollama', label: 'Ollama', endpoint: 'http://127.0.0.1:11434/v1' },
  { id: 'lmstudio', label: 'LM Studio', endpoint: 'http://127.0.0.1:1234/v1' },
] as const

export const imageGuides: Record<ImageProvider, ProviderGuide> = {
  cloudflare: {
    name: 'Cloudflare (free daily allowance)',
    summary: 'Makes images in the cloud with FLUX.1 Schnell. No powerful computer needed, and a free Cloudflare account includes a daily allowance.',
    steps: ['Create a free Cloudflare account.', 'Copy your account ID from the dashboard.', 'Create an API token with the Workers AI template and paste both below.'],
    links: [{ label: 'Find your account ID', href: 'https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/' }, { label: 'Create an API token', href: 'https://dash.cloudflare.com/profile/api-tokens' }, { label: 'Workers AI guide', href: 'https://developers.cloudflare.com/workers-ai/get-started/rest-api/' }],
  },
  unsloth: {
    name: 'Unsloth Studio (this computer)',
    summary: 'Makes images on your own computer with Unsloth Studio. Needs a capable graphics card.',
    steps: ['Install Unsloth Studio and load a text-to-image model.', 'Copy an API key from its Settings → API page.', 'Paste it below and pick the model.'],
    links: [{ label: 'Unsloth Studio guide', href: 'https://unsloth.ai/docs/new/studio' }],
  },
  local: {
    name: 'Another image server on this computer',
    summary: 'Connects any image server on this computer that speaks the OpenAI images API.',
    steps: ['Start your image server.', 'Enter its address, including /v1.', 'Pick one of the models it lists.'],
    links: [],
  },
}
