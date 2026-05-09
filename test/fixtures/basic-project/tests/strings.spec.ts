import { describe, it, expect } from "vitest";
import { greet } from "../src/strings.js";

describe("strings", () => {
  it("greets by name", () => {
    expect(greet("world")).toEqual("Hello, world!");
  });
});
