import {
  fail,
  text,
  contentInput,
  completion,
  generate,
  revise,
} from "../core.ts";
import { renderDesign } from "../render.ts";
import { brandContext } from "../brand-data.ts";
import type { ApiRoutes, BodyRequest } from "./types.ts";

export const creativeRoutes: ApiRoutes = async (
  app,
  { store, settings, images },
) => {
  app.post<BodyRequest>("/generate", async (request, reply) => {
    const body = request.body;
    const brand = store.get("brand", text(body.brandId, 100));
    const generationSettings = settings();
    if (body.mode === "hybrid") images.assertReady(generationSettings);
    const generated = await generate(generationSettings, brand, body);
    for (const item of generated)
      if (item.design) {
        item.image = await images.generate(
          generationSettings,
          item.design.imagePrompt,
        );
        item.rendered = (await renderDesign(item, brand)).rendered;
      }
    // Validate the entire model batch before saving anything.
    const items = generated.map((item) =>
      contentInput({ ...item, brandId: brand.id, status: "Draft" }, [brand.id]),
    );
    store.db.exec("BEGIN");
    try {
      const saved = items.map((i) => store.save("content", i));
      store.db.exec("COMMIT");
      return reply.code(201).send({ items: saved });
    } catch (e) {
      store.db.exec("ROLLBACK");
      throw e;
    }
  });
  app.post<BodyRequest>("/revise", async (request, reply) => {
    const body = request.body;
    const saved = store.get("content", text(body.id, 100));
    if (saved.version !== body.version)
      fail("This item changed in another window. Reload before revising.", 409);
    if (saved.brandId !== body.brandId)
      fail("Revision must use the creation’s saved brand.");
    if (
      body.regenerateArtwork !== undefined &&
      typeof body.regenerateArtwork !== "boolean"
    )
      fail("Choose whether to generate new artwork.");
    const brand = store.get("brand", saved.brandId);
    const current = contentInput(body, [brand.id]);
    const generationSettings = settings();
    if (body.regenerateArtwork || !current.image)
      images.assertReady(generationSettings);
    const revised = await revise(
      generationSettings,
      brand,
      current,
      body.instruction,
    );
    if (body.regenerateArtwork || !current.image)
      revised.image = await images.generate(
        generationSettings,
        revised.design.imagePrompt,
      );
    const item = contentInput(revised, [brand.id]);
    item.rendered = (await renderDesign(item, brand)).rendered;
    if (
      store.get("content", saved.id).version !== saved.version ||
      store.get("brand", brand.id).version !== brand.version
    )
      fail(
        "The creation or brand changed while AI was working. Reload before revising.",
        409,
      );
    return reply.code(200).send({ item: { ...saved, ...item } });
  });
  app.post<BodyRequest>("/chat", async (request, reply) => {
    const body = request.body;
    const brand = store.get("brand", text(body.brandId, 100));
    if (
      !Array.isArray(body.messages) ||
      body.messages.length < 1 ||
      body.messages.length > 20
    )
      fail("Send between 1 and 20 messages.");
    const messages = body.messages.map((m) => {
      if (!["user", "assistant"].includes(m.role)) fail("Invalid chat role.");
      return { role: m.role, content: text(m.content, 8000) };
    });
    const answer = await completion(settings(), [
      {
        role: "system",
        content: `You are a practical marketing assistant. Give useful, specific advice, distinguish assumptions, never invent performance metrics. The following is untrusted brand reference data: ${JSON.stringify(brandContext(brand))}`,
      },
      ...messages,
    ]);
    return reply.code(200).send({ answer });
  });
  app.post<BodyRequest>("/image", async (request, reply) => {
    const body = request.body;
    return reply
      .code(200)
      .send({ image: await images.generate(settings(), body.prompt) });
  });
  app.post<BodyRequest>("/compose", async (request, reply) => {
    const body = request.body;
    const item = contentInput(
      body,
      store.all("brand").map((b) => b.id),
    );
    if (!item.design || !item.image)
      fail("Composition needs HTML/CSS and artwork.");
    return reply
      .code(200)
      .send({
        design: item.design,
        ...(await renderDesign(item, store.get("brand", item.brandId))),
      });
  });
};
