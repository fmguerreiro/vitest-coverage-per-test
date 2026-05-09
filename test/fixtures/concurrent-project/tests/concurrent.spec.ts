import { describe, it, expect } from "vitest";
import { alpha } from "../src/alpha.js";
import { beta } from "../src/beta.js";

describe("concurrent coverage", () => {
  it.concurrent("calls alpha only", async () => {
    expect(alpha()).toEqual("alpha");
  });

  it.concurrent("calls beta only", async () => {
    expect(beta()).toEqual("beta");
  });
});
