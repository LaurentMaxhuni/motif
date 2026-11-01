# Verification

2026-10-31, Windows, Node 22.23.4, installed Chrome 156.

- Syntax: `npm run check`.
- Backend: `npm test` (50 tests, including research/crawl bounds, connector HTTP contracts, reviewed versions, secret redaction, fresh onboarding API state, hybrid model contracts and HTML/CSS boundaries).
- Chrome: `node scripts/smoke.mjs` (19 existing workflow checks) and `node scripts/features-smoke.mjs` (18 new-feature checks), in-memory isolated databases.
- Live app: `GET http://127.0.0.1:3333/api/state` returned one example brand and four example creations.
- Live website scan: `POST /api/scan` with `https://tryholo.ai` returned Holo AI, canonical website, and explicit metadata-review provenance. Did not save this scan to user data.
- Desktop and 390 px mobile screenshots visually reviewed. PNG creative export visually reviewed at 1080 × 1080.
- Browser smoke observed no external network requests or page errors during offline workflows.

REA public captures:

- `ev_9c346474466def4f22c9c1ae072b12857e3a5fd0def7b798defdb71461ba5525`: homepage, public feature descriptions, screenshot, and network metadata.
- `ev_6ec35fc852e5cbe06a5416fe6623438c27ba56fd7a0e5bcfb931828c7bfdd2bc`: app login screen and authentication boundary.

Saved evidence is a selected projection (parameters, browser lifecycle, limitations, and accessibility text), not a complete exported REA ledger. Screenshots and raw DOM were inspected during the session but are not embedded in that JSON.

Local AI contracts were exercised over HTTP against a fixture server. No actual user model or image engine was started. Model quality, throughput, hardware capacity, and engine-specific support remain unverified. No social account was connected and no content was published.

Hybrid verification calls text and image fixture endpoints in sequence, checks 1080 × 1080 PNG output, edits and rerenders a composition, persists source and pixels, and verifies image-server failure leaves no partial drafts. Security checks reject scripts, embedded documents, external image sources, inline handlers/styles, CSS imports/URLs (including escaped URLs), dynamic assets, and stylesheet-closing injection. Browser smoke additionally exports HTML and PNG, edits CSS and headline, verifies reload persistence, and checks the composition editor at mobile width. Fixture artwork is a deterministic test pattern, not output from a real image model.

New-feature browser checks cover fresh website onboarding, review-before-save, multi-page extraction, persisted evidence, first-campaign handoff, dark mode persistence and system preference changes, read-only channel tests, explicit fixture draft sending, duplicate suppression, stale reviewed content rejection, mobile connections/research layouts, and report download isolation across businesses. Tests observed no external browser requests or page errors. Remote connector operations used fixtures only; no real API key or live account was used.

The updated live server also completed extraction-only research of `https://tryholo.ai`: six analyzed pages across eleven bounded HTML/discovery/CSS requests. Results were retained only under ignored `output/` for inspection, not applied to the existing example brand. All pre-existing one-brand/four-creation data remained intact after restart.

Local code impact was inspected with Graphify, `graphify-out/graph.json` (uncommitted generated index), and relevant source was checked directly. Main integration points are `publicDocument`, `brandInput`, `brandContext`, `createApp`, and the new feature UI module.
