# Motif

A local marketing workspace reconstructed from [Holo’s public product workflow](https://tryholo.ai/), inspected with REA. Own branding and original artwork; no Holo account or service dependency.

## Run

Requires **Node.js 22.13+**. Dependencies are already installed in this checkout.

```powershell
npm start
```

Open **http://127.0.0.1:3333**. Or double-click `start-motif.cmd`. To choose another port in PowerShell: `$env:PORT=3334; npm start`.

For a fresh checkout, first run `npm ci`. Internet is needed to install dependencies, not for ordinary app use.

## What works

- Multiple brands with editable Brand DNA, voice, audience, palette, and product photography.
- Optional public website metadata extraction, with review before saving.
- Creative studio for social posts, ads, emails, SEO articles, and video scripts.
- Offline design templates, clearly distinguished from local AI generation.
- Configurable loopback text and image endpoints, model detection, and brand-aware chat.
- **HTML/CSS + image mode:** local LLM designs a fresh composition and artwork prompt; local image model generates the artwork; an isolated local Chrome renderer combines them into a 1080 × 1080 creative.
- Creative editor, four layouts, photo upload, original vector artwork, PNG/SVG and full-copy Markdown export.
- Draft, Approved, Scheduled, and Ready states, local content calendar, and five-day draft planning.
- Workspace activity, CSV export, JSON backup, and additive backup import.
- SQLite persistence, stale-edit conflict protection, and responsive desktop/mobile layouts.

The included Form & Field brand and four creations are editable **examples**. Add your brand with the top-right button.

## Local AI setup

Open **Settings** (sidebar on desktop, gear icon in the top bar on mobile). Enter base URL and exact installed model ID, then save. Detect text models can query the server’s `/models` route.

| Server | Text base URL |
| --- | --- |
| Ollama | `http://127.0.0.1:11434/v1` |
| LM Studio | `http://127.0.0.1:1234/v1` |
| llama.cpp / Unsloth | Your server’s loopback port plus `/v1` |

Text uses `/chat/completions`; generation requests JSON-object output. Choose a model/server supporting that contract. See [Ollama’s official compatibility documentation](https://docs.ollama.com/api/openai-compatibility). Settings do not start a model or download weights.

### Generate with both HTML/CSS and images

1. Configure **both** text and image endpoints and model IDs in Settings.
2. In Creative studio select **HTML/CSS + image**, enter a brief, and start with **1 variation**.
3. Motif asks the text model for copy, HTML, CSS, and an artwork prompt. It sends that prompt to the image model, embeds the returned artwork, and renders the result locally. Larger batches generate artwork sequentially and can take several minutes.
4. Open the creation to edit headline, CTA, and supporting text. Expand **HTML/CSS composition & artwork prompt** to change the layout and image prompt. Click **Update preview** to render current edits, or **Save creation** to render and persist them. Editing the image prompt does not generate a new image until you click **Local AI image**.
5. Download **PNG** for a ready-to-use creative, or **HTML** for a self-contained design with artwork embedded. Full caption/article/script text remains separately exportable. For email and SEO content the square is a promotional creative; the full copy is not squeezed into the image.

This mode uses model-authored compositions, not the four SVG template layouts. Text stays separate from artwork. Current artwork generation is text-to-image; it does not send uploaded product photos to an image-editing model or guarantee exact product reproduction.

Rendering requires installed Chrome/Chromium/Edge. Windows Chrome and Edge, common Linux Chromium paths, and macOS Chrome are detected. Set `CHROME_PATH` if yours is elsewhere. Renderer and output documents block scripts and network access; HTML tags/attributes and CSS are validated before rendering. CSS parsing uses [CSSTree](https://github.com/csstree/csstree); local browser rendering uses [Playwright](https://playwright.dev/docs/api/class-browser).

Images require an OpenAI-compatible `/images/generations` server returning PNG `b64_json`. Standard ComfyUI is not directly compatible; use an adapter or upload a locally produced image. Video output is a script, not a rendered video. No image or text model is bundled. Authenticated local endpoints are not supported in this version.

AI contracts are tested against a real loopback HTTP fixture; output quality and compatibility with your installed models require live verification. Errors are shown without silently substituting template output.

## Data and privacy

The server binds to `127.0.0.1`. Database: `data/motif.sqlite` with SQLite WAL sidecars. Use **Settings → Download workspace backup** for a consistent export while running. Keep the data folder when updating. Backup import adds new copies and preserves existing data and endpoint settings.

No telemetry, remote fonts, external artwork, cloud AI, or automatic model downloads. Browser network is restricted to this app by Content Security Policy. Endpoint settings accept loopback URLs only; inference redirects are rejected. A local model server must itself be configured to run locally; Motif cannot prevent a separate server from forwarding requests.

Website scanning intentionally contacts the supplied public HTTP(S) page. It does not log into websites, run their scripts, fetch linked assets, or crawl their pages. DNS is checked and pinned per request; private destinations, unusual ports, oversized pages, and excessive redirects are refused. Dynamic sites may need manual Brand DNA entry.

## Product boundaries

Holo’s paid editor, private APIs, prompts, publishing system, and analytics were not accessible. A user-authorized temporary-email login succeeded, but immediately reached **No Active Subscription**. Public checkout requires payment before Launch. Details and REA evidence are in [docs/authenticated-research.md](docs/authenticated-research.md). This is a working local reconstruction of its public workflow, **not verified feature parity**. Initial REA evidence IDs, accessibility captures, and limitations are in [docs/rea-evidence.json](docs/rea-evidence.json); scope and design decisions are in [docs/design.md](docs/design.md).

Schedules are local reminders. Nothing is automatically published, emailed, uploaded, or purchased. Approve and export content, then use your publishing tools. Activity shows real workspace counts; no invented reach, conversions, or ad-spend metrics. Generated claims and mailing compliance details still need editorial review.

## Verify

```powershell
npm run check
npm test
node scripts/smoke.mjs
```

Backend tests cover local AI HTTP contracts, the combined model pipeline, HTML/CSS validation, browser rendering, atomic failures, persistence and edits, backup import, scheduling, image validation, and network boundaries. Browser smoke uses installed Chrome on Windows, an in-memory test database, and checks creation, editing, template and hybrid PNG export, self-contained HTML export, CSS editing, planning, reload persistence, brand isolation, mobile overflow, and absence of external requests. Set `CHROME_PATH` to override its executable path. Screenshots and results are written under `output/playwright/` (Git-ignored). Test images and model responses are deterministic fixtures; actual model quality remains unverified.

Node 22 may print an experimental warning for its built-in SQLite module. This is expected.
