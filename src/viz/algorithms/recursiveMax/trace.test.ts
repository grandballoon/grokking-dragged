import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { DEFAULT_LIST, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();
const result = (list: number[]) => run(list).at(-1)!.vars.stack[0]!;

describe("recursive max port", () => {
  const frames = run(DEFAULT_LIST);

  it("returns 7, as the Python does for max([3, 7, 2, 5])", () => {
    expect(result(DEFAULT_LIST)).toEqual({
      lst: [3, 7, 2, 5],
      max_num: 7,
      returned: true,
      returns: 7,
    });
    expect(line(frames.at(-1)!)).toBe("return lst[0] if lst[0] > max_num else max_num");
  });

  it("stops at a one-item list", () => {
    const base = frames.find((f) => line(f) === "return lst[0]")!;
    expect(base.vars.stack.map((c) => c.lst)).toEqual([
      [3, 7, 2, 5],
      [7, 2, 5],
      [2, 5],
      [5],
    ]);
    expect(base.vars.stack.at(-1)!.returns).toBe(5);
  });

  it("compares on the way back up", () => {
    const returns = frames
      .filter((f) => line(f).startsWith("return lst[0] if"))
      .map((f) => f.vars.stack.at(-1)!.returns);
    expect(returns).toEqual([5, 7, 7]);
  });

  it("returns None for an empty list and keeps max_num on a tie, as the Python does", () => {
    expect(result([])).toMatchObject({ returned: true, returns: null });
    expect(result([4, 4])).toMatchObject({ max_num: 4, returns: 4 });
  });
});
