# Motif public pages

Routes: `/` landing, `/privacy` privacy policy, `/app` existing creative studio.

The public system adapts Hallmark’s Riso direction: blue ink, pink surfaces, sharp corners, large display type, and a quieter serif for reading. Bricolage Grotesque 800 replaces the theme’s Cabinet Grotesk so bundled fonts can be redistributed under the SIL Open Font License. Literata uses 400 and 500. Both are self-hosted; their licenses ship beside the font files. Source pages: [Bricolage Grotesque](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque), [Literata](https://github.com/google/fonts/tree/main/ofl/literata). The Riso grain and misregistration effects are deliberately omitted: typography stays in one color, and actual product captures remain unretouched. This is a digital studio rather than an imitation of printed paper.

`src/marketing/tokens.css` owns color, typography, spacing, container, shape, and motion tokens. Public styles are scoped under `.marketing`; only horizontal overflow clipping applies globally. Existing studio behavior and component styling remain in place; its banned Inter fallback was removed. The new root tokens do not force the studio into light mode.

Composition: an actual creative capture in the hero; a Brand DNA capture; four workflow rows; a full pink open-source section; native disclosure questions; a closing studio action; a compact footer. No gradients, stock photographs, fake metrics, generated interface mockups, or fabricated testimonials. Captures come from the existing Form & Field example templates, clearly identified as examples rather than AI quality evidence. `node scripts/capture-marketing.mjs` uses an isolated in-memory database and installed Chrome. It never opens the real data store. Hallmark’s capture script lacked Puppeteer; capture used the installed Playwright fallback.

Controls use one rectangular primary treatment, instant focus outlines, color transitions, and a small pressed transform. Native disclosures work without JavaScript. Reduced motion removes transforms and reduces transitions. The homepage has no form, loading request, or generated success state. Public pages never mount the workspace or request `/api/state`.

`scripts/prerender.mjs` renders both public routes to actual HTML after the client build. `/app` gets its own empty workspace entry; all three share the existing React/Vite stack. The server keeps an explicit route and asset allowlist. The sole added media extension is PNG for bundled product captures. No new project dependency or environment variable is required. Temporary Puppeteer tooling for Hallmark audits lives under ignored `output/`.

The privacy policy is a local-app template, not legal advice. Its source contains the lawyer-review notice. It records SQLite storage, local storage, the functional sidebar cookie, optional provider requests, website analysis, external links, credential handling, backups, deletion, and limits of its local-app scope. It contains no fabricated operator identity or contact address. No Terms or Cookie Policy was added because the requested scope was landing and privacy pages; no consent banner or tracker was added. A hosted service needs confirmed operator/contact details, hosting/logging practices, retention and regional disclosures before publication. [ICO privacy-notice guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/cookies-and-privacy-notices-in-detail) informed the coverage checklist; it does not establish compliance.

License: MIT for Motif code; font licenses and dependency licenses remain separate.

## Verification, November 7, 2026

| Command | Observed result |
| --- | --- |
| `rtk proxy npm run check` | Passed TypeScript and server/module syntax checks |
| `rtk proxy npm run build` | Passed client build and static prerendering |
| `rtk proxy npm test` | 112 passed, 0 failed, 0 skipped |
| `node scripts/landing-smoke.mjs` | 26 passed; both public routes at 320, 375, 834, 1280, 1440, and 1920px; keyboard, hover, active, reduced motion, dark system preference, local-only assets, workspace entry, and no-JavaScript HTML |
| `node scripts/smoke.mjs` | 27 workspace workflow checks passed |
| `node scripts/features-smoke.mjs` | 21 feature checks passed |
| `node scripts/navigation-smoke.mjs` | 6 navigation/session checks passed |
| `node scripts/select-smoke.mjs` | Passed pointer, keyboard, Escape/focus, light/dark, and 390/768/1440px layouts |
| `node scripts/cli-smoke.mjs` | 10 CLI-provider checks passed |
| `node scripts/image-provider-smoke.mjs` | 12 image-provider checks passed |
| `node scripts/brand-research-smoke.mjs` | 10 extraction/review checks passed |
| `rtk git diff --check` | Passed |
| `rtk proxy npm run lint` | Unavailable: `npm error Missing script: "lint"`; no standalone lint script exists in the project |

Hallmark audit commands, using temporary Puppeteer under ignored `output/hallmark-tools` through the process-only `HALLMARK_PUPPETEER` variable:

```powershell
node C:/Users/STORM/.agents/skills/hallmark/scripts/sloplint.mjs src/marketing/Marketing.tsx src/marketing/marketing.css src/marketing/tokens.css src/marketing/base.css --genre editorial --render --url http://127.0.0.1:3333/
node C:/Users/STORM/.agents/skills/hallmark/scripts/sloplint.mjs src/marketing/Marketing.tsx src/marketing/marketing.css --scope app --render --url http://127.0.0.1:3333/privacy
```

Landing: 0 FAIL, 0 REFLEX, 1 WARN. The answered warning is 82 words across the workflow/open-source transition, slightly above the approximate 80-word budget; the short provider cost/privacy sentence remains. Privacy: 0 FAIL, 0 REFLEX, 0 WARN. The privacy audit uses document-appropriate scope to retain required factual explanations rather than impose a marketing screen word budget. Screenshots cover 1280×800, 1440×900, 1920×1080, and full pages at 1440 and 375px. Separate public-page smoke captures cover 834px. Hover, instant focus-visible, pressed, keyboard disclosure, and reduced-motion behavior were exercised. No form, loading request, validation, disabled action, or success notification exists on these public pages.

Independent hero and finish reviews ran. Fixes: complete hero creatives, one complete mobile creative, a readable mobile Brand DNA form, and headings tied to Brand DNA and PNG export. Final captures were inspected after those fixes. Current screenshots are under `.hallmark/shots` and `output/playwright`, both Git-ignored; complete command logs remain under `output/landing-*` and `output/hallmark-*`.

Gaps: Chrome was exercised; Safari, Firefox, and physical touch devices were not. Provider browser checks use fixtures, not live model-quality claims. The policy is a local-app template requiring qualified legal review before a hosted service launch. No company/contact/jurisdiction placeholders were fabricated. No empty image slots remain; approved real AI campaign outputs would be the most useful future replacement for the explicitly labelled example templates.

Configuration changes: build adds `scripts/prerender.mjs`; the server allowlist adds `/app`, `/privacy`, their trailing-slash aliases, and bundled PNG assets; the entry chooses public-page hydration or the existing studio. No project dependency or persistent environment variable was added. This work does not deploy or push the site.
