# AI creative workflow — first milestone

Describe an ad or social poster, receive a complete AI design, request changes in plain language, save, and export PNG. No layout picker, color picker, design code, or manual composition controls in the creative editor. Existing creations remain readable and revisable.

Use the existing local text model, artwork model, validated HTML/CSS renderer, SQLite storage, and version checks. The original implementation used local models; text generation now also supports explicit CLI-provider selection as described in [CLI providers](cli-providers.md). Artwork also supports [Cloudflare and local image providers](image-providers.md). Compare AI-generated compositions plus artwork (chosen: existing renderer keeps text readable) with a single generated bitmap (requires a different editing contract and less reliable lettering).

Revision returns an unsaved preview. Save is explicit. Preserve artwork by default; offer an explicit option to generate new artwork. Invalid model output, unavailable models, stale versions, and closed/reopened editors must not overwrite saved work or another editor. Changed designs return to Draft and clear scheduled dates so old approval does not cover new content. Calendar expansion and publishing remain later milestones.

Acceptance: complete AI creation is the studio default, prompt-based revision changes the preview, save survives reload, PNG downloads at 1080×1080, errors preserve the previous preview and request, mobile works, and existing workflows retain coverage. Fixture success proves integration contracts; actual model quality requires a running text/image engine and is reported separately.
