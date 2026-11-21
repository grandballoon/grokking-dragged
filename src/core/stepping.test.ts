import { describe, expect, it } from "vitest";
import { clampStep, stepBy, withInput } from "./stepping";

describe("stepping", () => {
  it("clamps and rounds steps", () => {
    expect(clampStep(-3, 5)).toBe(0);
    expect(clampStep(9, 5)).toBe(4);
    expect(clampStep(2.4, 5)).toBe(2);
    expect(clampStep(3, 0)).toBe(0);
  });

  it("steps within bounds", () => {
    expect(stepBy({ input: "a", step: 4 }, 1, 5)).toEqual({ input: "a", step: 4 });
    expect(stepBy({ input: "a", step: 4 }, -1, 5)).toEqual({ input: "a", step: 3 });
  });

  it("keeps showing the end when the input changes at the end", () => {
    expect(withInput({ input: "a", step: 4 }, 5, "b", 9)).toEqual({
      input: "b",
      step: 8,
    });
  });

  it("otherwise keeps the step, clamped to the new trace", () => {
    expect(withInput({ input: "a", step: 2 }, 5, "b", 9)).toEqual({
      input: "b",
      step: 2,
    });
    expect(withInput({ input: "a", step: 6 }, 9, "b", 4)).toEqual({
      input: "b",
      step: 3,
    });
  });
});
