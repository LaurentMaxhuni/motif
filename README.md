# Motif

A local marketing workspace reconstructed from [Holo’s public product workflow](https://tryholo.ai/), inspected with REA. Own branding and original artwork; no Holo account or service dependency.

## Run

Requires **Node.js 22.13+**. Dependencies are already installed in this checkout.

```powershell
npm start
```

Open **http://127.0.0.1:3333**. Or double-click `start-motif.cmd`. To choose another port in PowerShell: `$env:PORT=3334; npm start`.

For a fresh checkout, first run `npm ci`. `npm start` typechecks and builds the React frontend before starting the local server. Internet is needed to install dependencies and to use cloud-backed CLI providers. Local templates and configured local models can work offline.

The interface uses React, TypeScript, Tailwind CSS, official shadcn/ui components, Lucide icons, Sonner notifications and React Day Picker. Components live in `src/components/ui`; `components.json` configures the registry. Studio, workspace, calendar, Brand DNA, research, onboarding, connections, assistant, activity and settings share the same component system. The old custom DOM/CSS frontend has been removed.

For frontend development run `npm run dev:server` and `npm run dev` in separate terminals, then open the Vite URL. The development proxy targets the default backend port 3333. The Windows launcher runs the production build automatically.

## What works

- Multiple brands with editable Brand DNA, voice, audience, palette, and product photography.
- Deep local website analysis: up to 20 pages, robots/sitemap discovery, company and product evidence, audience and voice, visual identity, SEO audits, and downloadable source reports. Review before saving.
- Light, dark, and system appearance, remembered per browser.
- Guided first-business onboarding with website research, editable Brand DNA, optional AI-provider setup, and a first-campaign handoff.
- Brand-scoped Buffer, Metricool, and Zernio connectors for explicit drafts and scheduling, encrypted local credentials, and delivery history.
- Creative studio for social posts, ads, emails, SEO articles, and video scripts.
- Offline design templates, clearly distinguished from local AI generation.
- Configurable loopback text/image endpoints plus Codex, Claude Code, OpenCode, Pi and OMP CLI text providers, installation checks, and brand-aware chat.
- **HTML/CSS + image mode:** selected text AI provider designs a fresh composition and artwork prompt; local image model generates the artwork; an isolated local Chrome renderer combines them into a 1080 × 1080 creative.
- AI creative review: request changes in plain language, optionally regenerate artwork, undo the last revision, save, and export PNG or full-copy Markdown. Existing template creations remain readable and exportable.
- Draft, Approved, Scheduled, and Ready states, local content calendar, and five-day draft planning.
- Workspace activity, CSV export, JSON backup, and additive backup import.
- SQLite persistence, stale-edit conflict protection, and responsive desktop/mobile layouts.

Fresh installations start with onboarding and an empty workspace. Existing Form & Field examples and other saved data are preserved. **Add brand** starts the guided setup for another business.

## Brand DNA research

Onboarding can analyze your website before creating the business. For an existing business open **Brand DNA → Analyze website**. Choose 6, 12, or 20 pages and optionally enable interpretation with your selected text AI provider.

Extraction runs in the local Node process. It examines public page copy, headings, metadata, structured data, CTA wording, product/service candidates, explicit audience wording, palette/font/logo declarations, SEO issues, and coverage gaps. Reports include source URLs, quotes, warnings, and observed/inferred labels. Your selected AI provider can interpret audience and voice using validated source quotations. Unsupported or failed inference preserves the extracted findings.

Review and apply the proposed fields before your stored Brand DNA changes. Approved research travels into subsequent local generation context. **Full report** downloads all findings and evidence for the displayed business. See [analysis scope and bounds](docs/brand-analysis.md).

Extraction handles nested product data, product groups, streamed server HTML and modern CSS colors. Repeatable live/captured evaluations and remaining limits are documented in [brand extraction evaluation](docs/brand-extraction-evaluation.md). Run `node scripts/brand-research-smoke.mjs` for the isolated research browser workflow.

The crawler respects robots.txt and uses bounded same-origin requests. It does not run the target site's JavaScript or download its images/fonts. Sites that render their content only with JavaScript may need manual details. Enter the final canonical origin if a www/non-www redirect is refused. This is source-based research, not independent verification of a publisher's claims.

Text generation can also use an installed Codex, Claude Code, OpenCode, Pi or OMP CLI. Choose one in **Settings → AI providers**, detect the installation, test its login/model, then save. See [CLI setup and privacy](docs/cli-providers.md). CLI inference may use cloud services; artwork still needs a separate local image server.

## Appearance

Use the sun/moon control in the top bar, or **Settings → Appearance**. Select Light, Dark, or System. Theme applies to the studio, editor, research, connectors, and onboarding; exported creatives keep their chosen brand colors.

## Social connections

Open **Connections**, choose a provider, and save your API credentials locally. **Test & load channels** contacts that provider but creates no post. Approve and save content in Workspace, then use **Send content** to choose a matching account and either send a draft or explicitly schedule it. Scheduled posts publish through the provider at the chosen time; draft sends stay drafts.

| Provider | Configuration | Current media support |
| --- | --- | --- |
| Buffer | Personal API key and organization ID | Public HTTPS image URLs or text |
| Zernio | API key | Public HTTPS image URLs or text |
| Metricool | API token, user ID, blog/brand ID; API-enabled plan | Text drafts/schedules; attach artwork in Metricool |

Local PNG files and localhost URLs cannot be fetched by these external platforms. Motif does not automatically upload artwork. For Buffer/Zernio, host your export yourself and supply its public image URL; leaving it blank sends text only. Instagram requires image media and is draft-only in these connectors. Supported destinations include Facebook, Instagram drafts, LinkedIn, Twitter/X, Threads, and Bluesky; channel availability depends on your provider account.

The selected saved creation and connection are version-checked before sending. Identical deliveries are suppressed. Delivery history includes the creation, account, outcome and remote ID. An uncertain result must be checked on the provider before another attempt. See [connector setup, contracts, and limits](docs/connectors.md). API contracts are fixture-tested; live credentials and provider-side acceptance remain unverified. No live posts were created during implementation.

## Local AI setup

Open **Settings** (sidebar on desktop, gear icon in the top bar on mobile). Enter base URL and exact installed model ID, then save. Detect text models can query the server’s `/models` route.

| Server | Text base URL |
| --- | --- |
| Ollama | `http://127.0.0.1:11434/v1` |
| LM Studio | `http://127.0.0.1:1234/v1` |
| llama.cpp / Unsloth | Your server’s loopback port plus `/v1` |

Text uses `/chat/completions`; generation requests JSON-object output. Choose a model/server supporting that contract. See [Ollama’s official compatibility documentation](https://docs.ollama.com/api/openai-compatibility). Settings do not start a model or download weights.

### Create and revise a finished design with AI

1. Configure **both** text and image endpoints and model IDs in Settings.
2. In Creative studio enter a brief and start with **1 variation**. AI generates the complete design and artwork; no canvas editor is required.
3. Motif asks the text model for copy, HTML, CSS, and an artwork prompt. It sends that prompt to the image model, embeds the returned artwork, and renders the result locally. Larger batches generate artwork sequentially and can take several minutes.
4. Open the creation, describe a change, and click **Revise with AI**. Copy and composition are revised together. **Generate new artwork** replaces the artwork; leave it unchecked to preserve existing artwork. Older creations without artwork receive AI artwork on their first revision. **Undo revision** restores the previous preview. A revision returns to Draft and clears its scheduled date, requiring a new review. **Save creation** persists the preview; closing it discards unsaved changes. Invalid output or failed generation leaves the previous preview and saved creation intact.
5. Download **PNG** for a ready-to-use creative, or **HTML** for a self-contained design with artwork embedded. Full caption/article/script text remains separately exportable. For email and SEO content the square is a promotional creative; the full copy is not squeezed into the image.

This mode uses model-authored compositions, not the four SVG template layouts. Text stays separate from artwork. Current artwork generation is text-to-image; it does not send uploaded product photos to an image-editing model or guarantee exact product reproduction.

Rendering requires installed Chrome/Chromium/Edge. Windows Chrome and Edge, common Linux Chromium paths, and macOS Chrome are detected. Set `CHROME_PATH` if yours is elsewhere. Renderer and output documents block scripts and network access; HTML tags/attributes and CSS are validated before rendering. CSS parsing uses [CSSTree](https://github.com/csstree/csstree); local browser rendering uses [Playwright](https://playwright.dev/docs/api/class-browser).

Images require an OpenAI-compatible `/images/generations` server returning PNG `b64_json`. Standard ComfyUI is not directly compatible; use an adapter or upload a locally produced image. Video output is a script, not a rendered video. No image or text model is bundled. Authenticated local endpoints are not supported in this version.

AI contracts are tested against a real loopback HTTP fixture; output quality and compatibility with your installed models require live verification. Errors are shown without silently substituting template output.

## Data and privacy

The server binds to `127.0.0.1`. Database: `data/motif.sqlite` with SQLite WAL sidecars. Use **Settings → Download workspace backup** for a consistent brand/content export while running. Keep the data folder when updating. Backup import adds new copies and preserves existing data and endpoint settings.

Connector credentials are AES-256-GCM encrypted in a separate SQLite table using `data/connector.key`. JSON exports exclude connections, delivery history, credential ciphertext, and that key; re-enter credentials on another installation. A physical database backup does contain encrypted secrets: protect it and its key with normal local account/filesystem controls. Do not delete the key if you want existing connections to keep working.

No app telemetry, remote fonts, automatic model downloads, or automatic cloud fallback. Selecting a CLI provider explicitly allows its configured model service, which may be cloud-hosted. Browser network is restricted to this app by Content Security Policy. Model endpoint settings accept loopback URLs only; inference redirects are rejected. A local model server must itself be configured to run locally; Motif cannot prevent a separate server from forwarding requests. Website requests and optional connector operations intentionally use the network from the server; website extraction stays local; optional CLI interpretation sends supplied excerpts to the CLI’s configured model.

Quick metadata scanning intentionally contacts one public HTTP(S) page; deep analysis additionally follows permitted same-origin pages, robots/sitemap files and up to three stylesheets. It never logs into websites or runs their scripts. DNS is checked and pinned per request; private destinations, unusual ports, oversized documents, disallowed paths, and excessive redirects are refused. Active analyses are temporary jobs; review and apply a result to persist it. Restarting the server ends pending jobs.

## Product boundaries

Holo’s paid editor, private APIs, prompts, publishing system, and analytics were not accessible. A user-authorized temporary-email login succeeded, but immediately reached **No Active Subscription**. Public checkout requires payment before Launch. Details and REA evidence are in [docs/authenticated-research.md](docs/authenticated-research.md). This is a working local reconstruction of its public workflow, **not verified feature parity**. Initial REA evidence IDs, accessibility captures, and limitations are in [docs/rea-evidence.json](docs/rea-evidence.json); scope and design decisions are in [docs/design.md](docs/design.md).

Calendar dates alone remain local reminders. External delivery happens only through an explicit connector action; scheduled deliveries instruct the chosen provider to publish later. No paid ads, purchases, or emails are sent automatically. Activity shows real workspace counts; no invented reach, conversions, or ad-spend metrics. Generated claims and mailing compliance details still need editorial review.

## Verify

```powershell
npm run check
npm run build
npm test
node scripts/smoke.mjs
node scripts/features-smoke.mjs
node scripts/navigation-smoke.mjs
node scripts/select-smoke.mjs
```

Build before running tests. Backend tests cover local AI contracts, rendering, atomic failures, persistence, backups, scheduling, network boundaries and compiled-asset allowlists. Browser suites use installed Chrome and isolated in-memory databases to verify AI creation/revision/undo/export, approvals, planning, onboarding, research, themes, connector review/delivery and responsive keyboard navigation. Set `CHROME_PATH` to override the executable. Screenshots and results are written under `output/playwright/` (Git-ignored). Model and provider responses are deterministic fixtures; actual model quality and live platform acceptance remain unverified.

Node 22 may print an experimental warning for its built-in SQLite module. This is expected.
