# AI creative workflow — first milestone

Describe an ad or social poster, receive a complete AI design, request changes in plain language, save, and export PNG. No layout picker, color picker, design code, or manual composition controls in the creative editor. Existing creations remain readable and revisable.

Use the existing local text model, artwork model, validated HTML/CSS renderer, SQLite storage, and version checks. The original implementation used local models; text generation now also supports explicit CLI-provider selection as described in [CLI providers](cli-providers.md). Artwork also supports [Cloudflare and local image providers](image-providers.md). Compare AI-generated compositions plus artwork (chosen: existing renderer keeps text readable) with a single generated bitmap (requires a different editing contract and less reliable lettering).

Revision returns an unsaved preview. Save is explicit. Preserve artwork by default; offer an explicit option to generate new artwork. Invalid model output, unavailable models, stale versions, and closed/reopened editors must not overwrite saved work or another editor. Changed designs return to Draft and clear scheduled dates so old approval does not cover new content. Calendar expansion and publishing remain later milestones.

Acceptance: complete AI creation is the studio default, prompt-based revision changes the preview, save survives reload, PNG downloads at 1080×1080, errors preserve the previous preview and request, mobile works, and existing workflows retain coverage. Fixture success proves integration contracts; actual model quality requires a running text/image engine and is reported separately.

## Agency workflow and creative skills

HTML/CSS + image generation runs as an agency-style pipeline (`lib/creative/workflow.ts`):

1. **Concept** — one text-model call develops a distinct creative route per draft: audience insight, single idea, composition route, hierarchy, typography, color strategy and art direction. If a model cannot return a usable plan, design continues without one.
2. **Copy and layout** — the design call executes concept *N* for draft *N* and writes the HTML/CSS composition plus an artwork brief.
3. **Artwork** — `buildImagePrompt` turns the brief into a provider-ready prompt: art direction from the concept, brand colors as named colors (image models ignore hex), a square-format/negative-space instruction and a non-negotiable no-text rule, bounded to the provider's limit (2,048 characters for Cloudflare, 4,000 otherwise).
4. **Render and audit** — the existing sandboxed renderer screenshots the design, then measures it in the same browser (`lib/creative/audit.ts`): text outside the canvas, clipped or overlapping text, contrast sampled from the actual pixels behind each text element (text hidden, WCAG thresholds), headline dominance, safe margins, tiny text, typeface/size count, copy load and artwork presence. Scores start at 100 (critical −30, major −12, minor −4).
5. **Refine** — when a critical issue is found or the score is under 70, one design-only refinement call receives the measured findings. Copy and artwork never change in this pass, and the refined version is kept only if it scores higher.

The concept and quality check are stored as `review` on the creation and shown in the editor. AI revisions run the same render → audit → refine steps; saving a manually edited design refreshes the score.

### Skills

Craft knowledge lives in small, provider-independent modules under `lib/creative/skills/`: creative direction, advertising and copywriting, graphic design and composition, typography, brand consistency, art direction for image generation, and visual critique. Each declares the workflow stages it serves (`concept`, `copy`, `layout`, `artwork`, `critique`, `revision`) and optionally the content kinds it applies to; `skillPrompt(stage, { kind, channel })` composes the relevant ones under a stage role. Output contracts stay with the calling code and always win over skills. To add a skill, create a module exporting a `Skill` and add it to the registry in `skills/index.ts`.

Every step uses the configured text provider (local endpoint or CLI) and image provider, so no stage depends on a specific model. Fixture tests verify the contracts and the audit against rendered pixels; real model quality still depends on the models you run.
