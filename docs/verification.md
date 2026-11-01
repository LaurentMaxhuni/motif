# Verification

## Custom dropdowns and lighter chrome — 2026-11-01

- Replaced visible native dropdowns throughout brand switching, studio, planning, editor, research, calendar, settings and connector delivery forms with official shadcn/Radix Select menus. Shared FieldSelect composition preserves controlled values, labels, disabled states, numeric values and hidden form serialization. Empty brand selection shows a disabled placeholder. Removed the unused native-select component.
- Lightened shared borders in both themes, removed card/input/textarea/button shadows, and reduced focus rings from 3px to 2px with neutral colors. Keyboard focus and destructive/invalid states remain visible. Fixed a tablet-width connection-card overflow and prevented custom-menu focus from scrolling the editor header out of view; regressions cover both.
- `npm run check` and `npm run build`: passed. No runtime dependencies, environment variables or configuration changes added; Select uses already-installed Radix. Styling changes are shared component classes and existing CSS tokens.
- Existing creative browser suite: 27 checks passed. Existing feature browser suite: 21 checks passed. Tests now operate visible custom menu options rather than native selectOption APIs; form values, brand isolation, approvals, exports, backups and fixture-only sends remain covered.
- `node scripts/select-smoke.mjs`: passed custom pointer/keyboard selection, End/Enter, Escape/focus restoration, computed 1px border/2px focus ring, light/dark menus, dialog-contained menus and overflow checks at 390/768/1440px. Inspected studio/settings plus all other screens, editor, research, connector and onboarding forms in the responsive screenshot matrix under ignored output/playwright/.
- Live compiled asset/state check passed; saved-data checksum unchanged (2 brands, 4 creations). Existing model/provider environmental limits are unchanged.

## shadcn/ui migration — 2026-11-01

- Entire frontend migrated to React/TypeScript, Tailwind, official shadcn/ui registry components, Lucide, Sonner and React Day Picker. Original custom DOM/CSS frontend removed. All routes use the same primitives, neutral theme, responsive Sidebar/Sheet, forms and dialogs.
- `npm run check` and `npm run build`: passed. Pages load on demand; generated creative rendering remains isolated from the application UI. Windows launcher now builds before starting. Build retains an external local theme bootstrap so the initial appearance loads without inline scripts.
- Backend: **58 passed, zero failures**. Added compiled index/JS/CSS serving, source/private-file/traversal and sourcemap rejection tests.
- Creative browser suite: **27 checks passed**, including fully AI creation/revision/undo, saved versions, explicit artwork regeneration, failure preservation, late editor responses, save locking, full-size legacy previews, real PNG/SVG/HTML downloads, assistant success/failure/brand isolation, backup roundtrip and model settings preservation. No unexpected browser/console/CSP errors, HTTP failures or external browser requests.
- Feature browser suite: **21 checks passed**, preserving onboarding/research review, theme persistence/system preference changes, encrypted connector boundaries, explicit fixture-only drafts, duplicate suppression, stale reviews, report isolation and mobile layouts. Added mobile Sheet focus containment/Escape/trigger restoration and calendar month/agenda checks.
- Navigation browser suite: **6 checks passed**, covering reset of mounted onboarding, lazy-loaded Studio planning intent, rapid return while saves are pending, preservation of dirty edits, and ownership of persisted onboarding sessions. Independent review findings were fixed and re-reviewed with no remaining concrete findings.
- Screenshots reviewed for light/dark studio/editor, legacy artwork, mobile studio/editor/Brand DNA, calendar and connections. Evidence and full logs remain under ignored `output/`.
- Live server restarted with compiled UI at `http://127.0.0.1:3333`. State and JS asset returned HTTP 200. Read-only before/after checksum matched across brands, creations, settings and workspace preferences: **2 existing brands, 4 existing creations unchanged**. Vite development proxy also returned state successfully and reached schema validation for an intentionally invalid mutation; no settings were changed.
- App CSP allows inline styles for Radix positioning/scroll locks and Sonner styling; inline scripts remain blocked. Generated creative validation and renderer CSP are unchanged. Actual AI output quality and live provider acceptance remain unverified; models are still unconfigured and provider operations used fixtures only.

## AI creative milestone — 2026-11-01

- `npm run check`: passed; `npm test`: 57 passed, zero failures.
- `node scripts/smoke.mjs`: 21 workflow checks passed, covering AI-first generation, plain-language revision, artwork preservation/regeneration, undo, escaped copy, error preservation, late responses after reopening the same editor, conflicting actions while saving, saved revisions/schedules after reload, actual 1080×1080 PNG download, standalone HTML export, desktop/mobile, existing weekly planning and brand isolation.
- `node scripts/features-smoke.mjs`: 18 checks passed for onboarding, research, appearance and fixture-only connectors. Connector tests seed explicitly labelled template fixtures; production studio generation uses AI.
- Revision API tests also cover stale versions before/after inference, changed brand context, invalid instructions, malformed/unsafe model output, image-server failure, chained revisions, older creations without artwork, and absent models. Saved data is unchanged until explicit save.
- Desktop/mobile editor screenshots and downloaded PNG visually inspected under ignored `output/playwright/`. Fixtures prove rendering and integration behavior, not model output quality or exact product reproduction.
- Read-only live configuration check: neither model ID is configured. Local endpoints `127.0.0.1:11434/v1` and `127.0.0.1:7860/v1` refused connections. No engines started, weights downloaded, settings changed, or real-model generations performed. Real output quality remains unverified until models are configured and running.
- Local app started at `http://127.0.0.1:3333`; state endpoint returned HTTP 200. Final independent code review found no actionable issues. Graphify code graph refreshed under ignored `graphify-out/graph.json`.

## Previous verification

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
