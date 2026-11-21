import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_LIST, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("recursive count port", () => {
  const frames = run(DEFAULT_LIST);
  const last = frames.at(-1)!;

  it("returns 3, as the Python does for count([3, 1, 4])", () => {
    expect(last.vars.stack).toEqual([{ list: [3, 1, 4], rest: 2, returns: 3 }]);
    expect(line(last)).toBe("return 1 + count(list[1:])");
  });

  it("recurses down to the empty list, one slice at a time", () => {
    const base = frames.find((f) => line(f) === "return 0")!;
    expect(base.vars.stack.map((c) => c.list)).toEqual([[3, 1, 4], [1, 4], [4], []]);
  });

  it("counts 1 per item on the way back up, whatever the values", () => {
    const returns = (list: number[]) =>
      run(list)
        .filter((f) => f.vars.stack.at(-1)!.returns !== null)
        .map((f) => f.vars.stack.at(-1)!.returns);
    expect(returns(DEFAULT_LIST)).toEqual([0, 1, 2, 3]);
    expect(returns([9, 9, 9])).toEqual([0, 1, 2, 3]);
  });

  it("counts an empty list as 0 without recursing", () => {
    expect(run([]).at(-1)!.vars.stack[0]!.returns).toBe(0);
  });
});
