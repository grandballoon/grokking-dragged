import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_LIST, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("recursive sum port", () => {
  const frames = run(DEFAULT_LIST);
  const last = frames.at(-1)!;

  it("returns 12, as the Python does for sum([2, 4, 6])", () => {
    expect(last.vars.stack).toEqual([{ list: [2, 4, 6], rest: 10, returns: 12 }]);
    expect(line(last)).toBe("return list[0] + sum(list[1:])");
  });

  it("recurses down to the empty list, one slice at a time", () => {
    const base = frames.find((f) => line(f) === "return 0")!;
    expect(base.vars.stack.map((c) => c.list)).toEqual([[2, 4, 6], [4, 6], [6], []]);
    expect(base.vars.stack.at(-1)!.returns).toBe(0);
  });

  it("adds on the way back up", () => {
    const returns = frames
      .filter((f) => f.vars.stack.at(-1)!.returns !== null)
      .map((f) => f.vars.stack.at(-1)!.returns);
    expect(returns).toEqual([0, 6, 10, 12]);
  });

  it("sums an empty list to 0 without recursing", () => {
    const empty = run([]);
    expect(empty.map(line)).toEqual(["def sum(list):", "if list == []:", "return 0"]);
  });
});
