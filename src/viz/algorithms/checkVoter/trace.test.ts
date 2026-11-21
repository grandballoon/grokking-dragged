import { describe, expect, it } from "vitest";
import { lineText } from "../../../core/pythonSource";
import { BOOK_CALLS, run, SRC } from "./trace";

const line = (f: { line: number }) => lineText(SRC, f.line).trim();

describe("check voter port", () => {
  const frames = run(BOOK_CALLS);
  const last = frames.at(-1)!;

  it("prints what the Python prints", () => {
    expect(last.vars.stdout).toEqual([
      "let them vote!",
      "let them vote!",
      "kick them out!",
    ]);
    expect(last.vars.voted).toEqual({ tom: true, mike: true });
    expect(line(last)).toBe('print("kick them out!")');
  });

  it("looks each name up before deciding", () => {
    const checks = frames.filter((f) => line(f) === "if voted.get(name):");
    expect(checks.map((f) => [f.vars.call, f.vars.name, { ...f.vars.voted }])).toEqual([
      [0, "tom", {}],
      [1, "mike", { tom: true }],
      [2, "mike", { tom: true, mike: true }],
    ]);
  });

  it("treats names like dict keys, not object properties", () => {
    expect(run(["constructor"]).at(-1)!.vars.stdout).toEqual(["let them vote!"]);
  });

  it("only sets up the dict when there are no calls", () => {
    expect(run([]).map(line)).toEqual(["voted = {}"]);
  });
});
