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
