import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_ARR, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();
const result = (arr: number[]) => run({ arr }).at(-1)!.vars.stack[0]!.returns!.value;

describe("find_max port", () => {
  const frames = run({ arr: DEFAULT_ARR });

  it("finds 8, as find_max([2, 8, 3, 5]) does in Python", () => {
    expect(result(DEFAULT_ARR)).toBe(8);
  });

  it("stops recursing at a list of two", () => {
    const deepest = frames.find((f) => lineOf(f).includes("arr[0] > arr[1]"))!;
    expect(deepest.vars.stack.map((c) => c.arr)).toEqual([
      [2, 8, 3, 5],
      [8, 3, 5],
      [3, 5],
    ]);
    expect(deepest.vars.stack.at(-1)!.returns).toEqual({ value: 5 });
  });

  it("stores each sub-result in sub_max", () => {
    const back = frames.filter(
      (f) => lineOf(f).startsWith("sub_max") && f.vars.stack.at(-1)!.sub_max !== null,
    );
    expect(back.map((f) => f.vars.stack.at(-1)!.sub_max)).toEqual([5, 8]);
  });

  it("matches the Python on the short cases", () => {
    // python3 -c "from find_max import find_max; ..." gives these.
    expect(result([])).toBe(0);
    expect(result([7])).toBe(7);
    expect(result([4, 4])).toBe(4);
    expect(result([1, 9, 9, 2])).toBe(9);
  });
});
