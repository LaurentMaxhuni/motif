# Local website Brand DNA analysis

`analyzeWebsite({url, maxPages:12, useAI:false}, settings, dependencies={})` returns an editable brand draft plus `analysis`. All extraction runs inside the local Node process. Optional synthesis uses the existing loopback-only model transport. Website downloads contact the requested public website; no cloud analysis service receives page content.

The crawl reads robots.txt first, respects the most specific MotifLocal or wildcard group, and follows same-origin links and one sitemap. Explicit 404/410 robots responses permit crawling; other robots failures stop analysis. Sitemap indexes are reported but not recursively expanded. About/company, products/services, pricing, FAQ and audience pages take priority. Login/account/cart/checkout/action paths, credentials, private IP literals, nonstandard ports and non-HTTP URLs are excluded. The shared transport resolves and checks every hostname and redirect, rejects private/special-use addresses, and pins the selected DNS address. A transport `allowUrl` callback checks robots permission before fetching each redirect target. Same-origin redirects only; enter the final canonical origin if the site redirects between www and non-www hosts. Query strings and fragments are removed before crawling. Canonicals collapse pages only when the declared same-origin target was already analyzed.

Bounds: 1–20 successful pages (12 default), 36 requests including discovery and CSS, 75 seconds for website fetching, 12 MB aggregate transfer, 2 MB per response, 120,000 retained text characters and up to three same-origin stylesheets. The frontier holds at most 500 URLs. Requests are sequential. Failed pages and unavailable assets remain visible. Model inference has the existing local completion timeout separately. No JavaScript, images, remote fonts, CSS imports or cross-origin resources are executed or downloaded.

`analysis` contains:

- `pages`: URL, title, description, headings, bounded excerpt, approximate word count, metadata, structured data, CTA and visual signals.
- `findings`: company wording, product/service candidates, explicit audience wording, positioning/benefit phrases, publisher proof claims, voice samples/interpretation, visual palette/font/logo references, per-page SEO issues, content and technical coverage.
- `evidence`: claims tagged `observed` or `inferred`, source URLs and supporting quotes where available.
- `warnings`: missing evidence, extraction limitations, partial failures, scan limits and synthesis fallback.
- `coverage`: request/byte/text counts, page counts, pending URLs, skips, failures, robots state, sitemap and limits.

Products inferred from headings are labeled candidates. Publisher copy and JSON-LD are observations, not independently verified facts. Palette frequency reflects declarations across analyzed pages/stylesheets, not computed appearance or official brand hierarchy. Fallback colors are disclosed. Without a model, voice remains blank and audience uses explicit site wording only. Missing evidence stays visible rather than receiving generic persona claims.

Optional local synthesis receives bounded excerpts across all analyzed pages. It may add only audience and voice interpretations with exact source URLs and verbatim supporting quotes. Structure, field lengths, provenance and quote presence are validated before applying any output. Invalid or unavailable synthesis retains the extraction result. Quote validation establishes attribution, not semantic truth; all model interpretations require review. Website text is explicitly untrusted model input.

Large reports compact excerpts, headings, schema and asset lists before local storage, with an explicit warning. Evidence and findings remain available.

For fixtures, inject `fetchDocument(url, redirects, options)` returning `{html,url}`, `infer(settings,messages,json,maxTokens,signal)` and/or `onProgress({stage,pages,pagesCompleted,maxPages,url?,currentUrl?})`. An optional `dependencies.signal` cancels network requests and is checked between crawl and synthesis steps. The signal also aborts the local model HTTP request; the model server may continue processing internally. Local model inference retains its existing completion timeout. Transport options include `allowedMime`, `sameOrigin`, `maxBytes`, `timeoutMs` and abort `signal`; HTTP errors expose `statusCode`. Tests use in-memory fixtures and never call public websites or a model.
