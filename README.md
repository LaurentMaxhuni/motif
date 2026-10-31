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

Backend tests cover local AI HTTP contracts, persistence and edits, batch validation, backup import, scheduling, image validation, and network boundaries. Browser smoke uses installed Chrome on Windows, an in-memory test database, and checks creation, editing, PNG export, planning, reload persistence, brand isolation, mobile overflow, and absence of external requests. Set `CHROME_PATH` to override its executable path. Screenshots and results are written under `output/playwright/` (Git-ignored).

Node 22 may print an experimental warning for its built-in SQLite module. This is expected.
