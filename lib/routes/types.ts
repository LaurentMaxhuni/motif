import type { FastifyPluginAsync } from "fastify";
import type { openStore } from "../core.ts";
import type { createImageService } from "../images.ts";
import type { createConnectorService } from "../connectors.ts";
import type { AnalysisDependencies } from "../analysis.ts";
import type { Settings } from "../../src/lib/types.ts";

export interface RouteContext {
  store: ReturnType<typeof openStore>;
  settings: () => Settings;
  images: ReturnType<typeof createImageService>;
  connectors: ReturnType<typeof createConnectorService>;
  seed: boolean;
  token: string;
  analysisDependencies: AnalysisDependencies;
}

export type ApiRoutes = FastifyPluginAsync<RouteContext>;
// Incoming JSON is validated by the domain input functions.
export interface BodyRequest {
  Body: Record<string, any>;
}
export interface IdRequest extends BodyRequest {
  Params: { id: string };
}
