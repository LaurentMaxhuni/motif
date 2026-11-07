# Motif public pages

Current system: [design.md](../design.md). The user rejected the first Riso-inspired design and requested a complete restrained, product-focused restart. Routes remain `/`, `/privacy`, and `/app`.

The replacement uses one locally hosted family, IBM Plex Sans, neutral surfaces, charcoal controls, modest corners, a smaller type hierarchy, and tighter spacing. There are no decorative gradients, print textures, colored bands, fake product windows, metrics, or testimonials. The hero shows the real brief composer. Native radio controls switch the workflow between Brand DNA, the brief, and saved creative previews. Brand DNA is selected initially to avoid repeating the hero. Native disclosures provide setup information. Both interactions work without JavaScript.

Captures use isolated, synthetic in-memory data. Studio and brand captures focus on relevant controls rather than the whole application shell. Export previews remain explicitly labelled examples. The privacy practices, MIT license, static rendering, explicit routes, and actual studio behavior are preserved. The public theme is scoped to `.marketing` and `:root:has(.marketing)` so root-level browser surfaces and audit tools see the public palette while `/app` keeps its own tokens.

Independent visual review identified three defects: duplicate default preview, unclear preview interaction, and a wrapping secondary action. All were corrected and inspected. Fonts from the rejected design were removed. No new package dependency or persistent environment variable was added.

## Verification, November 7, 2026

- `rtk proxy npm run build`: passed client compilation and static prerendering.
- `rtk proxy npm run check`: passed TypeScript and syntax checks.
- `rtk proxy npm test`: 112 passed, 0 failed, 0 skipped; full result in `output/redesign-tests.log`.
- `node scripts/landing-smoke.mjs`: 30 checks passed at 320, 375, 834, 1280, 1440, and 1920px. Covers fonts, local-only assets, overflow, focus, hover, active, native-radio pointer/arrow keys, native disclosures, reduced motion, no-JavaScript operation, routes, and typography isolation from `/app`.
- `node scripts/smoke.mjs`: 27 existing studio workflow checks passed; full result in `output/redesign-studio.log`.
- `rtk git diff --check`: required before commit.
- Standalone lint remains unavailable: `npm error Missing script: "lint"`. Hallmark source/render checks are used for the public styles.

Hallmark commands:

```powershell
node C:/Users/STORM/.agents/skills/hallmark/scripts/sloplint.mjs src/marketing/Marketing.tsx src/marketing/marketing.css src/marketing/tokens.css src/marketing/base.css --genre modern-minimal --render --kept --url http://127.0.0.1:3333/
node C:/Users/STORM/.agents/skills/hallmark/scripts/sloplint.mjs src/marketing/Marketing.tsx src/marketing/marketing.css --scope app --render --url http://127.0.0.1:3333/privacy
```

Temporary audit tooling uses the process-only `HALLMARK_PUPPETEER` path under ignored `output/`. User-directed exceptions are recorded in the stylesheet and `design.md`: compact hero, 32px section heads, smaller closing-band gaps, and a compact closing action. The approximate accent classifier counts the neutral ink shared by text and controls; that does not justify adding a decorative hue. All previous link destinations are preserved. Heading changes and recaptured brand imagery are explicitly recorded. A 120-word workflow screen is noted as a compact information layout rather than padded into multiple poster screens.

Current screenshots: `.hallmark/shots/` and `output/playwright/`; before/after comparison: `.hallmark/compare.html`. All are ignored by Git.

Final audit: landing has 0 FAIL, 0 WARN, 5 documented Reflex exceptions and 2 information notes; privacy has 0 FAIL, 0 WARN, 1 documented exception and 1 note. No unresolved Floor or Reflex findings remain. All 16 prior link destinations are retained. The six replaced landing headings and recaptured image are recorded in the stylesheet. The replacement system is locked in `design.md`.

Gaps: Chrome was tested; Safari, Firefox, and physical touch devices were not. No live AI-quality claim is made from these sample captures. Privacy content is a factual local-app template, not legal advice. Operator, contact, hosting, retention, and jurisdiction details still need confirmation for a separately hosted service. The template carries a qualified-lawyer review notice in source. The original privacy checklist drew on [ICO guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail).

No empty material slots remain. A future approved campaign can replace the labelled example previews. This change does not deploy or push the project.
