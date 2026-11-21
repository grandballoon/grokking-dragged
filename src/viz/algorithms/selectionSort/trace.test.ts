import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_ARR, run, SRC, type SortCall } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("selection sort port", () => {
  const frames = run({ arr: BOOK_ARR });

  it("prints [2, 3, 5, 6, 10], as the Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["[2, 3, 5, 6, 10]"]);
  });

  it("pops the smallest remaining item on each pass", () => {
    const pops = frames
      .filter((f) => lineOf(f) === "newArr.append(arr.pop(smallest))")
      .map((f) => {
        const sort = f.vars.stack[0] as SortCall;
        return { arr: sort.arr, newArr: sort.newArr, smallest: sort.smallest };
      });
    expect(pops).toEqual([
      { arr: [5, 3, 6, 10], newArr: [2], smallest: 3 },
      { arr: [5, 6, 10], newArr: [2, 3], smallest: 1 },
      { arr: [6, 10], newArr: [2, 3, 5], smallest: 0 },
      { arr: [10], newArr: [2, 3, 5, 6], smallest: 0 },
      { arr: [], newArr: [2, 3, 5, 6, 10], smallest: 0 },
    ]);
  });

  it("shares one arr list between the two calls", () => {
    const inFind = frames.find((f) => f.vars.stack.length === 2)!;
    expect(inFind.vars.stack[0]!.arr).toBe(inFind.vars.stack[1]!.arr);
  });

  it("compares each later item against the smallest so far", () => {
    const compares = frames.filter((f) => lineOf(f) === "if arr[i] < smallest:");
    expect(compares.length).toBe(4 + 3 + 2 + 1);
    const first = compares[0]!.vars.stack[1]!;
    expect(first).toMatchObject({ fn: "findSmallest", smallest: 5, i: 1 });
  });

  it("keeps equal items in their original order", () => {
    expect(run({ arr: [3, 1, 3, 1] }).at(-1)!.vars.stdout).toEqual(["[1, 1, 3, 3]"]);
  });
});
