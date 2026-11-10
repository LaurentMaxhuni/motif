import { brandInput, contentInput, fail } from "../core.ts";
import { renderDesign } from "../render.ts";
import type { ApiRoutes, BodyRequest, IdRequest } from "./types.ts";

export const documentRoutes: ApiRoutes = async (app, { store, connectors }) => {
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
