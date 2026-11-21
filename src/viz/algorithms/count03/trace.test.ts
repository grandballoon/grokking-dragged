import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_ARR, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("count port", () => {
  const frames = run({ arr: DEFAULT_ARR });
  const last = frames.at(-1)!;

  it("counts 3 items, as count([2, 4, 6]) does in Python", () => {
    expect(last.vars.stack[0]!.returns).toEqual({ value: 3 });
  });

  it("calls itself on ever shorter copies, down to []", () => {
    const base = frames.find((f) => lineOf(f) === "return 0")!;
    expect(base.vars.stack.map((c) => c.arr)).toEqual([[2, 4, 6], [4, 6], [6], []]);
  });

  it("returns 1, 2, 3 on the way back", () => {
    const returns = frames
      .filter((f) => lineOf(f).startsWith("return 1"))
      .map((f) => f.vars.stack.at(-1)!.returns)
      .filter((r) => r !== null);
    expect(returns).toEqual([{ value: 1 }, { value: 2 }, { value: 3 }]);
  });

  it("returns 0 for an empty list straight away", () => {
    const end = run({ arr: [] });
    expect(end.length).toBe(3);
    expect(end.at(-1)!.vars.stack[0]!.returns).toEqual({ value: 0 });
  });
});
