import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { INITIAL_INPUT, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("countdown port", () => {
  const frames = run(INITIAL_INPUT);
  const last = frames.at(-1)!;

  it("prints 5 down to 1, as the Python does", () => {
    expect(last.vars.stdout).toEqual(["5", "4", "3", "2", "1"]);
    expect(last.vars.stack).toEqual([]);
  });

  it("stacks six calls at the deepest point, outermost first", () => {
    const deepest = frames.find((f) => lineOf(f) === "return 0")!;
    expect(deepest.vars.stack.map((c) => c.i)).toEqual([5, 4, 3, 2, 1, 0]);
    expect(deepest.vars.stack.at(-1)!.returns).toEqual({ value: 0 });
  });

  it("hands 0 back down through every caller", () => {
    const outerReturn = frames.findLast((f) => f.vars.stack.length === 1)!;
    expect(lineOf(outerReturn)).toBe("return countdown(i-1)");
    expect(outerReturn.vars.stack[0]).toMatchObject({
      i: 5,
      got: { value: 0 },
      returns: { value: 0 },
    });
  });

  it("stops at once for i <= 0, printing nothing", () => {
    const end = run({ i: -1 }).at(-1)!;
    expect(end.vars.stdout).toEqual([]);
  });
});
