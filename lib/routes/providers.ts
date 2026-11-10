import { fail, settingsInput, localRequest, completion } from "../core.ts";
import { cliProviders, cliSettings, inspectCli, textLabel } from "../cli.ts";
import type { ApiRoutes, BodyRequest } from "./types.ts";

export const providersRoutes: ApiRoutes = async (
  app,
  { store, settings, images },
) => {
  app.put<BodyRequest>("/settings", async (request, reply) => {
    const body = request.body;
    const s = settingsInput(body);
    images.validateCredentials(body.imageCredentials);
    const old = store.all("settings")[0];
    store.db.exec("BEGIN");
    try {
      const saved = store.save("settings", s, old?.id, old?.version);
      images.saveCredentials(body.imageCredentials);
      store.db.exec("COMMIT");
      return reply.code(200).send(saved);
    } catch (error) {
      store.db.exec("ROLLBACK");
      throw error;
    }
  });
  app.post<BodyRequest>("/image/models", async (request, reply) => {
    const body = request.body;
    const config = settingsInput({ ...settings(), ...body });
    return reply
      .code(200)
      .send({ models: await images.models(config, body.imageCredentials) });
  });
  app.post<BodyRequest>("/image/test", async (request, reply) => {
    const body = request.body;
    const config = settingsInput({ ...settings(), ...body });
    return reply
      .code(200)
      .send({
        image: await images.generate(
          config,
          "A ceramic mug on a plain studio background, soft natural light, no text.",
          body.imageCredentials,
        ),
      });
  });
  app.post<BodyRequest>("/cli/detect", async (request, reply) => {
    const body = request.body;

    const config = cliSettings(body);
    const providers = await Promise.all(
      Object.keys(cliProviders).map((id) =>
        inspectCli(id, config.cliProfiles[id]),
      ),
    );
    return reply.code(200).send({ providers });
  });
  app.post<BodyRequest>("/cli/test", async (request, reply) => {
    const body = request.body;

    const config = { ...settings(), ...cliSettings(body) };
    if (config.textProvider === "local") fail("Select a CLI provider to test.");
    const answer = await completion(
      config,
      [
        {
          role: "user",
          content: "Reply with exactly MOTIF_OK. Do not use any tools.",
        },
      ],
      false,
      100,
    );
    if (answer.trim() !== "MOTIF_OK")
      fail(
        "CLI responded, but the test reply was unexpected. Check the selected model.",
        502,
      );
    return reply.code(200).send({ ok: true, provider: textLabel(config) });
  });
  app.post<BodyRequest>("/models", async (request, reply) => {
    const body = request.body;
    if (body.kind === "image")
      return reply.code(200).send({ models: await images.models(settings()) });
    const endpoint = settings().textEndpoint;
    const r = await localRequest(endpoint, "/models", null, 6000);
    return reply
      .code(200)
      .send({
        models: (r.data || [])
          .filter((m) => typeof m.id === "string")
          .map((m) => m.id),
      });
  });
};
