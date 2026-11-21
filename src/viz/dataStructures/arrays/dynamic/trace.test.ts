import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { ARRAY_CORE } from "../../sources";
import { values } from "../../kit/testing";
import { outcomes } from "../testing";
import { INITIAL_INPUT, run, SRC } from "./trace";

const text = (line: number) => lineText(SRC, line).trim();

describe("DynamicArray port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;
  const endOf = (op: number) => frames.findLast((f) => f.vars.op === op)!;

  it("ends as the Python does", () => {
    // array('l', [4, 5]) with capacity 2
    expect(values(last.vars._array)).toEqual([4, 5]);
    expect(last.vars._capacity).toBe(2);
  });

  it("raises what the Python does, call by call", () => {
    expect(outcomes(frames, INITIAL_INPUT.ops)).toEqual([
      ...Array(8).fill("None"),
      "ValueError: Unable to delete element 7: the entry is not in the array",
      "None",
      "None",
    ]);
  });

  it("doubles and halves the capacity as the Python does", () => {
    const caps = INITIAL_INPUT.ops.map((_, i) => endOf(i).vars._capacity);
    expect(caps).toEqual([1, 2, 4, 4, 8, 8, 8, 4, 4, 2, 2]);
  });

  it("leaves stale values past _size after a delete", () => {
    expect(values(endOf(5).vars._array)).toEqual([3, 1, 6, 4, 4, 0, 0, 0]);
  });

  it("allocates the new array in core.py while old_array is still full", () => {
    const alloc = frames.find((f) => f.vars.op === 4 && f.file === ARRAY_CORE.file)!;
    expect(values(alloc.vars.allocating!)).toEqual(Array(8).fill(0));
    expect(values(alloc.vars.old_array!)).toEqual([3, 8, 1, 6]);
    expect(alloc.vars._array._id).toBe(alloc.vars.old_array!._id);
  });

  it("copies every element across, moving the value's identity", () => {
    const copies = frames.filter(
      (f) => f.vars.op === 4 && text(f.line) === "self._array[i] = old_array[i]",
    );
    expect(copies.map((f) => f.vars.i)).toEqual([0, 1, 2, 3]);
    const done = copies.at(-1)!.vars;
    expect(done._array._array[3]!.uid).toBe(done.old_array!._array[3]!.uid);
    expect(done._array._array[3]!.born).toBeGreaterThan(done.old_array!._array[3]!.born);
  });
});
