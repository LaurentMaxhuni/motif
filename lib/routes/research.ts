import { randomUUID } from "node:crypto";
import { analyzeWebsite } from "../analysis.ts";
import type { AnalysisProgress } from "../analysis.ts";
import { publicDocument, extractBrand, fail, text } from "../core.ts";
import { textReady } from "../cli.ts";
import type { ApiRoutes, BodyRequest, IdRequest } from "./types.ts";

interface AnalysisJob {
  id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  progress: AnalysisProgress;
  createdAt: number;
  controller: AbortController;
  result?: Awaited<ReturnType<typeof analyzeWebsite>>;
  error?: string;
}

export const researchRoutes: ApiRoutes = async (
  app,
  { settings, analysisDependencies },
) => {
  const jobs = new Map<string, AnalysisJob>();
  app.addHook("preClose", async () => {
    for (const job of jobs.values()) {
      job.status = "cancelled";
      job.controller.abort();
    }
  });
  app.post<BodyRequest>("/analysis", async (request, reply) => {
    const body = request.body;
    if ([...jobs.values()].some((job) => job.status === "running"))
      fail(
        "A website analysis is already running. Finish or cancel it first.",
        409,
      );
    for (const [id, job] of jobs)
      if (Date.now() - job.createdAt > 3600000) jobs.delete(id);
    const input = {
      url: text(body.url, 2000),
      maxPages: Number(body.maxPages || 12),
      useAI: body.useAI === true,
    };
    let target: URL;
    try {
      target = new URL(input.url);
    } catch {
      fail("Enter a full website URL.");
    }
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password
    )
      fail("Use a public HTTP(S) website without credentials.");
    if (
      !Number.isInteger(input.maxPages) ||
      input.maxPages < 1 ||
      input.maxPages > 20
    )
      fail("Choose between 1 and 20 pages.");
    if (input.useAI && !textReady(settings()))
      fail(
        "Configure a text AI provider in Settings before enabling AI interpretation.",
      );
    const job: AnalysisJob = {
      id: randomUUID(),
      status: "running",
      progress: {
        stage: "starting",
        message: "Preparing a local website analysis.",
      },
      createdAt: Date.now(),
      controller: new AbortController(),
    };
    jobs.set(job.id, job);
    void analyzeWebsite(input, settings(), {
      ...analysisDependencies,
      signal: job.controller.signal,
      onProgress: (progress) => {
        if (job.status === "running") job.progress = progress;
      },
    })
      .then((result) => {
        if (job.status === "running") {
          job.result = result;
          job.status = "completed";
        }
      })
      .catch((error) => {
        if (job.status === "running") {
          job.status = "failed";
          job.error = error.status
            ? error.message
            : "Website analysis could not finish. Check the URL and local model, or try a smaller crawl.";
        }
      });
    return reply.code(202).send({ id: job.id, status: job.status });
  });
  const jobPath = "/analysis/:id(^[a-zA-Z0-9-]+$)";
  app.get<IdRequest>(jobPath, async (request) => {
    const job = jobs.get(request.params.id);
    if (!job) fail("Analysis not found. The server may have restarted.", 404);
    const { controller, ...snapshot } = job;
    return snapshot;
  });
  app.delete<IdRequest>(jobPath, async (request) => {
    const job = jobs.get(request.params.id);
    if (!job) fail("Analysis not found. The server may have restarted.", 404);
    job.status = "cancelled";
    job.controller.abort();
    return { cancelled: true };
  });
  app.post<BodyRequest>("/scan", async (request) => {
    const doc = await publicDocument(text(request.body.url, 2000));
    return extractBrand(doc.html, doc.url);
  });
};
