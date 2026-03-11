import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildMessageContent, extractTextContent } from "../src/messages.js";

test("buildMessageContent returns plain text when no images are attached", async () => {
  const content = await buildMessageContent("hello", []);
  assert.equal(content, "hello");
});

test("buildMessageContent converts local image paths to file URLs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nano-gpt-cli-"));
  const imagePath = join(dir, "image.png");
  await writeFile(imagePath, "fake-image");

  const content = await buildMessageContent("describe", [imagePath]);
  assert.ok(Array.isArray(content));
  assert.equal(content[0]?.type, "text");
  assert.equal(content[1]?.type, "image_url");
  assert.match(content[1]?.image_url.url ?? "", /^file:\/\//);
});

test("extractTextContent joins text parts", () => {
  const text = extractTextContent([
    { type: "text", text: "hello " },
    { type: "image_url", image_url: { url: "https://example.com/cat.png" } },
    { type: "text", text: "world" },
  ]);

  assert.equal(text, "hello world");
});

