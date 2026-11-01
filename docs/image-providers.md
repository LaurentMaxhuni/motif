# Image providers

Open **Settings → AI providers → Image generation**. Text and image providers are independent: for example, Claude Code can design the composition while Cloudflare generates artwork. Existing custom local endpoints remain the default. The same selection is used for new creatives and explicitly regenerated artwork during revisions.

## Cloudflare Workers AI

1. In your [Cloudflare dashboard](https://dash.cloudflare.com/), open **Workers AI → Use REST API**. Create a Workers AI API token using the supplied template, then copy your account ID. See [Cloudflare's setup guide](https://developers.cloudflare.com/workers-ai/get-started/rest-api/).
2. Select **Cloudflare Workers AI** in Motif. Enter the 32-character account ID and API token.
3. Click **Generate test image**. This sends one neutral image prompt using the displayed configuration; it does not save settings or add a creation.
4. Save settings when ready.

The supported model is [FLUX.1 Schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/) at four steps. Its JPEG/base64 response is handled as an image rather than mislabeled PNG data. Prompts are limited to 2,048 characters. Requests go directly from Motif's backend to Cloudflare's fixed HTTPS API origin; your text CLI does not receive the API token.

Cloudflare currently includes a [daily free allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/) shared by Workers AI usage. A paid account can incur charges beyond that allocation; Motif does not meter your account or impose a billing cap. Quota/rate errors are shown without switching to a paid model or another provider. Image prompts leave your computer when Cloudflare is selected.

## Custom local URL

Select **Custom local URL**, then enter the OpenAI-compatible base URL, exact image model ID and optional API key. Example: `http://127.0.0.1:7860/v1`. The server must support `POST /images/generations` relative to that base, accepting `model`, `prompt`, `n:1`, `size:"1024x1024"` and `response_format:"b64_json"`.

**Detect image models** calls `/models` with the displayed key. Choose a text-to-image model from the custom dropdown or enter its ID manually. Model lists may include other modalities. This option accepts loopback HTTP(S) addresses only (`127.0.0.1`, `localhost`, `[::1]`); it does not open arbitrary hosted URLs or LAN addresses. Redirects are refused. Standard ComfyUI workflows need an OpenAI-compatible adapter.

## Unsloth Studio

Select **Unsloth Studio**. Use its API base URL, commonly `http://127.0.0.1:8888/v1`, replacing the port with the one shown by your installation. Create an API key under Unsloth **Settings → API**, then enter it in Motif. Load a supported text-to-image model on Unsloth's Images page, detect models and enter/select the exact image model ID.

Motif uses the documented [`/v1/images/generations`](https://unsloth.ai/docs/basics/api#endpoints) endpoint with Bearer authentication and base64 output. It does not call Unsloth's internal UI generation routes, install models or launch Studio. Unsloth's own model switching/download settings remain under your control. An unloaded model, unavailable server, unsupported version or authentication error produces a visible failure. Image generation still needs hardware capable of running the chosen model.

## Keys, limits and verification

Cloudflare, custom local and Unsloth keys are independent. Blank key fields preserve the existing saved key. **Remove saved key** stages removal until you save. Keys are AES-256-GCM encrypted in a separate SQLite table using the existing `data/connector.key`; normal settings/state and JSON backups contain no key values. Keep that key file with physical database backups. JSON imports preserve existing credentials; restoring on another installation requires entering them again.

Tests and model discovery can use unsaved fields without persisting them. A test image is a temporary preview. Generations require image configuration before text inference; a missing Cloudflare token is rejected early. Returned image URLs are never followed. Image bytes must identify as PNG, JPEG or WebP, responses are bounded, and image requests time out after three minutes. Invalid output or provider failure leaves stored creations unchanged.

Fixtures cover Cloudflare's fixed URL/auth/body, JPEG and PNG handling, local/Unsloth authenticated requests, secret encryption/removal/redaction, errors/oversized output, discovery, actual creative rendering and revisions. The dedicated browser suite covers all three options, previews without saving, saved keys after reload, full Cloudflare creative generation, quota failures and responsive layouts.

No Cloudflare credential was provided for a live image request. Unsloth generation was not tested with an active model. Fixture success verifies integration behavior, not image quality or the readiness of a particular account/model.
