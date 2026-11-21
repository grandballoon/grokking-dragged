import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_INPUT, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();
const printed = (arr: number[], target: number) =>
  run({ arr, targets: [target, target] }).at(-1)!.vars.stdout[0];

describe("recursive binary search port", () => {
  const frames = run(BOOK_INPUT);

  it("prints 2 and 0, as the Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["2", "0"]);
  });

  it("finds 6 by going left twice", () => {
    const found = frames.filter((f) => lineOf(f) === "return mid").at(-1)!;
    expect(found.vars.stack.map((c) => c.arr)).toEqual([[6, 7, 8, 9, 10], [6, 7], [6]]);
  });

  it("shifts an index found in the right half by mid + 1", () => {
    const shift = run({ arr: [6, 7, 8, 9, 10], targets: [9, 9] }).find(
      (f) => lineOf(f) === "(mid + 1) + recursive_response",
    )!;
    expect(shift.vars.stack.at(-1)).toMatchObject({
      mid: 2,
      recursive_response: { value: 0 },
      returns: { value: 3 },
    });
  });

  it("matches the Python on every target, found or not", () => {
    // From running the Python file's binary_search on these inputs.
    expect([5, 6, 7, 8, 9, 10, 11].map((t) => printed([6, 7, 8, 9, 10], t))).toEqual([
      "None",
      "0",
      "1",
      "2",
      "3",
      "4",
      "None",
    ]);
    expect(printed([], 3)).toBe("None");
    expect(printed([1, 3, 5, 7, 9, 11, 13], 13)).toBe("6");
    expect(printed([2, 2, 2], 2)).toBe("1");
  });
});
