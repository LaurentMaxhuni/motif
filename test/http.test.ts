import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../server.ts";
import { brandInput, openStore, defaultSettings } from "../lib/core.ts";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("Fastify routes work without binding a port and enforce the local API contract", async (t) => {
  const { server, store } = createApp({ database: ":memory:" });
  t.after(() => server.close());
  const host = "127.0.0.1:3333";
  const state = await server.inject({ url: "/api/state", headers: { host } });
  assert.equal(state.statusCode, 200);
  assert.equal(state.headers["cache-control"], "no-store");
  const headers = {
    host,
    "content-type": "application/json",
    "x-motif-token": state.json().token,
  };

  const workspace = (payload: string, override = {}) =>
    server.inject({
      method: "PUT",
      url: "/api/workspace",
      headers: { ...headers, ...override },
      payload,
    });
  assert.equal((await workspace("{", { "x-motif-token": "" })).statusCode, 403);
  assert.equal(
    (await workspace("{}", { origin: "https://other.example" })).statusCode,
    403,
  );
  assert.equal(
    (await workspace("{}", { "content-type": "text/plain" })).statusCode,
    415,
  );
  assert.deepEqual((await workspace("{")).json(), { error: "Invalid JSON." });
  assert.deepEqual((await workspace("[]")).json(), {
    error: "Expected JSON object.",
  });
  const oversized = await workspace(
    JSON.stringify({ padding: "a".repeat(12_000_000) }),
  );
  assert.equal(oversized.statusCode, 413);
  assert.deepEqual(oversized.json(), { error: "Request too large." });
  assert.equal(store.all("workspace").length, 0);

  const saved = await workspace('{"onboardingCompleted":true}');
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.json().onboardingCompleted, true);
  assert.equal(
    (
      await server.inject({
        url: "/api/state",
        headers: { host: "other.example" },
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await server.inject({ method: "HEAD", url: "/", headers: { host } }))
      .statusCode,
    405,
  );
  assert.equal(
    (await server.inject({ url: "/data/connector.key", headers: { host } }))
      .statusCode,
    404,
  );
});

test("existing SQLite documents and encrypted credentials survive Fastify restart", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "motif-fastify-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const database = join(directory, "motif.sqlite");
  const legacy = openStore(database);
  const brand = legacy.save("brand", brandInput({ name: "Existing studio" }));
  legacy.db.close();

  const first = createApp({ database });
  try {
    const state = (
      await first.server.inject({
        url: "/api/state",
        headers: { host: "localhost:3333" },
      })
    ).json();
    assert.equal(state.brands[0].id, brand.id);
    const saved = await first.server.inject({
      method: "PUT",
      url: "/api/settings",
      headers: { host: "localhost:3333", "x-motif-token": state.token },
      payload: {
        ...defaultSettings,
        imageCredentials: { local: "fixture-image-key" },
      },
    });
    assert.equal(saved.statusCode, 200);
  } finally {
    await first.server.close();
  }
  assert.throws(() => first.store.all("brand"));
  const key = readFileSync(join(directory, "connector.key"));
  const second = createApp({ database });
  try {
    const state = (
      await second.server.inject({
        url: "/api/state",
        headers: { host: "localhost:3333" },
      })
    ).json();
    assert.equal(state.brands[0].version, brand.version);
    assert.equal(state.imageCredentials.local, true);
    assert.ok(!JSON.stringify(state).includes("fixture-image-key"));
    assert.deepEqual(readFileSync(join(directory, "connector.key")), key);
  } finally {
    await second.server.close();
  }
});

test("Fastify shutdown cancels active research", async () => {
  let signal: AbortSignal;
  const { server } = createApp({
    database: ":memory:",
    analysisDependencies: {
      fetchDocument: async (_url, _redirects, options) => {
        signal = options.signal;
        return new Promise(() => {});
      },
    },
  });
  try {
    const headers = { host: "localhost:3333", "x-motif-token": "" };
    headers["x-motif-token"] = (
      await server.inject({ url: "/api/state", headers })
    ).json().token;
    const started = await server.inject({
      method: "POST",
      url: "/api/analysis",
      headers,
      payload: { url: "https://research.example/", maxPages: 1 },
    });
    assert.equal(started.statusCode, 202);
    assert.equal(signal.aborted, false);
  } finally {
    await server.close();
  }
  assert.equal(signal.aborted, true);
});
