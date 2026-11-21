import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { values } from "../../kit/testing";
import { outcomes } from "../testing";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("core Array port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("ends with the slots the Python holds", () => {
    // a = Array(5); a[0] = 7; a[3] = 2; ...; a[4] = 9
    expect(values(last.vars.self)).toEqual([7, 0, 0, 2, 9]);
  });

  it("returns and raises what the Python does, call by call", () => {
    expect(outcomes(frames, INITIAL_INPUT.ops)).toEqual([
      "None",
      "None",
      "2",
      "0",
      "IndexError: array assignment index out of range",
      "IndexError: array index out of range",
      "None",
    ]);
  });

  it("reserves the slots before filling them with 0", () => {
    const [sized, fill, filled] = frames;
    expect(lineText(SRC, sized!.line).trim()).toBe("self._size = size");
    expect(sized!.vars.self._array).toEqual([]);
    expect(fill!.vars.fill).toBe(0);
    expect(values(filled!.vars.self)).toEqual([0, 0, 0, 0, 0]);
  });

  it("stops at the raise line on a negative index, without wrapping", () => {
    const raised = frames.find((f) => f.vars.index === -1 && f.vars.error !== null)!;
    expect(lineText(SRC, raised.line).trim()).toBe(
      "raise IndexError('array index out of range')",
    );
  });

  it("gives every write a fresh stamp but keeps the value's identity", () => {
    const slot0 = last.vars.self._array[0]!;
    expect(slot0.uid).toBe("op0");
    expect(slot0.born).toBeGreaterThan(last.vars.self._array[1]!.born);
  });
});
