import { brandInput, contentInput, fail } from "../core.ts";
import { renderDesign } from "../render.ts";
import type { ApiRoutes, BodyRequest, IdRequest } from "./types.ts";
import type { Content } from "../../src/lib/types.ts";

interface VersionRequest extends BodyRequest {
  Params: { id: string; version: string };
}

export const documentRoutes: ApiRoutes = async (app, { store, connectors }) => {
  const history = "/contents/:id(^[a-zA-Z0-9-]+$)/versions";
  const versionPath = history + "/:version(^[1-9][0-9]*$)";
  const listVersions = store.db.prepare(
    "SELECT version, title, status, updated_at AS updatedAt FROM content_versions WHERE content_id = ? ORDER BY version DESC",
  );
  const findVersion = store.db.prepare(
    "SELECT value FROM content_versions WHERE content_id = ? AND version = ?",
  );

  function getVersion(id: string, version: string): Content {
    const number = Number(version);
    const row = Number.isSafeInteger(number) && findVersion.get(id, number);
    if (!row) fail("Saved version not found.", 404);
    return JSON.parse(row.value as string);
  }

  app.get<IdRequest>(history, async ({ params: { id } }) => {
    store.get("content", id);
    return { versions: listVersions.all(id) };
  });
  app.get<VersionRequest>(versionPath, async ({ params: { id, version } }) => {
    store.get("content", id);
    return { item: getVersion(id, version) };
  });
  app.post<VersionRequest>(versionPath + "/restore", async request => {
    const { id, version } = request.params;
    const current: Content = store.get("content", id);
    if (current.version !== request.body.version)
      fail("This item changed in another window. Reload before restoring.", 409);
    const archived = getVersion(id, version);
    const restored = contentInput(
      { ...archived, brandId: current.brandId, status: "Draft", scheduledAt: "" },
      [current.brandId],
    );
    return { item: store.save("content", restored, id, current.version) };
  });

  for (const [resource, type] of [
    ["brands", "brand"],
    ["contents", "content"],
  ] as const) {
    const save = async (body: Record<string, any>, id?: string) => {
      const input =
        type === "brand"
          ? brandInput(body)
          : contentInput(
              body,
              store.all("brand").map((b) => b.id),
            );
      if ("design" in input && input.design) {
        if (id && store.get(type, id).version !== body.version)
          fail(
            "This item changed in another window. Reload before saving.",
            409,
          );
        input.rendered = (
          await renderDesign(input, store.get("brand", input.brandId))
        ).rendered;
      }
      return store.save(type, input, id, body.version);
    };
    app.post<BodyRequest>("/" + resource, async (request, reply) =>
      reply.code(201).send(await save(request.body)),
    );
    const path = "/" + resource + "/:id(^[a-zA-Z0-9-]+$)";
    app.put<IdRequest>(path, async (request) =>
      save(request.body, request.params.id),
    );
    app.delete<IdRequest>(path, async (request) => {
      const { id } = request.params;
      if (
        type === "brand" &&
        store.all("content").some((c) => c.brandId === id)
      )
        fail("Remove this brand’s content before deleting the brand.");
      if (type === "brand" && connectors.list(id).length)
        fail(
          "Disconnect this brand’s social connections before deleting the brand.",
        );
      store.remove(type, id, request.body.version);
      return { deleted: true };
    });
  }
};
