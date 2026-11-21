import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { values } from "../../kit/testing";
import { outcomes } from "../testing";
import { INITIAL_INPUT, run, SRC, type Input } from "./trace";

const text = (line: number) => lineText(SRC, line).trim();

describe("SortedArray port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("ends as the Python does", () => {
    // SortedArray(array('l', [1, 2, 4, 7, 8, 9]))
    expect(values(last.vars._array)).toEqual([1, 2, 4, 7, 8, 9]);
  });

  it("returns and raises what the Python does, call by call", () => {
    expect(outcomes(frames, INITIAL_INPUT.ops)).toEqual([
      "None",
      "None",
      "None",
      "None",
      "None",
      "3",
      "None",
      "3",
      "None",
      "None",
      "None",
      "None",
      "ValueError: The array is already full, maximum size: 6",
    ]);
  });

  it("shifts every larger value right before inserting at the front", () => {
    const shifts = frames.filter(
      (f) => f.vars.op === 4 && text(f.line) === "self._array[i] = self._array[i-1]",
    );
    expect(shifts.map((f) => f.vars.i)).toEqual([4, 3, 2, 1]);
    const placed = frames.find(
      (f) => f.vars.op === 4 && text(f.line) === "self._array[0] = value",
    )!;
    expect(values(placed.vars._array).slice(0, 5)).toEqual([1, 2, 5, 7, 9]);
  });

  it("stops linear search early once it passes the target", () => {
    const search = frames.filter((f) => f.vars.op === 6);
    expect(search.at(-1)!.vars.i).toBe(3);
    expect(search.at(-1)!.vars.returned).toEqual({
      from: "linear_search",
      text: "None",
      raised: null,
    });
    expect(text(search.at(-1)!.line)).toBe("return None");
  });

  it("tells the three `return None` lines apart", () => {
    const input: Input = {
      max_size: 2,
      ops: script(
        ["insert", 1],
        ["linear_search", 0],
        ["linear_search", 5],
        ["binary_search", 5],
      ),
    };
    const nones = run(input)
      .filter((f) => f.vars.returned?.text === "None")
      .map((f) => f.line);
    expect(nones.map(text)).toEqual(["return None", "return None", "return None"]);
    expect(new Set(nones).size).toBe(3);
    expect([...nones].sort((a, b) => a - b)).toEqual(nones);
  });

  it("narrows binary search the way the Python does", () => {
    // [1, 2, 5, 7, 9]: looking for 3, mid 2 (5 > 3), then mid 0 (1 < 3), then mid 1 (2 < 3).
    const mids = frames
      .filter(
        (f) => f.vars.op === 8 && text(f.line) === "mid_val = self._array[mid_index]",
      )
      .map((f) => [f.vars.left, f.vars.mid_index, f.vars.right]);
    expect(mids).toEqual([
      [0, 2, 4],
      [0, 0, 1],
      [1, 1, 1],
    ]);
  });

  it("leaves a stale copy past _size after delete, as the Python does", () => {
    const deleted = frames.find(
      (f) => f.vars.op === 9 && text(f.line) === "self._size -= 1",
    )!;
    expect(values(deleted.vars._array)).toEqual([1, 2, 7, 9, 9, 0]);
    expect(deleted.vars._size).toBe(4);
  });

  it("raises when deleting a missing value and carries on", () => {
    const input: Input = {
      max_size: 3,
      ops: [
        { id: "a", name: "delete", args: [4] },
        { id: "b", name: "insert", args: [4] },
      ],
    };
    const run2 = run(input);
    expect(outcomes(run2, input.ops)).toEqual([
      "ValueError: Unable to delete element 4: the entry is not in the array",
      "None",
    ]);
    expect(values(run2.at(-1)!.vars._array)).toEqual([4, 0, 0]);
  });
});
