# Local brand extraction evaluation — 2026-11-01

Evaluated Holo, Stripe, Allbirds and Mozilla with five-page live crawls, then replayed every captured response against the final parser. All four final replays had zero missing captures, five readable pages and saveable reports. Raw responses and full reports remain under ignored `output/brand-quality/`.

| Sample | Baseline failure | Final result |
| --- | --- | --- |
| Holo | Homepage had no readable copy; legal headings became products | Static streamed HTML yields 1,891 homepage words; three generator page candidates; observed pink/purple palette |
| Stripe | Ten duplicate candidates; editorial pages crowded discovery | Ten distinct candidates across five pages; observed purple/navy palette |
| Allbirds | Cart copy and size variants polluted product summary | Two structured product groups; variant evidence retained |
| Mozilla | Survey/navigation copy appeared in draft products | Nine source-linked candidates, including Firefox and Thunderbird; no draft products outside recorded findings |

No final sample contained duplicate product names or the known legal/cart/survey noise labels checked by the evaluator. These are bounded sample checks, not proof that every candidate is correct. Titles/headings remain explicitly labelled candidates. Mozilla's selected colors are still neutral source declarations; the extractor does not establish an official palette. A laumax.dev sample failed DNS resolution and was not counted as successful.

Original captures differ from final crawls because discovery changed. Final parser comparisons replay the newer complete captures; initial counts are diagnostic examples, not a controlled accuracy score. Replay byte/request counts can differ from live transfer counts because replay has decoded bodies and no actual redirects.

Reproduce without website traffic:

```powershell
node --experimental-strip-types scripts/brand-extraction-eval.ts --captures output/brand-quality/live-final --out output/brand-quality/replay
```

Create fresh public captures explicitly:

```powershell
node --experimental-strip-types scripts/brand-extraction-eval.ts --live --out output/brand-quality/live
```

The dedicated browser suite uses an isolated database and fixture transport. Ten checks exercise review, edits, apply, persisted evidence, reload, full-report download, discard, version conflicts and cancellation without changing live brands. Existing feature checks cover malformed model interpretation and fallback. Actual model interpretation remains unverified: no local model is configured or running.
