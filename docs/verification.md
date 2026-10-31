# Verification

2026-10-31, Windows, Node 22.23.4, installed Chrome 156.

- Syntax: `npm run check`.
- Backend: `npm test` (12 tests).
- Chrome: `node scripts/smoke.mjs` (13 workflow checks, in-memory isolated database).
- Live app: `GET http://127.0.0.1:3333/api/state` returned one example brand and four example creations.
- Live website scan: `POST /api/scan` with `https://tryholo.ai` returned Holo AI, canonical website, and explicit metadata-review provenance. Did not save this scan to user data.
- Desktop and 390 px mobile screenshots visually reviewed. PNG creative export visually reviewed at 1080 × 1080.
- Browser smoke observed no external network requests or page errors during offline workflows.

REA public captures:

- `ev_9c346474466def4f22c9c1ae072b12857e3a5fd0def7b798defdb71461ba5525`: homepage, public feature descriptions, screenshot, and network metadata.
- `ev_6ec35fc852e5cbe06a5416fe6623438c27ba56fd7a0e5bcfb931828c7bfdd2bc`: app login screen and authentication boundary.

Saved evidence is a selected projection (parameters, browser lifecycle, limitations, and accessibility text), not a complete exported REA ledger. Screenshots and raw DOM were inspected during the session but are not embedded in that JSON.

Local AI contracts were exercised over HTTP against a fixture server. No actual user model or image engine was started. Model quality, throughput, hardware capacity, and engine-specific support remain unverified. No social account was connected and no content was published.
