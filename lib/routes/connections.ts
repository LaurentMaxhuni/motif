import { text } from "../core.ts";
import type { ApiRoutes, BodyRequest, IdRequest } from "./types.ts";

export const connectionsRoutes: ApiRoutes = async (app, { connectors }) => {
  app.get("/connections", async (request) => {
    const brandId = new URL(request.url, "http://localhost").searchParams.get(
      "brandId",
    );
    return { connections: connectors.list(text(brandId, 100)) };
  });
  app.post<BodyRequest>("/connections", async (request, reply) =>
    reply
      .code(request.body.id ? 200 : 201)
      .send(await connectors.save(request.body)),
  );
  app.post<IdRequest>(
    "/connections/:id(^[a-zA-Z0-9-]+$)/test",
    async (request) =>
      connectors.test(request.params.id, text(request.body.brandId, 100)),
  );
  app.delete<IdRequest>(
    "/connections/:id(^[a-zA-Z0-9-]+$)",
    async (request) => {
      await connectors.remove(
        request.params.id,
        request.body.version,
        text(request.body.brandId, 100),
      );
      return { deleted: true };
    },
  );
  app.get("/deliveries", async (request) => {
    const brandId = new URL(request.url, "http://localhost").searchParams.get(
      "brandId",
    );
    return { deliveries: connectors.deliveries(text(brandId, 100)) };
  });
  app.post<BodyRequest>("/deliveries", async (request, reply) =>
    reply.code(201).send(await connectors.send(request.body)),
  );
};
