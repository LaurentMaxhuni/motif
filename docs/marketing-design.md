# Public website redesign

The user supplied [AppLlama](https://appllama.io/) after rejecting the earlier designs. Its observed charcoal/cream palette, Instrument Sans typography, substantial artwork, and clear actions inform the new public pages. No reference code, image, copy, logo, customer count, or orbital icon treatment was copied.

## System and implementation

`design.md` describes the replacement system. Hallmark and design-taste-frontend were both used. Taste dealt a centered software hero and offered Instrument Sans; its initial forest-pale-lime palette is retained only in dealer history. The user reference overrides that palette. Supplied Taste system, layout, card, and motion files are vendored unchanged under `src/marketing/taste`; page overrides live outside those files. No npm dependency was added. No persistent environment variable was added.

The main public module is dynamically imported. Vite's manifest supplies its CSS to the landing and privacy prerender only. This keeps the public system out of `/app`. Public JPEG assets are served through the existing static allowlist. Source, manifests, and private data remain inaccessible through that allowlist.

The landing uses a campaign gallery, actual workspace capture, live brand and revision-input context, local setup, and large closing wordmark. Privacy retains its factual local-app policy. Both pages ship readable HTML without JavaScript. The kit supplies pointer feedback, menu state, Escape behavior, and reduced-motion treatment.

## Material and reproduction

Original poppy artwork was generated for Motif, then composed into three 1080 × 1080 campaigns through the actual `renderDesign` pipeline. These are own-brand campaign studies, not customer work or evidence of a model's generation quality. Composition sources are `src/marketing/campaigns.mjs`; source artwork is `src/marketing/assets/campaign-art.jpg`.

Run `node scripts/capture-campaigns.mjs` after building to reproduce the responsive campaign JPEGs and two app captures. It creates only in-memory application data; full-resolution renders go under ignored `output/campaigns`. The desktop and phone workspace images show the real app. The feature panels show actual brand input values and a revision instruction; no provider call or revised-output success is fabricated. There are no empty client-material slots.

Instrument Sans and DM Mono are self-hosted with their OFL notices. Superseded Plex fonts and earlier public captures were removed. All rendered public assets stay local.

## Verification

Verification logs and captures live under ignored `output/`. Chrome is the tested browser; Safari, Firefox, and physical touch devices remain unverified. Provider output quality is outside this visual change. The privacy notice covers the local app; a separately hosted service still needs its operator, contact, logging, retention, and jurisdiction details reviewed. The existing qualified-lawyer review note remains in source.

Commands, results, review findings, and checker limitations are recorded below. No deployment or push is part of this change.

### Checks completed

- Client build and static prerender: passed. TypeScript and syntax checks: passed.
- Backend/frontend regression suite: 112 passed, none skipped (`output/tests.log`).
- Public browser smoke: 30 checks passed, including 320/375/834/1280/1440/1920px, loaded fonts, no public API or remote asset requests, focus, pointer/keyboard menu behavior, Escape focus return, reduced motion, no-JavaScript HTML, privacy links, and `/app` stylesheet isolation.
- Existing studio browser regression: 27 workflow checks passed (`output/studio-smoke.log`).
- Full-page captures were made with Taste's supplied script at 1440, 1024, 820, 768, and 390px. Responsive layout check includes stress headlines at all five sizes. Capture and layout logs are in `output/taste-*`.
- The earlier performance run reported 0 FAIL, 4 WARN: 198 KiB CSS and images above the 2.2x displayed-size heuristic. Measured total transfer was 781.5 KiB desktop and 673.4 KiB phone; CPU timing is local lab evidence, not field performance. The phone image was subsequently replaced with the full workspace capture and is measured again below.
- No standalone lint script exists. Hallmark and Taste checks supplement the project checks; neither audit is represented as a completely clean pass.

### Automated audit limitations and decisions

The broad Taste consistency confirmation (`output/taste-consistency/report.json`) reported 40 FAIL and 16 WARN before the last independent-review fix batch. The report remains intact. Every failing category is accounted for:

| Category | Count | Assessment |
| --- | ---: | --- |
| Container edges | 20 | Includes React's required root wrapper, the expressly selected centered hero, and text inset inside factual brand panels. These are deliberate structures; the actual document has no sideways overflow. |
| No visual | 5 | The local setup section shows executable commands and requirements. Adding an unrelated picture would weaken the requested product focus. |
| Row lines | 4 | The hero has a bounded campaign gallery and, on small screens, a contained horizontal rail. Its boundaries are intentional; the page container remains capped. |
| Split pair | 3 | Compares text inside the padded command panel with the unboxed requirements. The actual two panel columns align, as checked by the layout script. |
| Off grid | 3 | Compares internal panel padding with outer section text rather than the matching panel edges. |
| Section gaps | 2 | Real tablet whitespace was addressed after this report by sizing the gallery to the available hero height. Confirmed with fresh layout captures. |
| Copy headings | 1 | Lexical heuristic rejects Brand DNA and open source; both name actual product concepts. Headings were further made specific to briefs, drafts, exports, and revisions. |
| Motion layer | 1 | Vite bundles the imported supplied motion CSS into a hashed stylesheet. Pointer, pressed, focus, and reduced-motion behavior pass real browser assertions. |
| Section height | 1 | Global scroll-snap heuristic flagged the horizontal gallery. Snapping was removed; native horizontal scrolling remains. |

Taste warnings cover repeated source actions in different contexts; campaign light/dark variations intentionally showing brand flexibility; reusing the current campaign next to its revision instruction; skip-link/navigation wording; no scroll-position indicator; closely sized phone headings; and a long informational workflow section without its own action. These are retained deliberately. There is a main action in the header, hero, and close. No customer or performance figure is invented.

Hallmark's full source/render command reported 80 source FAIL, 17 Reflex, 11 WARN (`output/hallmark-final.log`). All 80 FAIL are in supplied Taste kit files: system 21, layout 37, cards 17, motion 5. They include literal colors, unused animation selectors, and legacy viewport fallbacks followed by modern units. All six vendored files match the source skill SHA-256 hashes exactly. Taste explicitly forbids editing its kit to clear checks, so these incompatible source rules are recorded instead of altering the vendor code or claiming a full Hallmark pass. The 15 kit Reflex findings and 10 kit warnings are likewise preserved. The two owned Reflex findings are the generic font fallback misclassification (Instrument Sans actually loads) and the below-headline hero posture (explicit reference and dealt centered hero); both are documented in the CSS stamp. The remaining navigation warning is answered there.

Initial privacy rendering flagged a long prose measure. The final review narrowed it to 54ch and recaptured the document. No legal practice or provider behavior was changed.

### Independent visual reviews

Hallmark hero review: tablet controls and gallery were disconnected, campaign scale was weak, and only one phone campaign was visible. The gallery now fills its available tablet height and exposes the next campaign in a native horizontal rail. The explicitly selected centered composition remains deliberate.

Hallmark finish review: excess phone brand-panel height, a mobile capture missing its surrounding workspace controls, and generic section headings. The brand panel now takes its natural content height, the phone capture retains navigation, creation/export controls, filters and search, and section headings name the actual workflow. Fresh captures verify this fix batch. No Floor issue was raised by the independent reviewer.

### Final confirmation

After the review fixes and responsive image variants: build passed; layout check reported no findings at all five widths; fresh full pages at 1440/1024/820/768/390 were inspected; public browser smoke passed all 30 checks. Privacy's rendered audit passed with 0 FAIL, 0 Reflex, 0 WARN. Final performance: 0 FAIL, 3 WARN, 783.9 KiB desktop / 690.7 KiB phone transfer, CLS 0.025 / 0.000. Remaining warnings are 198.3 KiB CSS at both widths and one desktop revision thumbnail above the image-size heuristic. Full logs remain under `output/`.

`rtk git diff --check` passed. Only local code and Git history are changed; no push or deployment was requested.
