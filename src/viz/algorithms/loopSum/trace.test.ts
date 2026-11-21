import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_ARR, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("loop sum port", () => {
  const frames = run(BOOK_ARR);
  const last = frames.at(-1)!;

  it("prints 10, as the Python does", () => {
    expect(last.vars.stdout).toEqual(["10"]);
    expect(line(last)).toBe("print(sum([1, 2, 3, 4]))");
  });

  it("keeps a running total after each item", () => {
    const totals = frames
      .filter((f) => line(f) === "total += x")
      .map((f) => f.vars.total);
    expect(totals).toEqual([1, 3, 6, 10]);
  });

  it("checks the loop once per item and once more to finish", () => {
    const checks = frames.filter((f) => line(f) === "for x in arr:");
    expect(checks.map((f) => f.vars.at)).toEqual([0, 1, 2, 3, 4]);
    expect(checks.at(-1)!.vars.x).toBe(4);
  });

  it("sums an empty list to 0", () => {
    expect(run([]).at(-1)!.vars.stdout).toEqual(["0"]);
  });
});
