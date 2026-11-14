import Fastify from "fastify";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { openStore, defaultSettings } from "./lib/core.ts";
import { createConnectorService } from "./lib/connectors.ts";
import { createImageService } from "./lib/images.ts";
import { seedWorkspace } from "./lib/seed.ts";
import type { AnalysisDependencies } from "./lib/analysis.ts";
import { configureTransport } from "./lib/transport.ts";
import { staticRoutes } from "./lib/routes/static.ts";
import { workspaceRoutes } from "./lib/routes/workspace.ts";
import { documentRoutes } from "./lib/routes/documents.ts";
import { researchRoutes } from "./lib/routes/research.ts";
import { generationRoutes } from "./lib/routes/generation.ts";
import { creativeRoutes } from "./lib/routes/creative.ts";
import { providersRoutes } from "./lib/routes/providers.ts";
import { connectionsRoutes } from "./lib/routes/connections.ts";

const root = dirname(fileURLToPath(import.meta.url));
interface AppOptions {
  database?: string;
  seed?: boolean;
  analysisDependencies?: AnalysisDependencies;
  connectorFetch?: typeof fetch;
  imageFetch?: typeof fetch;
}

export function createApp({
  database = join(root, "data", "motif.sqlite"),
  seed = false,
  analysisDependencies = {},
  connectorFetch,
  imageFetch,
}: AppOptions = {}) {
  if (database !== ":memory:")
    mkdirSync(dirname(database), { recursive: true });
  const store = openStore(database);
  let secretKey;
  if (database === ":memory:") secretKey = randomBytes(32);
  else {
    const keyPath = join(dirname(database), "connector.key");
    try {
      writeFileSync(keyPath, randomBytes(32), { flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    secretKey = readFileSync(keyPath);
    if (secretKey.length !== 32)
      throw new Error(
        "Connector key is invalid. Restore the original data/connector.key.",
      );
  }
  const connectors = createConnectorService({
    store,
    secretKey,
    ...(connectorFetch ? { fetchImpl: connectorFetch } : {}),
  });
  const images = createImageService({
    store,
    secretKey,
    ...(imageFetch ? { fetchImpl: imageFetch } : {}),
  });

  if (seed) seedWorkspace(store);
  const token = randomUUID();
  const settings = () => store.all("settings")[0] || defaultSettings;
  const server = Fastify({
    bodyLimit: 12_000_000,
    requestTimeout: 30_000,
    exposeHeadRoutes: false,
  });
  configureTransport(server, token);
  const context = {
    store,
    settings,
    images,
    connectors,
    seed,
    token,
    analysisDependencies,
  };
  server.register(staticRoutes, { root });
  for (const routes of [
    workspaceRoutes,
    documentRoutes,
    researchRoutes,
    creativeRoutes,
    generationRoutes,
    providersRoutes,
    connectionsRoutes,
  ]) {
    server.register(routes, { ...context, prefix: "/api" });
  }
  server.addHook("onClose", async () => {
    store.db.close();
  });
  return { server, store };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { server } = createApp();
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void server.close().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    });
  }
  try {
    const address = await server.listen({
      port: Number(process.env.PORT || 3333),
      host: "127.0.0.1",
    });
    console.log(`Motif is running at ${address}`);
  } catch (error) {
    console.error(error);
    await server.close();
    process.exitCode = 1;
  }
}
