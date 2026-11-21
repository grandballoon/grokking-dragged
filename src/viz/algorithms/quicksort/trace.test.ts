import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_ARRAY, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("quicksort port", () => {
  const frames = run(BOOK_ARRAY);
  const last = frames.at(-1)!;

  it("prints [2, 3, 5, 10], as the Python does", () => {
    expect(last.vars.stdout).toEqual(["[2, 3, 5, 10]"]);
    expect(line(last)).toBe("print(quicksort([10, 5, 2, 3]))");
    expect(last.vars.stack).toEqual([]);
  });

  it("makes the same calls in the same order as the Python", () => {
    const calls = frames
      .filter((f) => line(f) === "def quicksort(array):")
      .map((f) => f.vars.stack.at(-1)!);
    expect(calls.map((c) => [c.uid, c.array])).toEqual([
      ["q", [10, 5, 2, 3]],
      ["ql", [5, 2, 3]],
      ["qll", [2, 3]],
      ["qlll", []],
      ["qllg", [3]],
      ["qlg", []],
      ["qg", []],
    ]);
  });

  it("partitions around the first element", () => {
    const root = last.vars.finished.find((c) => c.uid === "q")!;
    expect(root).toMatchObject({
      pivot: 10,
      less: [5, 2, 3],
      greater: [],
      sorted_less: [2, 3, 5],
      sorted_greater: [],
      returns: [2, 3, 5, 10],
    });
  });

  it("keeps duplicates of the pivot in less, as the Python does", () => {
    // python3: print(quicksort([10, 5, 2, 3, 7, 3])) -> [2, 3, 3, 5, 7, 10]
    const end = run([10, 5, 2, 3, 7, 3]).at(-1)!;
    expect(end.vars.stdout).toEqual(["[2, 3, 3, 5, 7, 10]"]);
    const three = end.vars.finished.find((c) => c.pivot === 3)!;
    expect(three.less).toEqual([3]);
  });

  it("sorts an empty list without recursing", () => {
    expect(run([]).at(-1)!.vars.stdout).toEqual(["[]"]);
  });
});
