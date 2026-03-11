import test from "node:test";
import assert from "node:assert/strict";

import { NanoGptClient } from "../src/client.js";

test("NanoGptClient preserves base-url path prefixes for model requests", async () => {
  let requestedUrl = "";
  const client = new NanoGptClient(
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/nanogpt",
    },
    async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  );

  await client.listModels();
  assert.equal(requestedUrl, "https://example.com/nanogpt/api/v1/models");
});

test("NanoGptClient avoids double-prefixing when base-url is already an API root", async () => {
  let requestedUrl = "";
  const client = new NanoGptClient(
    {
      apiKey: "test-key",
      baseUrl: "https://proxy.example/api",
    },
    async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  );

  await client.listModels();
  assert.equal(requestedUrl, "https://proxy.example/api/v1/models");
});

test("NanoGptClient forwards image-to-image fields to image generation", async () => {
  let requestedUrl = "";
  let requestBody = "";
  const client = new NanoGptClient(
    {
      apiKey: "test-key",
      baseUrl: "https://example.com/nanogpt",
    },
    async (input, init) => {
      requestedUrl = String(input);
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
  );

  await client.generateImage({
    model: "qwen-image",
    prompt: "restyle this sketch",
    imageDataUrl: "data:image/png;base64,abc123",
  });

  assert.equal(requestedUrl, "https://example.com/nanogpt/v1/images/generations");
  assert.deepEqual(JSON.parse(requestBody), {
    model: "qwen-image",
    prompt: "restyle this sketch",
    imageDataUrl: "data:image/png;base64,abc123",
  });
});
