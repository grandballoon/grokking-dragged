import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_ARR, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("sum_array port", () => {
  const frames = run({ arr: DEFAULT_ARR });

  it("sums to 12, as sum_array([2, 4, 6]) does in Python", () => {
    expect(frames.at(-1)!.vars.stack[0]!.returns).toEqual({ value: 12 });
  });

  it("recurses on copies of the tail down to []", () => {
    const base = frames.find((f) => lineOf(f) === "return 0")!;
    expect(base.vars.stack.map((c) => c.arr)).toEqual([[2, 4, 6], [4, 6], [6], []]);
  });

  it("returns the running sums 6, 10, 12 on the way back", () => {
    const returns = frames
      .filter((f) => lineOf(f).startsWith("return arr[0]"))
      .map((f) => f.vars.stack.at(-1)!.returns)
      .filter((r) => r !== null)
      .map((r) => r.value);
    expect(returns).toEqual([6, 10, 12]);
  });
});
