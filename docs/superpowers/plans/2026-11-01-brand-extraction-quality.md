# Local brand extraction quality

**Goal:** Improve the existing local website-to-Brand-DNA flow using reproduced extraction failures and repeatable evaluations. Preserve review-before-save, local-only model interpretation, bounded public crawling and existing data.

**Architecture:** Keep Node/Cheerio extraction and existing loopback synthesis. Isolate deterministic page/CSS extraction into `lib/brand-extract.js`; retain bounded crawl orchestration in `lib/analysis.js`. No external inference service, browser execution of website scripts, or automatic application of research.

**Baseline:** Clean main at 46da90f. Existing analysis covers nine fixture scenarios; real model endpoints were previously unconfigured. Known source limitations need measurement: nested JSON-LD, text cleanup, colors, sitemap discovery and weak page results. Live scans use public sites and write reports only under ignored output/.

## Interfaces

`extractPage(html,url)` returns the current page object: url,title,description,siteName,headings,wordCount,excerpt,paragraphs,links,seo,visuals,ctas. Additive evidence fields are allowed. `extractStyles(css)` returns `{colors,fonts,colorSignals}` with normalized six-digit hex values and explicit source/role cues. `visuals.colorSignals` may carry `{color,role,weight}`; role is a declaration hint, never proof of official brand hierarchy. Page findings retain real source URLs and quotations.

## Tasks

- [x] Measure baseline using bounded live scans and reproducible fixtures; retain raw captures for before/after comparison.
- [x] Page extraction (worker): tests and deterministic parsing for content cleanup, metadata/schema identity, nested products, modern CSS colors, logo references and semantic color cues. Own lib/brand-extract.js + test/brand-extract.test.js only.
- [x] Crawl/aggregation (root): integrate helper; repair reproduced discovery/coverage, candidate deduplication, palette choice, empty/challenge handling and deadline behavior. Preserve DNS pinning, robots, request/byte/page limits and cancellations. Add failing regressions first.
- [x] Evaluate (root): rerun identical captures and live samples; exercise local API→review→save→reload, malformed synthesis/failure fallback, no automatic saves, and existing network boundaries.
- [x] Run focused/full tests, typecheck, build and browser suites. Review final patch independently, commit meaningful steps, document evidence and environmental limits. Do not claim model quality without a live engine.

## Review focus

No cookie/navigation/error copy promoted to products. Product claims remain publisher claims. No guessed audience/voice from generic labels. Preserve international text and source wording. Do not silently miss CSS/JSON-LD content or report inaccessible pages as deep success. Every additional crawl stays within policy and budget; cancellation/timeout must not leave a running job indefinitely.

## Ledger

- Graphify navigation inspected analyzeWebsite/extract/brandContext and owning sources. Bug-hunt and TypeSafe AI consulted. Jev considered but not integrated: cloud semantic inference conflicts with this local task; exact parsing/ranking stays in code.

