import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("app exposes the refreshed dashboard surfaces", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

  assert.match(html, /Your Form,/);
  assert.match(html, /videoInput/);
  assert.match(html, /researchButton/);
  assert.match(app, /gemma4:latest/);
  assert.match(app, /video_context/);
  assert.match(app, /research_context/);
  assert.match(html, /Vercel \+ Local Gateway/);
  assert.match(server, /\/api\/gemma\/status/);
  assert.match(server, /runOllamaGemma/);
  assert.match(server, /Access-Control-Allow-Origin/);
});
