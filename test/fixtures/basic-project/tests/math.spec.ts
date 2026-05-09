import { describe, it, expect } from "vitest";
import { add } from "../src/math.js";

describe("math", () => {
  it("adds two numbers", () => {
    expect(add(1, 2)).toEqual(3);
  });
});
