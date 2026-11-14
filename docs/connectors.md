# Manual social management connections

Connections are optional. Creating local content, rendering, and exporting never requires a social provider. A user must save a provider token, test the connection, select the remote account, review content, then explicitly send a draft or schedule a future delivery. No publish-now operation exists.

## Configuration

| Provider | Credentials / configuration | Implemented delivery |
| --- | --- | --- |
| Buffer | Personal API key; `organizationId` from Buffer | Drafts; scheduled text/image posts; public HTTPS image URL |
| Metricool | API token; numeric `userId`, `blogId`; Advanced or Custom API plan | Text drafts and scheduled text posts |
| Zernio | API key; optional `profileId` to limit account discovery | Drafts with saved rendered artwork, text drafts, and scheduled posts with optional public HTTPS artwork |

Buffer organization IDs can be found with the official `account { organizations { id name } }` GraphQL query. Motif queries channels within the configured organization. Metricool IDs appear in the selected brand URL. Motif verifies the selected Metricool brand through `simpleProfiles`. Zernio profile IDs come from its dashboard/API.

Supported targets: Facebook, LinkedIn, Instagram drafts, Twitter/X, Threads, Bluesky. Motif applies conservative text limits and checks account platform against the local content channel. Instagram requires artwork; Instagram scheduling remains disabled because network-specific publishing settings require additional review. Pinterest, TikTok, YouTube, video, carousels, Stories, platform-specific settings, analytics and inbox operations are outside this connector's implemented surface.

Choose **Attach saved artwork** to send a saved rendered image with a Zernio draft. Motif reads the reviewed creation from SQLite, validates the image, requests a presigned upload URL, and uploads the bytes to Zernio's storage. The draft uses the returned public media URL. Motif checks the reviewed versions again after upload. A failed upload or changed review stops before draft creation and is recorded as a failed attempt. The user can review and retry explicitly. See the [Zernio upload guide](https://docs.zernio.com/guides/media-uploads).

You can also supply a publicly reachable HTTPS image URL you control for Buffer or Zernio. Motif rejects credentials, private destinations, and signed query URLs, then passes the URL to the provider. A delivery with neither a URL nor saved artwork sends text only. Review the resulting draft in the provider.

Metricool's current help article describes `media.mediaId`, while its current Swagger `ScheduledPost.media` is `string[]`, and the normalization endpoint has no response schema. Rather than guess or silently omit an attachment, Motif refuses Metricool media delivery. Attach exported creatives manually inside Metricool.

## Service API

`createConnectorService({store,secretKey,fetchImpl=fetch,resolveMediaHost=lookup})` uses core `openStore`. `secretKey` must be a Buffer containing 32 random bytes. Parent application persists this key locally; losing it requires re-entering credentials. `fetchImpl` and `resolveMediaHost` exist for fixture tests.

- `list(brandId)` returns sanitized connection metadata.
- `save({id?,version?,brandId,provider,name,token?,config})` creates or updates. Brand must exist. Provider and brand cannot change. An omitted token preserves the saved credential; an empty supplied token is rejected. Updates require the current version.
- `remove(id,version,brandId)` removes metadata and credential atomically.
- `test(id,brandId)` makes read-only discovery requests and returns `{connectionId,provider,accounts:[{id,name,platform}],checkedAt}`. Unsupported targets are excluded. No post is created.
- `send({connectionId,connectionVersion,brandId,contentId,contentVersion,accountId,platform,mode:'draft'|'schedule',scheduledAt?,mediaUrl?,attachArtwork?})` returns the recorded delivery. Reviewed content/connection versions must match before any remote call and are checked again after channel discovery. Content must belong to the connection's brand and have status Approved, Ready or Scheduled. Draft content is refused. `scheduledAt` requires an ISO timezone and at least one minute in the future. Caller must review media omission when sending text only.
- `deliveries(brandId)` returns the local journal, including remote IDs and outcome.

Credentials use AES-256-GCM, a fresh nonce, and connection ID as authenticated associated data. Ciphertext lives in the separate SQLite `connector_secrets` table, outside the JSON document export. Neither ciphertext nor key belongs in portable JSON backups; restored connection metadata requires new credentials. A physical database copy still contains encrypted credentials. Protect the local key and database using normal account/filesystem access controls.

Provider responses and error bodies are never stored wholesale. Connection lists do not expose tokens. Provider API requests use fixed HTTPS hosts, reject redirects, time out after 15 seconds and read at most 1 MB. Zernio artwork PUTs accept only the documented R2 host family over HTTPS, reject redirects, carry no API key, and time out after 60 seconds. Provider error messages are replaced with local redacted descriptions.

Delivery fingerprint covers connection, content ID, account, platform, mode, schedule, text, and either the media URL or a digest of the saved artwork. Identical attempts return the recorded result without another write. A Zernio artwork upload that failed before the draft request can be retried explicitly. Concurrent clicks are checked after account discovery. A journal row is persisted before the external write. Zernio additionally receives that delivery ID as `Idempotency-Key`. A transport error, timeout, malformed success, oversized reply or server error leaves `uncertain`; no automatic retry occurs. After a process crash, a `sending` row also suppresses duplicates. Check the provider manually before changing content or creating another delivery. Editing text, media, target, schedule or connection creates a different fingerprint and can produce another remote post.

## Official contracts checked 2026-10-31

- [Buffer endpoint/authentication](https://developers.buffer.com/llms.txt): GraphQL at `https://api.buffer.com`, Bearer token.
- [Buffer GraphQL reference](https://developers.buffer.com/reference.html): `ChannelsInput`, `CreatePostInput`; current required `assets` and `needsApproval` fields are supplied even though examples omit them.
- [Buffer draft example](https://developers.buffer.com/examples/create-draft-post.md): `saveToDraft:true`, `mode:addToQueue`, `schedulingType:automatic`.
- [Buffer scheduled example](https://developers.buffer.com/examples/create-scheduled-post.md): `mode:customScheduled` and `dueAt`.
- [Buffer image example](https://developers.buffer.com/examples/create-image-post.md): `assets:[{image:{url}}]`.
- [Metricool basic integration](https://help.metricool.com/basic-guide-for-api-integration-r97af): Advanced/Custom availability, `X-Mc-Auth`, `userId`/`blogId`, scheduler and drafts.
- [Metricool Swagger](https://app.metricool.com/api/swagger.json): `PublicBlog`, `/admin/simpleProfiles`, `/v2/scheduler/posts`, `ScheduledPost`, `JsonOkResponseScheduledPost`.
- [Metricool media guidance](https://help.metricool.com/common-questions-and-errors-when-using-the-api-8x9nq): public durable media, normalization and media IDs; discrepancy above.
- [Zernio accounts](https://docs.zernio.com/accounts/list-accounts): GET `https://zernio.com/api/v1/accounts`; `accounts[]` with `_id`, displayName, username and platform.
- [Zernio posts](https://docs.zernio.com/posts/create-post): POST `/v1/posts`; `content`, `platforms:[{platform,accountId}]`, `isDraft`, `publishNow:false`, `scheduledFor`, `mediaItems:[{type:'image',url}]`; `post._id` response and `Idempotency-Key`. A past scheduled date publishes immediately upstream, so Motif refuses it locally.

Validation: `node --experimental-strip-types --test test/connectors.test.ts` mocks HTTP for every provider. No live token, live connection, upload, draft or scheduled post was created during implementation. Fixture tests prove local contracts and safeguards; live API access, subscription permissions and provider-side acceptance remain unverified.
