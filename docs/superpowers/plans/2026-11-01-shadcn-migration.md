# Motif shadcn/ui migration

**Goal:** Replace the entire custom DOM/CSS interface with a React application built from actual shadcn/ui registry components. User explicitly selected a library-based redesign; preserve the current backend, data and functionality.

**Architecture:** Vite builds React/TypeScript and Tailwind into dist. Existing Node server serves only compiled index/assets plus favicon/theme bootstrap. API, loopback/CSRF protection, model generation, SQLite, credentials and rendering stay intact. shadcn New York neutral primitives, Lucide icons, Sonner notifications and React Day Picker provide the shared interface. No canvas editor.

**Design:** Neutral zinc surfaces, near-black primary buttons, restrained violet accents, 240px sidebar, readable 14px interface text, quiet borders and larger artwork previews. Light/dark/system themes. Studio is a focused brief composer and creative library; review uses a spacious two-panel dialog. Mobile uses shadcn Sheet navigation. All pages use the same buttons, fields, dialogs, cards and spacing.

**Interfaces:** `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/workspace.ts` define shared data/context. Named default page exports accept no props and use `useWorkspace()`. `CreativeEditor` receives `{item:Content,onClose:()=>void}`. `Onboarding` uses context `selectBrand`, `navigate`, `refresh`. API contracts remain in server.js and existing frontend source until migration verification finishes.

## Tasks

- [x] Foundation (root): React/Vite/Tailwind setup, official shadcn registry components, typed API/context, shell/theme, safe compiled asset serving and calendar.
- [x] Creative (worker): studio, workspace, preview/card and AI review dialog. Preserve model errors, undo, explicit save, no canvas, export and async isolation.
- [x] Brand (worker): brand fields, research review/report, resumable onboarding and explicit Brand DNA save.
- [x] Utilities (worker): settings/backup, connections/delivery review, assistant and activity. Keep credential boundaries and explicit send.
- [x] Integration (root): typecheck/build, full backend suite, migrate browser smoke checks to component UI, desktop/mobile/dark screenshots, keyboard dialogs, asset allowlist tests.
- [x] Review and commit verified migration; run live app against built assets. No external publishes and no real-model quality claims without configured engines.

## Review focus

Brand changes during generation/research/chat or connector calls must not overwrite another brand. Closing/reopening dialogs must ignore late responses. Import/export and metadata must preserve content, approvals, dates and secrets. Browser asset serving must reject traversal/private files and preserve CSP. Mobile dialogs, menus and keyboard focus must remain usable.

## Ledger

- Baseline: clean feature branch at 41935ca, 57 backend tests, 21 creative browser checks and 18 feature browser checks previously passed. Local model IDs empty and both default engines unavailable.
- Existing `createFeatures` and `createApp` impact inspected through Graphify; source verified. Official shadcn installation/sidebar/native-select documentation consulted.
- Implemented through scoped workers and root integration; source ownership isolated. Official registry generated primitives rather than lookalike CSS. Backend APIs unchanged except compiled asset allowlist and inline application styles needed by Radix/Sonner.
- Screenshot/browser fixes: SVG artwork must override shadcn icon-size and icon-padding selectors; mobile Brand DNA provenance badge wraps; mobile Sheet restores focus to its trigger; filter controls use ToggleGroup rather than tabs without panels.
- Independent review found cold-chunk planning intent, onboarding reset, save reconciliation and overlapping onboarding storage races. Fixed with durable intent/session state, pristine form reconciliation and explicit dirty-edit conflict actions. Navigation regressions passed; follow-up review clean.
- Final checks: typecheck/build, 58 backend tests, 27 creative checks, 21 feature checks, 6 navigation checks. Full logs/screenshots under ignored output. Live production and Vite proxy verified; live user-data checksum unchanged (2 brands,4 creations). Real model/provider verification still environmental, unchanged from baseline.
