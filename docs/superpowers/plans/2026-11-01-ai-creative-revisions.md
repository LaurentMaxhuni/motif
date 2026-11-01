# AI creative revisions implementation plan

> Execute inline with superpowers:executing-plans, task by task.

**Goal:** Generate and revise finished ads without a canvas editor.
**Architecture:** Extend existing local completion/rendering APIs with an unsaved revision endpoint; replace manual creative controls with a revision prompt.
**Tech Stack:** Node 22.13+, plain JavaScript, SQLite, Playwright. No new dependencies.
**Spec:** docs/ai-creative-workflow.md

## Constraints and review focus

Preserve existing creations and credentials. Keep local model access and HTML/CSS validation. Save explicitly with version checks. Cover malformed output, failed artwork, concurrent changes, editor lifecycle races, mobile and actual PNG export. Do not claim fixture imagery is real model output.

## Task 1 — revision API

Files: lib/core.js, server.js, test/revisions.test.js.
Interface: POST /api/revise with saved content fields, instruction, regenerateArtwork boolean. Return {item} containing unsaved draft with the same id/version; preserve image unless explicitly regenerated.

- [x] Add HTTP regression tests for preview/save/reload, sequential revisions, stale versions, bad output, unsafe design, image failure and missing models.
- [x] Run tests and observe missing-route failures.
- [x] Implement bounded prompt generation, validate entire result, render before returning, recheck content and brand versions after inference.
- [x] Pass relevant tests and commit API + design records.

## Task 2 — AI editing flow

Files: public/app.js, public/style.css, scripts/smoke.mjs, README.md, docs/verification.md.

- [x] Adapt browser smoke to expect AI defaults and prompt revisions, absent manual controls, undo, error preservation, stale editor rejection, saved persistence and PNG export.
- [x] Observe browser failure, then implement prompt editor and an in-memory undo snapshot. Guard asynchronous responses with editor session identity; disable conflicting actions while revising. Keep channel/status/date controls for review.
- [x] Run syntax, full tests and both browser suites; inspect screenshots/export. Check available live models without changing settings or starting engines.
- [x] Record evidence/limitations, review final diff, commit completed flow.

## Ledger

- Initial inspection: clean master at b997d4f; existing hybrid generation and manual editor. Graphify graph navigated generate, completion, editor, collectEditor and updateComposition; source verified directly. Work on feature branch in current checkout.
- Ruling: retain existing template/copy APIs for compatibility, make full AI the primary studio path. No TypeSafe integration: this milestone needs content generation, not a separate semantic selection service.
- Task 1: 26 relevant tests passed. Initial network sandbox prevented loopback fetches; approved isolated test execution works. Red→green verified missing route and legacy artwork conversion. Existing empty-artwork creations generate artwork on their first revision.
- Task 2: browser red→green verified studio default (template → complete AI), then 21 AI workflow checks passed. Full suite: 57 passed; feature browser suite: 18 passed. Inspected desktop/mobile and PNG output. Added a delayed-save test and disabled competing controls during save/export.
- Final review: independent review found no actionable issues. Default reviewer role was unavailable; supported default agent performed the review instead. Graph refreshed. Local app responds on port 3333.
- Remaining environmental validation: no configured/running local models. Both saved default endpoints refuse connections. Model quality and real product artwork remain unverified; configure engines and run a real creation/revision before advancing to calendar expansion.
