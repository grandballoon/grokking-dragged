import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { script } from "../../opScript";
import { SINGLY_LINKED_LIST } from "../../sources";
import { values } from "../../kit/testing";
import { echoesByOp } from "../shared/testing";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("bag port", () => {
  const frames = run(INITIAL_INPUT);

  it("iterates in the order the Python does", () => {
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual([
      "-",
      "-",
      "-",
      "[4, 7, 4]",
      "-",
      "[2, 4, 7, 4]",
    ]);
    expect(values(frames.at(-1)!.vars.obj._data._head)).toEqual([2, 4, 7, 4]);
  });

  it("returns the list's generator, then runs it", () => {
    const iter = frames.filter((f) => f.vars.op === 3);
    expect(iter[0]!.file).toBe(SRC.file);
    expect(lineText(SRC, iter[0]!.line).trim()).toBe("return iter(self._data)");
    const yields = iter.filter(
      (f) => lineText(SINGLY_LINKED_LIST, f.line).trim() === "yield data",
    );
    expect(yields.map((f) => f.vars.echoes.at(-1)!.text)).toEqual([
      "[4]",
      "[4, 7]",
      "[4, 7, 4]",
    ]);
    expect(yields.map((f) => f.vars.found)).toEqual(["op2", "op1", "op0"]);
  });

  it("iterates an empty bag to []", () => {
    const ops = script(["__iter__"]);
    expect(echoesByOp(ops, run({ ops }))).toEqual(["[]"]);
  });
});
