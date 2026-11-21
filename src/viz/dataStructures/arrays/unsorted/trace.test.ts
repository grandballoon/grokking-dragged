import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { ARRAY_CORE } from "../../sources";
import { values } from "../../kit/testing";
import { outcomes } from "../testing";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("UnsortedArray port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("ends as the Python does", () => {
    // UnsortedArray(array('l', [4, 7, 55, 9, 3]))
    expect(values(last.vars._array)).toEqual([4, 7, 55, 9, 3]);
    expect(last.vars._size).toBe(5);
  });

  it("returns and raises what the Python does, call by call", () => {
    expect(outcomes(frames, INITIAL_INPUT.ops)).toEqual([
      "None",
      "None",
      "None",
      "None",
      "2",
      "None",
      "None",
      "None",
      "None",
      "ValueError: The array is already full",
      "ValueError: Index 6 out of range.",
      "None",
    ]);
  });

  it("prints what traverse visits", () => {
    expect(last.vars.stdout).toEqual(["4", "7", "55"]);
  });

  it("allocates the core array first, in core.py", () => {
    expect(frames[0]!.file).toBe(ARRAY_CORE.file);
    expect(values(frames[0]!.vars._array)).toEqual([0, 0, 0, 0, 0]);
  });

  it("fills a deleted hole with the last element, leaving a stale copy", () => {
    const deleted = frames.find(
      (f) => f.vars.op === 5 && lineText(SRC, f.line).trim() === "self._size -= 1",
    )!;
    expect(values(deleted.vars._array)).toEqual([4, 7, 55, 7, 0]);
    expect(deleted.vars._size).toBe(3);
    const [moved, stale] = [
      deleted.vars._array._array[1]!,
      deleted.vars._array._array[3]!,
    ];
    expect(moved.uid).toBe(stale.uid);
    expect(moved.born).toBeGreaterThan(stale.born);
  });

  it("scans find left to right with index", () => {
    const scans = frames.filter((f) => f.vars.op === 4 && f.vars.index !== null);
    expect(scans.map((f) => f.vars.index)).toEqual([0, 1, 2, 2]);
  });
});
