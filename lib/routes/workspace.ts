import { randomUUID } from "node:crypto";
import { fail, brandInput, contentInput } from "../core.ts";
import type { ApiRoutes, BodyRequest } from "./types.ts";

export const workspaceRoutes: ApiRoutes = async (
  app,
  { store, settings, images, seed, token },
) => {
  app.get("/state", async (_request, reply) => {
    return reply
      .code(200)
      .send({
        token,
        brands: store.all("brand"),
        contents: store.all("content"),
        settings: settings(),
        imageCredentials: images.credentialStatus(),
        workspace: store.all("workspace")[0] || {
          onboardingCompleted:
            seed ||
            store
              .all("brand")
              .some((b) => b.source !== "Editable example brand"),
        },
      });
  });
  app.put<BodyRequest>("/workspace", async (request, reply) => {
    const body = request.body;
    if (typeof body.onboardingCompleted !== "boolean")
      fail("Invalid workspace preference.");
    const old = store.all("workspace")[0];
    return reply
      .code(200)
      .send(
        store.save(
          "workspace",
          { onboardingCompleted: body.onboardingCompleted },
          old?.id,
          old?.version,
        ),
      );
  });
  app.get("/export", async (_request, reply) => {
    return reply
      .code(200)
      .send({
        format: "motif-local",
        version: 1,
        exportedAt: new Date().toISOString(),
        brands: store.all("brand"),
        contents: store.all("content"),
        settings: settings(),
      });
  });
  app.post<BodyRequest>("/import", async (request, reply) => {
    const body = request.body;
    if (
      body.format !== "motif-local" ||
      body.version !== 1 ||
      !Array.isArray(body.brands) ||
      !Array.isArray(body.contents) ||
      body.brands.length > 100 ||
      body.contents.length > 1000
    )
      fail("Invalid Motif backup.");
    const map = new Map();
    const brands = body.brands.map((b) => {
      if (typeof b.id !== "string" || map.has(b.id))
        fail("Invalid or duplicate brand ID.");
      const id = randomUUID();
      map.set(b.id, id);
      return { value: brandInput(b), id };
    });
    const contents = body.contents.map((c) =>
      contentInput({ ...c, brandId: map.get(c.brandId) }, [...map.values()]),
    );
    store.db.exec("BEGIN");
    try {
      for (const b of brands) {
        const v = {
          ...b.value,
          id: b.id,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.db
          .prepare("INSERT INTO documents VALUES (?,?,?)")
          .run(b.id, "brand", JSON.stringify(v));
      }
      for (const c of contents) store.save("content", c);
      store.db.exec("COMMIT");
    } catch (e) {
      store.db.exec("ROLLBACK");
      throw e;
    }
    return reply
      .code(200)
      .send({ imported: contents.length, brands: brands.length });
  });
};
