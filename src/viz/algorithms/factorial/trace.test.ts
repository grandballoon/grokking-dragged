import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { INITIAL_INPUT, run, SRC } from "./trace";

const lineOf = (frame: { line: number }) => lineText(SRC, frame.line).trim();

describe("factorial port", () => {
  const frames = run(INITIAL_INPUT);

  it("prints 120, as the Python does", () => {
    expect(frames.at(-1)!.vars.stdout).toEqual(["120"]);
    expect(frames.at(-1)!.vars.stack).toEqual([]);
  });

  it("reaches the base case with five calls stacked", () => {
    const base = frames.find((f) => lineOf(f) === "return 1")!;
    expect(base.vars.stack.map((c) => c.x)).toEqual([5, 4, 3, 2, 1]);
  });

  it("returns the partial products in order as the stack unwinds", () => {
    const returns = frames
      .filter((f) => lineOf(f) === "return x * fact(x-1)")
      .map((f) => f.vars.stack.at(-1)!)
      .filter((c) => c.returns !== null)
      .map((c) => c.returns!.value);
    expect(returns).toEqual([2, 6, 24, 120]);
  });

  it("shows what each call got back before it multiplies", () => {
    const got = frames.find(
      (f) => f.vars.stack.at(-1)?.got !== null && f.vars.stack.at(-1)?.x === 3,
    )!;
    expect(got.vars.stack.at(-1)).toMatchObject({ got: { value: 2 }, returns: null });
  });
});
