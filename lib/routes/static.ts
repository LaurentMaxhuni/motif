import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { fail } from "../core.ts";
import { initializeTheme } from "../theme-bootstrap.ts";

export const staticRoutes: FastifyPluginAsync<{ root: string }> = async (
  app,
  { root },
) => {
  const files: Record<string, [string, string]> = {
    "/": ["dist/index.html", "text/html"],
    "/favicon.svg": ["public/favicon.svg", "image/svg+xml"],
  };
  for (const [url, [file, type]] of Object.entries(files)) {
    app.get(url, async (_request, reply) => {
      const path = join(root, file);
      if (!existsSync(path)) fail("Not found.", 404);
      return reply
        .header("Cache-Control", "no-cache")
        .type(type + "; charset=utf-8")
        .send(readFileSync(path));
    });
  }
  app.get("/theme.js", async (_request, reply) =>
    reply
      .header("Cache-Control", "no-cache")
      .type("text/javascript; charset=utf-8")
      .send(`(${initializeTheme.toString()})();`),
  );
  app.get("/assets/:filename", async (request, reply) => {
    const path = request.url.split("?")[0];
    const asset = /^\/assets\/[a-zA-Z0-9_-]+\.(js|css|woff2?)$/.exec(path);
    if (!asset || !existsSync(join(root, "dist" + path)))
      fail("Not found.", 404);
    const type =
      asset[1] === "js"
        ? "text/javascript"
        : asset[1] === "css"
          ? "text/css"
          : "font/" + asset[1];
    return reply
      .header("Cache-Control", "no-cache")
      .type(type + "; charset=utf-8")
      .send(readFileSync(join(root, "dist" + path)));
  });
};
