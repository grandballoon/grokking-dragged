import { describe, expect, it } from "vitest";
import { lineText } from "../../../../core/pythonSource";
import { SINGLY_LINKED_LIST } from "../../sources";
import { values } from "../../kit/testing";
import { echoesByOp } from "../shared/testing";
import { STACK_ECHOES } from "./reference";
import { INITIAL_INPUT, run, SRC } from "./trace";

describe("stack (linked list) port", () => {
  const frames = run(INITIAL_INPUT);

  it("returns and raises what the Python does", () => {
    expect(echoesByOp(INITIAL_INPUT.ops, frames)).toEqual(STACK_ECHOES);
    expect(values(frames.at(-1)!.vars.obj._data._head)).toEqual([]);
  });

  it("builds the list before assigning it", () => {
    expect(frames.slice(0, 2).map((f) => f.file)).toEqual([
      SINGLY_LINKED_LIST.file,
      SRC.file,
    ]);
  });

  it("pushes by stepping into insert_in_front, with push underneath", () => {
    const push3 = frames.filter((f) => f.vars.op === 2);
    expect(push3.map((f) => f.file)).toEqual([
      SINGLY_LINKED_LIST.file,
      SINGLY_LINKED_LIST.file,
      SRC.file,
    ]);
    expect(push3[0]!.vars.stack).toMatchObject([
      { fn: "push", locals: { value: 3 } },
      { fn: "insert_in_front", locals: { data: 3 } },
    ]);
    expect(values(push3.at(-1)!.vars.obj._data._head)).toEqual([3, 2, 1]);
  });

  it("pops by stepping into delete_from_front", () => {
    const pop = frames.filter((f) => f.vars.op === 4);
    expect(
      pop.map((f) =>
        lineText(f.file === SRC.file ? SRC : SINGLY_LINKED_LIST, f.line).trim(),
      ),
    ).toEqual([
      "if self.is_empty():",
      "if self.is_empty():",
      "data = self._head.data()",
      "self._head = self._head.next()",
      "return data",
      "return self._data.delete_from_front()",
    ]);
  });
});
