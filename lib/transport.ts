import type { FastifyInstance } from "fastify";
import { fail } from "./core.ts";

const parserErrors: Record<string, string> = {
  FST_ERR_CTP_BODY_TOO_LARGE: "Request too large.",
  FST_ERR_CTP_EMPTY_JSON_BODY: "Invalid JSON.",
  FST_ERR_CTP_INVALID_JSON_BODY: "Invalid JSON.",
  FST_ERR_CTP_INVALID_CONTENT_LENGTH: "Invalid JSON.",
  FST_ERR_CTP_INVALID_MEDIA_TYPE: "JSON required.",
};

export function configureTransport(app: FastifyInstance, token: string) {
  app.addHook("onRequest", async (request, reply) => {
    reply.headers({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "Cache-Control": "no-store",
    });
    const address = app.server.address();
    // Unbound instances use port 3333 for HTTP injection.
    const port = typeof address === "object" && address ? address.port : 3333;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
    if (!hosts.includes(request.headers.host || "")) fail("Invalid host.", 403);
    const path = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
    if (!path.startsWith("/api/")) {
      if (request.method !== "GET") fail("Method not allowed.", 405);
      return;
    }
    if (
      request.headers.origin &&
      !hosts.some((host) => request.headers.origin === `http://${host}`)
    ) {
      fail("Cross-origin access denied.", 403);
    }
    if (!["GET", "HEAD"].includes(request.method)) {
      if (request.headers["x-motif-token"] !== token)
        fail("Reload Motif before making changes.", 403);
      if (
        request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !==
        "application/json"
      ) {
        fail("JSON required.", 415);
      }
    }
  });
  app.addHook("preValidation", async (request) => {
    if (["GET", "HEAD"].includes(request.method)) return;
    if (
      !request.body ||
      typeof request.body !== "object" ||
      Array.isArray(request.body)
    ) {
      fail("Expected JSON object.");
    }
  });
  app.setErrorHandler(
    (
      error: Error & { status?: number; statusCode?: number; code?: string },
      _request,
      reply,
    ) => {
      const status = error.status || error.statusCode || 500;
      if (status >= 500 && !error.status) console.error(error);
      const message =
        parserErrors[error.code || ""] ||
        (status < 500 || error.status
          ? error.message
          : "Operation failed. Check server console.");
      reply.code(status).send({ error: message });
    },
  );
  app.setNotFoundHandler(async () => {
    fail("Not found.", 404);
  });
}
