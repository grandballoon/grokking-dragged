import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { echoesByOp } from "../shared/testing";
import { STACK_ECHOES } from "../stack/reference";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("stack (dynamic array) port", () => {
  const frames = run(INITIAL_INPUT);

  it("returns and raises what the Python does", () => {
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual(STACK_ECHOES);
    expect(frames.at(-1)!.vars.obj._data).toEqual([]);
  });

  it("grows the list at the end", () => {
    const pushed = frames.filter(
      (f) => lineText(SRC, f.line).trim() === "self._data.append(value)",
    );
    expect(pushed.map((f) => f.vars.obj._data)).toEqual([
      [1],
      [1, 2],
      [1, 2, 3],
      [1, 2, 4],
    ]);
    expect(pushed.map((f) => f.vars.found)).toEqual(["0", "1", "2", "2"]);
  });

  it("peeks at _data[-1]", () => {
    const peek = frames.find((f) => f.vars.op === 3 && f.vars.found !== null)!;
    expect(lineText(SRC, peek.line).trim()).toBe("return copy.deepcopy(self._data[-1])");
    expect(peek.vars.found).toBe("2");
  });
});
