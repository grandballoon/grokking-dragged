import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { HEAP_SRC, INITIAL_INPUT, run, SRC } from "./trace";

const text = (f: { file: string; line: number }) =>
  lineText(f.file === SRC.file ? SRC : HEAP_SRC, f.line).trim();

describe("k_largest_elements port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("prints what the Python prints", () => {
    expect(last.vars.stdout).toEqual([
      "[(2, 43), (7, 44), (0, 55), (3, 59), (1, 71), (9, 234)]",
    ]);
    expect(text(last)).toBe("print(k_largest_elements(arr, 6))");
  });

  it("leaves the heap as the Python does after every insert and top", () => {
    // From instrumenting Heap.insert and Heap.top under the same demo.
    const afterCalls = frames.filter(
      (f) =>
        f.file === SRC.file &&
        (text(f) === "heap.insert((i, arr[i]))" ||
          text(f).startsWith("heap.top()") ||
          text(f).startsWith("return [heap.top()")),
    );
    expect(afterCalls.map((f) => f.vars.heap)).toEqual([
      [[0, 55]],
      [
        [0, 55],
        [1, 71],
      ],
      [
        [2, 43],
        [1, 71],
        [0, 55],
      ],
      [
        [2, 43],
        [3, 59],
        [0, 55],
        [1, 71],
      ],
      [
        [4, 10],
        [2, 43],
        [0, 55],
        [1, 71],
        [3, 59],
      ],
      [
        [4, 10],
        [2, 43],
        [5, 20],
        [1, 71],
        [3, 59],
        [0, 55],
      ],
      [
        [5, 20],
        [2, 43],
        [0, 55],
        [1, 71],
        [3, 59],
      ],
      [
        [6, 15],
        [2, 43],
        [5, 20],
        [1, 71],
        [3, 59],
        [0, 55],
      ],
      [
        [5, 20],
        [2, 43],
        [0, 55],
        [1, 71],
        [3, 59],
      ],
      [
        [5, 20],
        [2, 43],
        [7, 44],
        [1, 71],
        [3, 59],
        [0, 55],
      ],
      [
        [2, 43],
        [0, 55],
        [7, 44],
        [1, 71],
        [3, 59],
      ],
      [
        [2, 43],
        [0, 55],
        [7, 44],
        [1, 71],
        [3, 59],
        [9, 234],
      ],
      [
        [7, 44],
        [0, 55],
        [9, 234],
        [1, 71],
        [3, 59],
      ],
      [
        [0, 55],
        [3, 59],
        [9, 234],
        [1, 71],
      ],
      [
        [3, 59],
        [1, 71],
        [9, 234],
      ],
      [
        [1, 71],
        [9, 234],
      ],
      [[9, 234]],
      [],
    ]);
  });

  it("validates the heap after every swap, stepping into heap.py", () => {
    const validations = frames.filter((f) => text(f) === "heap._validate()");
    expect(validations.map((f) => f.vars.i)).toEqual([6, 7, 9]);
    const insideValidate = frames.filter((f) => f.vars.stack.at(-1)?.fn === "_validate");
    expect(insideValidate.every((f) => f.file === HEAP_SRC.file)).toBe(true);
    expect(insideValidate.filter((f) => text(f) === "return True")).toHaveLength(3);
  });

  it("skips values no larger than the smallest kept one", () => {
    const skips = frames.filter((f) => f.note.includes("skip it"));
    expect(skips.map((f) => f.vars.i)).toEqual([8, 10, 11]);
  });

  it("follows k", () => {
    const end = run({ ...INITIAL_INPUT, k: 2 }).at(-1)!;
    expect(end.vars.stdout).toEqual(["[(1, 71), (9, 234)]"]);
  });
});
