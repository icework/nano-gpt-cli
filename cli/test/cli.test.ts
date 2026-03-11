import test from "node:test";
import assert from "node:assert/strict";

import { shouldUseJsonOutput } from "../src/cli.js";

test("shouldUseJsonOutput respects configured json output", () => {
  assert.equal(shouldUseJsonOutput("json"), true);
  assert.equal(shouldUseJsonOutput("text"), false);
  assert.equal(shouldUseJsonOutput(undefined), false);
});
