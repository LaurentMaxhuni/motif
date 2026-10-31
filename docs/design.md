# Motif local

Reconstruct Holo's publicly described product workflow as a local-first application, rather than claiming access to its private implementation. The initial directory was empty.

## Workflow

Brand DNA (manual or optional public website scan) → studio (templates or local AI) → editable content library → approval → local calendar → downloadable assets.

Node 22.13+ server bound to 127.0.0.1, built-in SQLite for durable state, plain JavaScript frontend, local CSS and SVG illustrations. No account, telemetry, CDN, subscription, or cloud AI. OpenAI-compatible text and image endpoints accept loopback addresses only. Model inference is explicit and failures remain visible. Offline templates are labelled templates.

Website scanning is the sole intentional public-network operation and fetches only the supplied public HTTP(S) document with redirect, DNS, byte, and time limits. Imported HTML never executes. Users can enter all brand details manually instead. Remote image URLs are never loaded automatically.

Studio supports social posts, ads, email, SEO articles and video scripts. Original SVG layouts provide editable static creative previews and SVG/PNG downloads; local image generation and image uploads can supply artwork. A local assistant uses saved Brand DNA. Plan-a-week creates drafts, never publishes. Calendar entries remain local; performance reflects actual content counts, not fabricated reach or revenue.

The optional **HTML/CSS + image** mode asks the local text model for per-creation HTML/CSS, editable text placeholders, and an image prompt. The configured local image model supplies PNG artwork. Validated static HTML/CSS and embedded artwork render in a 1080 × 1080 local Chrome context with JavaScript disabled and all network requests aborted. Content retains original artwork, generated source, supporting text, and the rendered preview. Edits rerender before save; PNG and standalone HTML exports include current edits. Entire batches validate and render before any draft is saved. Image failures do not fall back to templates.

## Interface

Holo-inspired light workspace: rose accent, charcoal navigation, generous white canvas, rounded creative thumbnails, persistent left sidebar, compact channel tabs, and a large creation brief. Motif has its own wordmark and original abstract artwork. Desktop grid collapses to mobile navigation; keyboard focus, labelled forms and dialogs, and reduced-motion behavior are required.

## Limits

No subscribed Holo account was supplied. A later user-authorized temporary-email login succeeded but reached the subscription gate before onboarding. Public checkout was observed up to the payment step; no purchase was made. Its paid editor, model prompts, publishing integrations, and analytics were not observed. This build reconstructs capabilities from public evidence; it is not a byte-identical clone. Actual social publishing, advertising spend, live metrics and generated video require external platforms or additional local engines and are not simulated.
